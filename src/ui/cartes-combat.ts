// Visuel d'une carte de deck ou de combat, par son id de jeu : un personnage (« per-001 ») est montré par sa carte
// de base, une carte Soutien (« sou-onigiri ») par sa propre mise en page. Sert aux écrans Decks et Combat.
import type { Bibliotheque } from '../core/combat/etat';
import type { Carte, CarteSoutien, Extension } from '../core/types';
import { creerCarte } from './carte';
import { creerCarteSoutien } from './carte-soutien';

export interface VisuelsCombat {
  /** La carte, à la largeur donnée par --carte-largeur (100 % de son conteneur par défaut). */
  visuel(id: string, interactive?: boolean): HTMLElement;
  /** Nom affiché de la carte. */
  nom(id: string): string;
}

export function creerVisuelsCombat(bib: Bibliotheque, extensions: Extension[]): VisuelsCombat {
  const personnages = new Map<string, { carte: Carte; extension: Extension }>();
  const soutiens = new Map<string, { soutien: CarteSoutien; extension: Extension }>();
  for (const extension of extensions) {
    // La carte de base du personnage (jamais une version secrète : la rareté ne change rien au combat).
    for (const carte of extension.cartes) if (!carte.secrete && !personnages.has(carte.personnage)) personnages.set(carte.personnage, { carte, extension });
    for (const carte of extension.cartes) if (!personnages.has(carte.personnage)) personnages.set(carte.personnage, { carte, extension });
    for (const soutien of extension.soutiens ?? []) soutiens.set(soutien.id, { soutien, extension });
  }
  const nom = (id: string): string => bib.personnages.get(id)?.nom ?? bib.soutiens.get(id)?.nom ?? 'Carte';
  return {
    nom,
    visuel(id, interactive = false) {
      const p = personnages.get(id);
      const s = p ? undefined : soutiens.get(id);
      const visuel = p ? creerCarte(p.carte, p.extension, { interactive })
        : s ? creerCarteSoutien(s.soutien, s.extension, { interactive })
          : null;
      if (visuel) { visuel.style.setProperty('--carte-largeur', '100%'); return visuel; }
      // Une carte n'est jamais vide (règle 7) : à défaut de visuel, son nom.
      const secours = document.createElement('div');
      secours.className = 'carte-secours';
      secours.textContent = nom(id);
      return secours;
    },
  };
}
