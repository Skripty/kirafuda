// Quêtes, calendrier de bienvenue et sceaux (GDD, « Économie »). Logique pure, testée.
// Tous les réglages chiffrés viennent de src/data/quetes.json.
// Règle 6 : chaque opération renvoie une nouvelle sauvegarde complète.
import { ELEMENTS, FINITIONS, ORDRE_FINITIONS } from './regles';
import { rngAGraine } from './rng';
import { jourLocal } from './economie';
import { indexer } from './extension';
import { joursDepuisSortie } from './catalogue';
import { validerTablePoids } from './validation';
import type { ElementId, EtatQuetes, Extension, FinitionId, Ouverture, Sauvegarde, TablePoids } from './types';
import { validerRecompensesDraft, type RecompensesDraft } from './classement';

// ---------- Configuration (quetes.json) ----------

export type TypeEvenement =
  | 'booster-ouvert' | 'carte-obtenue' | 'carte-inspectee' | 'achat-boutique'
  | 'doublon-revendu' | 'cote-consultee' | 'draft-joue' | 'probabilites-consultees';

/** Compteurs calculés à partir de la sauvegarde (quêtes de débutant), pas d'un événement. */
export type CompteurCalcule = 'collection' | 'serie-complete';

export const TYPES_EVENEMENTS: TypeEvenement[] = [
  'booster-ouvert', 'carte-obtenue', 'carte-inspectee', 'achat-boutique',
  'doublon-revendu', 'cote-consultee', 'draft-joue', 'probabilites-consultees',
];

export interface FiltreQuete {
  /** Rareté minimale de la carte obtenue. */
  rareteMin?: FinitionId;
  /** Carte que le joueur n'avait pas encore. */
  nouvelle?: boolean;
  /** « du-jour » : élément du jour (tiré avec la graine du jour). */
  element?: 'du-jour';
  /** « du-jour » : série du jour (tirée avec la graine du jour). */
  serie?: 'du-jour';
}

export interface DefQuete {
  id: string;
  texte: string;
  evenement: TypeEvenement;
  filtre?: FiltreQuete;
  objectif: number;
}

export interface DefQueteDebutant {
  id: string;
  texte: string;
  evenement: TypeEvenement | CompteurCalcule;
  objectif: number;
  sceaux: number;
}

export interface ConfigQuetes {
  connexion: { sceauxParJour: number; plafondStock: number };
  quetesDuJour: { nombreParJour: number; recompenseToutesFaites: { sceaux: number }; reserve: DefQuete[] };
  /** Rareté de la 5e carte d'un booster garanti (★ ou plus uniquement). */
  tableGarantie: { finitions: TablePoids<FinitionId> };
  calendrierBienvenue: { jours: { jour: number; sceaux: number; boosterGaranti?: boolean }[] };
  quetesDebutant: DefQueteDebutant[];
  hebdomadaire: { recompensesDraft: RecompensesDraft; queteSemaine: DefQuete & { sceaux: number } };
  /** Calendrier de lancement d'une extension : sceaux des 7 jours calendaires qui suivent sa sortie. */
  calendrierLancementExtension: { jours: number[] };
}

