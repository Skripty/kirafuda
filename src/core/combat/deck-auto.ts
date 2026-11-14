// Deck automatique : un deck de 20 cartes construit à partir des cartes possédées, autour d'un type (élément) ou
// d'une série. Logique pure, déterministe (aucun aléatoire) : mêmes cartes possédées → même deck.
//
// Ordre de construction :
//  1. personnages du critère : Bases et Héros d'abord (les plus solides), puis les Éveillés dont la série a un Base
//     ou un Héros dans le deck (un Éveillé seul ne peut jamais entrer en jeu) ; 7 personnages différents au plus ;
//  2. cartes Soutien possédées, les plus utiles d'abord ;
//  3. s'il manque encore des cartes : Bases et Héros neutres (coûts ◇, jouables partout), puis les autres Bases et
//     Héros possédés dont les attaques se paient avec les énergies du deck.
// 2 exemplaires au plus par carte, jamais plus que le nombre possédé.
import { ELEMENTS } from '../regles';
import type { CodeEnergie, ElementId, Personnage, TypePersonnage } from '../types';
import type { Bibliotheque, Deck } from './etat';
import { elementsDe } from './decks';

export const TAILLE_DECK_AUTO = 20;
const MAX_EXEMPLAIRES = 2;
const MAX_PERSONNAGES_CRITERE = 7;
const RANGS = ['S', 'A', 'B', 'C'];
const ENERGIE_DU_CODE: Partial<Record<CodeEnergie, ElementId>> = { f: 'feu', e: 'eau', g: 'glace', z: 'foudre', v: 'vent', t: 'terre', l: 'lumiere', n: 'tenebres' };

export type CritereDeck = { element: ElementId } | { serie: string };

export interface DeckAuto {
  deck: Deck;
  /** Cartes qui manquent pour atteindre 20 (la collection ne suffit pas). */
  manque: number;
}

/** Cartes Soutien les plus utiles d'abord ; les Terrains selon les personnages du deck. */
function prioriteSoutiens(persos: Personnage[]): string[] {
  const elements = new Set(persos.map((p) => p.element));
  const eveilles = persos.some((p) => p.type === 'eveille');
  return [
    'sou-entrainement-intensif', 'sou-parchemin-invocation',
    ...(eveilles ? ['sou-mentor'] : []),
    'sou-onigiri', 'sou-appel-renfort', 'sou-boussole', 'sou-reperage', 'sou-bandage', 'sou-infirmerie',
    ...(elements.has('tenebres') ? ['sou-shibuya-nuit', 'sou-relique-maudite'] : []),
    ...(elements.has('eau') || elements.has('vent') ? ['sou-mont-sagiri'] : []),
    'sou-arene-boxe', 'sou-talisman', 'sou-kunai', 'sou-pierre-energie', 'sou-fumigene', 'sou-antidote', 'sou-briefing-tactique',
    ...(eveilles ? [] : ['sou-mentor']),
  ];
}

const posable = (t: TypePersonnage): boolean => t !== 'eveille';

/** Les plus solides d'abord : rang (S, A, B, C), puis PV, puis id (ordre stable). */
const parForce = (a: Personnage, b: Personnage): number =>
  RANGS.indexOf(a.rang) - RANGS.indexOf(b.rang) || b.pv - a.pv || a.id.localeCompare(b.id);

/** Les attaques du personnage se paient-elles avec ces énergies (◇ = n'importe laquelle) ? */
function payable(p: Personnage, energies: ElementId[]): boolean {
  return p.attaques.some((a) => a.cout.every((c) => c === 'q' || energies.includes(ENERGIE_DU_CODE[c]!)));
}

/** Énergies du deck : celle du type d'abord (sauf Neutre), puis celles que demandent les attaques, 3 au plus. */
function energiesDe(persos: Personnage[], element: ElementId | null): ElementId[] {
  const besoins = elementsDe(persos).filter((e) => e !== 'neutre');
  const liste = element && element !== 'neutre' ? [element, ...besoins.filter((e) => e !== element)] : besoins;
  const resultat = liste.slice(0, 3);
  return resultat.length ? resultat : ['feu'];
}

/**
 * Complète une liste de cartes jusqu'à 20 : critère, cartes Soutien, puis compléments (voir en-tête).
 * `depart` : cartes déjà dans le deck (gardées telles quelles).
 */
