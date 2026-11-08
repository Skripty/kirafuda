// Sauvegarde locale (localStorage, export et import d'un fichier JSON).
// Version 2 : draft hebdomadaire. Version 3 : collection comptée par id de carte (système TCG Pocket).
// Règle 6 : une opération = une mise à jour complète. On écrit toujours l'état entier,
// en une seule écriture, sous une seule clé : jamais d'état à moitié enregistré.
// Le stockage est injecté (localStorage dans le navigateur, un faux stockage dans les tests).
import { FINITIONS, PRIX_BOUTIQUE } from './regles';
import { indexer } from './extension';
import { etatQuetesInitial, lireEtatQuetes } from './quetes';
import type { CarteTiree, DraftJoue, Extension, FinitionId, Ouverture, Sauvegarde } from './types';

export const CLE_SAUVEGARDE = 'kirafuda:sauvegarde';
/** Copie d'une sauvegarde illisible, mise de côté au lieu d'être écrasée. */
export const CLE_SAUVEGARDE_ILLISIBLE = 'kirafuda:sauvegarde-illisible';
export const VERSION_SAUVEGARDE = 8;

/** Le sous-ensemble de `Storage` dont on a besoin. */
export interface Stockage {
  getItem(cle: string): string | null;
  setItem(cle: string, valeur: string): void;
}

export interface ContexteValidation {
  /** Données de l'extension : nécessaires pour migrer une sauvegarde antérieure à la version 3. */
  extension?: Extension;
  /** Toutes les extensions du jeu : les cartes connues (import). Par défaut, celles de `extension`. */
  extensions?: Extension[];
  /** Refuser les cartes absentes des extensions (import d'un fichier). Au chargement, on reste tolérant. */
  refuserCartesInconnues?: boolean;
}

export type ResultatValidation =
  | { ok: true; sauvegarde: Sauvegarde; migreeDepuis: number | null }
  | { ok: false; erreurs: string[] };

export function sauvegardeParDefaut(): Sauvegarde {
  return {
    version: 8,
    sceaux: 0,
    derniereRecompenseQuotidienne: null,
    collection: {},
    points: {},
    historique: [],
    dernierDraft: null,
    quetes: etatQuetesInitial(),
  };
}

// ---------- Migrations ----------

/**
 * Migrations par numéro de version : MIGRATIONS[n] transforme une sauvegarde de version n
 * en version n + 1.
 */
export type Migration = (donnees: Record<string, unknown>, contexte: ContexteValidation) => Record<string, unknown>;

export const MIGRATIONS: Record<number, Migration> = {
  // Version 2 : ajout du draft hebdomadaire (aucun draft joué).
  1: (d) => ({ ...d, dernierDraft: null }),
  // Version 3 : la collection compte par id de carte.
  2: (d, contexte) => migrerCollectionParCarte(d, contexte),
  // Version 4 : quêtes, calendrier de bienvenue et boosters garantis.
  3: (d) => ajouterQuetes(d),
  // Version 5 : quêtes de débutant renommées (10 → 30 boosters, 50 → 75 cartes) ; une récompense réclamée le reste.
  4: (d) => renommerQuetesDebutant(d, RENOMMAGES_V5),
  // Version 6 : « premier draft » devient « 3 drafts » ; une récompense réclamée le reste.
  5: (d) => renommerQuetesDebutant(d, RENOMMAGES_V6),
  // Version 7 : calendriers de lancement des extensions (aucune case reçue).
  6: (d) => (estObjet(d.quetes) ? { ...d, quetes: { ...d.quetes, lancementsRecus: {} } } : d),
  // Version 8 : Renforts devient une vague de Lancement (un seul booster).
  7: (d) => fusionnerVaguesLancement(d),
};

/** Anciennes extensions devenues des vagues : id → extension qui les accueille, et leur ancien booster. */
export const VAGUES_FUSIONNEES: Record<string, { extension: string; ancienBooster: string; booster: string }> = {
  renforts: { extension: 'lancement', ancienBooster: 'booster-renforts', booster: 'booster-lancement' },
};

/**
 * Version 7 → 8 : les points Renforts sont ajoutés aux points Lancement ; les ouvertures du booster Renforts sont
 * rattachées au booster Lancement (leurs cartes ne changent pas). Collection et historique sont conservés.
 */
