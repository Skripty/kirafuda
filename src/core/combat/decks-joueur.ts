import type { Deck, Bibliotheque } from './etat';
import type { DeckEnregistre, ElementId, Extension, Personnage, Sauvegarde } from '../types';
import { elementsDe } from './decks';
import { validerDeck } from './moteur';

export const MAX_DECKS_JOUEUR = 10;

/** Exemplaires disponibles par personnage : les raretés d'un même personnage partagent la limite de deck. */
export function exemplairesParPersonnage(sauvegarde: Sauvegarde, extensions: Extension[]): Map<string, number> {
  const cartes = new Map(extensions.flatMap((extension) => extension.cartes.map((carte) => [carte.id, carte.personnage] as const)));
  const compte = new Map<string, number>();
  for (const [carteId, nombre] of Object.entries(sauvegarde.collection)) {
    const personnage = cartes.get(carteId);
    if (personnage && nombre > 0) compte.set(personnage, (compte.get(personnage) ?? 0) + nombre);
  }
  return compte;
}

/** Eléments d'énergie les plus utiles pour les attaques des personnages du deck. */
export function suggererElements(cartes: string[], bibliotheque: Bibliotheque): ElementId[] {
  const personnages = cartes.map((id) => bibliotheque.personnages.get(id)).filter((p): p is Personnage => !!p);
  return elementsDe(personnages);
}

/** Règles de deck et possession vérifiées à chaque changement du constructeur. */
export function validerDeckPossede(deck: Deck, bibliotheque: Bibliotheque, possedees: ReadonlySet<string>): string[] {
  const erreurs = validerDeck(deck, bibliotheque);
  for (const id of new Set(deck.cartes)) {
    if (!possedees.has(id)) erreurs.push(`La carte « ${bibliotheque.personnages.get(id)?.nom ?? bibliotheque.soutiens.get(id)?.nom ?? id} » n'est pas possédée.`);
  }
  return erreurs;
}

export function deckEnregistreVersDeck(deck: DeckEnregistre): Deck {
  return { nom: deck.nom, cartes: [...deck.cartes], elements: [...deck.elements] };
}