/** Vérifie quetes.json au démarrage : ids uniques, événements et raretés connus, nombres entiers positifs. */
export function validerConfigQuetes(c: ConfigQuetes): string[] {
  const e: string[] = [];
  const entier = (x: unknown, min: number): boolean => typeof x === 'number' && Number.isInteger(x) && x >= min;
  const evenementsCalcules: string[] = ['collection', 'serie-complete'];
  const verifierQuete = (q: { id: string; texte: string; evenement: string; objectif: number; filtre?: FiltreQuete }, ref: string, calculsPermis: boolean): void => {
    if (!q.id || !q.texte) e.push(`${ref} : id et texte obligatoires.`);
    if (!(TYPES_EVENEMENTS as string[]).includes(q.evenement) && !(calculsPermis && evenementsCalcules.includes(q.evenement))) {
      e.push(`${ref} : événement inconnu « ${q.evenement} ».`);
    }
    if (!entier(q.objectif, 1)) e.push(`${ref} : objectif entier ≥ 1 attendu.`);
    if (q.filtre?.rareteMin && !Object.hasOwn(FINITIONS, q.filtre.rareteMin)) e.push(`${ref} : rareté « ${q.filtre.rareteMin} » inconnue.`);
    if (q.filtre?.element && q.filtre.element !== 'du-jour') e.push(`${ref} : filtre d'élément « du-jour » attendu.`);
    if (q.filtre?.serie && q.filtre.serie !== 'du-jour') e.push(`${ref} : filtre de série « du-jour » attendu.`);
  };
  if (!entier(c.connexion?.sceauxParJour, 0) || !entier(c.connexion?.plafondStock, 0)) e.push('Quêtes, connexion : sceaux par jour et plafond entiers attendus.');
  const reserve = c.quetesDuJour?.reserve ?? [];
  const ids = new Set<string>();
  reserve.forEach((q, i) => {
    verifierQuete(q, `Quête du jour ${i + 1} (« ${q.id} »)`, false);
    if (ids.has(q.id)) e.push(`Quête du jour « ${q.id} » : identifiant en double.`);
    ids.add(q.id);
  });
  const parJour = c.quetesDuJour?.nombreParJour;
  const nonOuvrir = reserve.filter((q) => q.evenement !== 'booster-ouvert').length;
  if (!entier(parJour, 1) || parJour > nonOuvrir + (reserve.length > nonOuvrir ? 1 : 0)) {
    e.push('Quêtes du jour : nombre par jour trop grand pour la réserve (au plus une quête « ouvrir » par jour).');
  }
  if (!entier(c.quetesDuJour?.recompenseToutesFaites?.sceaux, 0)) e.push('Quêtes du jour : récompense « toutes faites » entière attendue.');
  const garantie = c.tableGarantie?.finitions;
  if (!garantie) e.push('Table garantie : finitions manquantes.');
  else {
    e.push(...validerTablePoids('Table garantie', garantie));
    for (const [f, poids] of Object.entries(garantie)) {
      if (Object.hasOwn(FINITIONS, f) && (poids ?? 0) > 0 && rangRarete(f as FinitionId) < rangRarete('pleine')) {
        e.push(`Table garantie : « ${f} » est sous ★ (le booster garanti promet une carte ★ ou plus).`);
      }
    }
  }
  const jours = c.calendrierBienvenue?.jours ?? [];
  jours.forEach((j, i) => {
    if (j.jour !== i + 1) e.push(`Calendrier de bienvenue : jour ${i + 1} attendu à la position ${i + 1}.`);
    if (!entier(j.sceaux, 0)) e.push(`Calendrier de bienvenue, jour ${j.jour} : sceaux entiers attendus.`);
  });
  const idsDeb = new Set<string>();
  (c.quetesDebutant ?? []).forEach((q, i) => {
    verifierQuete(q, `Quête de débutant ${i + 1} (« ${q.id} »)`, true);
    if (!entier(q.sceaux, 0)) e.push(`Quête de débutant « ${q.id} » : sceaux entiers attendus.`);
    if (idsDeb.has(q.id)) e.push(`Quête de débutant « ${q.id} » : identifiant en double.`);
    idsDeb.add(q.id);
  });
  const lancement = c.calendrierLancementExtension?.jours;
  if (!Array.isArray(lancement) || lancement.length !== 7 || !lancement.every((n) => entier(n, 0))) {
    e.push('Calendrier de lancement d’extension : 7 nombres de sceaux entiers attendus.');
  }
  e.push(...validerRecompensesDraft(c.hebdomadaire?.recompensesDraft));
  if (c.hebdomadaire?.queteSemaine) {
    verifierQuete(c.hebdomadaire.queteSemaine, 'Quête de la semaine', false);
    if (!entier(c.hebdomadaire.queteSemaine.sceaux, 0)) e.push('Quête de la semaine : sceaux entiers attendus.');
  } else e.push('Hebdomadaire : quête de la semaine manquante.');
  return e;
}

// ---------- État ----------

export function etatQuetesInitial(): EtatQuetes {
  return {
    jour: null, progresJour: {}, bonusJourReclame: false,
    cumuls: {}, debutantReclamees: [],
    semaine: null, progresSemaine: 0, semaineReclamee: false,
    calendrierJours: 0, calendrierDernierJour: null, boostersGarantis: 0, lancementsRecus: {},
  };
}

/** Lundi local (AAAA-MM-JJ) de la semaine d'une date : la semaine va du lundi au dimanche, heure locale. */
export function lundiLocal(date: Date): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return jourLocal(d);
}

