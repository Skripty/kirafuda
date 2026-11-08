// Moteur de combat (docs/COMBAT.md), pur et déterministe : aucune dépendance au DOM, tout l'aléatoire passe par
// la graine de la partie (etat.ts → rng.ts). Trois fonctions publiques :
//   creerPartie(bib, decks, graine)  → partie au début de la mise en place ;
//   actionsLegales(partie, bib)      → toutes les actions possibles à cet instant (avec leurs choix) ;
//   appliquer(partie, action, bib)   → nouvel état (la partie reçue n'est pas modifiée) + journal des événements.
import { FAIBLESSE, ELEMENTS } from '../regles';
import type { Attaque, ElementId, Personnage } from '../types';
import { ENERGIES, TYPES_PERSONNAGE, valeurDegats } from './fiches';
import type { Condition, EffetAction, EffetAttaque, EffetTalent, EtatCombat } from './effets';
import { ETATS } from './effets';
import {
  autre, cloner, melanger, nouveauPerso, piece, tirer, tourVide,
  type Bibliotheque, type CarteSoutien, type Deck, type IdJoueur, type JoueurCombat, type Partie, type PersoEnJeu,
} from './etat';

// ---------- Constantes de docs/COMBAT.md ----------

export const TAILLE_DECK = 20;
export const MAIN_DE_DEPART = 5;
export const BANC_MAX = 3;
export const POINTS_VICTOIRE = 3;
export const BONUS_FAIBLESSE = 20;
export const DEGATS_BRULURE = 10;
export const BONUS_MALEDICTION = 20;

// ---------- Actions et journal ----------

/** Choix qui accompagnent une action (cible, carte, ordre…). */
export interface Choix {
  /** Personnage visé (uid). */
  cible?: string;
  /** Carte choisie (uid) : dans la main, la défausse ou la main adverse. */
  carte?: string;
  /** Carte défaussée pour payer un talent (uid). */
  defausse?: string;
  /** Personnage du banc avec lequel s'échanger (uid). */
  echange?: string;
  /** Regarder : index de la carte gardée. */
  garder?: number;
  /** Regarder : remettre la carte sous le deck. */
  dessous?: boolean;
  /** Regarder : nouvel ordre des cartes (permutation des index). */
  ordre?: number[];
  /** Copie : index de l'attaque copiée. */
  copie?: number;
}

export type Action =
  | { type: 'mise-en-place'; joueur: IdJoueur; actif: string; banc: string[] }
  | { type: 'commencer'; joueur: IdJoueur; premier: boolean }
  | { type: 'attacher'; joueur: IdJoueur; cible: string }
  | { type: 'poser'; joueur: IdJoueur; carte: string }
  | { type: 'releve'; joueur: IdJoueur; carte: string; cible: string }
  | { type: 'jouer'; joueur: IdJoueur; carte: string; choix: Choix }
  | { type: 'talent'; joueur: IdJoueur; source: string; choix: Choix }
  | { type: 'repli'; joueur: IdJoueur; cible: string }
  | { type: 'attaquer'; joueur: IdJoueur; attaque: number; choix: Choix }
  | { type: 'passer'; joueur: IdJoueur }
  | { type: 'nouvel-actif'; joueur: IdJoueur; cible: string };

export interface Evenement {
  type: string;
  joueur?: IdJoueur;
  texte: string;
  /** Personnage concerné (uid) et valeur (dégâts, soin…), pour l'animation. */
  cible?: string;
  valeur?: number;
}

/** Contexte d'application : partie (modifiée en place, c'est une copie), bibliothèque, journal. */
interface Ctx { p: Partie; bib: Bibliotheque; journal: Evenement[] }

// ---------- Accès aux cartes ----------

const fiche = (c: Ctx, id: string): Personnage => {
  const f = c.bib.personnages.get(id);
  if (!f) throw new Error(`Personnage inconnu « ${id} ».`);
  return f;
};
const soutien = (bib: Bibliotheque, id: string): CarteSoutien | undefined => bib.soutiens.get(id);
const nomPerso = (c: Ctx, x: PersoEnJeu): string => fiche(c, x.id).nom;
const enJeu = (j: JoueurCombat): PersoEnJeu[] => [...(j.actif ? [j.actif] : []), ...j.banc];
const pvRestants = (c: Ctx, x: PersoEnJeu): number => fiche(c, x.id).pv - x.degats;
const talentsDe = (c: Ctx, x: PersoEnJeu): EffetTalent[] => fiche(c, x.id).talent?.effets ?? [];
const aTalent = <T extends EffetTalent['type']>(c: Ctx, x: PersoEnJeu, type: T): Extract<EffetTalent, { type: T }>[] =>
  talentsDe(c, x).filter((t): t is Extract<EffetTalent, { type: T }> => t.type === type);

function trouver(p: Partie, uid: string): { joueur: IdJoueur; perso: PersoEnJeu; actif: boolean } | null {
  for (const j of [0, 1] as IdJoueur[]) {
    const J = p.joueurs[j];
    if (J.actif?.uid === uid) return { joueur: j, perso: J.actif, actif: true };
    const b = J.banc.find((x) => x.uid === uid);
    if (b) return { joueur: j, perso: b, actif: false };
  }
  return null;
}

function dire(c: Ctx, type: string, texte: string, extra: Partial<Evenement> = {}): void {
  c.journal.push({ type, texte, ...extra });
}

/** Prochain tour (numéro global) du propriétaire d'un personnage. */
const prochainTourDe = (p: Partie, proprietaire: IdJoueur): number => (p.joueurActif === proprietaire ? p.tour + 2 : p.tour + 1);

// ---------- Création de la partie ----------

/** Carte qui se pose depuis la main (Base, Héros). */
const posable = (bib: Bibliotheque, id: string): boolean => {
  const f = bib.personnages.get(id);
  return !!f && TYPES_PERSONNAGE[f.type].posable;
};

/** Vérifie un deck : 20 cartes connues, au moins 1 Base (ou Héros), 2 exemplaires au plus par personnage et par Soutien, 1 à 3 éléments. */
export function validerDeck(deck: Deck, bib: Bibliotheque): string[] {
  const e: string[] = [];
  if (deck.cartes.length !== TAILLE_DECK) e.push(`Deck « ${deck.nom} » : ${deck.cartes.length} cartes au lieu de ${TAILLE_DECK}.`);
  const compte = new Map<string, number>();
  for (const id of deck.cartes) {
    if (!bib.personnages.has(id) && !bib.soutiens.has(id)) e.push(`Deck « ${deck.nom} » : carte inconnue « ${id} ».`);
    compte.set(id, (compte.get(id) ?? 0) + 1);
  }
  for (const [id, n] of compte) if (n > 2) e.push(`Deck « ${deck.nom} » : ${n} exemplaires de « ${id} » (2 au plus).`);
  if (!deck.cartes.some((id) => posable(bib, id))) e.push(`Deck « ${deck.nom} » : au moins un Base (ou un Héros) est nécessaire.`);
  if (deck.elements.length < 1 || deck.elements.length > 3 || new Set(deck.elements).size !== deck.elements.length) {
    e.push(`Deck « ${deck.nom} » : 1 à 3 éléments d'énergie différents attendus.`);
  }
  for (const el of deck.elements) if (el === 'neutre' || !Object.hasOwn(ELEMENTS, el)) e.push(`Deck « ${deck.nom} » : élément d'énergie « ${el} » impossible.`);
  return e;
}

/**
 * Nouvelle partie : chaque joueur mélange son deck et pioche 5 cartes ; une main sans Base est montrée, remélangée
 * et repiochée (au moins un Base garanti). Le pile ou face est tiré ici ; son gagnant choisira de commencer ou non
 * après la mise en place.
 */
