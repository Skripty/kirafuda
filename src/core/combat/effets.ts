// Vocabulaire des effets de combat (tâche 26) : chaque attaque, talent et carte Soutien porte un champ `effets`
// écrit dans ce vocabulaire (src/data/fiches-combat.json, src/data/soutiens.json). Le moteur (moteur.ts) les applique.
// Les effets trop particuliers ont leur propre code : { type: 'special', code }.
import type { ElementId, TypePersonnage } from '../types';

export type EtatCombat = 'brulure' | 'gel' | 'etourdi' | 'malediction';
export const ETATS: Record<EtatCombat, string> = { brulure: 'Brûlure', gel: 'Gel', etourdi: 'Étourdi', malediction: 'Malédiction' };

/** Côté d'une pièce. */
export type Piece = 'pile' | 'face';

/** Conditions (évaluées au moment de l'effet ; « soi » = le personnage qui porte l'attaque ou le talent). */
export type Condition =
  | { si: 'cible-blessee' }                       // la cible a déjà subi des dégâts
  | { si: 'cible-moitie-pv' }                     // la cible a la moitié de ses PV ou moins
  | { si: 'cible-etat'; etat: EtatCombat }
  | { si: 'cible-element'; element: ElementId }
  | { si: 'cible-type'; type: TypePersonnage }
  | { si: 'cible-plus-de-pv' }                    // la cible a plus de PV restants que soi
  | { si: 'soi-blesse' }
  | { si: 'soi-moitie-pv' }
  | { si: 'soi-pv-max'; valeur: number }          // soi a `valeur` PV restants ou moins
  | { si: 'soi-energies-min'; nombre: number }
  | { si: 'soi-pas-attaque-tour-precedent' }
  | { si: 'soi-blesse-dernier-tour-adverse' }
  | { si: 'perso-en-jeu'; personnage: string }     // ce personnage (id) est en jeu de ton côté
  | { si: 'autre-serie-en-jeu' }                  // un autre de tes personnages de la même série est en jeu
  | { si: 'banc-serie-min'; nombre: number }      // au moins `nombre` personnages de ta série sur ton banc
  | { si: 'objet-joue-ce-tour' }
  | { si: 'moins-de-points' }                     // tu as moins de points que l'adversaire
  | { si: 'moins-de-cartes-en-main' }
  | { si: 'source-eveille' }                      // les dégâts viennent d'un Éveillé (réductions)
  | { si: 'piece'; cote: Piece };                 // lancer une pièce : réussi sur ce côté

/** Où vont les dégâts de l'attaque (par défaut : l'actif adverse). */
export type CibleAttaque = 'banc-adverse' | 'n-importe';

/** Effets d'une attaque, appliqués dans l'ordre (les bonus avant le calcul des dégâts). */
export type EffetAttaque =
  | { type: 'bonus'; valeur: number; si: Condition }
  | { type: 'bonus-par-banc'; valeur: number }                       // par personnage sur ton banc
  | { type: 'pieces'; nombre: number; parFace: number }               // dégâts = parFace × nombre de faces
  | { type: 'pile-ou-face'; face: number; pile: number }              // dégâts selon la pièce
  | { type: 'cible'; quoi: CibleAttaque }
  | { type: 'zone' }                                                  // les dégâts touchent chaque personnage adverse
  | { type: 'degats-banc-adverse'; valeur: number }                   // en plus, à chaque personnage du banc adverse
  | { type: 'ignore'; quoi: 'boucliers' | 'boucliers-et-reductions' }
  | { type: 'etat'; etat: EtatCombat; si?: Condition }                // sur la cible
  | { type: 'degats-differes'; valeur: number }                       // la cible subit encore `valeur` au tour suivant
  | { type: 'degats-soi'; valeur: number }
  | { type: 'defausse-energies-soi'; nombre: number | 'toutes' }
  | { type: 'forcer-echange-adverse' }                                // l'adversaire met un personnage de son banc en actif
  | { type: 'repos'; quoi: 'attaque' | 'toutes' }                     // cette attaque (ou toute attaque) interdite au tour suivant
  | { type: 'bloque-repli-cible' }                                    // la cible ne peut pas se replier au prochain tour
  | { type: 'bloque-attaque-cible'; si?: Condition }                  // la cible ne peut pas attaquer au prochain tour
  | { type: 'echange-soi' }                                           // échange ensuite avec un de tes personnages du banc
  | { type: 'soin'; valeur: number; cible: 'allie'; serie?: string }
  | { type: 'soin-soi-si-ko'; valeur: number }
  | { type: 'bouclier-soi'; valeur: number }                          // subit `valeur` de moins jusqu'à ton prochain tour
  | { type: 'pioche'; valeur: number }
  | { type: 'defausse-main-adverse-hasard'; nombre: number }
  | { type: 'recuperer-defausse'; quoi: 'objet' }
  | { type: 'special'; code: 'copie' };                               // Copie (Yuta)

