// Plugin Vite de la page d'admin des images : actif seulement avec `npm run dev` (apply: 'serve').
// Absent de `npm run build` : ni routes, ni page.
//
// Routes (serveur de développement seulement) :
//   L'admin travaille sur toutes les cartes de Lancement, toutes vagues (src/data/extensions.json) :
//   GET  /__admin/vagues     → vagues de Lancement : [{ id, nom, disponibleLe, fichier, cartes }] (lecture seule)
//   GET  /__admin/extension  → Lancement assemblé avec toutes ses vagues (chaque carte porte sa « vague ») (lecture seule)
//   GET  /__admin/fichiers   → images présentes dans public/cartes/, par carte (lecture seule)
//   POST /__admin/image?carte=<id-carte>&calque=<illustration|animation>
//                            → enregistre l'image reçue : public/cartes/<id-carte>/illustration.webp (WebP),
//                              ou animation.gif (GIF, cartes immersives seulement)
//   POST /__admin/carte      → enregistre les cadrages de la carte dans le JSON
//                              de la vague de la carte, après une copie de sauvegarde dans sauvegardes-admin/
//   GET  /__admin/popularite → popularité publiée (src/data/popularite.json, migrée de l'ancien format si besoin,
//                              avec copie de sauvegarde), base (popularite-base.json) et semaine à publier
//   POST /__admin/popularite/publier { semaine, coups } → calcule et écrit la semaine (copie de l'ancien fichier
//                              dans sauvegardes-admin/) ; refuse une semaine déjà publiée
//   POST /__admin/migrer-images
//                            → copie les anciennes images rangées par finition (public/cartes/<id>/<finition>.webp)
//                              vers la carte correspondante, sans rien écraser ni supprimer
import { constants, mkdir, readFile, readdir, rename, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { TAILLE_MAX_IMAGE, appliquerEdition, formatAttendu, planMigrationImages, serialiserExtension, validerParametresImage } from '../src/core/edition';
import { assembler, construireCatalogue, type EntreeExtension, type ExtensionCatalogue } from '../src/core/catalogue';
import { calculerSemaine, lireFichierPopularite, publicationPossible, semaineAPublier, validerCoups, type BasePopularite, type FichierPopularite } from '../src/core/popularite';
import type { Extension } from '../src/core/types';

const TAILLE_MAX_JSON = 1024 * 1024;

class ErreurHttp extends Error {
  constructor(readonly statut: number, message: string) { super(message); }
}

function repondre(res: ServerResponse, statut: number, corps: unknown): void {
  res.statusCode = statut;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(corps));
}

/** Lit le corps de la requête en refusant tout ce qui dépasse `max` octets. */
function lireCorps(req: IncomingMessage, max: number): Promise<Uint8Array> {
  const annonce = Number(req.headers['content-length'] ?? '0');
  if (annonce > max) return Promise.reject(new ErreurHttp(413, `Fichier trop lourd : ${Math.ceil(max / 1024 / 1024)} Mo maximum.`));
  return new Promise((resoudre, rejeter) => {
    const morceaux: Uint8Array[] = [];
    let total = 0;
    req.on('data', (m: Uint8Array) => {
      total += m.length;
      if (total > max) {
        rejeter(new ErreurHttp(413, `Fichier trop lourd : ${Math.ceil(max / 1024 / 1024)} Mo maximum.`));
        req.destroy();
        return;
      }
      morceaux.push(m);
    });
    req.on('end', () => {
      const tout = new Uint8Array(total);
      let pos = 0;
      for (const m of morceaux) { tout.set(m, pos); pos += m.length; }
      resoudre(tout);
    });
    req.on('error', rejeter);
  });
}

