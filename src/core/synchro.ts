// Synchronisation de la sauvegarde avec le compte en ligne (tâche 23). Logique pure, sans réseau ni DOM.
//
// - La sauvegarde locale reste la référence pendant la partie : elle est envoyée en ligne après chaque opération
//   (envois regroupés, au plus un toutes les 5 secondes) et au moment de quitter.
// - À la connexion : si une seule des deux sauvegardes existe, on la garde ; si les deux existent et diffèrent,
//   le joueur choisit — sauf quand on sait laquelle est à jour (une seule a changé depuis la dernière synchronisation).
// - Hors ligne, le jeu continue ; les envois reprennent au retour du réseau.
import type { Sauvegarde } from './types';

/** Délai minimal entre deux envois (ms). */
export const DELAI_ENVOI = 5000;
/** Nouvel essai après un échec d'envoi (ms). */
export const DELAI_REESSAI = 30000;

// ---------- Empreinte ----------

/** JSON aux clés triées : deux objets égaux donnent le même texte (jsonb ne garde pas l'ordre des clés). */
export function jsonCanonique(valeur: unknown): string {
  if (valeur === null || typeof valeur !== 'object') return JSON.stringify(valeur) ?? 'null';
  if (Array.isArray(valeur)) return `[${valeur.map((v) => (v === undefined ? 'null' : jsonCanonique(v))).join(',')}]`;
  const o = valeur as Record<string, unknown>;
  return `{${Object.keys(o).filter((k) => o[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${jsonCanonique(o[k])}`).join(',')}}`;
}

/** Empreinte courte du contenu d'une sauvegarde (FNV-1a 32 bits, deux passes) : sert seulement à comparer. */
export function empreinte(valeur: unknown): string {
  const texte = jsonCanonique(valeur);
  let a = 0x811c9dc5;
  let b = 0x01000193 ^ texte.length;
  for (let i = 0; i < texte.length; i++) {
    const c = texte.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193);
    b = Math.imul(b ^ c, 0x5bd1e995);
  }
  return `${(a >>> 0).toString(16).padStart(8, '0')}${(b >>> 0).toString(16).padStart(8, '0')}`;
}

// ---------- Résumé (écran de choix) ----------

export interface Resume {
  /** Exemplaires possédés. */
  cartes: number;
  cartesDifferentes: number;
  /** Boosters ouverts (historique complet). */
  boosters: number;
  sceaux: number;
}

export function resumer(s: Sauvegarde): Resume {
  const exemplaires = Object.values(s.collection);
  return {
    cartes: exemplaires.reduce((a, b) => a + b, 0),
    cartesDifferentes: exemplaires.filter((n) => n > 0).length,
    boosters: s.historique.length,
    sceaux: s.sceaux,
  };
}

/** Une sauvegarde « vierge » (aucune carte, aucun booster, aucun draft) compte comme absente. */
export const estVierge = (s: Sauvegarde): boolean =>
  Object.keys(s.collection).length === 0 && s.historique.length === 0 && s.dernierDraft === null;

// ---------- Décision à la connexion ----------

/** Ce que l'appareil sait de la dernière synchronisation réussie (gardé dans le navigateur). */
export interface MetaSynchro {
  utilisateur: string;
  /** Empreinte des données envoyées ou reçues en dernier. */
  empreinte: string;
  /** Date (serveur) de la version en ligne correspondante. */
  enLigneLe: string;
}

export interface SauvegardeEnLigne {
  sauvegarde: Sauvegarde;
  /** Date de mise à jour côté serveur (ISO). */
  misAJourLe: string;
}

export type Decision =
  /** Rien à faire (aucune sauvegarde avec du contenu, ou les deux sont identiques). */
  | { action: 'rien' }
  /** La sauvegarde locale est gardée et envoyée en ligne. */
  | { action: 'envoyer' }
  /** La sauvegarde en ligne remplace la locale. */
  | { action: 'prendre' }
  /** Les deux existent et ont changé : le joueur choisit. */
  | { action: 'choisir' };

export function decider(e: {
  utilisateur: string;
  locale: Sauvegarde;
  enLigne: SauvegardeEnLigne | null;
  meta: MetaSynchro | null;
}): Decision {
  const localeExiste = !estVierge(e.locale);
  const enLigneExiste = e.enLigne !== null && !estVierge(e.enLigne.sauvegarde);
  if (!localeExiste && !enLigneExiste) return { action: e.enLigne ? 'rien' : 'envoyer' };
  if (!enLigneExiste) return { action: 'envoyer' };
  if (!localeExiste) return { action: 'prendre' };

  const enLigne = e.enLigne!;
  const empLocale = empreinte(e.locale);
  if (empLocale === empreinte(enLigne.sauvegarde)) return { action: 'rien' };
  const meta = e.meta && e.meta.utilisateur === e.utilisateur ? e.meta : null;
  if (meta) {
    const enLigneInchangee = enLigne.misAJourLe === meta.enLigneLe;
    const localeInchangee = empLocale === meta.empreinte;
    if (enLigneInchangee) return { action: 'envoyer' }; // seule la locale a changé (ou aucune) : elle est à jour
    if (localeInchangee) return { action: 'prendre' }; // un autre appareil a joué depuis
  }
  return { action: 'choisir' };
}

// ---------- Pseudo ----------

export const PSEUDO_MIN = 3;
export const PSEUDO_MAX = 20;

export type ResultatPseudo = { ok: true; pseudo: string } | { ok: false; erreur: string };

/** 3 à 20 caractères : lettres, chiffres, espace, « _ », « - », « . » ; espaces en trop retirés. */
export function validerPseudo(saisie: string): ResultatPseudo {
  const pseudo = saisie.normalize('NFC').trim().replace(/\s+/g, ' ');
  const longueur = [...pseudo].length;
  if (longueur < PSEUDO_MIN) return { ok: false, erreur: `Le pseudo doit faire au moins ${PSEUDO_MIN} caractères.` };
  if (longueur > PSEUDO_MAX) return { ok: false, erreur: `Le pseudo doit faire au plus ${PSEUDO_MAX} caractères.` };
  if (!/^[\p{L}\p{N}_.\- ]+$/u.test(pseudo)) return { ok: false, erreur: 'Lettres, chiffres, espace, « _ », « - » et « . » seulement.' };
  return { ok: true, pseudo };
}

/** Pseudo proposé à partir du nom Discord (nettoyé, tronqué), ou chaîne vide. */
export function pseudoPropose(nom: string | undefined | null): string {
  if (!nom) return '';
  const propre = [...nom.normalize('NFC').replace(/[^\p{L}\p{N}_.\- ]/gu, '').trim().replace(/\s+/g, ' ')].slice(0, PSEUDO_MAX).join('').trim();
  return validerPseudo(propre).ok ? propre : '';
}

// ---------- Envois regroupés ----------

export interface Horloge {
  maintenant: () => number;
  programmer: (f: () => void, ms: number) => unknown;
  annuler: (id: unknown) => void;
}

/**
 * Regroupe les envois : après une opération, envoi immédiat si le dernier date de plus de 5 s,
 * sinon un seul envoi à la fin du délai pour toutes les opérations faites entre-temps.
 * Un envoi raté (hors ligne, erreur) est retenté plus tard, ou tout de suite par `vider()` (retour du réseau, départ).
 */
export class Planificateur {
  private sale = false;
  private enCours: Promise<void> | null = null;
  private minuterie: unknown = null;
  private dernierEnvoi = Number.NEGATIVE_INFINITY;
  private actif = true;

  constructor(
    /** Envoie l'état actuel ; renvoie false en cas d'échec (sera retenté). */
    private readonly envoyer: () => Promise<boolean>,
    private readonly horloge: Horloge,
    private readonly delai = DELAI_ENVOI,
    private readonly delaiReessai = DELAI_REESSAI,
  ) {}

  /** Vrai s'il reste des changements à envoyer. */
  get enAttente(): boolean { return this.sale; }

  /** Une opération vient d'être enregistrée localement. */
  signaler(): void {
    this.sale = true;
    if (this.actif && !this.enCours && this.minuterie === null) this.programmer(Math.max(0, this.dernierEnvoi + this.delai - this.horloge.maintenant()));
  }

  /** Envoie tout de suite ce qui reste (départ de la page, retour du réseau). */
  vider(): Promise<void> {
    if (this.minuterie !== null) { this.horloge.annuler(this.minuterie); this.minuterie = null; }
    if (this.enCours) return this.enCours.then(() => (this.sale && this.actif ? this.executer() : undefined));
    return this.sale && this.actif ? this.executer() : Promise.resolve();
  }

  /** Arrête les envois (déconnexion, choix en attente). Les changements restent marqués. */
  arreter(): void {
    this.actif = false;
    if (this.minuterie !== null) { this.horloge.annuler(this.minuterie); this.minuterie = null; }
  }

  reprendre(): void {
    this.actif = true;
    if (this.sale) this.signaler();
  }

  private programmer(ms: number): void {
    this.minuterie = this.horloge.programmer(() => { this.minuterie = null; void this.executer(); }, ms);
  }

  private executer(): Promise<void> {
    if (this.enCours) return this.enCours;
    if (!this.sale || !this.actif) return Promise.resolve();
    this.sale = false;
    this.enCours = (async () => {
      let ok = false;
      try { ok = await this.envoyer(); } catch { ok = false; }
      this.dernierEnvoi = this.horloge.maintenant();
      this.enCours = null;
      if (!ok) {
        this.sale = true;
        if (this.actif && this.minuterie === null) this.programmer(this.delaiReessai);
      } else if (this.sale && this.actif && this.minuterie === null) {
        this.programmer(Math.max(0, this.dernierEnvoi + this.delai - this.horloge.maintenant()));
      }
    })();
    return this.enCours;
  }
}
