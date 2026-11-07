// Draft hebdomadaire solo (GDD, « Draft hebdomadaire »).
// Une graine par semaine : tout le monde ouvre les mêmes 3 boosters (15 cartes) et en garde 5.
// Le score est déterministe et ne dépend jamais de la finition ni du rang (règle 5).
// Les cartes du draft n'entrent pas dans la collection : seule la récompense en sceaux est gagnée.
import { EFFETS, ELEMENTS, FAIBLESSE, ORDRE_RANGS } from './regles';
import { rngAGraine, type Rng } from './rng';
import { tirerBooster } from './tirage';
import { indexer } from './extension';
import type { Booster, CarteTiree, EffetType, ElementId, Extension, Personnage, Rang, Sauvegarde } from './types';

// ---------- Thèmes ----------

/** Critères par carte : chaque carte de l'équipe le respecte ou non. */
export type CritereCarte =
  | { type: 'elements'; valeurs: ElementId[] }
  | { type: 'series'; valeurs: string[] }
  | { type: 'effets'; valeurs: EffetType[] }
  | { type: 'pv-min'; valeur: number }
  | { type: 'degats-forte-min'; valeur: number };

/** Critères d'équipe : évalués sur les 5 cartes gardées. */
export type CritereEquipe =
  | { type: 'rang-max'; valeur: Rang }
  | { type: 'elements-differents-min'; valeur: number }
  | { type: 'paires-serie-min'; valeur: number };

export type CritereTheme = CritereCarte | CritereEquipe;

export interface Theme {
  id: string;
  nom: string;
  description: string;
  critere: CritereTheme;
}

const TYPES_EQUIPE: CritereTheme['type'][] = ['rang-max', 'elements-differents-min', 'paires-serie-min'];
export const estCritereEquipe = (c: CritereTheme): c is CritereEquipe => TYPES_EQUIPE.includes(c.type);

const rangDe = (r: Rang): number => ORDRE_RANGS.indexOf(r);

/**
 * Une carte respecte-t-elle le thème ? Pour « rang-max », oui si son personnage n'est pas au-dessus du rang.
 * Les critères « éléments différents » et « paires de série » ne se jugent que sur l'équipe : toujours false ici
 * (voir `signaleParCarte` et `progressionEquipe`).
 */
export function correspondAuTheme(carte: Personnage, theme: Theme): boolean {
  const c = theme.critere;
  switch (c.type) {
    case 'elements': return c.valeurs.includes(carte.element);
    case 'series': return c.valeurs.includes(carte.serie);
    case 'effets': return carte.attaques.some((a) => a.effet !== null && c.valeurs.includes(a.effet.type));
    case 'pv-min': return carte.pv >= c.valeur;
    case 'degats-forte-min': return carte.attaques[1].degats >= c.valeur;
    case 'rang-max': return rangDe(carte.rang) <= rangDe(c.valeur);
    case 'elements-differents-min':
    case 'paires-serie-min': return false;
  }
}

/** Le thème peut-il se signaler carte par carte pendant le draft ? */
export const signaleParCarte = (theme: Theme): boolean =>
  theme.critere.type !== 'elements-differents-min' && theme.critere.type !== 'paires-serie-min';

export interface ProgressionEquipe {
  /** Où en est l'équipe (personnages au-dessus du rang, éléments différents, paires). */
  valeur: number;
  objectif: number;
  respecte: boolean;
  /** « 3 éléments sur 5 », « 1 paire sur 2 », « Aucun personnage au-dessus du rang B ». */
  texte: string;
}

/** Paires de personnages d'une même série (paires disjointes : 3 d'une série = 1 paire, 4 = 2 paires). */
function paires(equipe: Personnage[]): number {
  const parSerie = new Map<string, number>();
  for (const c of equipe) parSerie.set(c.serie, (parSerie.get(c.serie) ?? 0) + 1);
  return [...parSerie.values()].reduce((n, k) => n + Math.floor(k / 2), 0);
}

