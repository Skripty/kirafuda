// Choix des images d'une carte, avec la règle de repli (AGENTS.md, règle 7 : une carte n'est jamais vide).
// Une illustration fixe par carte : public/cartes/<id-carte>/illustration.webp.
// L'immersive peut avoir en plus une animation en WebP animé (animation.webp), affichée en priorité,
// sauf en mode animations réduites (une image animée ne peut pas être mise en pause) : on montre alors l'image fixe.
// Repli : une carte secrète sans image reprend l'image de la carte de base du même personnage,
// puis l'interface affiche un visuel de remplacement.
// Logique pure : renvoie la liste ordonnée des fichiers à essayer.
import { CALQUES_PAR_FINITION } from './regles';
import type { Cadrage, Calque, Carte, FinitionId } from './types';

export type { Calque };

export const CADRAGE_DEFAUT: Readonly<Cadrage> = { zoom: 100, x: 50, y: 50 };

export interface CandidatImage {
  /** Chemin relatif au dossier public, ex. « cartes/lan-041/illustration.webp ». */
  src: string;
  cadrage: Cadrage;
  /** « carte » : image propre ; « base » : reprise de la carte de base du personnage. */
  origine: 'carte' | 'base';
}

export const calquesDeLaFinition = (finition: FinitionId): Calque[] => CALQUES_PAR_FINITION[finition];

/** Extension de fichier d'un calque : WebP pour tous (l'animation est un WebP animé, converti depuis un GIF par l'admin ou npm run images). */
export const extensionCalque = (_calque: Calque): 'webp' => 'webp';

/** Chemin public d'un calque d'une carte. */
export const cheminImage = (carteId: string, calque: Calque): string => `cartes/${carteId}/${calque}.${extensionCalque(calque)}`;

const cadrageDe = (carte: Carte, calque: Calque): Cadrage => ({ ...CADRAGE_DEFAUT, ...carte.images[calque] });

/**
 * Images à essayer, dans l'ordre, pour un calque d'une carte.
 * `base` : carte de base du même personnage (utilisée seulement pour une carte secrète).
 * Liste vide : calque sans objet pour cette rareté.
 */
export function candidatsImage(carte: Carte, calque: Calque, base?: Carte): CandidatImage[] {
  if (!calquesDeLaFinition(carte.finition).includes(calque)) return [];
  const liste: CandidatImage[] = [{ src: cheminImage(carte.id, calque), cadrage: cadrageDe(carte, calque), origine: 'carte' }];
  if (carte.secrete && base && base.id !== carte.id) {
    liste.push({ src: cheminImage(base.id, 'illustration'), cadrage: cadrageDe(base, 'illustration'), origine: 'base' });
  }
  return liste;
}

/**
 * Images à essayer, dans l'ordre, pour afficher une carte :
 * animation (immersive, si les animations ne sont pas réduites), puis illustration fixe,
 * puis l'illustration de la carte de base (carte secrète).
 */
export function candidatsAffichage(carte: Carte, base: Carte | undefined, animationsReduites: boolean): CandidatImage[] {
  const animation = animationsReduites ? [] : candidatsImage(carte, 'animation').slice(0, 1);
  return [...animation, ...candidatsImage(carte, 'illustration', base)];
}