/** Passage à un nouveau jour ou à une nouvelle semaine : remet à zéro ce qui doit l'être. */
export function changerDePeriode(q: EtatQuetes, maintenant: Date): EtatQuetes {
  const jour = jourLocal(maintenant);
  const semaine = lundiLocal(maintenant);
  let r = q;
  if (r.jour !== jour) r = { ...r, jour, progresJour: {}, bonusJourReclame: false };
  if (r.semaine !== semaine) r = { ...r, semaine, progresSemaine: 0, semaineReclamee: false };
  return r;
}

// ---------- Quêtes du jour ----------

export interface QueteDuJour extends DefQuete {
  /** Texte affiché, avec l'élément ou la série du jour quand la quête en dépend. */
  libelle: string;
}

export interface TirageDuJour {
  jour: string;
  element: ElementId;
  serie: string;
  quetes: QueteDuJour[];
}

/**
 * Les quêtes du jour : tirées avec la graine de la date (AAAA-MM-JJ), donc les mêmes pour tous.
 * Élément et série du jour viennent de la même graine, parmi les personnages des extensions sorties.
 * Au plus une quête « ouvrir des boosters » par jour.
 */
export function quetesDuJour(jour: string, config: ConfigQuetes, extensions: Extension[]): TirageDuJour {
  const rng = rngAGraine(`quetes:${jour}`);
  const personnages = extensions.flatMap((e) => e.personnages);
  const elements = [...new Set(personnages.map((p) => p.element))].sort();
  // Tri par code (pas de localeCompare) : le même ordre dans tous les navigateurs.
  const series = [...new Set(personnages.map((p) => p.serie))].sort();
  const element = elements[rng.entier(elements.length)]!;
  const serie = series[rng.entier(series.length)]!;

  // Mélange de Fisher-Yates avec la graine, puis on garde les premières quêtes permises.
  const reserve = [...config.quetesDuJour.reserve];
  for (let i = reserve.length - 1; i > 0; i--) {
    const j = rng.entier(i + 1);
    [reserve[i], reserve[j]] = [reserve[j]!, reserve[i]!];
  }
  const quetes: QueteDuJour[] = [];
  for (const q of reserve) {
    if (quetes.length >= config.quetesDuJour.nombreParJour) break;
    if (q.evenement === 'booster-ouvert' && quetes.some((x) => x.evenement === 'booster-ouvert')) continue;
    let libelle = q.texte;
    if (q.filtre?.element === 'du-jour') libelle = `${q.texte} (${ELEMENTS[element].nom})`;
    if (q.filtre?.serie === 'du-jour') libelle = `${q.texte} (${serie})`;
    quetes.push({ ...q, libelle });
  }
  return { jour, element, serie, quetes };
}

// ---------- Événements ----------

export type Evenement =
  | { type: 'carte-obtenue'; finition: FinitionId; serie: string | null; element: ElementId | null; nouvelle: boolean }
  | { type: Exclude<TypeEvenement, 'carte-obtenue'> };

/** Événements produits par une ouverture : un booster ouvert, puis chaque carte obtenue. */
export function evenementsOuverture(ouverture: Ouverture, extension: Extension): Evenement[] {
  const index = indexer(extension);
  const evts: Evenement[] = [{ type: 'booster-ouvert' }];
  for (const c of ouverture.cartes) {
    const carte = index.carte(c.carteId);
    if (!carte) {
      // Carte Soutien : ni série ni élément.
      const soutien = index.soutien(c.carteId);
      if (soutien) evts.push({ type: 'carte-obtenue', finition: soutien.finition, serie: null, element: null, nouvelle: c.nouveau });
      continue;
    }
    const p = index.personnageDe(carte);
    evts.push({ type: 'carte-obtenue', finition: carte.finition, serie: p.serie, element: p.element, nouvelle: c.nouveau });
  }
  return evts;
}

/** Une carte obtenue (boutique) : même forme d'événement que pour un booster. */
export function evenementCarte(extension: Extension, carteId: string, nouvelle: boolean): Evenement | null {
  const index = indexer(extension);
  const carte = index.carte(carteId);
  if (!carte) {
    const soutien = index.soutien(carteId);
    return soutien ? { type: 'carte-obtenue', finition: soutien.finition, serie: null, element: null, nouvelle } : null;
  }
  const p = index.personnageDe(carte);
  return { type: 'carte-obtenue', finition: carte.finition, serie: p.serie, element: p.element, nouvelle };
}