export function creerPartie(bib: Bibliotheque, decks: [Deck, Deck], graine: string): { partie: Partie; journal: Evenement[] } {
  for (const d of decks) { const e = validerDeck(d, bib); if (e.length) throw new Error(e.join(' ')); }
  const cartes: Record<string, string> = {};
  const joueur = (i: IdJoueur, d: Deck): JoueurCombat => ({
    nom: d.nom,
    deck: d.cartes.map((id, k) => { const uid = `J${i + 1}-${String(k + 1).padStart(2, '0')}`; cartes[uid] = id; return uid; }),
    main: [], defausse: [], actif: null, banc: [], points: 0, elements: [...d.elements], energie: null,
    tour: tourVide(), unique: [], toursJoues: 0, pret: false,
  });
  const p: Partie = {
    graine, tirages: 0, tour: 0, joueurActif: 0, premier: null, gagnantPiece: 0,
    joueurs: [joueur(0, decks[0]), joueur(1, decks[1])], cartes, terrain: null, phase: 'mise-en-place',
    attente: null, gagnant: null, raisonFin: null,
  };
  const c: Ctx = { p, bib, journal: [] };
  for (const i of [0, 1] as IdJoueur[]) {
    const J = p.joueurs[i];
    for (let essai = 1; ; essai++) {
      J.deck.push(...J.main);
      J.main = [];
      melanger(p, J.deck);
      J.main = J.deck.splice(0, MAIN_DE_DEPART);
      if (J.main.some((u) => posable(bib, cartes[u]!))) break;
      dire(c, 'main-sans-base', `${J.nom} montre une main sans Base, remélange et repioche.`, { joueur: i });
      if (essai > 50) throw new Error('Mise en place impossible : aucun Base pioché.');
    }
  }
  p.gagnantPiece = piece(p) === 'pile' ? 0 : 1;
  dire(c, 'piece', `Pile ou face : ${p.joueurs[p.gagnantPiece].nom} choisira qui commence.`, { joueur: p.gagnantPiece });
  return { partie: p, journal: c.journal };
}

// ---------- Énergies et coûts ----------

/** Coût effectif d'une attaque (talent « Irrégulier » : 1 ◇ de moins). */
function coutAttaque(c: Ctx, joueur: IdJoueur, x: PersoEnJeu, a: Attaque): Attaque['cout'] {
  let cout = [...a.cout];
  for (const t of aTalent(c, x, 'cout-reduit')) {
    if (condition(c, t.si, { joueur, soi: x })) {
      for (let k = 0; k < t.valeur; k++) { const i = cout.lastIndexOf('q'); if (i >= 0) cout = cout.filter((_, n) => n !== i); }
    }
  }
  return cout;
}

/** Les énergies attachées paient-elles ce coût ? (énergie d'élément : la sienne ; ◇ : n'importe laquelle) */
export function peutPayer(energies: ElementId[], cout: Attaque['cout']): boolean {
  const reste = [...energies];
  for (const code of cout) {
    if (code === 'q') continue;
    const el = ENERGIES[code]!;
    const i = reste.indexOf(el);
    if (i < 0) return false;
    reste.splice(i, 1);
  }
  return reste.length >= cout.filter((x) => x === 'q').length;
}

// ---------- Conditions ----------

interface ContexteCondition { joueur: IdJoueur; soi: PersoEnJeu; cible?: PersoEnJeu; source?: PersoEnJeu }

function condition(c: Ctx, cond: Condition | undefined, x: ContexteCondition): boolean {
  if (!cond) return true;
  const { p } = c;
  const J = p.joueurs[x.joueur];
  const A = p.joueurs[autre(x.joueur)];
  const f = fiche(c, x.soi.id);
  switch (cond.si) {
    case 'cible-blessee': return !!x.cible && x.cible.degats > 0;
    case 'cible-moitie-pv': return !!x.cible && pvRestants(c, x.cible) * 2 <= fiche(c, x.cible.id).pv;
    case 'cible-etat': return !!x.cible && x.cible.etats.includes(cond.etat);
    case 'cible-element': return !!x.cible && fiche(c, x.cible.id).element === cond.element;
    case 'cible-type': return !!x.cible && fiche(c, x.cible.id).type === cond.type;
    case 'cible-plus-de-pv': return !!x.cible && pvRestants(c, x.cible) > pvRestants(c, x.soi);
    case 'soi-blesse': return x.soi.degats > 0;
    case 'soi-moitie-pv': return pvRestants(c, x.soi) * 2 <= f.pv;
    case 'soi-pv-max': return pvRestants(c, x.soi) <= cond.valeur;
    case 'soi-energies-min': return x.soi.energies.length >= cond.nombre;
    case 'soi-pas-attaque-tour-precedent': {
      // Son dernier tour à lui : deux tours plus tôt si c'est au tour adverse, sinon le tour d'avant le sien.
      const precedent = p.joueurActif === x.joueur ? p.tour - 2 : p.tour - 1;
      return x.soi.dernierTourAttaque !== precedent;
    }
    case 'soi-blesse-dernier-tour-adverse': {
      const dernier = p.joueurActif === x.joueur ? p.tour - 1 : p.tour;
      return x.soi.blessures.some((b) => b.tour === dernier && b.valeur > 0);
    }
    case 'perso-en-jeu': return enJeu(J).some((y) => y.id === cond.personnage);
    case 'autre-serie-en-jeu': return enJeu(J).some((y) => y.uid !== x.soi.uid && fiche(c, y.id).serie === f.serie);
    case 'banc-serie-min': return J.banc.filter((y) => fiche(c, y.id).serie === f.serie).length >= cond.nombre;
    case 'objet-joue-ce-tour': return J.tour.objet;
    case 'moins-de-points': return J.points < A.points;
    case 'moins-de-cartes-en-main': return J.main.length < A.main.length;
    case 'source-eveille': return !!x.source && fiche(c, x.source.id).type === 'eveille';
    case 'piece': {
      const r = piece(p);
      dire(c, 'piece', `Pièce : ${r}.`, { joueur: x.joueur, cible: x.soi.uid });
      return r === cond.cote;
    }
  }
}

// ---------- Dégâts, soins, états ----------

function blesser(c: Ctx, x: PersoEnJeu, valeur: number, raison: string): void {
  if (valeur <= 0) return;
  x.degats += valeur;
  const b = x.blessures.find((y) => y.tour === c.p.tour);
  if (b) b.valeur += valeur; else x.blessures.push({ tour: c.p.tour, valeur });
  x.blessures = x.blessures.filter((y) => y.tour >= c.p.tour - 2);
  dire(c, 'degats', `${nomPerso(c, x)} subit ${valeur} dégâts (${raison}).`, { cible: x.uid, valeur });
}

function soigner(c: Ctx, x: PersoEnJeu, valeur: number): void {
  const v = Math.min(valeur, x.degats);
  if (v <= 0) return;
  x.degats -= v;
  dire(c, 'soin', `${nomPerso(c, x)} est soigné de ${v}.`, { cible: x.uid, valeur: v });
}

/** Pose un état sur un actif (immunités : Restriction céleste, Esprit flottant). Les états ne vont que sur l'actif. */
function poserEtat(c: Ctx, proprietaire: IdJoueur, x: PersoEnJeu, etat: EtatCombat): void {
  if (c.p.joueurs[proprietaire].actif?.uid !== x.uid) return;
  if (aTalent(c, x, 'immunite').some((t) => t.etats.includes(etat))) {
    dire(c, 'immunite', `${nomPerso(c, x)} n'est pas touché par l'état ${ETATS[etat]}.`, { cible: x.uid });
    return;
  }
  if (!x.etats.includes(etat)) x.etats.push(etat);
  if (etat === 'gel' || etat === 'etourdi') x.etatsJusqua[etat] = prochainTourDe(c.p, proprietaire);
  dire(c, 'etat', `${nomPerso(c, x)} : ${ETATS[etat]}.`, { cible: x.uid });
}

const retirerEtats = (x: PersoEnJeu): void => { x.etats = []; x.etatsJusqua = {}; };

/**
 * Dégâts d'une attaque contre une cible, dans l'ordre de docs/COMBAT.md : dégâts de base → bonus de l'attaque et des
 * talents de l'attaquant → Faiblesse +20 (actif seulement) → réductions et boucliers de la cible (sauf « ignore ») → minimum 0.
 */
