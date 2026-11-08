// Empreinte des fonctions serveur : calculée sur les seuls fichiers regroupés dans chaque fonction (code de
// src/core utilisé, données du draft), tels que relevés par le build. Elle est écrite, avec la liste de ces
// fichiers, en tête de chaque fichier déployable : un test vérifie que rien n'a changé depuis la génération.
// Modifier un fichier qui n'entre pas dans les fonctions (popularite.json, l'interface…) n'oblige pas à redéployer.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

export const FONCTIONS = ['soumettre-draft', 'reclamer-draft'] as const;

/**
 * Fichiers de données dont les fonctions n'utilisent qu'une partie : seule cette partie compte.
 * - quetes.json : les récompenses du classement (les autres quêtes ne concernent pas les fonctions) ;
 * - extension-*.json : les personnages (nom, série, rang, élément, PV, attaques) et la liste des cartes avec leur
 *   rareté. Les réglages d'images (fichiers, cadrage, zoom, position, faits dans l'admin) ne servent pas au draft.
 */
export const PARTIES_UTILISEES: [RegExp, (donnees: any) => unknown][] = [
  [/^src\/data\/quetes\.json$/, (q) => q.hebdomadaire?.recompensesDraft ?? null],
  [/^src\/data\/extension-[^/]+\.json$/, (e) => ({
    id: e.id, total: e.total, totalAvecSecretes: e.totalAvecSecretes,
    // Sans les effets structurés du combat (le draft ne les lit pas) : rééquilibrer le combat n'oblige pas à redéployer.
    personnages: Array.isArray(e.personnages) ? e.personnages.map(({ talent, attaques, ...p }: any) => ({
      ...p,
      talent: talent ? { nom: talent.nom, texte: talent.texte } : talent,
      attaques: Array.isArray(attaques) ? attaques.map(({ effets: _effets, ...a }: any) => a) : attaques,
    })) : e.personnages,
    cartes: Array.isArray(e.cartes)
      ? e.cartes.map((c: any) => ({ id: c.id, numero: c.numero, personnage: c.personnage, finition: c.finition, secrete: c.secrete }))
      : e.cartes,
  })],
];

/** Empreinte d'une liste de fichiers (chemins relatifs à la racine, avec « / »), fins de ligne normalisées. */
export function empreinteDe(racine: string, sources: string[]): string {
  const hash = createHash('sha256');
  for (const s of [...sources].sort()) {
    const texte = readFileSync(path.join(racine, s), 'utf8').replace(/\r\n/g, '\n');
    const partie = PARTIES_UTILISEES.find(([motif]) => motif.test(s))?.[1];
    hash.update(s).update('\0').update(partie ? JSON.stringify(partie(JSON.parse(texte))) : texte).update('\0');
  }
  return hash.digest('hex').slice(0, 16);
}

export const enTete = (nom: string, empreinte: string, sources: string[]): string =>
  `// Fonction Supabase « ${nom} » — FICHIER GÉNÉRÉ par \`npm run fonctions\`, ne pas modifier à la main.\n`
  + `// Empreinte des sources : ${empreinte}\n`
  + `// Sources : ${[...sources].sort().join(', ')}\n`;

/** Empreinte et sources écrites en tête d'un fichier généré (null si l'en-tête est absent). */
export function lireEnTete(texte: string): { empreinte: string; sources: string[] } | null {
  const e = /^\/\/ Empreinte des sources : ([0-9a-f]+)$/m.exec(texte);
  const s = /^\/\/ Sources : (.+)$/m.exec(texte);
  return e && s ? { empreinte: e[1]!, sources: s[1]!.split(', ') } : null;
}

/** Le fichier généré est-il à jour (mêmes sources, même contenu) ? Renvoie la raison sinon. */
export function verifierFonction(racine: string, texte: string): string | null {
  const t = lireEnTete(texte);
  if (!t) return 'en-tête absent';
  let actuelle: string;
  try { actuelle = empreinteDe(racine, t.sources); } catch { return 'un fichier source a disparu'; }
  return actuelle === t.empreinte ? null : 'une source a changé';
}