const rangRarete = (f: FinitionId): number => ORDRE_FINITIONS.indexOf(f);

function correspond(q: DefQuete, e: Evenement, tirage: TirageDuJour | null): boolean {
  if (q.evenement !== e.type) return false;
  const f = q.filtre;
  if (!f) return true;
  if (e.type !== 'carte-obtenue') return true;
  if (f.rareteMin && rangRarete(e.finition) < rangRarete(f.rareteMin)) return false;
  if (f.nouvelle && !e.nouvelle) return false;
  if (f.element === 'du-jour' && (!tirage || e.element !== tirage.element)) return false;
  if (f.serie === 'du-jour' && (!tirage || e.serie !== tirage.serie)) return false;
  return true;
}

export interface ContexteQuetes {
  config: ConfigQuetes;
  /** Extensions sorties (élément et série du jour, cartes, séries complètes). */
  extensions: Extension[];
  maintenant: Date;
}

/** Applique des événements du jeu à la progression (quêtes du jour, de la semaine, compteurs de débutant). */
export function appliquerEvenements(s: Sauvegarde, evenements: Evenement[], ctx: ContexteQuetes): Sauvegarde {
  let q = changerDePeriode(s.quetes, ctx.maintenant);
  const tirage = quetesDuJour(q.jour!, ctx.config, ctx.extensions);
  const progresJour = { ...q.progresJour };
  const cumuls = { ...q.cumuls };
  let progresSemaine = q.progresSemaine;
  const semaine = ctx.config.hebdomadaire.queteSemaine;
  for (const e of evenements) {
    cumuls[e.type] = (cumuls[e.type] ?? 0) + 1;
    for (const qj of tirage.quetes) if (correspond(qj, e, tirage)) progresJour[qj.id] = (progresJour[qj.id] ?? 0) + 1;
    if (correspond(semaine, e, tirage)) progresSemaine++;
  }
  q = { ...q, progresJour, cumuls, progresSemaine };
  return { ...s, quetes: q };
}

// ---------- Connexion et calendrier de bienvenue ----------

export interface ResultatConnexion {
  sauvegarde: Sauvegarde;
  /** false : déjà fait aujourd'hui (la sauvegarde renvoyée a seulement pu changer de période). */
  nouvelleJournee: boolean;
  sceauxConnexion: number;
  /** Case du calendrier obtenue aujourd'hui (1 à 7), ou null. */
  jourCalendrier: number | null;
  sceauxCalendrier: number;
  boosterGaranti: boolean;
}

/**
 * Premier lancement de la journée : sceaux de connexion (plafonnés au stock de connexion),
 * puis une case du calendrier de bienvenue (une par jour joué, non plafonnée).
 * Le booster garanti du jour 1 ne vaut que pour le tout premier booster (aucun booster encore ouvert).
 */
export function appliquerConnexion(s: Sauvegarde, ctx: ContexteQuetes): ResultatConnexion {
  const aujourdhui = jourLocal(ctx.maintenant);
  const quetes = changerDePeriode(s.quetes, ctx.maintenant);
  const base = { ...s, quetes };
  const derniere = s.derniereRecompenseQuotidienne;
  if (derniere !== null && aujourdhui <= derniere) {
    return { sauvegarde: base, nouvelleJournee: false, sceauxConnexion: 0, jourCalendrier: null, sceauxCalendrier: 0, boosterGaranti: false };
  }
  const { sceauxParJour, plafondStock } = ctx.config.connexion;
  const sceauxConnexion = Math.max(0, Math.min(sceauxParJour, plafondStock - s.sceaux));

  const jours = ctx.config.calendrierBienvenue.jours;
  let jourCalendrier: number | null = null;
  let sceauxCalendrier = 0;
  let boosterGaranti = false;
  let q = quetes;
  if (q.calendrierJours < jours.length && q.calendrierDernierJour !== aujourdhui) {
    const j = jours[q.calendrierJours]!;
    jourCalendrier = j.jour;
    sceauxCalendrier = j.sceaux;
    boosterGaranti = !!j.boosterGaranti && (j.jour !== 1 || s.historique.length === 0);
    q = { ...q, calendrierJours: q.calendrierJours + 1, calendrierDernierJour: aujourdhui, boostersGarantis: q.boostersGarantis + (boosterGaranti ? 1 : 0) };
  }
  return {
    sauvegarde: { ...base, sceaux: s.sceaux + sceauxConnexion + sceauxCalendrier, derniereRecompenseQuotidienne: aujourdhui, quetes: q },
    nouvelleJournee: true,
    sceauxConnexion,
    jourCalendrier,
    sceauxCalendrier,
    boosterGaranti,
  };
}

