// Popularité hebdomadaire (GDD, « Cote »). Logique pure, testée.
// Popularité d'un personnage (1 à 100) = base + ajustement de la semaine.
// - Base : src/data/popularite-base.json, fixée une fois pour toutes.
// - Chaque lundi : ajustement = Math.trunc(ajustement précédent × 0,7) (arrondi vers zéro) + coups de pouce de la semaine ;
//   résultat borné 1 à 100. L'arrondi vers zéro ramène tout ajustement à 0 (avec l'arrondi au plus proche, ±1 y restait).
// - Coups de pouce, sur une série entière ou un personnage : −5, +5, +10, +15.
// src/data/popularite.json (semaine courante et précédente) est généré par l'admin, jamais écrit à la main.
import { lundiSemaineIso, semaineIso, semaineSuivante } from './draft';
import type { Personnage, Popularite } from './types';

// ---------- Réglages ----------
export const DECROISSANCE = 0.7;
export const COUPS_AUTORISES = [-5, 5, 10, 15] as const;
export const POPULARITE_MIN = 1;
export const POPULARITE_MAX = 100;

export type ValeurCoup = (typeof COUPS_AUTORISES)[number];

/** src/data/popularite-base.json */
export interface BasePopularite {
  personnages: Record<string, { nom: string; serie: string; base: number }>;
}

export interface EntreePopularite {
  popularite: number;
  ajustement: number;
}

/** src/data/popularite.json (nouveau format). */
export interface FichierPopularite {
  semaine: string;
  semainePrecedente: string;
  courante: Record<string, EntreePopularite>;
  precedente: Record<string, EntreePopularite>;
  /** Coups de pouce de la semaine courante (trace de la publication). */
  coupsDePouce: CoupDePouce[];
}

export type CibleCoup = { type: 'serie'; serie: string } | { type: 'personnage'; id: string };
export interface CoupDePouce {
  cible: CibleCoup;
  valeur: ValeurCoup;
}

const SEMAINE = /^\d{4}-S\d{2}$/;
const borner = (x: number): number => Math.min(POPULARITE_MAX, Math.max(POPULARITE_MIN, x));
/** Arrondi vers zéro (7 × 0,7 = 4,9 → 4 ; −5 × 0,7 = −3,5 → −3) : un ajustement de ±1 revient à 0 la semaine suivante. */
const versZero = (x: number): number => Math.trunc(x) + 0; // + 0 : jamais −0
const entier = (x: unknown): x is number => typeof x === 'number' && Number.isInteger(x);

// ---------- Semaines ----------

/** Nombre de semaines entre deux semaines ISO (b − a). */
export function semainesEntre(a: string, b: string): number {
  return Math.round((lundiSemaineIso(b).getTime() - lundiSemaineIso(a).getTime()) / (7 * 86_400_000));
}

/**
 * Semaine à publier : la semaine qui suit la dernière publiée, ou la semaine en cours si plusieurs semaines
 * ont été sautées (on rattrape d'un coup, la baisse de l'ajustement s'appliquant pour chaque semaine écoulée).
 */
export function semaineAPublier(fichier: FichierPopularite, maintenant: Date): string {
  const suivante = semaineSuivante(fichier.semaine);
  const enCours = semaineIso(maintenant);
  return enCours > suivante ? enCours : suivante;
}

// ---------- Calcul ----------

/** La base de chaque personnage (id → base). */
export const bases = (base: BasePopularite): Record<string, number> =>
  Object.fromEntries(Object.entries(base.personnages).map(([id, p]) => [id, p.base]));

/** Somme des coups de pouce qui visent ce personnage (par sa série ou par lui-même). */
function pouce(id: string, serie: string, coups: CoupDePouce[]): number {
  return coups.reduce((n, c) => n + ((c.cible.type === 'serie' ? c.cible.serie === serie : c.cible.id === id) ? c.valeur : 0), 0);
}

/**
 * Semaine suivante. Pour chaque personnage de la base :
 * ajustement = Math.trunc(ajustement précédent × 0,7) (une fois par semaine écoulée) + coups de pouce,
 * popularité = base + ajustement, bornée de 1 à 100. L'ajustement gardé est celui qui s'applique vraiment
 * (popularité − base) : un personnage déjà à 100 ne garde pas de réserve invisible.
 * Un personnage sans ajustement précédent (nouvelle vague) part de 0.
 */
export function calculerSemaine(base: BasePopularite, precedent: FichierPopularite, coups: CoupDePouce[], semaine: string): FichierPopularite {
  const ecoulees = Math.max(1, semainesEntre(precedent.semaine, semaine));
  const courante: Record<string, EntreePopularite> = {};
  for (const [id, p] of Object.entries(base.personnages)) {
    let ajustement = precedent.courante[id]?.ajustement ?? 0;
    for (let k = 0; k < ecoulees; k++) ajustement = versZero(ajustement * DECROISSANCE);
    const popularite = borner(p.base + ajustement + pouce(id, p.serie, coups));
    courante[id] = { popularite, ajustement: popularite - p.base };
  }
  return { semaine, semainePrecedente: precedent.semaine, courante, precedente: precedent.courante, coupsDePouce: coups };
}

