// Decks générés automatiquement (simulation, tests) : un deck par série, avec ses personnages et des cartes Soutien.
import type { ElementId, Personnage } from '../types';
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
    .sort((a, b) => (a.type === b.type ? a.id.localeCompare(b.id) : a.type === 'base' ? -1 : 1));
  if (!persos.some((p) => p.type === 'base')) return null;
  const cartes: string[] = [];
  for (const p of persos) for (let k = 0; k < 2 && cartes.length < TAILLE_DECK; k++) cartes.push(p.id);
  for (const s of SOUTIENS_DE_COMPLEMENT) for (let k = 0; k < 2 && cartes.length < TAILLE_DECK; k++) if (bib.soutiens.has(s)) cartes.push(s);
  return { nom: serie, cartes, elements: elementsDe(persos) };
}

/** Séries des personnages connus, dans l'ordre alphabétique. */
export const seriesDe = (bib: Bibliotheque): string[] => [...new Set([...bib.personnages.values()].map((p) => p.serie))].sort((a, b) => a.localeCompare(b, 'fr'));
