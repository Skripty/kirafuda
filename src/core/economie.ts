// Économie : récompense quotidienne de sceaux (GDD, « Économie »).
import { PLAFOND_SCEAUX, RECOMPENSE_QUOTIDIENNE } from './regles';
import type { Sauvegarde } from './types';

/** Jour local du joueur, au format AAAA-MM-JJ (la journée commence à minuit chez lui). */
export function jourLocal(date: Date): string {
  const p = (n: number): string => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

export interface ResultatRecompense {
  sauvegarde: Sauvegarde;
  /** false : déjà réclamée aujourd'hui (la sauvegarde renvoyée est l'originale). */
  nouvelleJournee: boolean;
  /** Sceaux réellement ajoutés (moins de 2 si le plafond est proche, 0 s'il est atteint). */
  sceauxGagnes: number;
}

/**
 * Premier lancement de la journée : +2 sceaux, sans dépasser 10 en stock.
 * La journée est marquée réclamée même au plafond (pas de rattrapage plus tard dans la journée).
 * Un jour antérieur au dernier jour réclamé (horloge reculée) ne donne rien.
 */
export function appliquerRecompenseQuotidienne(sauvegarde: Sauvegarde, aujourdhui: string): ResultatRecompense {
  const derniere = sauvegarde.derniereRecompenseQuotidienne;
  if (derniere !== null && aujourdhui <= derniere) {
    return { sauvegarde, nouvelleJournee: false, sceauxGagnes: 0 };
  }
  const sceauxGagnes = Math.max(0, Math.min(RECOMPENSE_QUOTIDIENNE, PLAFOND_SCEAUX - sauvegarde.sceaux));
  return {
    sauvegarde: { ...sauvegarde, sceaux: sauvegarde.sceaux + sceauxGagnes, derniereRecompenseQuotidienne: aujourdhui },
    nouvelleJournee: true,
    sceauxGagnes,
  };
}

/** Millisecondes avant la prochaine récompense quotidienne (minuit, heure locale du joueur). */
export function delaiAvantRecompense(maintenant: Date): number {
  const minuit = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate() + 1);
  return minuit.getTime() - maintenant.getTime();
}

/** Part de la journée locale écoulée, de 0 à 1 (barre de progression vers la prochaine récompense). */
export function progressionJournee(maintenant: Date): number {
  const debut = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate());
  const fin = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate() + 1);
  return (maintenant.getTime() - debut.getTime()) / (fin.getTime() - debut.getTime());
}

/** Sceaux que rapportera la prochaine récompense, compte tenu du plafond (0 si le stock est plein). */
export function prochaineRecompense(sceaux: number): number {
  return Math.max(0, Math.min(RECOMPENSE_QUOTIDIENNE, PLAFOND_SCEAUX - sceaux));
}

/** Durée lisible : « 7 h 12 », « 45 min ». */
export function formaterDelai(ms: number): string {
  const minutes = Math.max(0, Math.ceil(ms / 60_000));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`;
}