function calculerDegats(
  c: Ctx, attaquant: IdJoueur, source: PersoEnJeu, cible: PersoEnJeu, base: number, bonusAttaque: number,
  ignore: 'boucliers' | 'boucliers-et-reductions' | null, cibleActive: boolean, premiere: boolean,
): number {
  const { p } = c;
  const J = p.joueurs[attaquant];
  const defenseur = autre(attaquant);
  const D = p.joueurs[defenseur];
  if (base <= 0) return 0;
  let d = base + bonusAttaque;
  const ctxSoi = { joueur: attaquant, soi: source, cible };
  for (const t of aTalent(c, source, 'bonus-attaque')) if (condition(c, t.si, ctxSoi)) d += t.valeur;
  // Bonus de série : un autre de tes personnages de la même série en jeu, qui a ce talent.
  const serie = fiche(c, source.id).serie;
  for (const y of enJeu(J)) {
    if (y.uid === source.uid || fiche(c, y.id).serie !== serie) continue;
    for (const t of aTalent(c, y, 'bonus-serie')) d += t.valeur;
  }
  if (p.terrain) {
    for (const e of soutien(c.bib, p.terrain.id)?.effets ?? []) {
      if (e.type !== 'terrain' || !e.bonusAttaque) continue;
      const f = fiche(c, source.id);
      if ((e.element && f.element === e.element) || (e.typePerso && f.type === e.typePerso)) d += e.bonusAttaque;
    }
  }
  if (cibleActive) {
    if (cible.etats.includes('malediction')) {
      d += BONUS_MALEDICTION;
      cible.etats = cible.etats.filter((x) => x !== 'malediction');
      dire(c, 'etat-fin', `${nomPerso(c, cible)} n'est plus Maudit (+${BONUS_MALEDICTION}).`, { cible: cible.uid });
    }
    for (const y of J.banc) for (const t of aTalent(c, y, 'vulnerabilite-adverse')) d += t.valeur;
    if (FAIBLESSE[fiche(c, cible.id).element] === fiche(c, source.id).element) d += BONUS_FAIBLESSE;
  }
  // Réductions (talents) et boucliers (effets temporaires).
  if (ignore !== 'boucliers-et-reductions') {
    const ctxCible = { joueur: defenseur, soi: cible, source };
    for (const t of aTalent(c, cible, 'reduction')) if (condition(c, t.si, ctxCible)) d -= t.valeur;
    if (premiere) for (const t of aTalent(c, cible, 'reduction-premiere')) d -= t.valeur;
    const serieCible = fiche(c, cible.id).serie;
    for (const y of enJeu(D)) {
      for (const t of aTalent(c, y, 'protection')) {
        if (fiche(c, y.id).serie !== serieCible) continue;
        if (t.depuis === 'banc' && t.pour === 'actif-serie' && D.banc.includes(y) && cibleActive) d -= t.valeur;
        if (t.depuis === 'jeu' && t.pour === 'autres-serie' && y.uid !== cible.uid) d -= t.valeur;
      }
    }
  }
  if (ignore === null) for (const b of cible.boucliers) d -= b.valeur;
  d = Math.max(0, d);
  // « Retraité » : une attaque qui devrait mettre K.-O. une cible à plus de 10 PV la laisse à 10 PV
  // (une cible à 10 PV ou moins peut être mise K.-O. : jamais de blocage).
  for (const t of aTalent(c, source, 'plancher')) {
    const reste = pvRestants(c, cible);
    if (reste > t.valeur && d >= reste && (!t.sauf || !condition(c, t.sauf, ctxSoi))) d = reste - t.valeur;
  }
  return d;
}

// ---------- K.-O. et fin de partie ----------

function finir(c: Ctx, gagnant: IdJoueur, raison: string): void {
  if (c.p.phase === 'fin') return;
  c.p.phase = 'fin';
  c.p.gagnant = gagnant;
  c.p.raisonFin = raison;
  c.p.attente = null;
  dire(c, 'victoire', `${c.p.joueurs[gagnant].nom} gagne : ${raison}`, { joueur: gagnant });
}

/**
 * Met K.-O. tous les personnages à 0 PV (talents de survie, de retour au deck et « quand … est mis K.-O. »), compte
 * les points, vérifie la victoire, puis demande un nouvel actif aux joueurs qui en ont besoin.
 * `attaquant` : personnage dont l'attaque vient d'avoir lieu (talents « quand une attaque de … met K.-O. »).
 */
function resoudreKO(c: Ctx, suite: 'continuer' | 'fin-de-tour' | 'debut-de-tour', attaquant?: { joueur: IdJoueur; perso: PersoEnJeu; cible?: PersoEnJeu; soinSiKO?: number }): void {
  const { p } = c;
  let tour = 0;
  for (;;) {
    if (++tour > 20) break;
    const tombes: { joueur: IdJoueur; perso: PersoEnJeu }[] = [];
    for (const j of [0, 1] as IdJoueur[]) {
      for (const x of enJeu(p.joueurs[j])) if (pvRestants(c, x) <= 0) tombes.push({ joueur: j, perso: x });
    }
    if (tombes.length === 0) break;
    for (const { joueur, perso } of tombes) {
      const J = p.joueurs[joueur];
      const f = fiche(c, perso.id);
      // Survie : Rika (toujours, une fois) et Pochita (pile ou face, une fois).
      const cleSurvie = `survie:${perso.id}`;
      const rika = talentsDe(c, perso).some((t) => t.type === 'special' && t.code === 'rika');
      const survie = aTalent(c, perso, 'survie')[0];
      if ((rika || survie) && !J.unique.includes(cleSurvie)) {
        J.unique.push(cleSurvie);
        const reussi = rika || !survie!.piece || piece(p) === survie!.piece;
        if (reussi) {
          perso.degats = f.pv - (rika ? 10 : survie!.pv);
          dire(c, 'survie', `${f.nom} devrait être K.-O. mais reste à ${f.pv - perso.degats} PV (${f.talent!.nom}).`, { cible: perso.uid });
          continue;
        }
        dire(c, 'survie-ratee', `${f.talent!.nom} : la pièce ne sauve pas ${f.nom}.`, { cible: perso.uid });
      }
      // Retrait du jeu.
      if (J.actif?.uid === perso.uid) J.actif = null;
      J.banc = J.banc.filter((y) => y.uid !== perso.uid);
      const points = TYPES_PERSONNAGE[f.type].points; // Base 1, Éveillé et Héros 2
      p.joueurs[autre(joueur)].points += points;
      dire(c, 'ko', `${f.nom} est mis K.-O. : +${points} point${points > 1 ? 's' : ''} pour ${p.joueurs[autre(joueur)].nom}.`, { joueur, cible: perso.uid, valeur: points });
      const cleRetour = `retour:${perso.id}`;
      if (aTalent(c, perso, 'retour-deck').length && !J.unique.includes(cleRetour)) {
        J.unique.push(cleRetour);
        J.deck.push(perso.uid);
        melanger(p, J.deck);
        dire(c, 'retour-deck', `${f.nom} retourne dans le deck (${f.talent!.nom}).`, { joueur, cible: perso.uid });
      } else J.defausse.push(perso.uid);
      // « Quand … est mis K.-O. »
      for (const t of aTalent(c, perso, 'si-ko-subi')) {
        for (const e of t.effets) {
          if (e.type === 'degats-actif-adverse') { const a = p.joueurs[autre(joueur)].actif; if (a) blesser(c, a, e.valeur, f.talent!.nom); }
          if (e.type === 'soin-serie') for (const y of enJeu(J)) if (fiche(c, y.id).serie === f.serie) soigner(c, y, e.valeur);
        }
      }
      // « Quand une attaque de … met K.-O. »
      if (attaquant && joueur !== attaquant.joueur && enJeu(p.joueurs[attaquant.joueur]).includes(attaquant.perso)) {
        for (const t of aTalent(c, attaquant.perso, 'si-ko-inflige')) {
          for (const e of t.effets) {
            if (e.type === 'soin-soi') soigner(c, attaquant.perso, e.valeur);
            if (e.type === 'pioche') piocher(c, attaquant.joueur, e.valeur);
          }
        }
        if (attaquant.soinSiKO && attaquant.cible?.uid === perso.uid) soigner(c, attaquant.perso, attaquant.soinSiKO);
      }
    }
  }
  // Victoire : 3 points, ou l'adversaire n'a plus de personnage en jeu (ou plus d'actif ni de banc pour le remplacer).
  const ordre: IdJoueur[] = [p.joueurActif, autre(p.joueurActif)];
  for (const j of ordre) if (p.joueurs[j].points >= POINTS_VICTOIRE) return finir(c, j, `${POINTS_VICTOIRE} points.`);
  for (const j of ordre) {
    const A = p.joueurs[autre(j)];
    if (!A.actif && A.banc.length === 0) return finir(c, j, `${A.nom} n'a plus aucun personnage en jeu.`);
  }
  const attendus = ([0, 1] as IdJoueur[]).filter((j) => !p.joueurs[j].actif);
  if (attendus.length) p.attente = { joueurs: attendus, suite };
  else poursuivre(c, suite);
}

function poursuivre(c: Ctx, suite: 'continuer' | 'fin-de-tour' | 'debut-de-tour'): void {
  if (suite === 'fin-de-tour') finDeTour(c);
  else if (suite === 'debut-de-tour') debutDeTour(c);
}

// ---------- Tours ----------

function piocher(c: Ctx, j: IdJoueur, n: number): void {
  const J = c.p.joueurs[j];
  let k = 0;
  for (; k < n && J.deck.length; k++) J.main.push(J.deck.shift()!);
  if (k) dire(c, 'pioche', `${J.nom} pioche ${k} carte${k > 1 ? 's' : ''}.`, { joueur: j, valeur: k });
}