// ---------- Calendrier de lancement d'une extension ----------

/** Une extension qui a un calendrier de lancement (toutes sauf l'extension de base). */
export interface SortieExtension {
  id: string;
  nom: string;
  /** AAAA-MM-JJ, heure locale. */
  disponibleLe: string;
}

export interface GainLancement {
  extensionId: string;
  nom: string;
  /** 1 à 7. */
  jour: number;
  sceaux: number;
}

/**
 * Calendrier de lancement : les 7 jours calendaires qui suivent la sortie d'une extension (jour 1 = jour de sortie).
 * Au premier lancement d'un de ces jours, le joueur reçoit la case du jour ; un jour manqué est perdu.
 * Chaque case ne se reçoit qu'une fois (lancementsRecus). Sceaux non plafonnés.
 */
export function appliquerLancements(s: Sauvegarde, sorties: SortieExtension[], config: ConfigQuetes, maintenant: Date): { sauvegarde: Sauvegarde; gains: GainLancement[] } {
  const jours = config.calendrierLancementExtension.jours;
  const gains: GainLancement[] = [];
  let recus = s.quetes.lancementsRecus;
  for (const e of sorties) {
    const d = joursDepuisSortie(e.disponibleLe, maintenant);
    if (d < 0 || d >= jours.length || (recus[e.id] ?? []).includes(d)) continue;
    gains.push({ extensionId: e.id, nom: e.nom, jour: d + 1, sceaux: jours[d]! });
    recus = { ...recus, [e.id]: [...(recus[e.id] ?? []), d] };
  }
  if (gains.length === 0) return { sauvegarde: s, gains };
  const total = gains.reduce((n, g) => n + g.sceaux, 0);
  return { sauvegarde: { ...s, sceaux: s.sceaux + total, quetes: { ...s.quetes, lancementsRecus: recus } }, gains };
}

export interface VueLancement {
  extensionId: string;
  nom: string;
  /** Jour du calendrier aujourd'hui (1 à 7). */
  jourActuel: number;
  cases: { jour: number; sceaux: number; recue: boolean; aujourdhui: boolean; passee: boolean }[];
}

/** Calendriers de lancement en cours aujourd'hui (bandeau de l'accueil). */
export function vueLancements(s: Sauvegarde, sorties: SortieExtension[], config: ConfigQuetes, maintenant: Date): VueLancement[] {
  const jours = config.calendrierLancementExtension.jours;
  const vues: VueLancement[] = [];
  for (const e of sorties) {
    const d = joursDepuisSortie(e.disponibleLe, maintenant);
    if (d < 0 || d >= jours.length) continue;
    const recus = s.quetes.lancementsRecus[e.id] ?? [];
    vues.push({
      extensionId: e.id, nom: e.nom, jourActuel: d + 1,
      cases: jours.map((sceaux, i) => ({ jour: i + 1, sceaux, recue: recus.includes(i), aujourdhui: i === d, passee: i < d })),
    });
  }
  return vues;
}

// ---------- Vue d'ensemble et réclamations ----------

export interface LigneQuete {
  id: string;
  texte: string;
  progres: number;
  objectif: number;
  sceaux: number;
  faite: boolean;
  reclamee: boolean;
}

export interface VueQuetes {
  jour: TirageDuJour;
  quetesDuJour: LigneQuete[];
  bonus: { sceaux: number; pret: boolean; reclame: boolean };
  semaine: LigneQuete;
  debutant: LigneQuete[];
  calendrier: { jour: number; sceaux: number; garanti: boolean; obtenu: boolean; aujourdhui: boolean }[];
  calendrierFini: boolean;
  /** Récompenses prêtes à être réclamées. */
  aReclamer: number;
}