function remplir(depart: string[], critere: CritereDeck | null, bib: Bibliotheque, possedes: (id: string) => number): { cartes: string[]; elements: ElementId[] } {
  const cartes = [...depart];
  const nombre = (id: string): number => cartes.filter((x) => x === id).length;
  const ajouter = (id: string, jusqua = MAX_EXEMPLAIRES): void => {
    while (cartes.length < TAILLE_DECK_AUTO && nombre(id) < Math.min(jusqua, possedes(id))) cartes.push(id);
  };
  const persosDuDeck = (): Personnage[] => [...new Set(cartes)].map((id) => bib.personnages.get(id)).filter((p): p is Personnage => !!p);
  const tous = [...bib.personnages.values()].filter((p) => possedes(p.id) > 0).sort(parForce);
  const correspond = (p: Personnage): boolean => !critere ? false : 'element' in critere ? p.element === critere.element : p.serie === critere.serie;

  // 1. Personnages du critère.
  const choisis = tous.filter(correspond);
  const posables = choisis.filter((p) => posable(p.type));
  const seriesPosables = new Set([...posables, ...persosDuDeck().filter((p) => posable(p.type))].map((p) => p.serie));
  const eveilles = choisis.filter((p) => p.type === 'eveille' && seriesPosables.has(p.serie));
  // Les Bases qui préparent un Éveillé du deck passent devant les autres.
  const seriesEveilles = new Set(eveilles.map((p) => p.serie));
  const ordre = [
    ...posables.filter((p) => seriesEveilles.has(p.serie)),
    ...posables.filter((p) => !seriesEveilles.has(p.serie)),
  ];
  const differents = new Set(persosDuDeck().map((p) => p.id));
  const prendre = (p: Personnage): void => {
    if (differents.size >= MAX_PERSONNAGES_CRITERE && !differents.has(p.id)) return;
    differents.add(p.id);
    ajouter(p.id);
  };
  // Au moins deux Bases (ou Héros) avant les Éveillés, pour que le deck puisse toujours jouer.
  for (const p of ordre.slice(0, 2)) prendre(p);
  for (const p of eveilles) if (seriesPosables.has(p.serie)) prendre(p);
  for (const p of ordre.slice(2)) prendre(p);

  // 2. Cartes Soutien.
  const element = critere && 'element' in critere ? critere.element : null;
  for (const s of prioriteSoutiens(persosDuDeck())) if (bib.soutiens.has(s)) ajouter(s);

  // 3. Compléments : Bases et Héros neutres, puis ceux qui se paient avec les énergies du deck.
  const energies = energiesDe(persosDuDeck(), element ?? persosDuDeck()[0]?.element ?? null);
  for (const p of tous) if (posable(p.type) && p.element === 'neutre') ajouter(p.id);
  for (const p of tous) if (posable(p.type) && payable(p, energies)) ajouter(p.id);
  return { cartes, elements: energiesDe(persosDuDeck(), element ?? energies[0] ?? null) };
}

/** Nom proposé pour un deck automatique. */
export function nomDeckAuto(critere: CritereDeck): string {
  return 'element' in critere ? `Deck ${ELEMENTS[critere.element].nom}` : `Deck ${critere.serie}`;
}

/**
 * Deck automatique autour d'un type ou d'une série. null si aucun Base ni Héros possédé ne correspond
 * (le deck ne pourrait jamais commencer une partie).
 */
export function construireDeckAuto(critere: CritereDeck, bib: Bibliotheque, possedes: (id: string) => number): DeckAuto | null {
  const correspond = (p: Personnage): boolean => ('element' in critere ? p.element === critere.element : p.serie === critere.serie);
  if (![...bib.personnages.values()].some((p) => correspond(p) && posable(p.type) && possedes(p.id) > 0)) return null;
  const { cartes, elements } = remplir([], critere, bib, possedes);
  return { deck: { nom: nomDeckAuto(critere), cartes, elements }, manque: TAILLE_DECK_AUTO - cartes.length };
}

/**
 * Complète un deck commencé à la main : ses cartes restent, le reste suit le type le plus présent parmi ses
 * personnages (ou son premier élément d'énergie). Les énergies sont recalculées.
 */
export function completerDeck(deck: Deck, bib: Bibliotheque, possedes: (id: string) => number): DeckAuto {
  const persos = deck.cartes.map((id) => bib.personnages.get(id)).filter((p): p is Personnage => !!p);
  const compte = new Map<ElementId, number>();
  for (const p of persos) compte.set(p.element, (compte.get(p.element) ?? 0) + 1);
  const dominant = [...compte].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? deck.elements[0] ?? null;
  const { cartes, elements } = remplir(deck.cartes.slice(0, TAILLE_DECK_AUTO), dominant ? { element: dominant } : null, bib, possedes);
  return { deck: { ...deck, cartes, elements }, manque: TAILLE_DECK_AUTO - cartes.length };
}

/** Nombre de personnages possédés par type (pour proposer les types jouables). */
export function personnagesParElement(bib: Bibliotheque, possedes: (id: string) => number): Map<ElementId, { total: number; posables: number }> {
  const n = new Map<ElementId, { total: number; posables: number }>();
  for (const p of bib.personnages.values()) {
    if (possedes(p.id) <= 0) continue;
    const v = n.get(p.element) ?? { total: 0, posables: 0 };
    v.total++;
    if (posable(p.type)) v.posables++;
    n.set(p.element, v);
  }
  return n;
}