export function fusionnerVaguesLancement(d: Record<string, unknown>): Record<string, unknown> {
  let r = d;
  for (const [ancienne, cible] of Object.entries(VAGUES_FUSIONNEES)) {
    if (estObjet(r.points) && ancienne in r.points) {
      const points = { ...r.points };
      const ajout = points[ancienne];
      delete points[ancienne];
      const avant = points[cible.extension];
      points[cible.extension] = (typeof avant === 'number' ? avant : 0) + (typeof ajout === 'number' ? ajout : 0);
      r = { ...r, points };
    }
    if (Array.isArray(r.historique)) {
      r = { ...r, historique: r.historique.map((o: unknown) => (estObjet(o) && o.boosterId === cible.ancienBooster ? { ...o, boosterId: cible.booster } : o)) };
    }
  }
  return r;
}

/** Anciens ids de quêtes de débutant → nouveaux ids (version 5). */
export const RENOMMAGES_V5: Record<string, string> = {
  'dix-boosters': 'trente-boosters',
  'cartes-50': 'cartes-75',
};
/** Anciens ids de quêtes de débutant → nouveaux ids (version 6). */
export const RENOMMAGES_V6: Record<string, string> = {
  'premier-draft': 'trois-drafts',
};

/** Quêtes de débutant renommées : une récompense déjà réclamée sous l'ancien id reste réclamée sous le nouveau. */
export function renommerQuetesDebutant(d: Record<string, unknown>, renommages: Record<string, string>): Record<string, unknown> {
  if (!estObjet(d.quetes) || !Array.isArray(d.quetes.debutantReclamees)) return d; // la validation dira ce qui ne va pas
  const reclamees = [...new Set(d.quetes.debutantReclamees.map((id: unknown) => (typeof id === 'string' ? renommages[id] ?? id : id)))];
  return { ...d, quetes: { ...d.quetes, debutantReclamees: reclamees } };
}

/**
 * Version 3 → 4 : état des quêtes. Les compteurs des quêtes de débutant reprennent ce que le joueur a déjà fait
 * (boosters ouverts, cartes obtenues, draft joué), pour ne rien perdre. Le calendrier de bienvenue commence
 * au prochain lancement ; le booster garanti du jour 1 ne vaut que si aucun booster n'a encore été ouvert.
 */
export function ajouterQuetes(d: Record<string, unknown>): Record<string, unknown> {
  const historique = Array.isArray(d.historique) ? d.historique : [];
  const cartes = historique.reduce((n: number, o: unknown) => n + (estObjet(o) && Array.isArray(o.cartes) ? o.cartes.length : 0), 0);
  const cumuls: Record<string, number> = {};
  if (historique.length) cumuls['booster-ouvert'] = historique.length;
  if (cartes) cumuls['carte-obtenue'] = cartes;
  if (d.dernierDraft) cumuls['draft-joue'] = 1;
  return { ...d, quetes: { ...etatQuetesInitial(), cumuls } };
}

/**
 * Version 2 → 3. Avant, une clé « lan-041:holo » voulait dire « le personnage n° 41 dans la finition holo ».
 * Chaque exemplaire devient la carte du même personnage dans la même finition si elle existe ;
 * sinon il est converti en points de booster au prix de la boutique de sa finition.
 * Sceaux, points et historique sont gardés (les cartes de l'historique sont converties de la même façon).
 */
export function migrerCollectionParCarte(d: Record<string, unknown>, contexte: ContexteValidation): Record<string, unknown> {
  const ext = contexte.extension;
  if (!ext) throw new Error('Migration vers la version 3 impossible sans les données de l’extension.');
  const index = indexer(ext);
  /** Ancienne carte n° N = personnage de la carte de base n° N (les ids de base n'ont pas changé). */
  const personnageDe = (ancienId: string): string | undefined => {
    const c = index.carte(ancienId);
    return c && !c.secrete ? c.personnage : undefined;
  };
  const cible = (ancienId: string, finition: string) => {
    const p = personnageDe(ancienId);
    return p ? index.cartesDe(p).find((c) => c.finition === finition) : undefined;
  };

  const collection: Record<string, unknown> = {};
  let pointsGagnes = 0;
  for (const [cle, n] of Object.entries(estObjet(d.collection) ? d.collection : {})) {
    const sep = cle.lastIndexOf(':');
    const ancienId = cle.slice(0, sep);
    const finition = cle.slice(sep + 1);
    if (sep <= 0 || !estFinition(finition) || !estEntier(n, 1)) { collection[cle] = n; continue; } // signalé ensuite
    const carte = cible(ancienId, finition);
    if (carte) collection[carte.id] = ((collection[carte.id] as number | undefined) ?? 0) + n;
    else pointsGagnes += n * PRIX_BOUTIQUE[finition];
  }

  const points = estObjet(d.points) ? { ...d.points } : {};
  if (pointsGagnes > 0) points[ext.id] = ((points[ext.id] as number | undefined) ?? 0) + pointsGagnes;

  const historique = Array.isArray(d.historique)
    ? d.historique.map((o: unknown) => {
      if (!estObjet(o) || !Array.isArray(o.cartes)) return o;
      return {
        ...o,
        cartes: o.cartes.map((c: unknown) => {
          if (!estObjet(c) || typeof c.carteId !== 'string' || typeof c.finition !== 'string') return c;
          // Carte du même personnage dans cette finition, sinon sa carte de base (la finition d'origine est gardée).
          return { ...c, carteId: cible(c.carteId, c.finition)?.id ?? c.carteId };
        }),
      };
    })
    : d.historique;

  return { ...d, collection, points, historique };
}