// ---------- Fichier (lecture, migration) ----------

/** Ancien format : { semaine, semainePrecedente, courante: { id: nombre }, precedente: { id: nombre } }. */
export function estAncienFormat(x: unknown): boolean {
  if (typeof x !== 'object' || x === null) return false;
  const c = (x as { courante?: unknown }).courante;
  return typeof c === 'object' && c !== null && Object.values(c).some((v) => typeof v === 'number');
}

/** Migration de l'ancien fichier : la semaine courante devient la base + 0 (et la précédente aussi : aucune tendance). */
export function migrerAncienFichier(ancien: { semaine?: unknown; semainePrecedente?: unknown }, base: BasePopularite): FichierPopularite {
  const entrees = Object.fromEntries(Object.entries(base.personnages).map(([id, p]) => [id, { popularite: borner(p.base), ajustement: 0 }]));
  const semaine = typeof ancien.semaine === 'string' && SEMAINE.test(ancien.semaine) ? ancien.semaine : '2026-S45';
  const precedente = typeof ancien.semainePrecedente === 'string' && SEMAINE.test(ancien.semainePrecedente) ? ancien.semainePrecedente : semaine;
  return { semaine, semainePrecedente: precedente, courante: entrees, precedente: { ...entrees }, coupsDePouce: [] };
}

/**
 * Lit popularite.json (ancien ou nouveau format) et le vérifie : semaines AAAA-Snn, popularités entières de 1 à 100,
 * ajustement = popularité − base, personnages connus de la base. Renvoie le fichier (migré si besoin) ou les erreurs.
 */
export function lireFichierPopularite(brut: unknown, base: BasePopularite): { fichier: FichierPopularite; migre: boolean } | { erreurs: string[] } {
  if (estAncienFormat(brut)) return { fichier: migrerAncienFichier(brut as object, base), migre: true };
  const e: string[] = [];
  const f = brut as Partial<FichierPopularite> | null;
  if (typeof f !== 'object' || f === null) return { erreurs: ['Popularité : le fichier src/data/popularite.json est illisible.'] };
  for (const nom of ['semaine', 'semainePrecedente'] as const) {
    if (typeof f[nom] !== 'string' || !SEMAINE.test(f[nom]!)) e.push(`Popularité : « ${nom} » doit être une semaine AAAA-Snn.`);
  }
  for (const nom of ['courante', 'precedente'] as const) {
    const table = f[nom];
    if (typeof table !== 'object' || table === null) { e.push(`Popularité : la table « ${nom} » est absente.`); continue; }
    for (const [id, v] of Object.entries(table)) {
      const b = base.personnages[id];
      if (!b) { e.push(`Popularité ${nom} : personnage inconnu « ${id} » (absent de popularite-base.json).`); continue; }
      if (!entier(v?.popularite) || v.popularite < POPULARITE_MIN || v.popularite > POPULARITE_MAX) {
        e.push(`Popularité ${nom} : ${id} doit avoir une popularité entière de ${POPULARITE_MIN} à ${POPULARITE_MAX} (valeur : ${String(v?.popularite)}).`);
      } else if (!entier(v.ajustement) || v.popularite !== borner(b.base + v.ajustement)) {
        e.push(`Popularité ${nom} : ${id}, popularité ${v.popularite} ≠ base ${b.base} + ajustement ${String(v.ajustement)}.`);
      }
    }
  }
  if (!Array.isArray(f.coupsDePouce)) e.push('Popularité : liste « coupsDePouce » absente.');
  if (e.length > 0) return { erreurs: e };
  return { fichier: f as FichierPopularite, migre: false };
}

/**
 * Popularité utilisée par le jeu (cote, tendances). Un personnage absent du fichier (vague sortie après la dernière
 * publication) prend sa base + 0, la semaine courante comme la précédente.
 */
export function versPopularite(fichier: FichierPopularite, base: BasePopularite): Popularite {
  const table = (t: Record<string, EntreePopularite>): Record<string, number> =>
    Object.fromEntries(Object.entries(base.personnages).map(([id, p]) => [id, t[id]?.popularite ?? borner(p.base)]));
  return { semaine: fichier.semaine, semainePrecedente: fichier.semainePrecedente, courante: table(fichier.courante), precedente: table(fichier.precedente) };
}

// ---------- Validation ----------

