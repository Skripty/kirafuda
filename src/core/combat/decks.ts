// Decks générés automatiquement (simulation, tests) : un deck par série, avec ses personnages et des cartes Soutien.
import type { ElementId, Personnage } from '../types';
import { rngAGraine, type Rng } from '../rng';
import { ENERGIES } from './fiches';
import type { Bibliotheque, Deck } from './etat';
import { TAILLE_DECK } from './moteur';

/** Cartes Soutien ajoutées pour compléter un deck de série, dans cet ordre (2 exemplaires chacune). */
export const SOUTIENS_DE_COMPLEMENT = [
  'sou-entrainement-intensif', 'sou-onigiri', 'sou-parchemin-invocation', 'sou-mentor', 'sou-appel-renfort',
  'sou-talisman', 'sou-infirmerie', 'sou-reperage', 'sou-boussole', 'sou-kunai', 'sou-bandage', 'sou-antidote',
];

/** Les 1 à 3 éléments les plus demandés par les coûts des attaques (Neutre seul : l'élément le plus fréquent de la série). */
export function elementsDe(persos: Personnage[]): ElementId[] {
  const n = new Map<ElementId, number>();
  for (const p of persos) for (const a of p.attaques) for (const c of a.cout) { const e = ENERGIES[c]; if (e) n.set(e, (n.get(e) ?? 0) + 1); }
  const tries = [...n].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([e]) => e).slice(0, 3);
  if (tries.length) return tries;
  const parElement = persos.map((p) => p.element).filter((e) => e !== 'neutre');
  return [parElement[0] ?? 'feu'];
}

/**
 * Deck d'une série : chaque personnage en 2 exemplaires (Bases d'abord), complété par des cartes Soutien jusqu'à 20.
 * null si la série n'a aucun Base (un deck doit en avoir au moins un).
 */
export function deckDeSerie(serie: string, bib: Bibliotheque): Deck | null {
  const persos = [...bib.personnages.values()].filter((p) => p.serie === serie)
    .sort((a, b) => ((a.type === 'eveille') === (b.type === 'eveille') ? a.id.localeCompare(b.id) : a.type === 'eveille' ? 1 : -1));
  if (!persos.some((p) => p.type !== 'eveille')) return null;
  const cartes: string[] = [];
  for (const p of persos) for (let k = 0; k < 2 && cartes.length < TAILLE_DECK; k++) cartes.push(p.id);
  for (const s of SOUTIENS_DE_COMPLEMENT) for (let k = 0; k < 2 && cartes.length < TAILLE_DECK; k++) if (bib.soutiens.has(s)) cartes.push(s);
  return { nom: serie, cartes, elements: elementsDe(persos) };
}

/** Séries des personnages connus, dans l'ordre alphabétique. */
export const seriesDe = (bib: Bibliotheque): string[] => [...new Set([...bib.personnages.values()].map((p) => p.serie))].sort((a, b) => a.localeCompare(b, 'fr'));

// ---------- Decks standardisés (simulation d'équilibrage) ----------

/** 6 cartes Soutien identiques pour tous les decks standardisés. */
export const SOUTIENS_STANDARD = ['sou-entrainement-intensif', 'sou-entrainement-intensif', 'sou-parchemin-invocation', 'sou-parchemin-invocation', 'sou-onigiri', 'sou-appel-renfort'];
/** Personnages différents par deck standardisé (2 exemplaires chacun : 14 cartes). */
export const PERSONNAGES_STANDARD = 7;
/** Au moins autant de Bases (ou Héros) de la série dans un deck tiré (séries de plus de 7 personnages). */
const BASES_MIN = 3;

/** Mélange déterministe (Fisher-Yates). */
function melangerAvec<T>(rng: Rng, l: T[]): T[] {
  const r = [...l];
  for (let i = r.length - 1; i > 0; i--) { const j = rng.entier(i + 1); [r[i], r[j]] = [r[j]!, r[i]!]; }
  return r;
}

/**
 * Bases d'autres séries qui complètent une série de moins de 7 personnages : ils partagent un de ses éléments
 * (élément du personnage), et sont toujours les mêmes pour une série donnée (mélange à graine fixe par série).
 */
export function complementDe(serie: string, bib: Bibliotheque): Personnage[] {
  const persos = [...bib.personnages.values()].filter((p) => p.serie === serie);
  const manque = PERSONNAGES_STANDARD - persos.length;
  if (manque <= 0) return [];
  const elements = new Set(persos.map((p) => p.element));
  const candidats = [...bib.personnages.values()]
    .filter((p) => p.serie !== serie && p.type === 'base' && elements.has(p.element))
    .sort((a, b) => a.id.localeCompare(b.id));
  return melangerAvec(rngAGraine(`complement:${serie}`), candidats).slice(0, manque);
}

/**
 * Deck standardisé d'une série : 7 personnages différents en 2 exemplaires (14 cartes) + les 6 mêmes cartes Soutien.
 * - 7 personnages ou moins : tous, complétés par les Bases fixes de complementDe ;
 * - plus de 7 : 7 tirés avec `rng` (au moins 3 Bases de la série), pour que chaque personnage soit joué.
 * null si la série n'a aucun Base ni Héros à elle (ses Éveillés ne pourraient jamais entrer en jeu).
 */
export function deckStandard(serie: string, bib: Bibliotheque, rng: Rng): Deck | null {
  const persos = [...bib.personnages.values()].filter((p) => p.serie === serie).sort((a, b) => a.id.localeCompare(b.id));
  if (!persos.some((p) => p.type !== 'eveille')) return null;
  let choisis: Personnage[];
  if (persos.length <= PERSONNAGES_STANDARD) choisis = [...persos, ...complementDe(serie, bib)];
  else {
    const bases = melangerAvec(rng, persos.filter((p) => p.type !== 'eveille'));
    const obligatoires = bases.slice(0, BASES_MIN);
    const reste = melangerAvec(rng, persos.filter((p) => !obligatoires.includes(p)));
    choisis = [...obligatoires, ...reste.slice(0, PERSONNAGES_STANDARD - obligatoires.length)];
  }
  return {
    nom: serie,
    cartes: [...choisis.flatMap((p) => [p.id, p.id]), ...SOUTIENS_STANDARD],
    elements: elementsDe(choisis),
  };
}
