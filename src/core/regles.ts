// Règles fixes du GDD : éléments, faiblesses, finitions, multiplicateurs de cote.
import type { Calque, ElementId, FinitionId, Rang } from './types';

/**
 * Éléments : nom, abréviation, couleur d'accent et icône.
 * `glyphe` : tracé SVG (attribut d) d'une icône au trait, dans une grille de 24 × 24.
 */
/**
 * Couleurs alignées sur les icônes (public/elements/<element>.webp) et sur tokens.css (--element-<id>) :
 * Feu rouge orangé, Eau bleu, Glace bleu ciel, Foudre jaune, Vent vert, Terre brun, Lumière ivoire doré,
 * Ténèbres violet, Neutre gris.
 */
export const ELEMENTS: Record<ElementId, { nom: string; abreviation: string; couleur: string; glyphe: string }> = {
  feu:      { nom: 'Feu',      abreviation: 'Fe', couleur: '#CE2F18', glyphe: 'M12 3c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5 .3 2 1.3 3 2.5 3.5C11.5 9 11 6 12 3z' },
  eau:      { nom: 'Eau',      abreviation: 'Ea', couleur: '#1764DA', glyphe: 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z' },
  glace:    { nom: 'Glace',    abreviation: 'Gl', couleur: '#2F9FDC', glyphe: 'M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9' },
  foudre:   { nom: 'Foudre',   abreviation: 'Fo', couleur: '#E8AB07', glyphe: 'M13 3L5 13h6l-1 8 8-10h-6l1-8z' },
  vent:     { nom: 'Vent',     abreviation: 'Ve', couleur: '#38A937', glyphe: 'M3 9h11a3 3 0 1 0-3-3M3 15h15a3 3 0 1 1-3 3M3 12h8' },
  terre:    { nom: 'Terre',    abreviation: 'Te', couleur: '#AA6327', glyphe: 'M3 19L9 8l4 6 3-4 5 9z' },
  lumiere:  { nom: 'Lumière',  abreviation: 'Lu', couleur: '#F2E3B2', glyphe: 'M12 7a5 5 0 1 0 0 10a5 5 0 1 0 0-10zM12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4' },
  tenebres: { nom: 'Ténèbres', abreviation: 'Té', couleur: '#722DA1', glyphe: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z' },
  neutre:   { nom: 'Neutre',   abreviation: 'Ne', couleur: '#828285', glyphe: 'M12 4a8 8 0 1 0 0 16a8 8 0 1 0 0-16z' },
};

/** Faiblesse de chaque élément (null = aucune). */
export const FAIBLESSE: Record<ElementId, ElementId | null> = {
  feu: 'eau', eau: 'foudre', foudre: 'terre', terre: 'vent', vent: 'glace', glace: 'feu',
  lumiere: 'tenebres', tenebres: 'lumiere', neutre: null,
};

export const FINITIONS: Record<FinitionId, { nom: string; symbole: string; pleineCarte: boolean; multiplicateurCote: number }> = {
  'commune':     { nom: 'Commune',                  symbole: '♦',    pleineCarte: false, multiplicateurCote: 1 },
  'peu-commune': { nom: 'Peu commune',              symbole: '♦♦',   pleineCarte: false, multiplicateurCote: 1.5 },
  'holo':        { nom: 'Rare holo',                symbole: '♦♦♦',  pleineCarte: false, multiplicateurCote: 3 },
  'holo-integrale': { nom: 'Holo intégrale',          symbole: '♦♦♦♦', pleineCarte: false, multiplicateurCote: 5 },
  'pleine':      { nom: 'Pleine illustration',      symbole: '★',    pleineCarte: true,  multiplicateurCote: 8 },
  'alternative': { nom: 'Illustration alternative', symbole: '★★',   pleineCarte: true,  multiplicateurCote: 15 },
  'immersive':   { nom: 'Immersive animée',         symbole: '★★★',  pleineCarte: true,  multiplicateurCote: 40 },
  'couronne':    { nom: 'Couronne',                 symbole: '♛',    pleineCarte: true,  multiplicateurCote: 100 },
};


/** Calques d'image selon la rareté : une illustration fixe pour toutes ; l'immersive peut avoir en plus une animation (WebP animé). */
export const CALQUES_PAR_FINITION: Record<FinitionId, Calque[]> = {
  'commune': ['illustration'], 'peu-commune': ['illustration'], 'holo': ['illustration'], 'holo-integrale': ['illustration'],
  'pleine': ['illustration'], 'alternative': ['illustration'], 'immersive': ['illustration', 'animation'], 'couronne': ['illustration'],
};

export const ORDRE_FINITIONS: FinitionId[] = ['commune', 'peu-commune', 'holo', 'holo-integrale', 'pleine', 'alternative', 'immersive', 'couronne'];
export const ORDRE_RANGS: Rang[] = ['C', 'B', 'A', 'S'];

/** Sceaux offerts au premier lancement de chaque journée. */
export const RECOMPENSE_QUOTIDIENNE = 2;
/** La récompense quotidienne ne fait pas dépasser ce stock (le draft et la revente le peuvent). */
export const PLAFOND_SCEAUX = 10;

/** Boutique de points : prix d'un exemplaire, en points de l'extension (GDD, « Économie »). */
export const PRIX_BOUTIQUE: Record<FinitionId, number> = {
  'commune': 35, 'peu-commune': 70, 'holo': 150, 'holo-integrale': 500, 'pleine': 400,
  'alternative': 1250, 'immersive': 1500, 'couronne': 2500,
};

/**
 * Revente d'un exemplaire en trop : 1 sceau par tranche entière de cette cote (arrondi inférieur).
 * Une cote inférieure ne se revend pas. Taux choisi pour que revendre tout un booster rapporte en
 * moyenne moins d'un demi-sceau, même si toutes les popularités étaient à 100 (test dans tests/cote.test.ts).
 */
export const COTE_PAR_SCEAU = 600;

/** Popularité : entier de 0 à 100. */
export const POPULARITE_MAX = 100;

/** Total exact attendu pour chaque table de poids. */
export const TOTAL_POIDS = 100_000;