/** Base : chaque personnage des vagues sorties a une base entière de 1 à 100 ; aucun personnage inconnu. */
export function validerBase(base: BasePopularite, sortis: Personnage[], connus: Personnage[] = sortis): string[] {
  const e: string[] = [];
  if (typeof base?.personnages !== 'object' || base.personnages === null) return ['Popularité de base : la table « personnages » est absente.'];
  for (const p of sortis) {
    const b = base.personnages[p.id];
    if (!b) e.push(`Popularité de base : aucune base pour ${p.id} (${p.nom}).`);
  }
  const ids = new Set(connus.map((p) => p.id));
  for (const [id, b] of Object.entries(base.personnages)) {
    if (!ids.has(id)) e.push(`Popularité de base : personnage inconnu « ${id} ».`);
    if (!entier(b.base) || b.base < POPULARITE_MIN || b.base > POPULARITE_MAX) {
      e.push(`Popularité de base : ${id} doit avoir une base entière de ${POPULARITE_MIN} à ${POPULARITE_MAX} (valeur : ${String(b.base)}).`);
    }
  }
  return e;
}

/** Coups de pouce envoyés à la publication : valeurs autorisées, séries et personnages connus, une cible une seule fois. */
export function validerCoups(coups: unknown, base: BasePopularite): CoupDePouce[] | string[] {
  if (!Array.isArray(coups)) return ['Coups de pouce : une liste est attendue.'];
  const e: string[] = [];
  const series = new Set(Object.values(base.personnages).map((p) => p.serie));
  const vus = new Set<string>();
  const ok: CoupDePouce[] = [];
  for (const c of coups as Partial<CoupDePouce>[]) {
    const cible = c?.cible;
    const cle = cible?.type === 'serie' ? `s:${cible.serie}` : cible?.type === 'personnage' ? `p:${cible.id}` : '';
    if (!(COUPS_AUTORISES as readonly number[]).includes(c?.valeur as number)) { e.push(`Coup de pouce : valeur ${String(c?.valeur)} non autorisée (${COUPS_AUTORISES.join(', ')}).`); continue; }
    if (cible?.type === 'serie' && !series.has(cible.serie)) { e.push(`Coup de pouce : série inconnue « ${cible.serie} ».`); continue; }
    if (cible?.type === 'personnage' && !base.personnages[cible.id]) { e.push(`Coup de pouce : personnage inconnu « ${cible.id} ».`); continue; }
    if (!cle) { e.push('Coup de pouce : cible manquante.'); continue; }
    if (vus.has(cle)) { e.push(`Coup de pouce : cible en double (${cle.slice(2)}).`); continue; }
    vus.add(cle);
    ok.push({ cible: cible!, valeur: c!.valeur! });
  }
  return e.length > 0 ? e : ok;
}

// ---------- Aperçu ----------

export interface LigneApercu {
  id: string;
  nom: string;
  serie: string;
  avant: number;
  apres: number;
  variation: number;
  sens: 'hausse' | 'baisse' | 'stable';
}

export interface Apercu {
  semaine: string;
  lignes: LigneApercu[];
  hausses: LigneApercu[];
  baisses: LigneApercu[];
}

/** Aperçu d'une publication : nouvelle popularité et flèche de chaque personnage, plus fortes hausses et baisses. */
export function apercu(avant: FichierPopularite, apres: FichierPopularite, base: BasePopularite, nombre = 5): Apercu {
  const lignes = Object.entries(base.personnages).map(([id, p]): LigneApercu => {
    const a = avant.courante[id]?.popularite ?? borner(p.base);
    const n = apres.courante[id]!.popularite;
    return { id, nom: p.nom, serie: p.serie, avant: a, apres: n, variation: n - a, sens: n > a ? 'hausse' : n < a ? 'baisse' : 'stable' };
  });
  const parNom = (x: LigneApercu, y: LigneApercu): number => x.nom.localeCompare(y.nom, 'fr');
  return {
    semaine: apres.semaine,
    lignes,
    hausses: lignes.filter((l) => l.variation > 0).sort((x, y) => y.variation - x.variation || parNom(x, y)).slice(0, nombre),
    baisses: lignes.filter((l) => l.variation < 0).sort((x, y) => x.variation - y.variation || parNom(x, y)).slice(0, nombre),
  };
}

// ---------- Publication ----------

/**
 * La semaine à publier peut-elle l'être maintenant ? Au plus une semaine d'avance (la semaine qui suit la semaine
 * en cours) : on prépare le lundi qui vient, sans pouvoir enchaîner les semaines futures.
 */
export function publicationPossible(fichier: FichierPopularite, maintenant: Date): { ok: true; semaine: string } | { ok: false; semaine: string; raison: string } {
  const semaine = semaineAPublier(fichier, maintenant);
  const limite = semaineSuivante(semaineIso(maintenant));
  if (semaine <= limite) return { ok: true, semaine };
  const ouverture = new Date(lundiSemaineIso(semaine).getTime() - 7 * 86_400_000)
    .toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  return { ok: false, semaine, raison: `La semaine ${fichier.semaine} est déjà publiée. La suivante (${semaine}) pourra l’être à partir du ${ouverture}.` };
}
