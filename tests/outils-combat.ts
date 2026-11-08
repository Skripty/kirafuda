// Outils des tests de combat : une partie construite à la main (actifs, bancs, mains, énergies), des pièces
// choisies à l'avance (graine trouvée pour obtenir pile ou face), et l'application d'actions vérifiées.
import { catalogue } from '../src/catalogue';
import { fusionner, toutesLesExtensions } from '../src/core/catalogue';
import { rngAGraine } from '../src/core/rng';
import soutiensJson from '../src/data/soutiens.json';
import { bibliotheque, nouveauPerso, tourVide, type CarteSoutien, type IdJoueur, type JoueurCombat, type Partie, type PersoEnJeu } from '../src/core/combat/etat';
import { appliquer, actionsLegales, type Action, type Choix, type Evenement } from '../src/core/combat/moteur';
import type { ElementId } from '../src/core/types';

export const bib = bibliotheque(fusionner(toutesLesExtensions(catalogue)).personnages, soutiensJson.soutiens as unknown as CarteSoutien[]);

export interface Cote {
  actif?: string;
  banc?: string[];
  main?: string[];
  deck?: string[];
  defausse?: string[];
  elements?: ElementId[];
  points?: number;
  /** Énergies attachées : index 0 = actif, 1… = banc. */
  energies?: ElementId[][];
  /** Dégâts : index 0 = actif, 1… = banc. */
  degats?: number[];
  energie?: ElementId | null;
}

/**
 * Partie en cours de jeu, au tour 5 du joueur 0 (ni l'un ni l'autre n'est à son premier tour ; tout le monde est en jeu
 * depuis le tour 1). Les cartes reçoivent des uid lisibles : « A-<id> » pour le joueur 0, « B-<id> » pour le joueur 1
 * (suffixe « #2 », « #3 »… pour les exemplaires suivants).
 */
export function partie(j0: Cote, j1: Cote, o: { tour?: number; joueurActif?: IdJoueur; graine?: string } = {}): Partie {
  const cartes: Record<string, string> = {};
  const vus = new Map<string, number>();
  const uid = (j: IdJoueur, id: string): string => {
    const cle = `${j}:${id}`;
    const n = (vus.get(cle) ?? 0) + 1;
    vus.set(cle, n);
    const u = `${j === 0 ? 'A' : 'B'}-${id}${n > 1 ? `#${n}` : ''}`;
    cartes[u] = id;
    return u;
  };
  const joueur = (j: IdJoueur, c: Cote): JoueurCombat => {
    const enJeu = (id: string, k: number): PersoEnJeu => {
      const x = nouveauPerso(uid(j, id), id, 1);
      x.energies = [...(c.energies?.[k] ?? [])];
      x.degats = c.degats?.[k] ?? 0;
      return x;
    };
    return {
      nom: j === 0 ? 'Alice' : 'Bruno',
      actif: c.actif ? enJeu(c.actif, 0) : null,
      banc: (c.banc ?? []).map((id, k) => enJeu(id, k + 1)),
      main: (c.main ?? []).map((id) => uid(j, id)),
      deck: (c.deck ?? []).map((id) => uid(j, id)),
      defausse: (c.defausse ?? []).map((id) => uid(j, id)),
      points: c.points ?? 0,
      elements: c.elements ?? ['feu'],
      energie: c.energie ?? null,
      tour: tourVide(),
      unique: [],
      toursJoues: 3,
      pret: true,
    };
  };
  const tour = o.tour ?? 5;
  return {
    graine: o.graine ?? 'test', tirages: 0, tour, joueurActif: o.joueurActif ?? 0, premier: 0, gagnantPiece: 0,
    joueurs: [joueur(0, j0), joueur(1, j1)], cartes, terrain: null, phase: 'jeu', attente: null, gagnant: null, raisonFin: null,
  };
}

/** Prochaines pièces tirées (sans rien changer). */
export function pieces(p: Partie, n: number): ('pile' | 'face')[] {
  return Array.from({ length: n }, (_, k) => (rngAGraine(`${p.graine}:${p.tirages + k}`).entier(2) === 0 ? 'pile' : 'face'));
}

/** Change la graine pour que les prochaines pièces tombent comme demandé. */
export function avecPieces(p: Partie, cotes: ('pile' | 'face')[]): Partie {
  for (let k = 0; k < 10_000; k++) {
    const essai = { ...p, graine: `pieces-${cotes.join('-')}-${k}`, tirages: 0 };
    if (pieces(essai, cotes.length).every((x, i) => x === cotes[i])) return essai;
  }
  throw new Error('graine introuvable');
}

/** Applique une action (vérifiée : elle doit être légale). */
export function jouer(p: Partie, a: Action): { p: Partie; journal: Evenement[] } {
  const r = appliquer(p, a, bib);
  return { p: r.partie, journal: r.journal };
}

export const attaque = (p: Partie, index: number, choix: Choix = {}): { p: Partie; journal: Evenement[] } =>
  jouer(p, { type: 'attaquer', joueur: p.joueurActif, attaque: index, choix });

/** Un personnage en jeu par son uid. */
export function perso(p: Partie, uid: string): PersoEnJeu {
  for (const J of p.joueurs) {
    if (J.actif?.uid === uid) return J.actif;
    const b = J.banc.find((x) => x.uid === uid);
    if (b) return b;
  }
  throw new Error(`${uid} n'est pas en jeu`);
}

export const degats = (p: Partie, uid: string): number => perso(p, uid).degats;
export const legales = (p: Partie): Action[] => actionsLegales(p, bib);
export const types = (p: Partie): string[] => [...new Set(legales(p).map((a) => a.type))];
export const texte = (journal: Evenement[]): string => journal.map((e) => e.texte).join(' | ');

/** Dégâts infligés à un personnage dans un journal (même s'il est mis K.-O.). */
export const inflige = (journal: Evenement[], uid: string): number =>
  journal.filter((e) => e.type === 'degats' && e.cible === uid).reduce((n, e) => n + (e.valeur ?? 0), 0);
