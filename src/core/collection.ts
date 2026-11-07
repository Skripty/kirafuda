// Collection : ce que possède le joueur, calculé uniquement à partir de la sauvegarde.
// Une entrée par carte de l'extension (140) : les 100 cartes de base puis les secrètes.
import { indexer } from './extension';
import { FINITIONS, ORDRE_FINITIONS } from './regles';
import type { Carte, ElementId, Extension, FinitionId, Personnage, Sauvegarde } from './types';

export interface EntreeCollection {
  carte: Carte;
  personnage: Personnage;
  /** Exemplaires possédés de cette carte. */
  exemplaires: number;
}

/** Une entrée par carte, dans l'ordre des numéros (base puis secrètes). */
export function entreesCollection(sauvegarde: Sauvegarde, extension: Extension): EntreeCollection[] {
  const index = indexer(extension);
  return index.cartesTriees.map((carte) => ({
    carte,
    personnage: index.personnageDe(carte),
    exemplaires: sauvegarde.collection[carte.id] ?? 0,
  }));
}

export const estPossedee = (e: EntreeCollection): boolean => e.exemplaires > 0;

export interface Completion {
  /** Cartes possédées (toutes). */
  possedees: number;
  total: number;
  /** Cartes de base possédées, sur le nombre de cartes de base. */
  base: { possedees: number; total: number };
  /** Cartes secrètes possédées. */
  secretes: { possedees: number; total: number };
}

export function completion(entrees: EntreeCollection[]): Completion {
  const compter = (liste: EntreeCollection[]) => ({ possedees: liste.filter(estPossedee).length, total: liste.length });
  const base = compter(entrees.filter((e) => !e.carte.secrete));
  const secretes = compter(entrees.filter((e) => e.carte.secrete));
  return { possedees: base.possedees + secretes.possedees, total: entrees.length, base, secretes };
}

export interface Filtres {
  serie: string | null;
  element: ElementId | null;
  /** Rareté de la carte. */
  finition: FinitionId | null;
  /** null : toutes ; « possedees » ; « manquantes ». */
  possession: 'possedees' | 'manquantes' | null;
}

export const FILTRES_VIDES: Filtres = { serie: null, element: null, finition: null, possession: null };

export function filtrer(entrees: EntreeCollection[], f: Filtres): EntreeCollection[] {
  return entrees.filter((e) =>
    (f.serie === null || e.personnage.serie === f.serie)
    && (f.element === null || e.personnage.element === f.element)
    && (f.finition === null || e.carte.finition === f.finition)
    && (f.possession === null || (f.possession === 'possedees') === estPossedee(e)));
}

/** Séries de l'extension, triées par ordre alphabétique. */
export function series(extension: Extension): string[] {
  return [...new Set(extension.personnages.map((p) => p.serie))].sort((a, b) => a.localeCompare(b, 'fr'));
}

/** Autres cartes du même personnage (versions), dans l'ordre des numéros. */
export function versions(entree: EntreeCollection, entrees: EntreeCollection[]): EntreeCollection[] {
  return entrees.filter((e) => e.personnage.id === entree.personnage.id);
}

export interface LigneRarete {
  /** Symbole écrit (♦, ♦♦…, « ★ et + ») : la rareté n'est jamais indiquée par la seule couleur. */
  libelle: string;
  nom: string;
  possedees: number;
  total: number;
}

/**
 * Complétion par rareté : une ligne par rareté de base (♦ à ♦♦♦♦), puis les raretés ★ et plus regroupées.
 * Les raretés sans aucune carte dans l'extension sont omises.
 */
export function completionParRarete(entrees: EntreeCollection[]): LigneRarete[] {
  const lignes: LigneRarete[] = [];
  const compter = (liste: EntreeCollection[]) => ({ possedees: liste.filter(estPossedee).length, total: liste.length });
  for (const f of ORDRE_FINITIONS.filter((x) => !FINITIONS[x].pleineCarte)) {
    const c = compter(entrees.filter((e) => e.carte.finition === f));
    if (c.total > 0) lignes.push({ libelle: FINITIONS[f].symbole, nom: FINITIONS[f].nom, ...c });
  }
  const etoiles = compter(entrees.filter((e) => FINITIONS[e.carte.finition].pleineCarte));
  if (etoiles.total > 0) lignes.push({ libelle: '★ et +', nom: 'Pleine illustration et plus', ...etoiles });
  return lignes;
}