/** Progression de l'équipe pour un critère d'équipe (null pour un critère par carte). Équipe vide : jamais respecté. */
export function progressionEquipe(equipe: Personnage[], theme: Theme): ProgressionEquipe | null {
  const c = theme.critere;
  const pl = (n: number, mot: string): string => `${n} ${mot}${n > 1 ? 's' : ''}`;
  switch (c.type) {
    case 'rang-max': {
      const auDessus = equipe.filter((p) => rangDe(p.rang) > rangDe(c.valeur)).length;
      return {
        valeur: auDessus, objectif: 0, respecte: equipe.length > 0 && auDessus === 0,
        texte: auDessus === 0 ? `Aucun personnage au-dessus du rang ${c.valeur}` : `${pl(auDessus, 'personnage')} au-dessus du rang ${c.valeur}`,
      };
    }
    case 'elements-differents-min': {
      const n = new Set(equipe.map((p) => p.element)).size;
      return { valeur: n, objectif: c.valeur, respecte: n >= c.valeur, texte: `${pl(n, 'élément')} sur ${c.valeur}` };
    }
    case 'paires-serie-min': {
      const n = paires(equipe);
      return { valeur: n, objectif: c.valeur, respecte: n >= c.valeur, texte: `${pl(n, 'paire')} sur ${c.valeur}` };
    }
    default:
      return null;
  }
}

/** Part minimale des personnages du draft de la semaine qui doivent respecter un thème à critère par carte. */
export const SEUIL_ELIGIBILITE = 0.15;

/**
 * Un thème est-il éligible pour un draft ? Critère d'équipe : toujours. Critère par carte : si au moins 15 %
 * des personnages (différents) du draft le respectent.
 */
export function themeEligible(theme: Theme, personnagesDuDraft: Personnage[]): boolean {
  if (estCritereEquipe(theme.critere)) return true;
  const uniques = [...new Map(personnagesDuDraft.map((p) => [p.id, p])).values()];
  if (uniques.length === 0) return false;
  return uniques.filter((p) => correspondAuTheme(p, theme)).length >= SEUIL_ELIGIBILITE * uniques.length;
}

/** Vérifie themes-draft.json au démarrage. */
export function validerThemes(themes: Theme[], extension: Extension): string[] {
  const erreurs: string[] = [];
  if (!Array.isArray(themes) || themes.length === 0) return ['Thèmes du draft : la liste est vide.'];
  const series = new Set(extension.personnages.map((p) => p.serie));
  const ids = new Set<string>();
  themes.forEach((t, i) => {
    const ref = `Thème du draft ${i + 1} (« ${t.id ?? '?'} »)`;
    if (!t.id || !t.nom || !t.description) erreurs.push(`${ref} : id, nom et description sont obligatoires.`);
    if (ids.has(t.id)) erreurs.push(`${ref} : identifiant en double.`);
    ids.add(t.id);
    const c = t.critere as CritereTheme | undefined;
    if (!c) { erreurs.push(`${ref} : critère manquant.`); return; }
    switch (c.type) {
      case 'elements':
        for (const v of c.valeurs ?? []) if (!Object.hasOwn(ELEMENTS, v)) erreurs.push(`${ref} : élément inconnu « ${v} ».`);
        if (!c.valeurs?.length) erreurs.push(`${ref} : aucune valeur.`);
        break;
      case 'series':
        for (const v of c.valeurs ?? []) if (!series.has(v)) erreurs.push(`${ref} : série inconnue « ${v} ».`);
        if (!c.valeurs?.length) erreurs.push(`${ref} : aucune valeur.`);
        break;
      case 'effets':
        for (const v of c.valeurs ?? []) if (!Object.hasOwn(EFFETS, v)) erreurs.push(`${ref} : effet inconnu « ${v} ».`);
        if (!c.valeurs?.length) erreurs.push(`${ref} : aucune valeur.`);
        break;
      case 'pv-min':
      case 'degats-forte-min':
        if (!Number.isInteger(c.valeur) || c.valeur <= 0) erreurs.push(`${ref} : valeur entière positive attendue.`);
        break;
      case 'rang-max':
        if (!ORDRE_RANGS.includes(c.valeur)) erreurs.push(`${ref} : rang inconnu « ${String(c.valeur)} » (${ORDRE_RANGS.join(', ')}).`);
        break;
      case 'elements-differents-min':
        if (!Number.isInteger(c.valeur) || c.valeur < 1 || c.valeur > CARTES_A_GARDER) erreurs.push(`${ref} : nombre d'éléments de 1 à ${CARTES_A_GARDER} attendu.`);
        break;
      case 'paires-serie-min':
        if (!Number.isInteger(c.valeur) || c.valeur < 1 || c.valeur > Math.floor(CARTES_A_GARDER / 2)) {
          erreurs.push(`${ref} : nombre de paires de 1 à ${Math.floor(CARTES_A_GARDER / 2)} attendu.`);
        }
        break;
      default:
        erreurs.push(`${ref} : type de critère inconnu « ${String((c as { type: unknown }).type)} ».`);
    }
  });
  return erreurs;
}

