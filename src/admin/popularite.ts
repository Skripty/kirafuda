// Onglet « Popularité » de l'admin : coups de pouce de la semaine, aperçu, publication de popularite.json.
// Le calcul vient de src/core/popularite.ts ; à la publication, le plugin d'admin le refait côté serveur.
import {
  COUPS_AUTORISES, apercu, calculerSemaine, type Apercu, type BasePopularite, type CoupDePouce, type FichierPopularite,
  type LigneApercu, type ValeurCoup,
} from '../core/popularite';
import { lundiSemaineIso } from '../core/draft';

interface Donnees {
  fichier: FichierPopularite;
  base: BasePopularite;
  semaineAPublier: string;
  /** Raison si la semaine ne peut pas encore être publiée (déjà publiée, trop tôt), sinon null. */
  possible: string | null;
  migre: boolean;
  sauvegarde?: string;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, classe?: string, texte?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texte !== undefined) e.textContent = texte;
  return e;
}
const signe = (n: number): string => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0');
const fleche = (l: LigneApercu): string => (l.sens === 'hausse' ? '▲' : l.sens === 'baisse' ? '▼' : '=');
const dateLundi = (semaine: string): string =>
  lundiSemaineIso(semaine).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

/** Crée l'onglet ; les données sont chargées depuis le plugin d'admin. */
export function creerOngletPopularite(): HTMLElement {
  const racine = el('section', 'adm-pop');
  racine.setAttribute('aria-label', 'Popularité de la semaine');
  let d: Donnees | null = null;
  /** Coup de pouce par cible (« s:One Piece », « p:per-001 ») : une valeur par cible. */
  const coups = new Map<string, CoupDePouce>();
  let recherche = '';
  let vue: Apercu | null = null;
  let message: { texte: string; erreur: boolean } | null = null;
  let envoi = false;

  async function charger(): Promise<void> {
    try {
      const r = await fetch('/__admin/popularite');
      const corps = await r.json() as Donnees & { erreurs?: string[] };
      if (!r.ok) throw new Error(corps.erreurs?.join(' ') ?? `Erreur ${r.status}`);
      d = corps;
      if (corps.migre) message = { texte: `Ancien fichier popularite.json migré : semaine courante = base + 0 (copie : ${corps.sauvegarde}).`, erreur: false };
    } catch (e) {
      message = { texte: `Popularité indisponible : ${(e as Error).message}`, erreur: true };
    }
    rendre();
  }

  const cle = (c: CoupDePouce['cible']): string => (c.type === 'serie' ? `s:${c.serie}` : `p:${c.id}`);
  function basculer(cible: CoupDePouce['cible'], valeur: ValeurCoup): void {
    const k = cle(cible);
    if (coups.get(k)?.valeur === valeur) coups.delete(k);
    else coups.set(k, { cible, valeur });
    vue = null; // l'aperçu ne correspond plus
    message = null;
    rendre();
  }

  /** Boutons −5 / +5 / +10 / +15 d'une cible (le bouton actif est pressé ; un 2e clic l'enlève). */
  function boutons(cible: CoupDePouce['cible'], nom: string): HTMLElement {
    const g = el('div', 'adm-pop-coups');
    g.setAttribute('role', 'group');
    g.setAttribute('aria-label', `Coup de pouce : ${nom}`);
    const actif = coups.get(cle(cible))?.valeur;
    for (const v of COUPS_AUTORISES) {
      const b = el('button', v < 0 ? 'moins' : undefined, signe(v));
      b.type = 'button';
      b.setAttribute('aria-pressed', String(actif === v));
      b.setAttribute('aria-label', `${signe(v)} pour ${nom}`);
      b.addEventListener('click', () => basculer(cible, v));
      g.append(b);
    }
    return g;
  }

  function publier(avecCoups: boolean): void {
    if (!d || envoi) return;
    envoi = true;
    message = null;
    rendre();
    void (async () => {
      try {
        const r = await fetch('/__admin/popularite/publier', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ semaine: d!.semaineAPublier, coups: avecCoups ? [...coups.values()] : [] }),
        });
        const corps = await r.json() as { ok: boolean; erreurs?: string[]; sauvegarde?: string };
        if (!r.ok || !corps.ok) throw new Error(corps.erreurs?.join(' ') ?? `Erreur ${r.status}`);
        const publiee = d!.semaineAPublier;
        coups.clear();
        vue = null;
        await charger();
        message = { texte: `Semaine ${publiee} publiée dans src/data/popularite.json (copie de l’ancien fichier : ${corps.sauvegarde}). Recharge le jeu pour voir la nouvelle cote.`, erreur: false };
      } catch (e) {
        message = { texte: `Publication refusée : ${(e as Error).message}`, erreur: true };
      } finally {
        envoi = false;
        rendre();
      }
    })();
  }

  function blocLignes(titre: string, lignes: LigneApercu[]): HTMLElement {
    const b = el('div', 'adm-pop-bloc');
    b.append(el('h3', undefined, titre));
    if (lignes.length === 0) b.append(el('p', 'adm-aide', 'Aucune.'));
    const ul = el('ul');
    for (const l of lignes) {
      const li = el('li', `adm-pop-${l.sens}`);
      li.append(el('span', undefined, `${l.nom} · ${l.serie}`), el('strong', undefined, `${l.avant} → ${l.apres} ${fleche(l)} ${signe(l.variation)}`));
      ul.append(li);
    }
    b.append(ul);
    return b;
  }

  function rendre(): void {
    const enfants: HTMLElement[] = [];
    const msg = el('p', `adm-message${message?.erreur ? ' erreur' : ''}`, message?.texte ?? '');
    msg.setAttribute('role', 'status');
    if (!d) { racine.replaceChildren(el('h2', undefined, 'Popularité'), msg); return; }
    const data = d;

    // En-tête : semaine à publier
    const tete = el('div', 'adm-panneau');
    tete.append(
      el('h2', undefined, `Semaine à publier : ${data.semaineAPublier}`),
      el('p', 'adm-aide', `À partir du ${dateLundi(data.semaineAPublier)} · dernière publiée : ${data.fichier.semaine}. Sans coup de pouce, chaque ajustement perd 30 % (arrondi vers zéro) ; popularité = base + ajustement, de 1 à 100.`),
    );
    enfants.push(tete);

    // Séries
    const parSerie = new Map<string, number>();
    for (const p of Object.values(data.base.personnages)) parSerie.set(p.serie, (parSerie.get(p.serie) ?? 0) + 1);
    const series = el('div', 'adm-panneau');
    series.append(el('h2', undefined, 'Séries'), el('p', 'adm-aide', '+5 épisode ou chapitre marquant · +10 nouvelle saison, film, fin d’arc · +15 événement majeur · −5 série en pause depuis longtemps.'));
    const ul = el('ul', 'adm-pop-liste');
    for (const [serie, n] of [...parSerie].sort((a, b) => a[0].localeCompare(b[0], 'fr'))) {
      const li = el('li');
      li.append(el('span', undefined, `${serie} (${n})`), boutons({ type: 'serie', serie }, serie));
      ul.append(li);
    }
    series.append(ul);

    // Personnage : recherche
    const perso = el('div', 'adm-panneau');
    perso.append(el('h2', undefined, 'Un personnage'));
    const champ = el('input');
    champ.type = 'search';
    champ.placeholder = 'Rechercher un personnage ou une série';
    champ.value = recherche;
    champ.setAttribute('aria-label', 'Rechercher un personnage');
    champ.addEventListener('input', () => {
      recherche = champ.value;
      rendre();
      const nouveau = racine.querySelector<HTMLInputElement>('.adm-pop input[type=search]');
      nouveau?.focus();
      nouveau?.setSelectionRange(recherche.length, recherche.length);
    });
    perso.append(champ);
    const q = recherche.trim().toLowerCase();
    const trouves = q.length < 2 ? [] : Object.entries(data.base.personnages)
      .filter(([, p]) => `${p.nom} ${p.serie}`.toLowerCase().includes(q)).slice(0, 8);
    const ulP = el('ul', 'adm-pop-liste');
    for (const [id, p] of trouves) {
      const li = el('li');
      const actuelle = data.fichier.courante[id]?.popularite ?? p.base;
      li.append(el('span', undefined, `${p.nom} · ${p.serie} · ${actuelle}`), boutons({ type: 'personnage', id }, p.nom));
      ulP.append(li);
    }
    if (q.length >= 2 && trouves.length === 0) perso.append(el('p', 'adm-aide', 'Aucun personnage.'));
    perso.append(ulP);

    // Coups de pouce choisis, aperçu, publication
    const pub = el('div', 'adm-panneau');
    pub.append(el('h2', undefined, 'Publication'));
    const liste = [...coups.values()];
    pub.append(el('p', 'adm-aide', liste.length === 0
      ? 'Aucun coup de pouce : la semaine sera publiée « sans actualité ».'
      : `Coups de pouce : ${liste.map((c) => `${c.cible.type === 'serie' ? c.cible.serie : data.base.personnages[c.cible.id]!.nom} ${signe(c.valeur)}`).join(' · ')}`));
    const actions = el('div', 'adm-pop-actions');
    const bApercu = el('button', undefined, 'Aperçu');
    bApercu.type = 'button';
    bApercu.addEventListener('click', () => {
      vue = apercu(data.fichier, calculerSemaine(data.base, data.fichier, liste, data.semaineAPublier), data.base);
      message = null;
      rendre();
    });
    const bPublier = el('button', 'adm-principal', envoi ? 'Publication…' : 'Publier la semaine');
    bPublier.type = 'button';
    bPublier.disabled = !vue || envoi || data.possible !== null;
    if (!vue) bPublier.title = 'Affiche d’abord l’aperçu.';
    bPublier.addEventListener('click', () => publier(true));
    const bSans = el('button', undefined, 'Publier sans actualité');
    bSans.type = 'button';
    bSans.disabled = envoi || data.possible !== null;
    bSans.addEventListener('click', () => publier(false));
    actions.append(bApercu, bPublier, bSans);
    pub.append(actions);
    if (data.possible) pub.append(el('p', 'adm-message', data.possible));
    pub.append(msg);

    if (vue) {
      const changes = vue.lignes.filter((l) => l.variation !== 0).length;
      const blocs = el('div', 'adm-pop-apercu');
      blocs.append(blocLignes('Plus fortes hausses', vue.hausses), blocLignes('Plus fortes baisses', vue.baisses));
      const tout = el('details', 'adm-pop-tout');
      tout.append(el('summary', undefined, `Tous les personnages (${changes} changent sur ${vue.lignes.length})`));
      const table = el('table');
      const entete = el('tr');
      for (const t of ['Personnage', 'Série', 'Avant', 'Après', '']) entete.append(el('th', undefined, t));
      table.append(entete);
      for (const l of [...vue.lignes].sort((a, b) => b.variation - a.variation || a.nom.localeCompare(b.nom, 'fr'))) {
        const tr = el('tr', `adm-pop-${l.sens}`);
        for (const t of [l.nom, l.serie, String(l.avant), String(l.apres), `${fleche(l)} ${signe(l.variation)}`]) tr.append(el('td', undefined, t));
        table.append(tr);
      }
      tout.append(table);
      pub.append(el('h3', undefined, `Aperçu de la semaine ${vue.semaine}`), blocs, tout);
    }

    const grille = el('div', 'adm-pop-grille');
    const gauche = el('div', 'adm-pop-colonne');
    gauche.append(series);
    const droite = el('div', 'adm-pop-colonne');
    droite.append(perso, pub);
    grille.append(gauche, droite);
    racine.replaceChildren(...enfants, grille);
  }

  rendre();
  void charger();
  return racine;
}