/** Applique les migrations une par une jusqu'à `versionCible`. `depuis` : version d'origine si migrée, sinon null. */
export function migrer(
  donnees: Record<string, unknown>,
  migrations: Record<number, Migration> = MIGRATIONS,
  versionCible: number = VERSION_SAUVEGARDE,
  contexte: ContexteValidation = {},
): { donnees: Record<string, unknown>; depuis: number | null } | { erreur: string } {
  const version = donnees.version;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return { erreur: 'Numéro de version absent ou invalide.' };
  }
  if (version > versionCible) {
    return { erreur: `Sauvegarde créée par une version plus récente du jeu (version ${version}, ce jeu lit jusqu'à la version ${versionCible}).` };
  }
  let courant = donnees;
  for (let v = version; v < versionCible; v++) {
    const etape = migrations[v];
    if (!etape) return { erreur: `Aucune migration connue de la version ${v} vers la version ${v + 1}.` };
    try {
      courant = { ...etape(courant, contexte), version: v + 1 };
    } catch (e) {
      return { erreur: (e as Error).message };
    }
  }
  return { donnees: courant, depuis: version === versionCible ? null : version };
}

// ---------- Validation ----------

const estObjet = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null && !Array.isArray(x);
const estEntier = (x: unknown, min: number): x is number =>
  typeof x === 'number' && Number.isInteger(x) && x >= min;
const estFinition = (x: unknown): x is FinitionId => typeof x === 'string' && Object.hasOwn(FINITIONS, x);