// ---------- Semaine et graine ----------

/** Semaine ISO en temps universel (même semaine pour tout le monde), ex. « 2026-S45 ». Commence le lundi 00:00 UTC. */
export function semaineIso(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const jour = d.getUTCDay() || 7; // lundi = 1 … dimanche = 7
  d.setUTCDate(d.getUTCDate() + 4 - jour); // jeudi de la même semaine
  const annee = d.getUTCFullYear();
  const debut = Date.UTC(annee, 0, 1);
  const numero = Math.ceil(((d.getTime() - debut) / 86_400_000 + 1) / 7);
  return `${annee}-S${String(numero).padStart(2, '0')}`;
}

/** Début de la semaine suivante (lundi 00:00 UTC). */
export function prochaineSemaine(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const jour = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 8 - jour);
  return d;
}

/** Adversaires possibles du défi (Neutre n'a ni faiblesse ni force : défi sans objet). */
export const ADVERSAIRES: ElementId[] = ['feu', 'eau', 'glace', 'foudre', 'vent', 'terre', 'lumiere', 'tenebres'];

export interface DraftSemaine {
  semaine: string;
  graine: string;
  theme: Theme;
  /** Élément de l'adversaire du défi. */
  adversaire: ElementId;
  /** 3 boosters de 5 cartes. */
  boosters: CarteTiree[][];
  /** Les 15 cartes, dans l'ordre (indices 0 à 14 utilisés pour le choix). */
  cartes: CarteTiree[];
}

export const BOOSTERS_PAR_DRAFT = 3;
export const CARTES_A_GARDER = 5;

/** Premier jour (lundi, AAAA-MM-JJ en temps universel) de la semaine du draft. */
export function debutSemaine(date: Date): string {
  const d = new Date(prochaineSemaine(date).getTime() - 7 * 86_400_000);
  return d.toISOString().slice(0, 10);
}

/** Une extension du draft et son booster. */
export interface SourceDraft {
  extension: Extension;
  booster: Booster;
}

/** Extensions du draft : les mêmes pour toutes les semaines, ou celles sorties au début de chaque semaine. */
export type SourcesDraft = SourceDraft[] | ((semaine: string) => SourceDraft[]);
const sourcesDe = (sources: SourcesDraft, semaine: string): SourceDraft[] => (typeof sources === 'function' ? sources(semaine) : sources);

/** Lundi 00:00 (temps universel) d'une semaine « AAAA-Snn ». */
export function lundiSemaineIso(semaine: string): Date {
  const [a, n] = semaine.split('-S').map(Number) as [number, number];
  const quatreJanvier = new Date(Date.UTC(a, 0, 4));
  const lundiS1 = Date.UTC(a, 0, 4 - ((quatreJanvier.getUTCDay() || 7) - 1));
  return new Date(lundiS1 + (n - 1) * 7 * 86_400_000);
}
export const semaineSuivante = (semaine: string): string => semaineIso(new Date(lundiSemaineIso(semaine).getTime() + 7 * 86_400_000));
const semainePrecedente = (semaine: string): string => semaineIso(new Date(lundiSemaineIso(semaine).getTime() - 7 * 86_400_000));

/**
 * Première semaine du tirage du thème « en sac ». Les semaines d'avant (déjà commencées quand le sac est arrivé)
 * gardent exactement leur ancien tirage, sur les 10 thèmes de l'ancien fichier (les 10 premiers, dans le même ordre).
 */
export const SEMAINE_DEBUT_SAC = '2026-S46';
export const THEMES_AVANT_SAC = 10;