/** Effets d'action : cartes Soutien et talents utilisables (une fois par tour ou par partie). */
export type EffetAction =
  | { type: 'soin'; valeur: number; cible: 'allie' | 'actif' | 'soi'; serie?: string; retire?: 'brulure' | 'tous' }
  | { type: 'soin-degats-dernier-tour-adverse' }                        // soigne tous les dégâts subis au dernier tour adverse
  | { type: 'retirer-etats'; nombre: 'un' | 'tous' }
  | { type: 'bouclier'; valeur: number; cible: 'actif' | 'soi' }       // jusqu'à ton prochain tour
  | { type: 'degats'; valeur: number; cible: 'banc-adverse' | 'adverse' }
  | { type: 'pioche'; valeur: number }
  | { type: 'pioche-puis-defausse' }
  | { type: 'pioche-puis-sous-deck' }
  | { type: 'chercher'; quoi: 'base' | 'objet' | 'soutien' | 'eveille'; vers: 'main' | 'banc'; serie?: 'la-sienne'; hasard?: boolean; sauf?: string }
  | { type: 'regarder'; nombre: number; garder: number; reste: 'dessous' | 'ordre' | 'choix-dessous' }
  | { type: 'repli-gratuit' }                                           // ce tour
  | { type: 'energie-supplementaire'; element?: ElementId; cible: 'banc' | 'meme-element'; degatsCible?: number; puisDefausse?: boolean }
  | { type: 'echange-actif-soin'; valeur: number }
  | { type: 'melange-main-adverse'; pioche: number }
  | { type: 'retirer-energie-adverse' }
  | { type: 'recuperer-defausse'; quoi: 'objet' }
  | { type: 'echanger-actif-adverse' }
  | { type: 'voir-main-adverse' }
  | { type: 'voir-deck-adverse'; nombre: number }
  | { type: 'main-adverse-sous-deck' }
  | { type: 'bonus-prochaine-attaque'; valeur: number }
  | { type: 'terrain'; bonusAttaque?: number; element?: ElementId; typePerso?: TypePersonnage; repli?: number; soin?: number; elements?: ElementId[] }
  | { type: 'special'; code: 'arise' };