/** Début d'un tour : pioche (deck vide : rien), énergie produite (pas au premier tour du premier joueur), boucliers expirés. */
function debutDeTour(c: Ctx): void {
  const { p } = c;
  const j = p.joueurActif;
  const J = p.joueurs[j];
  J.toursJoues++;
  J.tour = tourVide();
  for (const x of enJeu(J)) x.boucliers = x.boucliers.filter((b) => b.jusqua > p.tour);
  dire(c, 'tour', `Tour ${p.tour} : ${J.nom}.`, { joueur: j, valeur: p.tour });
  piocher(c, j, 1);
  const premierTourDuPremier = j === p.premier && J.toursJoues === 1;
  J.energie = premierTourDuPremier ? null : J.elements[tirer(p, J.elements.length)]!;
  if (J.energie) dire(c, 'energie', `Énergie du tour : ${ELEMENTS[J.energie].nom}.`, { joueur: j });
}

/**
 * Entre les tours : Brûlure (10 à chaque actif brûlé), effets « à la fin de chacun de tes tours » et du Terrain,
 * dégâts différés, puis K.-O. ; les états Gel et Étourdi arrivés à échéance disparaissent.
 */
function finDeTour(c: Ctx): void {
  const { p } = c;
  const j = p.joueurActif;
  const J = p.joueurs[j];
  J.energie = null;
  for (const x of enJeu(J)) x.bonusProchaineAttaque = 0;
  for (const k of [0, 1] as IdJoueur[]) {
    const a = p.joueurs[k].actif;
    if (a?.etats.includes('brulure')) blesser(c, a, DEGATS_BRULURE, 'Brûlure');
  }
  for (const x of enJeu(J)) for (const t of aTalent(c, x, 'fin-de-tour')) soigner(c, x, t.soin);
  if (p.terrain) {
    for (const e of soutien(c.bib, p.terrain.id)?.effets ?? []) {
      if (e.type === 'terrain' && e.soin && e.elements) {
        for (const k of [0, 1] as IdJoueur[]) for (const x of enJeu(p.joueurs[k])) if (e.elements.includes(fiche(c, x.id).element)) soigner(c, x, e.soin);
      }
    }
  }
  for (const k of [0, 1] as IdJoueur[]) {
    for (const x of enJeu(p.joueurs[k])) {
      const dus = x.differes.filter((d) => d.auTour <= p.tour + 1);
      x.differes = x.differes.filter((d) => d.auTour > p.tour + 1);
      for (const d of dus) blesser(c, x, d.valeur, 'dégâts différés');
    }
  }
  for (const k of [0, 1] as IdJoueur[]) {
    for (const x of enJeu(p.joueurs[k])) {
      for (const e of ['gel', 'etourdi'] as const) {
        if (x.etats.includes(e) && (x.etatsJusqua[e] ?? 0) <= p.tour) {
          x.etats = x.etats.filter((y) => y !== e);
          delete x.etatsJusqua[e];
          dire(c, 'etat-fin', `${nomPerso(c, x)} n'est plus ${ETATS[e]}.`, { cible: x.uid });
        }
      }
    }
  }
  p.tour++;
  p.joueurActif = autre(j);
  resoudreKO(c, 'debut-de-tour');
}

// ---------- Effets d'action (cartes Soutien, talents utilisables) ----------

const estBase = (c: Ctx, uid: string): boolean => c.bib.personnages.get(c.p.cartes[uid]!)?.type === 'base';
/** Se pose depuis la main (mise en place, banc) : Base ou Héros. */
const estPosable = (c: Ctx, uid: string): boolean => posable(c.bib, c.p.cartes[uid]!);
const typeCarte = (bib: Bibliotheque, id: string): 'base' | 'eveille' | 'heros' | 'objet' | 'soutien' | 'terrain' =>
  bib.personnages.get(id)?.type ?? soutien(bib, id)!.type;

/** Cartes (uid) d'une zone correspondant à une recherche. */
function cartesCherchees(c: Ctx, zone: string[], quoi: 'base' | 'objet' | 'soutien' | 'eveille', serie: string | null, sauf?: string): string[] {
  return zone.filter((u) => {
    const id = c.p.cartes[u]!;
    if (sauf && id === sauf) return false;
    if (typeCarte(c.bib, id) !== quoi) return false;
    return !serie || c.bib.personnages.get(id)?.serie === serie;
  });
}

function poserSurBanc(c: Ctx, j: IdJoueur, uid: string, depuis: string[]): void {
  const J = c.p.joueurs[j];
  const i = depuis.indexOf(uid);
  if (i >= 0) depuis.splice(i, 1);
  const x = nouveauPerso(uid, c.p.cartes[uid]!, c.p.tour);
  J.banc.push(x);
  dire(c, 'pose', `${J.nom} pose ${nomPerso(c, x)} sur son banc.`, { joueur: j, cible: uid });
  // « Chef mercenaire » : un autre personnage en jeu avec ce talent, et un Base de sa série.
  for (const y of enJeu(J)) {
    if (y.uid === uid) continue;
    for (const t of aTalent(c, y, 'pose-base-serie')) {
      if (fiche(c, y.id).serie === fiche(c, x.id).serie && estBase(c, uid)) piocher(c, j, t.pioche);
    }
  }
}

