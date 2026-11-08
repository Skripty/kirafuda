// Icônes des 9 éléments (public/elements/<element>.webp : rondes, fond transparent, 256 px).
// Une seule adresse par élément : le navigateur la charge une fois pour toutes les cartes.
import { ELEMENTS } from '../core/regles';
import type { ElementId } from '../core/types';

export const srcElement = (id: ElementId): string => `${import.meta.env.BASE_URL}elements/${id}.webp`;

/**
 * Image de l'élément. `alt` : texte alternatif (le nom de l'élément, éventuellement précédé d'un contexte) ;
 * null pour une icône décorative dont le sens est déjà donné à côté (ex. « Coût 2 »).
 */
export function iconeElement(id: ElementId, classe: string, alt: string | null = ELEMENTS[id].nom): HTMLImageElement {
  const img = document.createElement('img');
  img.className = classe;
  img.src = srcElement(id);
  img.width = 256;
  img.height = 256;
  img.decoding = 'async';
  img.draggable = false;
  img.alt = alt ?? '';
  if (alt === null) img.setAttribute('aria-hidden', 'true');
  else img.title = ELEMENTS[id].nom;
  return img;
}
