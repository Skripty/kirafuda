// Boutique de points et revente de doublons (GDD, « Économie »).
// Règle 6 : chaque opération renvoie une nouvelle sauvegarde complète, ou rien ne change.
// La confirmation est demandée par l'interface avant d'appeler ces fonctions.
import { PRIX_BOUTIQUE } from './regles';
import { coteExemplaire, sceauxPourCote } from './cote';
import { indexer } from './extension';
import type { Carte, Extension, FinitionId, Personnage, Popularite, Sauvegarde } from './types';

// ---------- Boutique de points ----------

export type ResultatAchat =
  | { ok: true; sauvegarde: Sauvegarde; prix: number; soldeApres: number }
  | { ok: false; raison: 'carte-inconnue' }
  | { ok: false; raison: 'points-insuffisants'; manque: number };

/** Prix d'une carte : celui de sa rareté. */
export const prixAchat = (finition: FinitionId): number => PRIX_BOUTIQUE[finition];
export const soldePoints = (s: Sauvegarde, extension: Extension): number => s.points[extension.id] ?? 0;

/** Échange des points de l'extension contre un exemplaire d'une carte, au prix de sa rareté. */
export function acheter(s: Sauvegarde, extension: Extension, carteId: string): ResultatAchat {
  const index = indexer(extension);
  const carte = index.carte(carteId) ?? index.soutien(carteId);
  if (!carte) return { ok: false, raison: 'carte-inconnue' };
  const prix = prixAchat(carte.finition);
  const solde = soldePoints(s, extension);
  if (solde < prix) return { ok: false, raison: 'points-insuffisants', manque: prix - solde };
  const soldeApres = solde - prix;
  return {
    ok: true,
    prix,
    soldeApres,
    sauvegarde: {
      ...s,
      points: { ...s.points, [extension.id]: soldeApres },
      collection: { ...s.collection, [carteId]: (s.collection[carteId] ?? 0) + 1 },
    },
  };
}

// ---------- Revente de doublons ----------

/** Sceaux rapportés par un exemplaire en trop, selon sa cote de la semaine (0 : ne se revend pas). */
export function prixRevente(p: Popularite, carte: Carte): number {
  return sceauxPourCote(coteExemplaire(p.courante[carte.personnage] ?? 0, carte.finition));
}

export interface Doublon {
  carte: Carte;
  personnage: Personnage;
  exemplaires: number;
  /** Exemplaires en trop : tous sauf le dernier, qui n'est jamais revendu. */
  enTrop: number;
  cote: number;
  prixUnitaire: number;
}

/** Doublons revendables (au moins 2 exemplaires, cote suffisante pour 1 sceau), dans l'ordre des numéros. */
export function doublonsRevendables(s: Sauvegarde, extension: Extension, p: Popularite): Doublon[] {
  const index = indexer(extension);
  const resultat: Doublon[] = [];
  for (const carte of index.cartesTriees) {
    const exemplaires = s.collection[carte.id] ?? 0;
    if (exemplaires < 2) continue;
    const cote = coteExemplaire(p.courante[carte.personnage] ?? 0, carte.finition);
    const prixUnitaire = sceauxPourCote(cote);
    if (prixUnitaire > 0) resultat.push({ carte, personnage: index.personnageDe(carte), exemplaires, enTrop: exemplaires - 1, cote, prixUnitaire });
  }
  return resultat;
}

export type ResultatRevente =
  | { ok: true; sauvegarde: Sauvegarde; sceauxGagnes: number; restants: number }
  | { ok: false; raison: 'carte-inconnue' | 'non-revendable' | 'pas-de-doublon' | 'quantite-invalide' };

/** Revend `quantite` exemplaires en trop d'une carte, au prix de sa cote. Le dernier exemplaire n'est jamais revendu. */
export function revendre(s: Sauvegarde, p: Popularite, extension: Extension, carteId: string, quantite = 1): ResultatRevente {
  const carte = indexer(extension).carte(carteId);
  if (!carte) return { ok: false, raison: 'carte-inconnue' };
  const prix = prixRevente(p, carte);
  if (prix <= 0) return { ok: false, raison: 'non-revendable' };
  if (!Number.isInteger(quantite) || quantite < 1) return { ok: false, raison: 'quantite-invalide' };
  const exemplaires = s.collection[carteId] ?? 0;
  if (exemplaires < 2) return { ok: false, raison: 'pas-de-doublon' };
  if (quantite > exemplaires - 1) return { ok: false, raison: 'quantite-invalide' };
  const restants = exemplaires - quantite;
  const sceauxGagnes = quantite * prix;
  return {
    ok: true,
    sceauxGagnes,
    restants,
    sauvegarde: { ...s, sceaux: s.sceaux + sceauxGagnes, collection: { ...s.collection, [carteId]: restants } },
  };
}