/** Applique des effets d'action. `soi` : le personnage qui porte le talent (ou null pour une carte Soutien). */
function appliquerEffetsAction(c: Ctx, j: IdJoueur, effets: EffetAction[], choix: Choix, soi: PersoEnJeu | null, carteJouee?: string): void {
  const { p } = c;
  const J = p.joueurs[j];
  const A = p.joueurs[autre(j)];
  const cible = choix.cible ? trouver(p, choix.cible) : null;
  for (const e of effets) {
    switch (e.type) {
      case 'soin': {
        const x = e.cible === 'soi' ? soi : e.cible === 'actif' ? J.actif : cible?.perso ?? null;
        if (!x) break;
        soigner(c, x, e.valeur);
        if (e.retire === 'tous') retirerEtats(x);
        if (e.retire === 'brulure') x.etats = x.etats.filter((y) => y !== 'brulure');
        break;
      }
      case 'soin-degats-dernier-tour-adverse': {
        const x = cible?.perso;
        if (x) soigner(c, x, x.blessures.filter((b) => b.tour === p.tour - 1).reduce((n, b) => n + b.valeur, 0));
        break;
      }
      case 'retirer-etats': {
        const x = cible?.perso;
        if (!x) break;
        if (e.nombre === 'tous') retirerEtats(x);
        else if (x.etats.length) { const etat = x.etats[0]!; x.etats = x.etats.slice(1); delete x.etatsJusqua[etat]; }
        dire(c, 'etats-retires', `${nomPerso(c, x)} : états retirés.`, { cible: x.uid });
        break;
      }
      case 'bouclier': {
        const x = e.cible === 'soi' ? soi : J.actif;
        if (x) { x.boucliers.push({ valeur: e.valeur, jusqua: p.tour + 2 }); dire(c, 'bouclier', `${nomPerso(c, x)} subira ${e.valeur} dégâts de moins jusqu'au prochain tour de ${J.nom}.`, { cible: x.uid, valeur: e.valeur }); }
        break;
      }
      case 'degats': if (cible) blesser(c, cible.perso, e.valeur, carteJouee ? soutien(c.bib, p.cartes[carteJouee]!)!.nom : 'talent'); break;
      case 'pioche': piocher(c, j, e.valeur); break;
      case 'pioche-puis-defausse':
      case 'pioche-puis-sous-deck': {
        piocher(c, j, 1);
        // Carte rendue : une carte Soutien de la main s'il y en a, sinon la dernière piochée (choix fixe, voir rapport).
        const u = J.main.find((x) => !c.bib.personnages.has(p.cartes[x]!)) ?? J.main[J.main.length - 1];
        if (!u) break;
        J.main = J.main.filter((x) => x !== u);
        if (e.type === 'pioche-puis-defausse') J.defausse.push(u); else J.deck.push(u);
        dire(c, e.type === 'pioche-puis-defausse' ? 'defausse' : 'sous-deck', `${J.nom} ${e.type === 'pioche-puis-defausse' ? 'défausse' : 'remet sous son deck'} une carte.`, { joueur: j });
        break;
      }
      case 'chercher': {
        const serie = e.serie === 'la-sienne' && soi ? fiche(c, soi.id).serie : null;
        const trouvees = cartesCherchees(c, J.deck, e.quoi, serie, e.sauf);
        if (!trouvees.length || (e.vers === 'banc' && J.banc.length >= BANC_MAX)) { dire(c, 'recherche-vide', `${J.nom} ne trouve rien.`, { joueur: j }); break; }
        const u = e.hasard ? trouvees[tirer(p, trouvees.length)]! : trouvees[0]!;
        if (e.vers === 'banc') poserSurBanc(c, j, u, J.deck);
        else { J.deck = J.deck.filter((x) => x !== u); J.main.push(u); dire(c, 'recherche', `${J.nom} ajoute une carte de son deck à sa main.`, { joueur: j }); }
        melanger(p, J.deck);
        break;
      }
      case 'regarder': {
        const dessus = J.deck.slice(0, e.nombre);
        if (!dessus.length) break;
        J.deck = J.deck.slice(dessus.length);
        let reste = dessus;
        if (e.garder > 0) {
          const k = Math.min(choix.garder ?? 0, dessus.length - 1);
          J.main.push(dessus[k]!);
          reste = dessus.filter((_, i) => i !== k);
        }
        if (e.reste === 'dessous') J.deck.push(...reste);
        else if (e.reste === 'choix-dessous') { if (choix.dessous) J.deck.push(...reste); else J.deck.unshift(...reste); }
        else { const ordre = choix.ordre && choix.ordre.length === reste.length ? choix.ordre : reste.map((_, i) => i); J.deck.unshift(...ordre.map((i) => reste[i]!)); }
        dire(c, 'regarder', `${J.nom} regarde ${dessus.length} carte${dessus.length > 1 ? 's' : ''} de son deck.`, { joueur: j });
        break;
      }
      case 'repli-gratuit': J.tour.repliGratuit = true; break;
      case 'energie-supplementaire': {
        const x = cible?.perso;
        const el = e.element ?? J.elements[tirer(p, J.elements.length)]!;
        if (x) {
          x.energies.push(el);
          dire(c, 'energie-attachee', `${nomPerso(c, x)} reçoit 1 énergie ${ELEMENTS[el].nom}.`, { cible: x.uid });
          if (e.degatsCible) blesser(c, x, e.degatsCible, soutien(c.bib, p.cartes[carteJouee ?? '']!)?.nom ?? 'effet');
        }
        if (e.puisDefausse && choix.defausse) { J.main = J.main.filter((u) => u !== choix.defausse); J.defausse.push(choix.defausse); }
        if (!e.element) J.tour.energieBonus = true;
        break;
      }
      case 'echange-actif-soin': {
        const b = J.banc.find((x) => x.uid === choix.cible);
        if (!b || !J.actif) break;
        echanger(c, j, b);
        soigner(c, J.actif!, e.valeur);
        break;
      }
      case 'melange-main-adverse': {
        A.deck.push(...A.main);
        A.main = [];
        melanger(p, A.deck);
        dire(c, 'melange', `${A.nom} mélange sa main dans son deck.`, { joueur: autre(j) });
        piocher(c, autre(j), e.pioche);
        break;
      }
      case 'retirer-energie-adverse': {
        const a = A.actif;
        if (a?.energies.length) { a.energies.pop(); dire(c, 'energie-retiree', `${nomPerso(c, a)} perd 1 énergie.`, { cible: a.uid }); }
        break;
      }
      case 'recuperer-defausse': {
        const u = choix.carte;
        if (u && J.defausse.includes(u)) { J.defausse = J.defausse.filter((x) => x !== u); J.main.push(u); dire(c, 'recuperation', `${J.nom} récupère ${soutien(c.bib, p.cartes[u]!)?.nom ?? 'une carte'}.`, { joueur: j }); }
        break;
      }
      case 'echanger-actif-adverse': {
        const b = A.banc.find((x) => x.uid === choix.cible);
        if (b && A.actif) echanger(c, autre(j), b);
        break;
      }
      case 'voir-main-adverse': dire(c, 'voir-main', `${J.nom} regarde la main de ${A.nom} (${A.main.length} cartes).`, { joueur: j }); break;
      case 'voir-deck-adverse': dire(c, 'voir-deck', `${J.nom} regarde les ${Math.min(e.nombre, A.deck.length)} premières cartes du deck de ${A.nom}.`, { joueur: j }); break;
      case 'main-adverse-sous-deck': {
        const u = choix.carte;
        if (u && A.main.includes(u)) { A.main = A.main.filter((x) => x !== u); A.deck.push(u); dire(c, 'sous-deck', `${A.nom} remet une carte de sa main sous son deck.`, { joueur: autre(j) }); }
        break;
      }
      case 'bonus-prochaine-attaque': if (soi) soi.bonusProchaineAttaque += e.valeur; break;
      case 'terrain': break; // effet permanent : lu par le moteur tant que le Terrain est en jeu
      case 'special': {
        // Arise : remet sur ton banc un Base de Solo Leveling de ta défausse, avec 30 PV.
        const u = choix.carte;
        if (u && J.defausse.includes(u) && J.banc.length < BANC_MAX) {
          poserSurBanc(c, j, u, J.defausse);
          const x = J.banc[J.banc.length - 1]!;
          x.degats = Math.max(0, fiche(c, x.id).pv - 30);
          dire(c, 'arise', `Arise : ${nomPerso(c, x)} revient avec 30 PV.`, { cible: x.uid });
        }
        break;
      }
    }
  }
}

/** Échange l'actif avec un personnage du banc (les états de l'actif sont retirés en allant sur le banc). */
function echanger(c: Ctx, j: IdJoueur, b: PersoEnJeu): void {
  const J = c.p.joueurs[j];
  const ancien = J.actif!;
  retirerEtats(ancien);
  J.banc = J.banc.map((x) => (x.uid === b.uid ? ancien : x));
  J.actif = b;
  dire(c, 'echange', `${nomPerso(c, b)} devient l'actif de ${J.nom}.`, { joueur: j, cible: b.uid });
}

// ---------- Attaque ----------

/** L'attaque utilisée : celle du personnage, ou celle copiée sur l'actif adverse (Copie). */
function attaqueUtilisee(c: Ctx, j: IdJoueur, x: PersoEnJeu, index: number, choix: Choix): Attaque | null {
  const a = fiche(c, x.id).attaques[index];
  if (!a) return null;
  if (a.effets?.some((e) => e.type === 'special' && e.code === 'copie')) {
    const cible = c.p.joueurs[autre(j)].actif;
    return cible ? fiche(c, cible.id).attaques[choix.copie ?? 0] ?? null : null;
  }
  return a;
}