/** Effets d'un talent : passifs, déclenchés, ou utilisables (`activable`). */
export type EffetTalent =
  | { type: 'activable'; limite: 'tour' | 'partie'; cout?: 'defausse-carte' | 'defausse-objet' | 'defausse-energie'; si?: Condition; effets: EffetAction[] }
  | { type: 'bonus-attaque'; valeur: number; si?: Condition }
  | { type: 'bonus-serie'; valeur: number }                           // tes autres personnages de la série font +valeur
  | { type: 'reduction'; valeur: number; si?: Condition }              // soi subit `valeur` de moins
  | { type: 'reduction-premiere'; valeur: number }                     // la première attaque subie à chaque tour adverse
  | { type: 'esquive-premiere'; cote: Piece }                          // la première attaque subie à chaque tour adverse échoue sur ce côté
  | { type: 'protection'; valeur: number; depuis: 'banc' | 'jeu'; pour: 'actif-serie' | 'autres-serie' }
  | { type: 'vulnerabilite-adverse'; valeur: number }                  // tant que soi est sur le banc : l'actif adverse subit +valeur
  | { type: 'immunite'; etats: EtatCombat[] }
  | { type: 'cout-reduit'; valeur: number; si: Condition }             // ses attaques coûtent `valeur` ◇ de moins
  | { type: 'plancher'; valeur: number; sauf?: Condition }             // ses attaques ne descendent jamais la cible sous `valeur` PV
  | { type: 'survie'; pv: number; piece?: Piece }                      // une fois par partie, au lieu d'être mis K.-O.
  | { type: 'retour-deck' }                                            // une fois par partie : K.-O. → retourne dans le deck
  | { type: 'si-ko-subi'; effets: ({ type: 'degats-actif-adverse'; valeur: number } | { type: 'soin-serie'; valeur: number })[] }
  | { type: 'si-ko-inflige'; effets: ({ type: 'soin-soi'; valeur: number } | { type: 'pioche'; valeur: number })[] }
  | { type: 'entree-releve'; effets: ({ type: 'degats-banc-adverse'; valeur: number } | { type: 'poser-base-serie' })[] }
  | { type: 'releve-adverse-etourdie' }
  | { type: 'fin-de-tour'; soin: number }
  | { type: 'pose-base-serie'; pioche: number }                        // quand tu poses un Base de sa série
  | { type: 'attaque-bloque-repli' }                                   // quand il attaque, l'actif adverse ne peut pas se replier
  | { type: 'repli-gratuit'; limite: 'tour' }
  | { type: 'special'; code: 'rika' | 'roi-des-fleaux' };

// ---------- Validation (forme des données ; le moteur sait appliquer chaque type) ----------

const estObjet = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const TYPES_ATTAQUE = new Set(['bonus', 'bonus-par-banc', 'pieces', 'pile-ou-face', 'cible', 'zone', 'degats-banc-adverse', 'ignore', 'etat',
  'degats-differes', 'degats-soi', 'defausse-energies-soi', 'forcer-echange-adverse', 'repos', 'bloque-repli-cible', 'bloque-attaque-cible',
  'echange-soi', 'soin', 'soin-soi-si-ko', 'bouclier-soi', 'pioche', 'defausse-main-adverse-hasard', 'recuperer-defausse', 'special']);
const TYPES_ACTION = new Set(['soin', 'soin-degats-dernier-tour-adverse', 'retirer-etats', 'bouclier', 'degats', 'pioche', 'pioche-puis-defausse',
  'pioche-puis-sous-deck', 'chercher', 'regarder', 'repli-gratuit', 'energie-supplementaire', 'echange-actif-soin', 'melange-main-adverse',
  'retirer-energie-adverse', 'recuperer-defausse', 'echanger-actif-adverse', 'voir-main-adverse', 'voir-deck-adverse', 'main-adverse-sous-deck',
  'bonus-prochaine-attaque', 'terrain', 'special']);
const TYPES_TALENT = new Set(['activable', 'bonus-attaque', 'bonus-serie', 'reduction', 'reduction-premiere', 'esquive-premiere', 'protection',
  'vulnerabilite-adverse', 'immunite', 'cout-reduit', 'plancher', 'survie', 'retour-deck', 'si-ko-subi', 'si-ko-inflige', 'entree-releve',
  'releve-adverse-etourdie', 'fin-de-tour', 'pose-base-serie', 'attaque-bloque-repli', 'repli-gratuit', 'special']);

function verifier(liste: unknown, types: Set<string>, ref: string): string[] {
  if (!Array.isArray(liste)) return [`${ref} : liste « effets » attendue.`];
  const e: string[] = [];
  for (const x of liste) {
    if (!estObjet(x) || typeof x.type !== 'string' || !types.has(x.type)) { e.push(`${ref} : effet inconnu ${JSON.stringify(x)}.`); continue; }
    if (x.type === 'activable') e.push(...verifier(x.effets, TYPES_ACTION, `${ref} (activable)`));
  }
  return e;
}

export const validerEffetsAttaque = (x: unknown, ref: string): string[] => verifier(x, TYPES_ATTAQUE, ref);
export const validerEffetsTalent = (x: unknown, ref: string): string[] => verifier(x, TYPES_TALENT, ref);
export const validerEffetsSoutien = (x: unknown, ref: string): string[] => verifier(x, TYPES_ACTION, ref);