/** Cartes différentes possédées et séries dont toutes les cartes de base sont possédées. */
function compteursCalcules(s: Sauvegarde, extensions: Extension[]): Record<CompteurCalcule, number> {
  const cartes = extensions.flatMap((e) => e.cartes);
  const differentes = cartes.filter((c) => (s.collection[c.id] ?? 0) > 0).length;
  const parSerie = new Map<string, { total: number; possedees: number }>();
  for (const e of extensions) {
    const index = indexer(e);
    for (const c of e.cartes.filter((x) => !x.secrete)) {
      const serie = index.personnageDe(c).serie;
      const v = parSerie.get(serie) ?? { total: 0, possedees: 0 };
      v.total++;
      if ((s.collection[c.id] ?? 0) > 0) v.possedees++;
      parSerie.set(serie, v);
    }
  }
  const series = [...parSerie.values()].filter((v) => v.total > 0 && v.possedees === v.total).length;
  return { collection: differentes, 'serie-complete': series };
}

export function vueQuetes(s: Sauvegarde, ctx: ContexteQuetes): VueQuetes {
  const q = changerDePeriode(s.quetes, ctx.maintenant);
  const tirage = quetesDuJour(q.jour!, ctx.config, ctx.extensions);
  const quetesJour = tirage.quetes.map((d): LigneQuete => {
    const progres = Math.min(q.progresJour[d.id] ?? 0, d.objectif);
    // Une quête du jour ne se réclame pas seule : seul le bonus des 3 faites rapporte (GDD).
    return { id: d.id, texte: d.libelle, progres, objectif: d.objectif, sceaux: 0, faite: progres >= d.objectif, reclamee: false };
  });
  const toutes = quetesJour.length > 0 && quetesJour.every((l) => l.faite);
  const sem = ctx.config.hebdomadaire.queteSemaine;
  const progresSem = Math.min(q.progresSemaine, sem.objectif);
  const calcules = compteursCalcules(s, ctx.extensions);
  const debutant = ctx.config.quetesDebutant.map((d): LigneQuete => {
    const brut = d.evenement === 'collection' || d.evenement === 'serie-complete' ? calcules[d.evenement] : q.cumuls[d.evenement] ?? 0;
    const progres = Math.min(brut, d.objectif);
    return { id: d.id, texte: d.texte, progres, objectif: d.objectif, sceaux: d.sceaux, faite: progres >= d.objectif, reclamee: q.debutantReclamees.includes(d.id) };
  });
  const jours = ctx.config.calendrierBienvenue.jours;
  const aujourdhui = jourLocal(ctx.maintenant);
  const vue: VueQuetes = {
    jour: tirage,
    quetesDuJour: quetesJour,
    bonus: { sceaux: ctx.config.quetesDuJour.recompenseToutesFaites.sceaux, pret: toutes, reclame: q.bonusJourReclame },
    semaine: { id: sem.id, texte: sem.texte, progres: progresSem, objectif: sem.objectif, sceaux: sem.sceaux, faite: progresSem >= sem.objectif, reclamee: q.semaineReclamee },
    debutant,
    calendrier: jours.map((j, i) => ({
      jour: j.jour, sceaux: j.sceaux, garanti: !!j.boosterGaranti,
      obtenu: i < q.calendrierJours,
      aujourdhui: i === q.calendrierJours - 1 && q.calendrierDernierJour === aujourdhui,
    })),
    calendrierFini: q.calendrierJours >= jours.length,
    aReclamer: 0,
  };
  vue.aReclamer = [vue.semaine, ...vue.debutant].filter((l) => l.faite && !l.reclamee).length
    + (vue.bonus.pret && !vue.bonus.reclame ? 1 : 0);
  return vue;
}

export type CibleReclamation =
  | { type: 'bonus-jour' }
  | { type: 'semaine' }
  | { type: 'debutant'; id: string };

export type ResultatReclamation =
  | { ok: true; sauvegarde: Sauvegarde; sceaux: number }
  | { ok: false; raison: 'inconnue' | 'pas-finie' | 'deja-reclamee' };