/** Cartes, adversaire et (ancien tirage seulement) thème d'une semaine. */
function tirerSemaine(semaine: string, sources: SourceDraft[], themes: Theme[]): Omit<DraftSemaine, 'theme'> & { themeAncien: Theme | null } {
  if (sources.length === 0) throw new Error('Draft : aucune extension sortie.');
  const graine = `draft:${sources.map((s) => s.extension.id).join('+')}:${semaine}`;
  const rng = rngAGraine(graine);
  // Ancien tirage : thème, adversaire puis boosters, avec la même graine (drafts déjà joués inchangés).
  const ancien = semaine < SEMAINE_DEBUT_SAC;
  const themeAncien = ancien ? themes[rng.entier(Math.min(THEMES_AVANT_SAC, themes.length))]! : null;
  const adversaire = ADVERSAIRES[rng.entier(ADVERSAIRES.length)]!;
  const boosters = Array.from({ length: BOOSTERS_PAR_DRAFT }, (_, i) => {
    const source = sources[i % sources.length]!;
    return tirerBooster(source.booster, source.extension, rng).cartes;
  });
  return { semaine, graine, adversaire, boosters, cartes: boosters.flat(), themeAncien };
}

/** Personnages des 15 cartes du draft. */
function personnagesDuDraft(cartes: CarteTiree[], sources: SourceDraft[]): Personnage[] {
  return cartes.map((t) => {
    const ext = sources.find((s) => indexer(s.extension).carte(t.carteId))!.extension;
    const index = indexer(ext);
    return index.personnageDe(index.carte(t.carteId)!);
  });
}

/** Mélange de Fisher-Yates (ids de thèmes) avec la graine du cycle. */
function sacDuCycle(themes: Theme[], cycle: number): string[] {
  const rng: Rng = rngAGraine(`draft-themes:cycle:${cycle}`);
  const sac = themes.map((t) => t.id);
  for (let i = sac.length - 1; i > 0; i--) {
    const j = rng.entier(i + 1);
    [sac[i], sac[j]] = [sac[j]!, sac[i]!];
  }
  return sac;
}

/**
 * Thème de chaque semaine depuis SEMAINE_DEBUT_SAC jusqu'à `jusqua` (comprise), rejoué semaine après semaine :
 * - un sac mélangé avec la graine du cycle ; on prend le premier thème du sac pas encore sorti dans le cycle,
 *   éligible pour le draft de la semaine et différent de celui de la semaine précédente ;
 * - si aucun ne convient, un nouveau cycle commence (nouveau sac) : chaque thème éligible revient donc une fois
 *   avant qu'un autre ne se répète, et jamais deux semaines de suite.
 */
export function themesDesSemaines(jusqua: string, sources: SourcesDraft, themes: Theme[]): Map<string, Theme> {
  const parId = new Map(themes.map((t) => [t.id, t]));
  const resultat = new Map<string, Theme>();
  if (jusqua < SEMAINE_DEBUT_SAC) return resultat;
  // La semaine d'avant le sac (ancien tirage) compte pour « jamais deux semaines de suite ».
  const veille = semainePrecedente(SEMAINE_DEBUT_SAC);
  let precedent: string | null = tirerSemaine(veille, sourcesDe(sources, veille), themes).themeAncien?.id ?? null;
  let cycle = 0;
  let sac = sacDuCycle(themes, cycle);
  let sortis = new Set<string>();
  for (let semaine = SEMAINE_DEBUT_SAC; semaine <= jusqua; semaine = semaineSuivante(semaine)) {
    const src = sourcesDe(sources, semaine);
    const persos = personnagesDuDraft(tirerSemaine(semaine, src, themes).cartes, src);
    const convient = (id: string): boolean => id !== precedent && themeEligible(parId.get(id)!, persos);
    let choisi = sac.find((id) => !sortis.has(id) && convient(id));
    if (!choisi) {
      cycle++;
      sac = sacDuCycle(themes, cycle);
      sortis = new Set();
      choisi = sac.find(convient) ?? sac.find((id) => id !== precedent)!;
    }
    sortis.add(choisi);
    precedent = choisi;
    resultat.set(semaine, parId.get(choisi)!);
  }
  return resultat;
}

/**
 * Draft de la semaine : identique pour tous, car tout vient de la graine « draft:<extensions>:<semaine> »
 * et de la graine du cycle des thèmes.
 * Les sources sont les extensions sorties au début de la semaine (le draft ne change pas en cours de semaine) ;
 * les 3 boosters tournent entre elles dans l'ordre (avec Lancement et Renforts : Lancement, Renforts, Lancement).
 * Avec une seule extension, la graine reste « draft:lancement:<semaine> ».
 */
