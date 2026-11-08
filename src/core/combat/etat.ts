// État d'une partie de combat (docs/COMBAT.md). Tout est sérialisable (JSON) : une partie peut être sauvegardée
// et reprise. L'aléatoire vient de rng.ts avec une graine et un compteur de tirages (même graine = même partie).
import { rngAGraine } from '../rng';
import type { ElementId, Personnage } from '../types';
import type { EffetAction, EtatCombat } from './effets';

export type IdJoueur = 0 | 1;
export const autre = (j: IdJoueur): IdJoueur => (j === 0 ? 1 : 0);

/** Carte Soutien (src/data/soutiens.json). */
export interface CarteSoutien {
  id: string;
  nom: string;
  type: 'objet' | 'soutien' | 'terrain';
  texte: string;
  finition: string;
  effets: EffetAction[];
}

/** Les cartes connues du moteur : personnages (avec leurs effets) et cartes Soutien. */
export interface Bibliotheque {
  personnages: Map<string, Personnage>;
  soutiens: Map<string, CarteSoutien>;
}

export const bibliotheque = (personnages: Personnage[], soutiens: CarteSoutien[]): Bibliotheque => ({
  personnages: new Map(personnages.map((p) => [p.id, p])),
  soutiens: new Map(soutiens.map((s) => [s.id, s])),
});

/** Un deck : 20 identifiants de cartes (personnages ou Soutiens) et 1 à 3 éléments d'énergie. */
export interface Deck {
  nom: string;
  cartes: string[];
  elements: ElementId[];
}

/** Un personnage en jeu (actif ou banc). */
export interface PersoEnJeu {
  /** Identifiant de la carte dans la partie (« J1-07 »). */
  uid: string;
  /** Identifiant du personnage (fiche). */
  id: string;
  degats: number;
  energies: ElementId[];
  /** États (sur l'actif seulement). Gel et Étourdi disparaissent à la fin du tour `etatsJusqua[etat]`. */
  etats: EtatCombat[];
  etatsJusqua: Partial<Record<EtatCombat, number>>;
  /** Tour (numéro global) où il est entré en jeu. */
  entreAuTour: number;
  /** Boucliers : « subit X dégâts de moins jusqu'à ton prochain tour » (retirés au début du tour `jusqua`). */
  boucliers: { valeur: number; jusqua: number }[];
  /** Ne peut pas utiliser cette attaque (index) ou aucune (-1) jusqu'au tour inclus. */
  repos: { attaque: number; jusqua: number } | null;
  sansRepliJusqua: number;
  sansAttaqueJusqua: number;
  /** Dégâts à subir entre les tours (Poing divergent). */
  differes: { valeur: number; auTour: number }[];
  /** Bonus pour la prochaine attaque de ce tour (talent d'Asa). */
  bonusProchaineAttaque: number;
  /** Dernier tour (global) où il a attaqué. */
  dernierTourAttaque: number | null;
  /** Dégâts subis, par tour (pour « au dernier tour adverse »). */
  blessures: { tour: number; valeur: number }[];
  /** Tour où il a subi sa première attaque (talents « la première attaque subie à chaque tour adverse »). */
  premiereAttaqueAuTour: number | null;
}

export interface TourJoueur {
  energieAttachee: boolean;
  soutien: boolean;
  terrain: boolean;
  repli: boolean;
  objet: boolean;
  repliGratuit: boolean;
  /** Clés « uid:talent » des talents déjà utilisés ce tour. */
  talents: string[];
  /** Pierre d'énergie utilisée ce tour. */
  energieBonus: boolean;
}

export interface JoueurCombat {
  nom: string;
  /** Le dessus du deck est l'index 0. */
  deck: string[];
  main: string[];
  defausse: string[];
  actif: PersoEnJeu | null;
  banc: PersoEnJeu[];
  points: number;
  elements: ElementId[];
  /** Énergie produite ce tour, pas encore attachée (perdue à la fin du tour). */
  energie: ElementId | null;
  tour: TourJoueur;
  /** Effets « une fois par partie » déjà utilisés. */
  unique: string[];
  toursJoues: number;
  /** Mise en place faite. */
  pret: boolean;
}

export type Phase = 'mise-en-place' | 'choix-premier' | 'jeu' | 'fin';

export interface Partie {
  graine: string;
  tirages: number;
  /** Numéro du tour en cours (global, 1 = premier tour du premier joueur). */
  tour: number;
  joueurActif: IdJoueur;
  premier: IdJoueur | null;
  /** Gagnant du pile ou face (choisit de commencer ou non). */
  gagnantPiece: IdJoueur;
  joueurs: [JoueurCombat, JoueurCombat];
  /** uid → id de la carte. */
  cartes: Record<string, string>;
  terrain: { uid: string; id: string; proprietaire: IdJoueur } | null;
  phase: Phase;
  /** Joueurs qui doivent choisir un nouvel actif, et ce qui se passe ensuite. */
  attente: { joueurs: IdJoueur[]; suite: 'continuer' | 'fin-de-tour' | 'debut-de-tour' } | null;
  gagnant: IdJoueur | null;
  raisonFin: string | null;
}

// ---------- Aléatoire (graine + compteur) ----------

/** Entier dans [0, n[ ; le compteur de tirages avance (la partie reste reproductible). */
export function tirer(p: Partie, n: number): number {
  const r = rngAGraine(`${p.graine}:${p.tirages}`).entier(n);
  p.tirages++;
  return r;
}

export const piece = (p: Partie): 'pile' | 'face' => (tirer(p, 2) === 0 ? 'pile' : 'face');

export function melanger<T>(p: Partie, liste: T[]): void {
  for (let i = liste.length - 1; i > 0; i--) {
    const j = tirer(p, i + 1);
    [liste[i], liste[j]] = [liste[j]!, liste[i]!];
  }
}

export const tourVide = (): TourJoueur => ({
  energieAttachee: false, soutien: false, terrain: false, repli: false, objet: false, repliGratuit: false, talents: [], energieBonus: false,
});

export const nouveauPerso = (uid: string, id: string, tour: number): PersoEnJeu => ({
  uid, id, degats: 0, energies: [], etats: [], etatsJusqua: {}, entreAuTour: tour, boucliers: [], repos: null,
  sansRepliJusqua: 0, sansAttaqueJusqua: 0, differes: [], bonusProchaineAttaque: 0, dernierTourAttaque: null, blessures: [], premiereAttaqueAuTour: null,
});

/** Copie profonde (l'état est du JSON). */
export const cloner = (p: Partie): Partie => structuredClone(p);