function attaquer(c: Ctx, j: IdJoueur, index: number, choix: Choix): void {
  const { p } = c;
  const J = p.joueurs[j];
  const A = p.joueurs[autre(j)];
  const soi = J.actif!;
  const original = fiche(c, soi.id).attaques[index]!;
  const a = attaqueUtilisee(c, j, soi, index, choix)!;
  const effets = a.effets ?? [];
  dire(c, 'attaque', `${nomPerso(c, soi)} utilise ${original.nom}${a !== original ? ` (copie : ${a.nom})` : ''}.`, { joueur: j, cible: soi.uid });
  soi.dernierTourAttaque = p.tour;
  // Étourdi : pile, l'attaque échoue.
  if (soi.etats.includes('etourdi') && piece(p) === 'pile') {
    dire(c, 'echec', `${nomPerso(c, soi)} est Étourdi : pile, l'attaque échoue.`, { cible: soi.uid });
    return resoudreKO(c, 'fin-de-tour');
  }
  // « Bungee Gum » : quand il attaque, l'actif adverse ne peut pas se replier au prochain tour.
  if (aTalent(c, soi, 'attaque-bloque-repli').length && A.actif) A.actif.sansRepliJusqua = p.tour + 1;

  // Dégâts de base (pièces) et bonus de l'attaque.
  let base = valeurDegats(a.degats);
  const pieces = effets.find((e): e is Extract<EffetAttaque, { type: 'pieces' }> => e.type === 'pieces');
  if (pieces) {
    let faces = 0;
    for (let k = 0; k < pieces.nombre; k++) if (piece(p) === 'face') faces++;
    base = faces * pieces.parFace;
    dire(c, 'piece', `${faces} face${faces > 1 ? 's' : ''} sur ${pieces.nombre}.`, { cible: soi.uid, valeur: faces });
  }
  const pf = effets.find((e): e is Extract<EffetAttaque, { type: 'pile-ou-face' }> => e.type === 'pile-ou-face');
  if (pf) { const r = piece(p); base = r === 'face' ? pf.face : pf.pile; dire(c, 'piece', `Pièce : ${r}.`, { cible: soi.uid }); }
  const ignore = (effets.find((e) => e.type === 'ignore') as Extract<EffetAttaque, { type: 'ignore' }> | undefined)?.quoi ?? null;

  // Cibles.
  const mode = (effets.find((e) => e.type === 'cible') as Extract<EffetAttaque, { type: 'cible' }> | undefined)?.quoi;
  const zone = effets.some((e) => e.type === 'zone');
  let cibles: PersoEnJeu[] = [];
  if (zone) cibles = enJeu(A);
  else if (mode && choix.cible) { const t = trouver(p, choix.cible); if (t && t.joueur !== j) cibles = [t.perso]; }
  else if (A.actif) cibles = [A.actif];
  const principale = cibles[0];

  // Bonus de l'attaque (conditions sur la cible principale).
  let bonus = soi.bonusProchaineAttaque;
  soi.bonusProchaineAttaque = 0;
  const ctx = { joueur: j, soi, cible: principale };
  for (const e of effets) {
    if (e.type === 'bonus' && condition(c, e.si, ctx)) bonus += e.valeur;
    if (e.type === 'bonus-par-banc') bonus += e.valeur * J.banc.length;
  }

  let koCible: PersoEnJeu | undefined;
  for (const x of cibles) {
    const active = A.actif?.uid === x.uid;
    // Première attaque subie à ce tour adverse : esquive (Sharingan, Mode Turbo) ou réduction (Calme plat).
    const premiere = x.premiereAttaqueAuTour !== p.tour;
    x.premiereAttaqueAuTour = p.tour;
    const esq = premiere ? aTalent(c, x, 'esquive-premiere')[0] : undefined;
    if (esq) {
      const r = piece(p);
      if (r === esq.cote) { dire(c, 'esquive', `${nomPerso(c, x)} esquive l'attaque (${r}).`, { cible: x.uid }); continue; }
    }
    const d = calculerDegats(c, j, soi, x, base, bonus, ignore, active, premiere);
    blesser(c, x, d, a.nom);
    if (x === principale) koCible = x;
    // Effets sur la cible touchée.
    for (const e of effets) {
      if (e.type === 'etat' && active && condition(c, e.si, { joueur: j, soi, cible: x })) poserEtat(c, autre(j), x, e.etat);
      if (e.type === 'bloque-repli-cible' && active) x.sansRepliJusqua = p.tour + 1;
      if (e.type === 'bloque-attaque-cible' && active && condition(c, e.si, { joueur: j, soi, cible: x })) { x.sansAttaqueJusqua = p.tour + 1; dire(c, 'bloque', `${nomPerso(c, x)} ne pourra pas attaquer au prochain tour.`, { cible: x.uid }); }
      if (e.type === 'degats-differes') x.differes.push({ valeur: e.valeur, auTour: p.tour + 1 });
    }
  }
  // Effets sur le reste de l'adversaire, et sur soi.
  let soinSiKO = 0;
  for (const e of effets) {
    switch (e.type) {
      case 'degats-banc-adverse': for (const x of A.banc) blesser(c, x, e.valeur, a.nom); break;
      case 'degats-soi': blesser(c, soi, e.valeur, a.nom); break;
      case 'defausse-energies-soi': {
        const n = e.nombre === 'toutes' ? soi.energies.length : Math.min(e.nombre, soi.energies.length);
        soi.energies.splice(soi.energies.length - n, n);
        dire(c, 'energies-defaussees', `${nomPerso(c, soi)} défausse ${n} énergie${n > 1 ? 's' : ''}.`, { cible: soi.uid, valeur: n });
        break;
      }
      case 'repos': soi.repos = { attaque: e.quoi === 'attaque' ? index : -1, jusqua: p.tour + 2 }; break;
      case 'bouclier-soi': soi.boucliers.push({ valeur: e.valeur, jusqua: p.tour + 2 }); break;
      case 'pioche': piocher(c, j, e.valeur); break;
      case 'defausse-main-adverse-hasard':
        for (let k = 0; k < e.nombre && A.main.length; k++) { const u = A.main.splice(tirer(p, A.main.length), 1)[0]!; A.defausse.push(u); dire(c, 'defausse', `${A.nom} défausse une carte au hasard.`, { joueur: autre(j) }); }
        break;
      case 'recuperer-defausse': appliquerEffetsAction(c, j, [{ type: 'recuperer-defausse', quoi: 'objet' }], choix, soi); break;
      case 'soin': if (choix.cible) { const t = trouver(p, choix.cible); if (t && t.joueur === j) soigner(c, t.perso, e.valeur); } break;
      case 'soin-soi-si-ko': soinSiKO = e.valeur; break;
      default: break;
    }
  }
  // Échange de soi (Manœuvre tridimensionnelle, Dribble) puis échange forcé de l'adversaire (Bleu).
  if (effets.some((e) => e.type === 'echange-soi') && choix.echange) {
    const b = J.banc.find((x) => x.uid === choix.echange);
    if (b && pvRestants(c, soi) > 0) echanger(c, j, b);
  }
  // Échange forcé (Bleu) : si l'actif adverse tient encore debout, il va sur le banc et l'adversaire choisit
  // lui-même son nouvel actif (la résolution des K.-O. ci-dessous le lui demande, puis le tour se termine).
  if (effets.some((e) => e.type === 'forcer-echange-adverse') && A.actif && A.banc.length && pvRestants(c, A.actif) > 0) {
    const ancien = A.actif;
    retirerEtats(ancien);
    A.banc.push(ancien);
    A.actif = null;
    dire(c, 'echange-force', `${A.nom} doit mettre un personnage de son banc en actif.`, { joueur: autre(j) });
  }
  resoudreKO(c, 'fin-de-tour', { joueur: j, perso: soi, cible: koCible, soinSiKO });
}

// ---------- Actions légales ----------

const memesCartes = (c: Ctx, uids: string[]): string[] => {
  // Une seule action par carte identique (deux exemplaires d'Onigiri donnent le même résultat).
  const vus = new Set<string>();
  return uids.filter((u) => { const id = c.p.cartes[u]!; if (vus.has(id)) return false; vus.add(id); return true; });
};

function permutations(n: number): number[][] {
  if (n <= 1) return [[0].slice(0, n)];
  const r: number[][] = [];
  for (const p of permutations(n - 1)) for (let i = 0; i <= p.length; i++) r.push([...p.slice(0, i), n - 1, ...p.slice(i)]);
  return r;
}

/** Toutes les combinaisons de choix pour une liste d'effets d'action (cartes Soutien, talents). */
function choixAction(c: Ctx, j: IdJoueur, effets: EffetAction[], soi: PersoEnJeu | null, carteJouee: string | null): Choix[] {
  const { p } = c;
  const J = p.joueurs[j];
  const A = p.joueurs[autre(j)];
  let liste: Choix[] = [{}];
  const produit = (options: Choix[]): void => {
    if (!options.length) { liste = []; return; }
    liste = liste.flatMap((x) => options.map((o) => ({ ...x, ...o })));
  };
  for (const e of effets) {
    switch (e.type) {
      case 'soin':
        if (e.cible === 'allie') produit(enJeu(J).filter((x) => !e.serie || fiche(c, x.id).serie === e.serie).map((x) => ({ cible: x.uid })));
        if (e.cible === 'actif' && !J.actif) produit([]);
        break;
      case 'soin-degats-dernier-tour-adverse':
      case 'retirer-etats': produit(enJeu(J).map((x) => ({ cible: x.uid }))); break;
      case 'degats': produit((e.cible === 'banc-adverse' ? A.banc : enJeu(A)).map((x) => ({ cible: x.uid }))); break;
      case 'regarder': {
        const n = Math.min(e.nombre, J.deck.length);
        if (n === 0) break;
        if (e.garder > 0) produit(Array.from({ length: n }, (_, i) => ({ garder: i })));
        if (e.reste === 'choix-dessous') produit([{ dessous: false }, { dessous: true }]);
        if (e.reste === 'ordre') produit(permutations(n).map((ordre) => ({ ordre })));
        break;
      }
      case 'energie-supplementaire': {
        const cibles = e.cible === 'banc' ? J.banc : enJeu(J).filter((x) => fiche(c, x.id).element === e.element);
        if (e.element && !J.elements.includes(e.element)) { produit([]); break; }
        if (!e.element && J.tour.energieBonus) { produit([]); break; }
        produit(cibles.map((x) => ({ cible: x.uid })));
        if (e.puisDefausse) {
          const main = memesCartes(c, J.main.filter((u) => u !== carteJouee));
          if (main.length) produit(main.map((u) => ({ defausse: u })));
        }
        break;
      }
      case 'echange-actif-soin': produit(J.actif ? J.banc.map((x) => ({ cible: x.uid })) : []); break;
      case 'recuperer-defausse': produit(memesCartes(c, J.defausse.filter((u) => soutien(c.bib, p.cartes[u]!)?.type === 'objet')).map((u) => ({ carte: u }))); break;
      case 'echanger-actif-adverse': produit(A.actif ? A.banc.map((x) => ({ cible: x.uid })) : []); break;
      case 'main-adverse-sous-deck': produit(memesCartes(c, A.main).map((u) => ({ carte: u }))); break;
      case 'special': {
        const bases = memesCartes(c, J.defausse.filter((u) => {
          const f = c.bib.personnages.get(p.cartes[u]!);
          return f?.type === 'base' && soi && f.serie === fiche(c, soi.id).serie;
        }));
        produit(J.banc.length < BANC_MAX ? bases.map((u) => ({ carte: u })) : []);
        break;
      }
      default: break;
    }
  }
  return liste;
}