export function genererDraft(semaine: string, sources: SourcesDraft, themes: Theme[]): DraftSemaine {
  const { themeAncien, ...tirage } = tirerSemaine(semaine, sourcesDe(sources, semaine), themes);
  const theme = themeAncien ?? themesDesSemaines(semaine, sources, themes).get(semaine)!;
  return { ...tirage, theme };
}

// ---------- Score ----------

export type Categorie = 'Puissance' | 'Thème' | 'Synergies' | 'Défi';
export interface LigneScore { categorie: Categorie; libelle: string; points: number }
export interface Score { total: number; lignes: LigneScore[] }

/** Barème du score (détaillé à l'écran). */
export const BAREME = {
  /** Puissance d'un personnage : (PV + dégâts des deux attaques) ÷ 10, arrondi. */
  diviseurPuissance: 10,
  parCarteDuTheme: 15,
  equipeEntiereDuTheme: 20,
  /** Thème à critère d'équipe respecté : autant qu'une équipe entière du thème (5 × 15 + 20). */
  critereEquipeRespecte: 95,
  parCarteMemeSerie: 10,
  parCarteCouverte: 8,
  aucuneFaiblessePartagee: 15,
  parCarteForteContreAdversaire: 10,
  parCarteFaibleContreAdversaire: -10,
} as const;

export function puissance(carte: Personnage): number {
  return Math.round((carte.pv + carte.attaques[0].degats + carte.attaques[1].degats) / BAREME.diviseurPuissance);
}

/**
 * Score d'une équipe de cartes (personnages distincts).
 * - Puissance : (PV + dégâts) ÷ 10 par carte.
 * - Thème : +15 par carte du thème, +20 si toute l'équipe l'est ; critère d'équipe respecté : +95 (tout ou rien).
 * - Synergies : +10 par carte en plus dans une même série ; +8 par carte dont la menace est couverte
 *   (une autre carte bat l'élément qui la bat) ; +15 si aucune faiblesse n'est partagée.
 * - Défi : +10 par carte forte contre l'adversaire, −10 par carte faible contre lui.
 */
export function scorer(equipe: Personnage[], theme: Theme, adversaire: ElementId): Score {
  const lignes: LigneScore[] = [];
  const nomEl = (e: ElementId): string => ELEMENTS[e].nom;

  for (const c of equipe) lignes.push({ categorie: 'Puissance', libelle: `${c.nom} (${c.pv} PV, ${c.attaques[0].degats} + ${c.attaques[1].degats} dégâts)`, points: puissance(c) });

  const progression = progressionEquipe(equipe, theme);
  if (progression) {
    // Critère d'équipe : tout ou rien, la ligne montre toujours où en est l'équipe.
    if (equipe.length > 0) {
      lignes.push({
        categorie: 'Thème',
        libelle: `Thème « ${theme.nom} » ${progression.respecte ? 'respecté' : 'pas encore respecté'} : ${progression.texte}`,
        points: progression.respecte ? BAREME.critereEquipeRespecte : 0,
      });
    }
  } else {
    const duTheme = equipe.filter((c) => correspondAuTheme(c, theme));
    if (duTheme.length > 0) lignes.push({ categorie: 'Thème', libelle: `${duTheme.length} carte${duTheme.length > 1 ? 's' : ''} du thème « ${theme.nom} »`, points: duTheme.length * BAREME.parCarteDuTheme });
    if (equipe.length > 0 && duTheme.length === equipe.length) lignes.push({ categorie: 'Thème', libelle: 'Toute l’équipe respecte le thème', points: BAREME.equipeEntiereDuTheme });
  }

  const parSerie = new Map<string, number>();
  for (const c of equipe) parSerie.set(c.serie, (parSerie.get(c.serie) ?? 0) + 1);
  for (const [serie, n] of [...parSerie].sort((a, b) => a[0].localeCompare(b[0], 'fr'))) {
    if (n >= 2) lignes.push({ categorie: 'Synergies', libelle: `Même série : ${serie} ×${n}`, points: (n - 1) * BAREME.parCarteMemeSerie });
  }

  const couvertes = equipe.filter((c, i) => {
    const menace = FAIBLESSE[c.element];
    const parade = menace ? FAIBLESSE[menace] : null;
    return parade !== null && equipe.some((autre, j) => j !== i && autre.element === parade);
  });
  if (couvertes.length > 0) lignes.push({ categorie: 'Synergies', libelle: `Éléments complémentaires : ${couvertes.length} carte${couvertes.length > 1 ? 's' : ''} couverte${couvertes.length > 1 ? 's' : ''}`, points: couvertes.length * BAREME.parCarteCouverte });

  const faiblesses = equipe.map((c) => FAIBLESSE[c.element]).filter((f): f is ElementId => f !== null);
  if (equipe.length > 0 && new Set(faiblesses).size === faiblesses.length) lignes.push({ categorie: 'Synergies', libelle: 'Aucune faiblesse partagée', points: BAREME.aucuneFaiblessePartagee });

  const fortes = equipe.filter((c) => FAIBLESSE[adversaire] === c.element);
  const faibles = equipe.filter((c) => FAIBLESSE[c.element] === adversaire);
  if (fortes.length > 0) lignes.push({ categorie: 'Défi', libelle: `${fortes.length} carte${fortes.length > 1 ? 's' : ''} forte${fortes.length > 1 ? 's' : ''} contre ${nomEl(adversaire)}`, points: fortes.length * BAREME.parCarteForteContreAdversaire });
  if (faibles.length > 0) lignes.push({ categorie: 'Défi', libelle: `${faibles.length} carte${faibles.length > 1 ? 's' : ''} faible${faibles.length > 1 ? 's' : ''} contre ${nomEl(adversaire)}`, points: faibles.length * BAREME.parCarteFaibleContreAdversaire });

  return { total: lignes.reduce((a, l) => a + l.points, 0), lignes };
}