function estJourIso(x: unknown): x is string {
  if (typeof x !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(x)) return false;
  const d = new Date(`${x}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === x;
}
const estDateIso = (x: unknown): x is string => typeof x === 'string' && x.length > 0 && !Number.isNaN(Date.parse(x));

/** Lit une valeur au format de la sauvegarde ; renvoie une copie propre (sans champ inconnu) ou les erreurs. */
function lire(d: Record<string, unknown>, contexte: ContexteValidation): { sauvegarde: Sauvegarde } | { erreurs: string[] } {
  const erreurs: string[] = [];
  const connues = contexte.extensions ?? (contexte.extension ? [contexte.extension] : []);
  const ids = contexte.refuserCartesInconnues && connues.length > 0 ? new Set(connues.flatMap((e) => e.cartes.map((c) => c.id))) : null;
  const carteConnue = (id: string): boolean => !ids || ids.has(id);

  if (!estEntier(d.sceaux, 0)) erreurs.push('Sceaux : un entier positif ou nul est attendu.');

  const jour = d.derniereRecompenseQuotidienne;
  if (jour !== null && !estJourIso(jour)) {
    erreurs.push('Dernière récompense quotidienne : une date AAAA-MM-JJ ou null est attendue.');
  }

  const collection: Record<string, number> = {};
  if (!estObjet(d.collection)) {
    erreurs.push('Collection : un objet est attendu.');
  } else {
    for (const [cle, n] of Object.entries(d.collection)) {
      if (!/^[a-z0-9-]+$/.test(cle)) {
        erreurs.push(`Collection : clé « ${cle} » invalide (attendu un id de carte, ex. « lan-041 »).`);
      } else if (!carteConnue(cle)) {
        erreurs.push(`Collection : carte inconnue « ${cle} ».`);
      }
      if (!estEntier(n, 1)) erreurs.push(`Collection : « ${cle} » doit compter au moins 1 exemplaire.`);
      else collection[cle] = n;
    }
  }

  const points: Record<string, number> = {};
  if (!estObjet(d.points)) {
    erreurs.push('Points : un objet est attendu.');
  } else {
    for (const [ext, n] of Object.entries(d.points)) {
      if (!estEntier(n, 0)) erreurs.push(`Points de « ${ext} » : un entier positif ou nul est attendu.`);
      else points[ext] = n;
    }
  }

  const historique: Ouverture[] = [];
  if (!Array.isArray(d.historique)) {
    erreurs.push('Historique : une liste est attendue.');
  } else {
    d.historique.forEach((o: unknown, i) => {
      const ref = `Historique, ouverture ${i + 1}`;
      if (!estObjet(o)) { erreurs.push(`${ref} : un objet est attendu.`); return; }
      const avant = erreurs.length;
      if (typeof o.id !== 'string' || o.id === '') erreurs.push(`${ref} : identifiant manquant.`);
      if (!estDateIso(o.date)) erreurs.push(`${ref} : date invalide.`);
      if (typeof o.boosterId !== 'string' || o.boosterId === '') erreurs.push(`${ref} : booster manquant.`);
      if (typeof o.exceptionnelle !== 'boolean') erreurs.push(`${ref} : « exceptionnelle » doit valoir true ou false.`);
      if (!estEntier(o.pointsGagnes, 0)) erreurs.push(`${ref} : points gagnés invalides.`);
      if (typeof o.vue !== 'boolean') erreurs.push(`${ref} : « vue » doit valoir true ou false.`);
      const cartes: Ouverture['cartes'] = [];
      if (!Array.isArray(o.cartes)) {
        erreurs.push(`${ref} : liste de cartes manquante.`);
      } else {
        o.cartes.forEach((c: unknown, j) => {
          const refC = `${ref}, carte ${j + 1}`;
          if (!estObjet(c)) { erreurs.push(`${refC} : un objet est attendu.`); return; }
          if (typeof c.carteId !== 'string' || !carteConnue(c.carteId)) erreurs.push(`${refC} : carte inconnue « ${String(c.carteId)} ».`);
          if (!estFinition(c.finition)) erreurs.push(`${refC} : finition inconnue « ${String(c.finition)} ».`);
          if (!estEntier(c.emplacement, 1)) erreurs.push(`${refC} : emplacement invalide.`);
          if (typeof c.nouveau !== 'boolean') erreurs.push(`${refC} : « nouveau » doit valoir true ou false.`);
          if (!estEntier(c.exemplaires, 1)) erreurs.push(`${refC} : nombre d'exemplaires invalide.`);
          cartes.push({
            carteId: c.carteId as string,
            finition: c.finition as CarteTiree['finition'],
            emplacement: c.emplacement as number,
            nouveau: c.nouveau as boolean,
            exemplaires: c.exemplaires as number,
          });
        });
      }
      if (erreurs.length === avant) {
        historique.push({
          id: o.id as string,
          date: o.date as string,
          boosterId: o.boosterId as string,
          exceptionnelle: o.exceptionnelle as boolean,
          cartes,
          pointsGagnes: o.pointsGagnes as number,
          vue: o.vue as boolean,
        });
      }
    });
  }

  let dernierDraft: DraftJoue | null = null;
  if (d.dernierDraft !== null) {
    const dj = d.dernierDraft;
    const choixOk = estObjet(dj) && Array.isArray(dj.choix) && dj.choix.length === 5
      && dj.choix.every((i) => estEntier(i, 0) && i < 15) && new Set(dj.choix).size === 5;
    if (!estObjet(dj) || typeof dj.semaine !== 'string' || dj.semaine === '' || !choixOk
      || typeof dj.score !== 'number' || !Number.isInteger(dj.score) || !estEntier(dj.sceaux, 0)) {
      erreurs.push('Dernier draft : semaine, 5 choix distincts de 0 à 14, score et sceaux entiers attendus (ou null).');
    } else {
      dernierDraft = { semaine: dj.semaine, choix: [...(dj.choix as number[])], score: dj.score, sceaux: dj.sceaux as number };
      // Classement en ligne (tâche 24) : champs facultatifs, sans changement de version.
      for (const champ of ['envoye', 'dansClassement'] as const) {
        if (dj[champ] === undefined) continue;
        if (typeof dj[champ] !== 'boolean') erreurs.push(`Dernier draft : « ${champ} » doit être vrai ou faux.`);
        else dernierDraft[champ] = dj[champ];
      }
    }
  }

  const quetes = lireEtatQuetes(d.quetes);
  if (Array.isArray(quetes)) erreurs.push(...quetes);

  if (erreurs.length > 0 || Array.isArray(quetes)) return { erreurs };
  return {
    sauvegarde: {
      version: 8,
      sceaux: d.sceaux as number,
      derniereRecompenseQuotidienne: jour as string | null,
      collection,
      points,
      historique,
      dernierDraft,
      quetes,
    },
  };
}

/**
 * Valide des données quelconques (fichier importé, contenu du stockage) et les migre si besoin.
 * Renvoie une sauvegarde propre, ou la liste des erreurs en français.
 */
