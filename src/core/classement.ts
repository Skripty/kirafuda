// Classement hebdomadaire du draft (tâche 24). Logique pure, partagée par le jeu et par les fonctions serveur
// (supabase/fonctions) : le serveur recalcule le draft de la semaine et le score avec exactement ce code.
// Semaine du classement : du lundi 00:00 au dimanche 23:59 (heure de Paris). Après, la semaine est fermée.
import { CARTES_A_GARDER, equipeChoisie, genererDraft, lundiSemaineIso, semaineIso, semaineSuivante, scorer, type LigneScore, type SourcesDraft, type Theme } from './draft';
import { fusionner } from './catalogue';

// ---------- Heure de Paris ----------

const HEURE = 3_600_000;

/** Dimanche de la dernière semaine d'un mois (mois 0 à 11), à 01:00 UTC : instant du changement d'heure européen. */
function changementHeure(annee: number, mois: number): number {
  const dernierJour = new Date(Date.UTC(annee, mois + 1, 0));
  const dimanche = dernierJour.getUTCDate() - dernierJour.getUTCDay();
  return Date.UTC(annee, mois, dimanche, 1);
}

/**
 * Décalage de l'heure de Paris sur le temps universel (en ms) : +2 h du dernier dimanche de mars (01:00 UTC)
 * au dernier dimanche d'octobre (01:00 UTC), +1 h sinon. Règle de l'Union européenne, sans dépendre du navigateur.
 */
export function decalageParis(date: Date): number {
  const t = date.getTime();
  const annee = date.getUTCFullYear();
  return t >= changementHeure(annee, 2) && t < changementHeure(annee, 9) ? 2 * HEURE : HEURE;
}

/** Date dont les champs UTC donnent l'heure de Paris (pour lire le jour et la semaine à Paris). */
export const heureDeParis = (date: Date): Date => new Date(date.getTime() + decalageParis(date));

/** Semaine du draft et du classement (« 2026-S46 »), selon le calendrier de Paris. */
export const semaineDraft = (date: Date): string => semaineIso(heureDeParis(date));

/** Instant de fermeture d'une semaine : le lundi suivant à 00:00, heure de Paris (dernier envoi : dimanche 23:59:59). */
export function finSemaineDraft(semaine: string): Date {
  const minuitLocal = lundiSemaineIso(semaineSuivante(semaine)).getTime();
  // Aucun changement d'heure entre dimanche 03:00 et lundi 00:00 : le décalage de dimanche soir convient.
  return new Date(minuitLocal - decalageParis(new Date(minuitLocal - 6 * HEURE)));
}

export const semaineFermee = (semaine: string, maintenant: Date): boolean => maintenant.getTime() >= finSemaineDraft(semaine).getTime();

/** Première semaine du classement en ligne. */
export const SEMAINE_DEBUT_CLASSEMENT = '2026-S45';

/** Semaines passées du classement (fermées), de la plus récente à la plus ancienne. */
export function semainesPassees(maintenant: Date, depuis = SEMAINE_DEBUT_CLASSEMENT): string[] {
  const courante = semaineDraft(maintenant);
  const r: string[] = [];
  for (let s = depuis; s < courante; s = semaineSuivante(s)) r.unshift(s);
  return r;
}

// ---------- Soumission d'une équipe (vérifiée par le serveur) ----------

export interface ContexteDraft {
  /** Extensions du draft de chaque semaine (sorties à son lundi). */
  sources: SourcesDraft;
  themes: Theme[];
}

export type CodeRefus = 'requete-invalide' | 'semaine-fermee' | 'semaine-future' | 'choix-invalide';

export type VerdictSoumission =
  | { ok: true; semaine: string; choix: number[]; cartes: string[]; score: number; detail: LigneScore[]; dejaRecu: number }
  | { ok: false; code: CodeRefus; message: string };

const FORMAT_SEMAINE = /^\d{4}-S\d{2}$/;