/** Choix possibles pour une attaque (cible, soin, échange, carte, attaque copiée). */
function choixAttaque(c: Ctx, j: IdJoueur, a: Attaque): Choix[] {
  const { p } = c;
  const J = p.joueurs[j];
  const A = p.joueurs[autre(j)];
  let liste: Choix[] = [{}];
  const produit = (options: Choix[], facultatif = false): void => {
    if (!options.length) { if (!facultatif) liste = []; return; }
    liste = liste.flatMap((x) => options.map((o) => ({ ...x, ...o })));
  };
  for (const e of a.effets ?? []) {
    if (e.type === 'cible') produit((e.quoi === 'banc-adverse' ? A.banc : enJeu(A)).map((x) => ({ cible: x.uid })));
    if (e.type === 'soin') produit(enJeu(J).filter((x) => !e.serie || fiche(c, x.id).serie === e.serie).map((x) => ({ cible: x.uid })));
    if (e.type === 'echange-soi') produit([{}, ...J.banc.map((x) => ({ echange: x.uid }))], true);
    if (e.type === 'recuperer-defausse') produit(memesCartes(c, J.defausse.filter((u) => soutien(c.bib, p.cartes[u]!)?.type === 'objet')).map((u) => ({ carte: u })), true);
    if (e.type === 'special' && e.code === 'copie') produit(A.actif ? fiche(c, A.actif.id).attaques.map((_, i) => ({ copie: i })) : []);
  }
  return liste;
}

/** Les attaques utilisables par l'actif (énergies, Gel, interdictions, premier tour du premier joueur). */
function attaquesPossibles(c: Ctx, j: IdJoueur): number[] {
  const { p } = c;
  const J = p.joueurs[j];
  const x = J.actif;
  if (!x || (j === p.premier && J.toursJoues === 1)) return [];
  if (x.etats.includes('gel') || x.sansAttaqueJusqua >= p.tour) return [];
  return fiche(c, x.id).attaques.map((_, i) => i).filter((i) => {
    if (x.repos && x.repos.jusqua >= p.tour && (x.repos.attaque === -1 || x.repos.attaque === i)) return false;
    return peutPayer(x.energies, coutAttaque(c, j, x, fiche(c, x.id).attaques[i]!));
  });
}

/** Coût du Repli (Terrain compris) et repli gratuit possible. */
function coutRepli(c: Ctx, j: IdJoueur): { cout: number; gratuit: boolean } {
  const { p } = c;
  const J = p.joueurs[j];
  const x = J.actif!;
  let cout = fiche(c, x.id).repli;
  if (p.terrain) for (const e of soutien(c.bib, p.terrain.id)?.effets ?? []) if (e.type === 'terrain' && e.repli) cout += e.repli;
  const killua = aTalent(c, x, 'repli-gratuit').length > 0;
  return { cout, gratuit: J.tour.repliGratuit || killua };
}

/** Peut-on relever ce personnage en jeu avec cet Éveillé ? */
function releveAutorisee(c: Ctx, eveille: Personnage, cible: PersoEnJeu): boolean {
  const { p } = c;
  if (fiche(c, cible.id).serie !== eveille.serie) return false;
  if (cible.entreAuTour < p.tour) return true;
  // « Roi des fléaux » : Sukuna peut relever Itadori au tour même où Itadori est entré.
  return !!eveille.talent?.effets?.some((t) => t.type === 'special' && t.code === 'roi-des-fleaux') && cible.id === 'per-008';
}

/** Talents utilisables (activables) d'un personnage en jeu, à cet instant. */
function talentsActivables(c: Ctx, j: IdJoueur, x: PersoEnJeu): Extract<EffetTalent, { type: 'activable' }>[] {
  const J = c.p.joueurs[j];
  return aTalent(c, x, 'activable').filter((t) => {
    if (t.limite === 'tour' && J.tour.talents.includes(`${x.uid}:${x.id}`)) return false;
    if (t.limite === 'partie' && J.unique.includes(`talent:${x.id}`)) return false;
    if (t.cout === 'defausse-carte' && J.main.length === 0) return false;
    if (t.cout === 'defausse-objet' && !J.main.some((u) => soutien(c.bib, c.p.cartes[u]!)?.type === 'objet')) return false;
    if (t.cout === 'defausse-energie' && x.energies.length === 0) return false;
    return condition(c, t.si, { joueur: j, soi: x });
  });
}

export function actionsLegales(partie: Partie, bib: Bibliotheque): Action[] {
  const c: Ctx = { p: cloner(partie), bib, journal: [] };
  const { p } = c;
  if (p.phase === 'fin') return [];
  if (p.phase === 'mise-en-place') {
    const j = (p.joueurs[0].pret ? 1 : 0) as IdJoueur;
    const J = p.joueurs[j];
    const bases = J.main.filter((u) => estPosable(c, u));
    const r: Action[] = [];
    // Actif : chaque Base ; banc : les combinaisons des autres Bases (3 au plus), sans doublon de personnage identique.
    for (const actif of memesCartes(c, bases)) {
      const autres = bases.filter((u) => u !== actif);
      const ensembles: string[][] = [[]];
      for (const u of autres) for (const s of [...ensembles]) if (s.length < BANC_MAX) ensembles.push([...s, u]);
      const vus = new Set<string>();
      for (const banc of ensembles) {
        const cle = banc.map((u) => p.cartes[u]).sort().join(',');
        if (vus.has(cle)) continue;
        vus.add(cle);
        r.push({ type: 'mise-en-place', joueur: j, actif, banc });
      }
    }
    return r;
  }
  if (p.phase === 'choix-premier') {
    return [{ type: 'commencer', joueur: p.gagnantPiece, premier: true }, { type: 'commencer', joueur: p.gagnantPiece, premier: false }];
  }
  if (p.attente) {
    const j = p.attente.joueurs[0]!;
    return p.joueurs[j].banc.map((x) => ({ type: 'nouvel-actif', joueur: j, cible: x.uid }));
  }
  const j = p.joueurActif;
  const J = p.joueurs[j];
  const r: Action[] = [];
  const premierTour = J.toursJoues === 1;
  // Énergie du tour.
  if (J.energie && !J.tour.energieAttachee) for (const x of enJeu(J)) r.push({ type: 'attacher', joueur: j, cible: x.uid });
  // Bases sur le banc.
  if (J.banc.length < BANC_MAX) for (const u of memesCartes(c, J.main.filter((u) => estPosable(c, u)))) r.push({ type: 'poser', joueur: j, carte: u });
  // Relèves (pas au premier tour de chaque joueur).
  if (!premierTour) {
    for (const u of memesCartes(c, J.main.filter((u) => bib.personnages.get(p.cartes[u]!)?.type === 'eveille'))) {
      const ev = bib.personnages.get(p.cartes[u]!)!;
      for (const x of enJeu(J)) if (releveAutorisee(c, ev, x)) r.push({ type: 'releve', joueur: j, carte: u, cible: x.uid });
    }
  }
  // Cartes Soutien.
  for (const u of memesCartes(c, J.main.filter((u) => bib.soutiens.has(p.cartes[u]!)))) {
    const s = soutien(bib, p.cartes[u]!)!;
    if (s.type === 'soutien' && (J.tour.soutien || (j === p.premier && premierTour))) continue;
    if (s.type === 'terrain' && (J.tour.terrain || p.terrain?.id === s.id)) continue;
    for (const choix of choixAction(c, j, s.effets, null, u)) r.push({ type: 'jouer', joueur: j, carte: u, choix });
  }
  // Talents utilisables.
  for (const x of enJeu(J)) {
    for (const t of talentsActivables(c, j, x)) {
      let choix = choixAction(c, j, t.effets, x, null);
      if (t.cout === 'defausse-carte' || t.cout === 'defausse-objet') {
        const main = memesCartes(c, J.main.filter((u) => t.cout === 'defausse-carte' || soutien(bib, p.cartes[u]!)?.type === 'objet'));
        choix = choix.flatMap((ch) => main.map((u) => ({ ...ch, defausse: u })));
      }
      for (const ch of choix) r.push({ type: 'talent', joueur: j, source: x.uid, choix: ch });
    }
  }
  // Repli (une fois par tour).
  if (J.actif && J.banc.length && !J.tour.repli && !J.actif.etats.includes('gel') && J.actif.sansRepliJusqua < p.tour) {
    const { cout, gratuit } = coutRepli(c, j);
    if (gratuit || J.actif.energies.length >= cout) for (const x of J.banc) r.push({ type: 'repli', joueur: j, cible: x.uid });
  }
  // Attaques.
  for (const i of attaquesPossibles(c, j)) {
    const a = attaqueUtilisee(c, j, J.actif!, i, {});
    if (!a) continue;
    for (const choix of choixAttaque(c, j, fiche(c, J.actif!.id).attaques[i]!)) r.push({ type: 'attaquer', joueur: j, attaque: i, choix });
  }
  r.push({ type: 'passer', joueur: j });
  return r;
}