/** Réclame une récompense : une seule fois, seulement si la quête est faite. Sceaux non plafonnés. */
export function reclamer(s: Sauvegarde, cible: CibleReclamation, ctx: ContexteQuetes): ResultatReclamation {
  const vue = vueQuetes(s, ctx);
  const q = changerDePeriode(s.quetes, ctx.maintenant);
  const donner = (sceaux: number, quetes: EtatQuetes): ResultatReclamation =>
    ({ ok: true, sceaux, sauvegarde: { ...s, sceaux: s.sceaux + sceaux, quetes } });

  if (cible.type === 'bonus-jour') {
    if (vue.bonus.reclame) return { ok: false, raison: 'deja-reclamee' };
    if (!vue.bonus.pret) return { ok: false, raison: 'pas-finie' };
    return donner(vue.bonus.sceaux, { ...q, bonusJourReclame: true });
  }
  if (cible.type === 'semaine') {
    if (vue.semaine.reclamee) return { ok: false, raison: 'deja-reclamee' };
    if (!vue.semaine.faite) return { ok: false, raison: 'pas-finie' };
    return donner(vue.semaine.sceaux, { ...q, semaineReclamee: true });
  }
  const ligne = vue.debutant.find((l) => l.id === cible.id);
  if (!ligne) return { ok: false, raison: 'inconnue' };
  if (ligne.reclamee) return { ok: false, raison: 'deja-reclamee' };
  if (!ligne.faite) return { ok: false, raison: 'pas-finie' };
  return donner(ligne.sceaux, { ...q, debutantReclamees: [...q.debutantReclamees, ligne.id] });
}

// ---------- Lecture dans une sauvegarde ----------

/** Vérifie l'état des quêtes lu dans une sauvegarde ; renvoie une copie propre ou des erreurs. */
export function lireEtatQuetes(x: unknown): EtatQuetes | string[] {
  const e: string[] = [];
  const objet = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
  const entier = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0;
  const jourOuNull = (v: unknown): v is string | null => v === null || (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v));
  const compteurs = (v: unknown): v is Record<string, number> => objet(v) && Object.values(v).every(entier);
  const textes = (v: unknown): v is string[] => Array.isArray(v) && v.every((t) => typeof t === 'string');
  if (!objet(x)) return ['Quêtes : un objet est attendu.'];
  if (!jourOuNull(x.jour)) e.push('Quêtes : jour invalide.');
  if (!compteurs(x.progresJour)) e.push('Quêtes : progression du jour invalide.');
  if (typeof x.bonusJourReclame !== 'boolean') e.push('Quêtes : bonus du jour invalide.');
  if (!compteurs(x.cumuls)) e.push('Quêtes : compteurs invalides.');
  if (!textes(x.debutantReclamees)) e.push('Quêtes : quêtes de débutant réclamées invalides.');
  if (!jourOuNull(x.semaine)) e.push('Quêtes : semaine invalide.');
  if (!entier(x.progresSemaine)) e.push('Quêtes : progression de la semaine invalide.');
  if (typeof x.semaineReclamee !== 'boolean') e.push('Quêtes : quête de la semaine invalide.');
  if (!entier(x.calendrierJours) || x.calendrierJours > 7) e.push('Quêtes : calendrier invalide (0 à 7 jours).');
  if (!jourOuNull(x.calendrierDernierJour)) e.push('Quêtes : dernier jour du calendrier invalide.');
  if (!entier(x.boostersGarantis)) e.push('Quêtes : boosters garantis invalides.');
  const lancements = (v: unknown): v is Record<string, number[]> =>
    objet(v) && Object.values(v).every((l) => Array.isArray(l) && l.every((j) => entier(j) && j < 7));
  if (!lancements(x.lancementsRecus)) e.push('Quêtes : calendriers de lancement invalides.');
  if (e.length) return e;
  return {
    jour: x.jour as string | null, progresJour: { ...(x.progresJour as Record<string, number>) },
    bonusJourReclame: x.bonusJourReclame as boolean,
    cumuls: { ...(x.cumuls as Record<string, number>) }, debutantReclamees: [...(x.debutantReclamees as string[])],
    semaine: x.semaine as string | null, progresSemaine: x.progresSemaine as number, semaineReclamee: x.semaineReclamee as boolean,
    calendrierJours: x.calendrierJours as number, calendrierDernierJour: x.calendrierDernierJour as string | null,
    boostersGarantis: x.boostersGarantis as number,
    lancementsRecus: Object.fromEntries(Object.entries(x.lancementsRecus as Record<string, number[]>).map(([k, l]) => [k, [...l]])),
  };
}
