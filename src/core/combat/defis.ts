import type { Deck } from './etat';

/** Défis proposés par l'écran Combat (tâche 27), dans l'ordre demandé par le GDD. */
export interface DefiCombat {
  id: string;
  nom: string;
  serie: string;
}

export const DEFIS_COMBAT: readonly DefiCombat[] = [
  { id: 'jujutsu-kaisen', nom: 'Jujutsu Kaisen', serie: 'Jujutsu Kaisen' },
  { id: 'one-piece', nom: 'One Piece', serie: 'One Piece' },
  { id: 'demon-slayer', nom: 'Demon Slayer', serie: 'Demon Slayer' },
  { id: 'solo-leveling', nom: 'Solo Leveling', serie: 'Solo Leveling' },
  { id: 'attaque-des-titans', nom: "L'Attaque des Titans", serie: "L'Attaque des Titans" },
  { id: 'chainsaw-man', nom: 'Chainsaw Man', serie: 'Chainsaw Man' },
];

/** Les 6 cartes Soutien des decks de départ (les mêmes que les decks standardisés de la simulation). */
const SOUTIENS_DEPART = ['sou-entrainement-intensif', 'sou-entrainement-intensif', 'sou-parchemin-invocation', 'sou-parchemin-invocation', 'sou-onigiri', 'sou-appel-renfort'];
const deux = (ids: string[]): string[] => ids.flatMap((id) => [id, id]);

/**
 * Decks de départ (tâche 28), jouables par tous sans posséder les cartes. Figés après simulation
 * (npm run simuler -- decks-depart) : environ 50 % l'un contre l'autre et 47 % en moyenne contre les défis.
 */
export const DECKS_DEPART: readonly (Deck & { id: string })[] = [
  {
    id: 'the-boxer',
    nom: 'Deck de départ · The Boxer',
    // Yu (Héros), K, Aaron Tide, J, Jean-Pierre Manuel, Ryu Baeksan, Viktor Grigoryevich.
    cartes: [...deux(['per-094', 'per-095', 'per-096', 'per-097', 'per-098', 'per-099', 'per-100']), ...SOUTIENS_DEPART],
    elements: ['glace'],
  },
  {
    id: 'spy-x-family',
    nom: 'Deck de départ · Spy x Family',
    // Anya, Loid, Yor, Bond, Franky, avec Fern (Frieren) et Kim Dokja (Omniscient Reader's Viewpoint).
    cartes: [...deux(['ren-per-005', 'ren-per-009', 'ren-per-010', 'ren-per-021', 'ren-per-022', 'per-050', 'per-075']), ...SOUTIENS_DEPART],
    elements: ['vent', 'glace'],
  },
];