// ---------- Application ----------

const cleAction = (a: Action): string => JSON.stringify(a, Object.keys(a).sort());

/** Applique une action légale. La partie reçue n'est pas modifiée. Lève une erreur si l'action n'est pas permise. */
export function appliquer(partie: Partie, action: Action, bib: Bibliotheque, o: { verifier?: boolean } = {}): { partie: Partie; journal: Evenement[] } {
  if (o.verifier !== false) {
    const legales = actionsLegales(partie, bib);
    const cle = JSON.stringify(normaliser(action));
    if (!legales.some((x) => JSON.stringify(normaliser(x)) === cle)) throw new Error(`Action impossible : ${cleAction(action)}`);
  }
  const c: Ctx = { p: cloner(partie), bib, journal: [] };
  executer(c, action);
  return { partie: c.p, journal: c.journal };
}

/** Forme canonique d'une action (ordre des clés), pour la comparer aux actions légales. */
function normaliser(x: unknown): unknown {
  if (Array.isArray(x)) return x.map(normaliser);
  if (x && typeof x === 'object') return Object.fromEntries(Object.keys(x).sort().map((k) => [k, normaliser((x as Record<string, unknown>)[k])]));
  return x;
}

function executer(c: Ctx, a: Action): void {
  const { p } = c;
  const J = p.joueurs[a.joueur];
  switch (a.type) {
    case 'mise-en-place': {
      J.main = J.main.filter((u) => u !== a.actif && !a.banc.includes(u));
      J.actif = nouveauPerso(a.actif, p.cartes[a.actif]!, 0);
      J.banc = a.banc.map((u) => nouveauPerso(u, p.cartes[u]!, 0));
      J.pret = true;
      dire(c, 'mise-en-place', `${J.nom} pose un actif face cachée et ${a.banc.length} personnage${a.banc.length > 1 ? 's' : ''} sur son banc.`, { joueur: a.joueur });
      if (p.joueurs[0].pret && p.joueurs[1].pret) p.phase = 'choix-premier';
      return;
    }
    case 'commencer': {
      p.premier = a.premier ? a.joueur : autre(a.joueur);
      p.joueurActif = p.premier;
      p.tour = 1;
      p.phase = 'jeu';
      dire(c, 'commencer', `${p.joueurs[p.premier].nom} commence. Les actifs sont révélés.`, { joueur: p.premier });
      debutDeTour(c);
      return;
    }
    case 'attacher': {
      const x = trouver(p, a.cible)!.perso;
      x.energies.push(J.energie!);
      dire(c, 'energie-attachee', `${J.nom} attache 1 énergie ${ELEMENTS[J.energie!].nom} à ${nomPerso(c, x)}.`, { joueur: a.joueur, cible: x.uid });
      J.energie = null;
      J.tour.energieAttachee = true;
      return;
    }
    case 'poser': poserSurBanc(c, a.joueur, a.carte, J.main); return;
    case 'releve': {
      const t = trouver(p, a.cible)!;
      const ancien = t.perso;
      const x = nouveauPerso(a.carte, p.cartes[a.carte]!, p.tour);
      x.energies = [...ancien.energies];
      x.degats = ancien.degats;
      J.main = J.main.filter((u) => u !== a.carte);
      J.defausse.push(ancien.uid);
      if (t.actif) J.actif = x; else J.banc = J.banc.map((y) => (y.uid === ancien.uid ? x : y));
      dire(c, 'releve', `Relève ! ${nomPerso(c, x)} remplace ${nomPerso(c, ancien)}.`, { joueur: a.joueur, cible: x.uid });
      // Talents d'entrée par Relève (Haki des rois, Multiclonage).
      for (const tal of aTalent(c, x, 'entree-releve')) {
        for (const e of tal.effets) {
          if (e.type === 'degats-banc-adverse') for (const y of p.joueurs[autre(a.joueur)].banc) blesser(c, y, e.valeur, fiche(c, x.id).talent!.nom);
          if (e.type === 'poser-base-serie') appliquerEffetsAction(c, a.joueur, [{ type: 'chercher', quoi: 'base', vers: 'banc', serie: 'la-sienne' }], {}, x);
          if (e.type === 'retirer-energie-adverse') appliquerEffetsAction(c, a.joueur, [{ type: 'retirer-energie-adverse' }], {}, x);
        }
      }
      // « Genjutsu des corbeaux » : un Itachi adverse en jeu étourdit le personnage qui entre (s'il est actif).
      for (const y of enJeu(p.joueurs[autre(a.joueur)])) if (aTalent(c, y, 'releve-adverse-etourdie').length && t.actif) poserEtat(c, a.joueur, x, 'etourdi');
      resoudreKO(c, 'continuer');
      return;
    }
    case 'jouer': {
      const s = soutien(c.bib, p.cartes[a.carte]!)!;
      J.main = J.main.filter((u) => u !== a.carte);
      dire(c, 'soutien', `${J.nom} joue ${s.nom}.`, { joueur: a.joueur, cible: a.carte });
      if (s.type === 'objet') J.tour.objet = true;
      if (s.type === 'soutien') J.tour.soutien = true;
      if (s.type === 'terrain') {
        J.tour.terrain = true;
        if (p.terrain) p.joueurs[p.terrain.proprietaire].defausse.push(p.terrain.uid);
        p.terrain = { uid: a.carte, id: s.id, proprietaire: a.joueur };
      } else J.defausse.push(a.carte);
      appliquerEffetsAction(c, a.joueur, s.effets, a.choix, null, a.carte);
      resoudreKO(c, 'continuer');
      return;
    }
    case 'talent': {
      const x = trouver(p, a.source)!.perso;
      const t = talentsActivables(c, a.joueur, x)[0]!;
      const f = fiche(c, x.id);
      if (t.limite === 'tour') J.tour.talents.push(`${x.uid}:${x.id}`); else J.unique.push(`talent:${x.id}`);
      if (t.cout === 'defausse-energie') x.energies.pop();
      if ((t.cout === 'defausse-carte' || t.cout === 'defausse-objet') && a.choix.defausse) {
        J.main = J.main.filter((u) => u !== a.choix.defausse);
        J.defausse.push(a.choix.defausse);
      }
      dire(c, 'talent', `${f.nom} utilise ${f.talent!.nom}.`, { joueur: a.joueur, cible: x.uid });
      appliquerEffetsAction(c, a.joueur, t.effets, a.choix, x);
      resoudreKO(c, 'continuer');
      return;
    }
    case 'repli': {
      const { cout, gratuit } = coutRepli(c, a.joueur);
      const x = J.actif!;
      if (!gratuit) x.energies.splice(x.energies.length - cout, cout);
      J.tour.repli = true;
      dire(c, 'repli', `${nomPerso(c, x)} se replie${gratuit ? ' sans payer' : cout ? ` (${cout} énergie${cout > 1 ? 's' : ''})` : ''}.`, { joueur: a.joueur, cible: x.uid });
      echanger(c, a.joueur, J.banc.find((y) => y.uid === a.cible)!);
      return;
    }
    case 'attaquer': attaquer(c, a.joueur, a.attaque, a.choix); return;
    case 'passer': dire(c, 'passer', `${J.nom} termine son tour sans attaquer.`, { joueur: a.joueur }); finDeTour(c); return;
    case 'nouvel-actif': {
      const b = J.banc.find((x) => x.uid === a.cible)!;
      J.banc = J.banc.filter((x) => x.uid !== b.uid);
      J.actif = b;
      dire(c, 'nouvel-actif', `${nomPerso(c, b)} devient l'actif de ${J.nom}.`, { joueur: a.joueur, cible: b.uid });
      const att = p.attente!;
      att.joueurs = att.joueurs.filter((j) => j !== a.joueur);
      if (att.joueurs.length === 0) { p.attente = null; poursuivre(c, att.suite); }
      return;
    }
  }
}

/** Points de vie restants d'un personnage en jeu (pour l'interface et l'IA). */
export const pv = (partie: Partie, bib: Bibliotheque, uid: string): number => {
  const t = trouver(partie, uid);
  return t ? bib.personnages.get(t.perso.id)!.pv - t.perso.degats : 0;
};

export { trouver };