/**
 * Vérifie une équipe envoyée par un joueur, sans rien croire de ce qu'il envoie à part ses choix :
 * - la semaine doit être celle en cours (heure de Paris) : une semaine passée est fermée ;
 * - les 15 cartes de la semaine sont recalculées depuis la graine ; les 5 choix (indices de 0 à 14) doivent
 *   en faire partie, être différents et désigner des personnages différents ;
 * - le score est recalculé avec le barème du jeu.
 * `dejaRecu` : sceaux de participation déjà reçus sur l'appareil (draft joué sans compte), déduits de la récompense.
 */
export function verifierSoumission(entree: unknown, maintenant: Date, contexte: ContexteDraft, participation: number): VerdictSoumission {
  const e = (typeof entree === 'object' && entree !== null ? entree : {}) as Record<string, unknown>;
  const refus = (code: CodeRefus, message: string): VerdictSoumission => ({ ok: false, code, message });
  if (typeof e.semaine !== 'string' || !FORMAT_SEMAINE.test(e.semaine)) return refus('requete-invalide', 'Semaine attendue (AAAA-Snn).');
  if (!Array.isArray(e.choix) || !e.choix.every((i) => Number.isInteger(i))) return refus('requete-invalide', `${CARTES_A_GARDER} indices de cartes attendus.`);
  const dejaRecu = e.dejaRecu === undefined ? 0 : e.dejaRecu;
  if (!Number.isInteger(dejaRecu) || (dejaRecu as number) < 0) return refus('requete-invalide', 'Sceaux déjà reçus : entier positif attendu.');
  const courante = semaineDraft(maintenant);
  if (e.semaine < courante) return refus('semaine-fermee', `La semaine ${e.semaine} est fermée (dimanche 23 h 59, heure de Paris) : l’équipe ne peut plus changer.`);
  if (e.semaine > courante) return refus('semaine-future', `La semaine ${e.semaine} n’a pas encore commencé.`);

  const choix = e.choix as number[];
  const draft = genererDraft(courante, contexte.sources, contexte.themes);
  const sources = typeof contexte.sources === 'function' ? contexte.sources(courante) : contexte.sources;
  const toutes = fusionner(sources.map((s) => s.extension));
  const equipe = equipeChoisie(draft, choix, toutes);
  if (typeof equipe === 'string') return refus('choix-invalide', equipe);
  const score = scorer(equipe, draft.theme, draft.adversaire);
  return {
    ok: true,
    semaine: courante,
    choix: [...choix],
    cartes: choix.map((i) => draft.cartes[i]!.carteId),
    score: score.total,
    detail: score.lignes,
    dejaRecu: Math.min(dejaRecu as number, participation),
  };
}

// ---------- Récompenses de fin de semaine ----------

/** Réglage de quetes.json (« hebdomadaire.recompensesDraft »). */
export interface RecompensesDraft {
  /** Sceaux du 1er, du 2e, du 3e… */
  podium: number[];
  /** Toute autre participation (et, sans compte, la récompense reçue tout de suite). */
  participation: number;
}

export function validerRecompensesDraft(r: RecompensesDraft | undefined): string[] {
  const entier = (n: unknown): boolean => Number.isInteger(n) && (n as number) >= 0;
  if (!r || !Array.isArray(r.podium) || !r.podium.every(entier) || !entier(r.participation)) {
    return ['Hebdomadaire : récompenses du draft (podium : liste de sceaux entiers, participation : entier) attendues.'];
  }
  return [];
}

/** Sceaux d'un rang (1 = premier) au classement figé de la semaine. */
export const recompenseDuRang = (rang: number, r: RecompensesDraft): number => r.podium[rang - 1] ?? r.participation;

/** Sceaux à créditer : la récompense du rang, moins la participation déjà reçue sur l'appareil. */
export const sceauxAReclamer = (rang: number, dejaRecu: number, r: RecompensesDraft): number =>
  Math.max(0, recompenseDuRang(rang, r) - dejaRecu);

/** « 1er », « 2e », « 13e ». */
export const rangTexte = (rang: number): string => (rang === 1 ? '1er' : `${rang}e`);
