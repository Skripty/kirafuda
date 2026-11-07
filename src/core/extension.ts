// Accès rapides aux données de l'extension : personnage d'une carte, carte de base, cartes par rareté.
// L'index est calculé une fois par objet Extension (cache), puis réutilisé (tirages, écrans).
import type { Carte, Extension, FinitionId, Personnage } from './types';

export interface IndexExtension {
  carte(id: string): Carte | undefined;
  personnage(id: string): Personnage | undefined;
  /** Personnage d'une carte (toujours présent dans des données validées). */
  personnageDe(carte: Carte): Personnage;
  /** Carte de base (non secrète) d'un personnage. */
  base(personnageId: string): Carte | undefined;
  /** Toutes les cartes d'un personnage, dans l'ordre des numéros. */
  cartesDe(personnageId: string): Carte[];
  /** Cartes d'une rareté, dans l'ordre des numéros. */
  parFinition(finition: FinitionId): Carte[];
  /** Toutes les cartes, dans l'ordre des numéros (base puis secrètes). */
  cartesTriees: Carte[];
}

const cache = new WeakMap<Extension, IndexExtension>();

export function indexer(extension: Extension): IndexExtension {
  const deja = cache.get(extension);
  if (deja) return deja;

  const cartesTriees = [...extension.cartes].sort((a, b) => a.numero - b.numero);
  const cartes = new Map(cartesTriees.map((c) => [c.id, c]));
  const personnages = new Map(extension.personnages.map((p) => [p.id, p]));
  const parPerso = new Map<string, Carte[]>();
  const parFinition = new Map<FinitionId, Carte[]>();
  for (const c of cartesTriees) {
    parPerso.set(c.personnage, [...(parPerso.get(c.personnage) ?? []), c]);
    parFinition.set(c.finition, [...(parFinition.get(c.finition) ?? []), c]);
  }

  const index: IndexExtension = {
    carte: (id) => cartes.get(id),
    personnage: (id) => personnages.get(id),
    personnageDe: (carte) => {
      const p = personnages.get(carte.personnage);
      if (!p) throw new Error(`Carte ${carte.id} : personnage inconnu « ${carte.personnage} ».`);
      return p;
    },
    base: (personnageId) => parPerso.get(personnageId)?.find((c) => !c.secrete),
    cartesDe: (personnageId) => parPerso.get(personnageId) ?? [],
    parFinition: (f) => parFinition.get(f) ?? [],
    cartesTriees,
  };
  cache.set(extension, index);
  return index;
}