// ---------- Choix et récompense ----------
// Récompense : participation au draft (quetes.json, « hebdomadaire »), quel que soit le score.

/** Cartes de l'équipe choisie (indices dans les 15). Renvoie un message d'erreur si le choix est invalide. */
export function equipeChoisie(draft: DraftSemaine, choix: number[], extension: Extension): Personnage[] | string {
  if (choix.length !== CARTES_A_GARDER) return `Choisis exactement ${CARTES_A_GARDER} cartes.`;
  if (new Set(choix).size !== choix.length) return 'Une même carte est choisie deux fois.';
  const index = indexer(extension);
  const equipe: Personnage[] = [];
  for (const i of choix) {
    const t = Number.isInteger(i) ? draft.cartes[i] : undefined;
    const c = t && index.carte(t.carteId);
    const carte = c && index.personnageDe(c);
    if (!carte) return 'Carte hors du draft.';
    if (equipe.some((c) => c.id === carte.id)) return `${carte.nom} est déjà dans l’équipe : choisis des personnages différents.`;
    equipe.push(carte);
  }
  return equipe;
}

export type ResultatDraft =
  | { ok: true; sauvegarde: Sauvegarde; score: Score; sceaux: number }
  | { ok: false; raison: 'deja-joue' | 'choix-invalide'; message: string };

/**
 * Valide l'équipe de la semaine : score, récompense de participation et enregistrement en une seule nouvelle sauvegarde.
 * La récompense est la participation au draft (quetes.json, « hebdomadaire ») : le score ne la change pas.
 */
export function jouerDraft(s: Sauvegarde, draft: DraftSemaine, choix: number[], extension: Extension, sceauxParticipation: number): ResultatDraft {
  if (s.dernierDraft?.semaine === draft.semaine) {
    return { ok: false, raison: 'deja-joue', message: 'Tu as déjà joué le draft de cette semaine.' };
  }
  const equipe = equipeChoisie(draft, choix, extension);
  if (typeof equipe === 'string') return { ok: false, raison: 'choix-invalide', message: equipe };
  const score = scorer(equipe, draft.theme, draft.adversaire);
  const sceaux = sceauxParticipation;
  return {
    ok: true,
    score,
    sceaux,
    sauvegarde: {
      ...s,
      sceaux: s.sceaux + sceaux,
      dernierDraft: { semaine: draft.semaine, choix: [...choix], score: score.total, sceaux },
    },
  };
}