/** Écriture atomique : fichier temporaire puis renommage (jamais de fichier à moitié écrit). */
async function ecrireAtomique(chemin: string, contenu: Uint8Array | string): Promise<void> {
  const temporaire = `${chemin}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporaire, contenu);
  await rename(temporaire, chemin);
}

export function adminImages(): Plugin {
  let racine = process.cwd();
  /** Heure de la dernière écriture du JSON par l'admin. */
  let derniereEcriture = 0;
  return {
    name: 'kirafuda-admin-images',
    apply: 'serve',
    configResolved(config) {
      racine = config.root;
    },
    // Une écriture faite par l'admin ne doit pas recharger les onglets ouverts (on perdrait la saisie en cours).
    // Le module reste invalidé : le jeu lit le nouveau JSON à son prochain rechargement.
    handleHotUpdate(ctx) {
      const dossierDonnees = path.join(racine, 'src', 'data');
      if (path.dirname(path.resolve(ctx.file)) === path.resolve(dossierDonnees) && Date.now() - derniereEcriture < 3000) return [];
      return undefined;
    },
    configureServer(server) {
      const dossierDonnees = path.join(racine, 'src', 'data');
      const nomSur = (f: string): string => {
        if (!/^[a-z0-9-]+\.json$/.test(f)) throw new ErreurHttp(500, `Nom de fichier refusé : « ${f} ».`);
        return f;
      };
      /**
       * Lancement, relu sur le disque à chaque requête : ses vagues (fichiers JSON) et leur assemblage.
       * Seuls les fichiers listés dans extensions.json sont lus ou écrits (jamais un chemin fourni par la requête).
       */
      const chargerLancement = async (): Promise<{ ext: ExtensionCatalogue; assemblee: Extension; fichierDeVague: Map<string, string>; textes: Map<string, string> }> => {
        const liste = JSON.parse(await readFile(path.join(dossierDonnees, 'extensions.json'), 'utf8')) as { extensions: EntreeExtension[] };
        const fichiers: Record<string, unknown> = {};
        const textes = new Map<string, string>();
        const fichierDeVague = new Map<string, string>();
        for (const e of liste.extensions) {
          fichiers[nomSur(e.booster)] = JSON.parse(await readFile(path.join(dossierDonnees, e.booster), 'utf8'));
          for (const v of e.vagues) {
            const texte = await readFile(path.join(dossierDonnees, nomSur(v.fichier)), 'utf8');
            textes.set(v.fichier, texte);
            fichiers[v.fichier] = JSON.parse(texte);
            fichierDeVague.set(v.id, v.fichier);
          }
        }
        const { catalogue, erreurs } = construireCatalogue(liste.extensions, fichiers);
        if (erreurs.length > 0 || !catalogue[0]) throw new ErreurHttp(500, erreurs.join(' ') || 'Aucune extension.');
        return { ext: catalogue[0], assemblee: assembler(catalogue[0]), fichierDeVague, textes };
      };
      const fichierPopularite = path.join(dossierDonnees, 'popularite.json');
      /** Écrit popularite.json (après une copie de l'ancien fichier dans sauvegardes-admin/) ; renvoie le chemin de la copie. */
      const ecrirePopularite = async (f: FichierPopularite): Promise<string> => {
        await mkdir(dossierSauvegardes, { recursive: true });
        const horodatage = new Date().toISOString().replace(/[:.]/g, '-');
        const copie = path.join(dossierSauvegardes, `popularite-${horodatage}.json`);
        await copyFile(fichierPopularite, copie);
        const contenu = { _note: 'Généré par l’admin (onglet Popularité) : ne pas modifier à la main. Popularité = base (popularite-base.json) + ajustement ; voir docs/GDD-resume.md, section Cote.', ...f };
        derniereEcriture = Date.now();
        await ecrireAtomique(fichierPopularite, `${JSON.stringify(contenu, null, 2)}\n`);
        return path.relative(racine, copie).split(path.sep).join('/');
      };
      /** Lit la base et la popularité publiée ; un ancien fichier est migré (base + 0) et réécrit, avec copie. */
      const lirePopularite = async (): Promise<{ fichier: FichierPopularite; base: BasePopularite; migre: boolean; sauvegarde?: string }> => {
        const base = JSON.parse(await readFile(path.join(dossierDonnees, 'popularite-base.json'), 'utf8')) as BasePopularite;
        const r = lireFichierPopularite(JSON.parse(await readFile(fichierPopularite, 'utf8')), base);
        if ('erreurs' in r) throw new ErreurHttp(500, r.erreurs.join(' '));
        if (!r.migre) return { fichier: r.fichier, base, migre: false };
        return { fichier: r.fichier, base, migre: true, sauvegarde: await ecrirePopularite(r.fichier) };
      };
      const dossierCartes = path.join(racine, 'public', 'cartes');
      const dossierSauvegardes = path.join(racine, 'sauvegardes-admin');
      /** Images (.webp) présentes dans le dossier de chaque carte de l'extension. */
      const listerFichiers = async (extension: Extension): Promise<Record<string, string[]>> => {
        const resultat: Record<string, string[]> = {};
        for (const carte of extension.cartes) {
          try {
            const noms = await readdir(path.join(dossierCartes, carte.id));
            const webp = noms.filter((n) => n.endsWith('.webp') || n.endsWith('.gif')).sort();
            if (webp.length) resultat[carte.id] = webp;
          } catch { /* pas encore de dossier pour cette carte */ }
        }
        return resultat;
      };

      server.middlewares.use(async (req, res, suite) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        if (!url.pathname.startsWith('/__admin/')) { suite(); return; }
        try {
          // Une page d'un autre site ne doit pas pouvoir écrire via le serveur local.
          const origine = req.headers.origin;
          if (origine && new URL(origine).host !== req.headers.host) throw new ErreurHttp(403, 'Origine refusée.');

          if (req.method === 'GET' && url.pathname === '/__admin/vagues') {
            const { ext, fichierDeVague } = await chargerLancement();
            repondre(res, 200, ext.vagues.map((v) => ({ id: v.id, nom: v.nom, disponibleLe: v.disponibleLe, fichier: fichierDeVague.get(v.id), cartes: v.donnees.cartes.length })));
            return;
          }

          if (req.method === 'GET' && url.pathname === '/__admin/extension') {
            repondre(res, 200, (await chargerLancement()).assemblee);
            return;
          }

          if (req.method === 'GET' && url.pathname === '/__admin/fichiers') {
            repondre(res, 200, await listerFichiers((await chargerLancement()).assemblee));
            return;
          }

          if (req.method === 'POST' && url.pathname === '/__admin/migrer-images') {
            const extension = (await chargerLancement()).assemblee;
            const plan = planMigrationImages(extension, await listerFichiers(extension));
            const copiees: string[] = [];
            for (const c of plan.copies) {
              const de = path.join(racine, 'public', ...c.de.split('/'));
              const vers = path.join(racine, 'public', ...c.vers.split('/'));
              if (!path.resolve(vers).startsWith(path.resolve(dossierCartes) + path.sep)) throw new ErreurHttp(400, 'Chemin refusé.');
              await mkdir(path.dirname(vers), { recursive: true });
              // COPYFILE_EXCL : ne jamais écraser une image déjà en place.
              try { await copyFile(de, vers, constants.COPYFILE_EXCL); copiees.push(`${c.de} → ${c.vers}`); }
              catch { plan.dejaPresentes.push(c.de); }
            }
            repondre(res, 200, { ok: true, copiees, dejaPresentes: plan.dejaPresentes, sansCarte: plan.sansCarte, calquesAbandonnes: plan.calquesAbandonnes });
            return;
          }

          if (req.method === 'POST' && url.pathname === '/__admin/image') {
            // Toutes les cartes de Lancement, toutes vagues : ren-001 est une carte connue.
            const extension = (await chargerLancement()).assemblee;
            const p = validerParametresImage({ carte: url.searchParams.get('carte'), calque: url.searchParams.get('calque') }, extension);
            if (!p.ok) throw new ErreurHttp(400, p.erreur);
            const octets = await lireCorps(req, TAILLE_MAX_IMAGE);
            if (!formatAttendu(p.calque, octets)) {
              throw new ErreurHttp(415, 'Le fichier reçu n’est pas une image WebP.');
            }
            const dossier = path.join(dossierCartes, p.carteId);
            const chemin = path.join(dossier, p.fichier);
            // Ceinture et bretelles : le chemin final doit rester dans public/cartes/.
            if (!path.resolve(chemin).startsWith(path.resolve(dossierCartes) + path.sep)) throw new ErreurHttp(400, 'Chemin refusé.');
            await mkdir(dossier, { recursive: true });
            await ecrireAtomique(chemin, octets);
            repondre(res, 200, { ok: true, chemin: `cartes/${p.carteId}/${p.fichier}`, octets: octets.length });
            return;
          }

          if (req.method === 'POST' && url.pathname === '/__admin/carte') {
            const corps = await lireCorps(req, TAILLE_MAX_JSON);
            let demande: unknown;
            try { demande = JSON.parse(new TextDecoder().decode(corps)); } catch { throw new ErreurHttp(400, 'JSON invalide.'); }
            // La fiche est enregistrée dans le fichier de la vague de la carte.
            const avant = await chargerLancement();
            const id = typeof demande === 'object' && demande !== null ? (demande as { id?: unknown }).id : undefined;
            const vague = avant.ext.vagues.find((v) => v.donnees.cartes.some((c) => c.id === id));
            if (!vague) throw new ErreurHttp(400, `Carte inconnue « ${String(id)} ».`);
            const nomFichier = avant.fichierDeVague.get(vague.id)!;
            const fichierExtension = path.join(dossierDonnees, nomFichier);
            const texte = avant.textes.get(nomFichier)!;
            const r = appliquerEdition(vague.donnees, demande);
            if (!r.ok) { repondre(res, 400, { ok: false, erreurs: r.erreurs }); return; }
            const nouveauTexte = serialiserExtension(r.extension);
            // La carte renvoyée porte le numéro affiché (assemblage des vagues) et sa vague.
            const carteAffichee = { ...r.carte, numero: avant.assemblee.cartes.find((c) => c.id === r.carte.id)!.numero, vague: vague.id };
            if (nouveauTexte === texte) { repondre(res, 200, { ok: true, carte: carteAffichee, personnage: r.personnage, inchange: true }); return; }
            // Copie de sauvegarde avant chaque écriture.
            await mkdir(dossierSauvegardes, { recursive: true });
            const horodatage = new Date().toISOString().replace(/[:.]/g, '-');
            const sauvegarde = path.join(dossierSauvegardes, `${nomFichier.replace(/\.json$/, '')}-${horodatage}.json`);
            await copyFile(fichierExtension, sauvegarde);
            derniereEcriture = Date.now();
            await ecrireAtomique(fichierExtension, nouveauTexte);
            repondre(res, 200, { ok: true, carte: carteAffichee, personnage: r.personnage, fichier: `src/data/${nomFichier}`, sauvegarde: path.relative(racine, sauvegarde).split(path.sep).join('/') });
            return;
          }

          if (url.pathname === '/__admin/popularite' && req.method === 'GET') {
            const { fichier, base, migre, sauvegarde } = await lirePopularite();
            const possible = publicationPossible(fichier, new Date());
            repondre(res, 200, { fichier, base, semaineAPublier: semaineAPublier(fichier, new Date()), possible: possible.ok ? null : possible.raison, migre, sauvegarde });
            return;
          }

          if (url.pathname === '/__admin/popularite/publier' && req.method === 'POST') {
            const corps = await lireCorps(req, TAILLE_MAX_JSON);
            let demande: { semaine?: unknown; coups?: unknown };
            try { demande = JSON.parse(new TextDecoder().decode(corps)); } catch { throw new ErreurHttp(400, 'JSON invalide.'); }
            const { fichier, base } = await lirePopularite();
            // Le serveur recalcule tout : seuls la semaine et les coups de pouce viennent de la page.
            const semaine = semaineAPublier(fichier, new Date());
            if (typeof demande.semaine !== 'string' || demande.semaine <= fichier.semaine) {
              throw new ErreurHttp(409, `La semaine ${String(demande.semaine)} est déjà publiée (dernière publiée : ${fichier.semaine}).`);
            }
            const possible = publicationPossible(fichier, new Date());
            if (!possible.ok) throw new ErreurHttp(409, possible.raison);
            if (demande.semaine !== semaine) throw new ErreurHttp(409, `Semaine à publier : ${semaine} (reçu : ${demande.semaine}). Recharge la page.`);
            const coups = validerCoups(demande.coups ?? [], base);
            if (coups.length > 0 && typeof coups[0] === 'string') throw new ErreurHttp(400, (coups as string[]).join(' '));
            const nouveau = calculerSemaine(base, fichier, coups as Exclude<typeof coups, string[]>, semaine);
            const sauvegarde = await ecrirePopularite(nouveau);
            repondre(res, 200, { ok: true, fichier: nouveau, sauvegarde });
            return;
          }

          throw new ErreurHttp(404, 'Route d’admin inconnue.');
        } catch (e) {
          if (e instanceof ErreurHttp) repondre(res, e.statut, { ok: false, erreurs: [e.message] });
          else repondre(res, 500, { ok: false, erreurs: [`Erreur du serveur : ${(e as Error).message}`] });
        }
      });
    },
  };
}