export function validerSauvegarde(donnees: unknown, contexte: ContexteValidation = {}): ResultatValidation {
  if (!estObjet(donnees)) return { ok: false, erreurs: ['Ce n’est pas une sauvegarde Kirafuda.'] };
  const migree = migrer(donnees, MIGRATIONS, VERSION_SAUVEGARDE, contexte);
  if ('erreur' in migree) return { ok: false, erreurs: [migree.erreur] };
  const lue = lire(migree.donnees, contexte);
  if ('erreurs' in lue) return { ok: false, erreurs: lue.erreurs };
  return { ok: true, sauvegarde: lue.sauvegarde, migreeDepuis: migree.depuis };
}

// ---------- Lecture et écriture ----------

export interface Chargement {
  sauvegarde: Sauvegarde;
  /** Message à montrer au joueur si la sauvegarde n'a pas pu être lue telle quelle. */
  avertissement: string | null;
  /** Version d'origine si la sauvegarde vient d'être migrée, sinon null. */
  migreeDepuis: number | null;
}

/**
 * Lit la sauvegarde. Absente : valeurs par défaut. Illisible : valeurs par défaut, et l'ancienne
 * version est mise de côté (jamais effacée) sous CLE_SAUVEGARDE_ILLISIBLE.
 */
export function chargerSauvegarde(stockage: Stockage, contexte: ContexteValidation = {}): Chargement {
  let brut: string | null;
  try {
    brut = stockage.getItem(CLE_SAUVEGARDE);
  } catch {
    return {
      sauvegarde: sauvegardeParDefaut(),
      avertissement: 'Le stockage local est indisponible (navigation privée ?) : ta progression ne sera pas conservée.',
      migreeDepuis: null,
    };
  }
  if (brut === null) return { sauvegarde: sauvegardeParDefaut(), avertissement: null, migreeDepuis: null };

  let donnees: unknown;
  try {
    donnees = JSON.parse(brut);
  } catch {
    donnees = undefined;
  }
  const resultat = validerSauvegarde(donnees, contexte);
  if (resultat.ok) {
    if (resultat.migreeDepuis !== null) enregistrerSauvegarde(stockage, resultat.sauvegarde);
    return { sauvegarde: resultat.sauvegarde, avertissement: null, migreeDepuis: resultat.migreeDepuis };
  }

  try {
    stockage.setItem(CLE_SAUVEGARDE_ILLISIBLE, brut);
  } catch {
    // Mise de côté impossible : on n'écrase pas pour autant la sauvegarde d'origine ici.
  }
  return {
    sauvegarde: sauvegardeParDefaut(),
    avertissement: 'Ta sauvegarde n’a pas pu être lue. Une copie a été mise de côté et une nouvelle partie commence.',
    migreeDepuis: null,
  };
}

export type ResultatEcriture = { ok: true } | { ok: false; erreur: string };

/**
 * Écrit l'état complet en une seule écriture. Une sauvegarde invalide n'est jamais écrite :
 * l'état enregistré reste alors celui d'avant (tout ou rien).
 */
export function enregistrerSauvegarde(stockage: Stockage, sauvegarde: Sauvegarde, contexte: ContexteValidation = {}): ResultatEcriture {
  const verif = validerSauvegarde(sauvegarde, contexte);
  if (!verif.ok) return { ok: false, erreur: `Sauvegarde refusée : ${verif.erreurs[0]}` };
  try {
    stockage.setItem(CLE_SAUVEGARDE, JSON.stringify(verif.sauvegarde));
    return { ok: true };
  } catch {
    return { ok: false, erreur: 'Impossible d’écrire la sauvegarde (stockage plein ou indisponible).' };
  }
}

// ---------- Export et import ----------

/** Contenu du fichier d'export (JSON lisible). */
export function exporterSauvegarde(sauvegarde: Sauvegarde): string {
  return JSON.stringify(sauvegarde, null, 2) + '\n';
}

export function nomFichierExport(date: Date): string {
  const p = (n: number): string => String(n).padStart(2, '0');
  return `kirafuda-sauvegarde-${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}.json`;
}

/** Lit le texte d'un fichier importé. Ne touche pas au stockage : l'appelant enregistre après confirmation. */
export function importerSauvegarde(texte: string, contexte: ContexteValidation = {}): ResultatValidation {
  let donnees: unknown;
  try {
    donnees = JSON.parse(texte);
  } catch {
    return { ok: false, erreurs: ['Le fichier n’est pas un fichier JSON valide.'] };
  }
  return validerSauvegarde(donnees, contexte);
}
