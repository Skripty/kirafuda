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

/** Avant la tâche 28, tous les défis se jouent avec le même deck imposé, sans vérification de collection. */
export const SERIE_DECK_DEPART = 'Jujutsu Kaisen';
