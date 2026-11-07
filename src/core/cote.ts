// Cote (GDD, « Cote ») : valeur de la semaine d'une carte = popularité du personnage × multiplicateur de sa rareté.
// La cote ne change jamais les PV ni les attaques (règle 5) : elle ne sert qu'à l'affichage et à la revente.
import { COTE_PAR_SCEAU, FINITIONS } from './regles';
import { indexer } from './extension';
import type { Carte, Extension, FinitionId, Personnage, Popularite, Sauvegarde } from './types';

export type Sens = 'hausse' | 'baisse' | 'stable';

export interface Tendance {
  actuelle: number;
  precedente: number;
  /** actuelle − precedente */
  variation: number;
  sens: Sens;
}

const sens = (variation: number): Sens => (variation > 0 ? 'hausse' : variation < 0 ? 'baisse' : 'stable');
/** Arrondi à 0,1 pour éviter les restes flottants (multiplicateur 1,5). */
const arrondir = (x: number): number => Math.round(x * 10) / 10;

export const popularite = (p: Popularite, personnageId: string): number => p.courante[personnageId] ?? 0;

export function coteExemplaire(popularite: number, finition: FinitionId): number {
  return arrondir(popularite * FINITIONS[finition].multiplicateurCote);
}

/** Cote de la semaine d'une carte et tendance par rapport à la semaine précédente. */
export function tendanceCote(p: Popularite, carte: Carte): Tendance {
  const actuelle = coteExemplaire(p.courante[carte.personnage] ?? 0, carte.finition);
  const precedente = coteExemplaire(p.precedente[carte.personnage] ?? 0, carte.finition);
  const variation = arrondir(actuelle - precedente);
  return { actuelle, precedente, variation, sens: sens(variation) };
}

/** Valeur totale de la collection (exemplaires × cote), cette semaine et la précédente. */
export function valeurCollection(s: Sauvegarde, extension: Extension, p: Popularite): Tendance {
  let actuelle = 0;
  let precedente = 0;
  for (const carte of extension.cartes) {
    const n = s.collection[carte.id] ?? 0;
    if (n === 0) continue;
    const t = tendanceCote(p, carte);
    actuelle += n * t.actuelle;
    precedente += n * t.precedente;
  }
  actuelle = arrondir(actuelle);
  precedente = arrondir(precedente);
  const variation = arrondir(actuelle - precedente);
  return { actuelle, precedente, variation, sens: sens(variation) };
}

export interface Hausse {
  personnage: Personnage;
  popularite: number;
  /** Gain de popularité depuis la semaine précédente (> 0). */
  gain: number;
  /** Le joueur possède au moins une carte de ce personnage. */
  possedee: boolean;
}

/**
 * Plus fortes hausses de popularité de la semaine, parmi tous les personnages de l'extension
 * (une hausse de popularité fait monter la cote de toutes ses cartes).
 */
export function plusFortesHausses(s: Sauvegarde, extension: Extension, p: Popularite, nombre = 3): Hausse[] {
  const index = indexer(extension);
  return extension.personnages
    .map((personnage, ordre) => ({
      ordre,
      hausse: {
        personnage,
        popularite: p.courante[personnage.id] ?? 0,
        gain: (p.courante[personnage.id] ?? 0) - (p.precedente[personnage.id] ?? 0),
        possedee: index.cartesDe(personnage.id).some((c) => (s.collection[c.id] ?? 0) > 0),
      },
    }))
    .filter(({ hausse }) => hausse.gain > 0)
    .sort((a, b) => b.hausse.gain - a.hausse.gain || b.hausse.popularite - a.hausse.popularite || a.ordre - b.ordre)
    .slice(0, nombre)
    .map(({ hausse }) => hausse);
}

/** Sceaux rapportés par la revente d'un exemplaire en trop : 1 par tranche entière de COTE_PAR_SCEAU. */
export function sceauxPourCote(cote: number): number {
  return Math.floor(cote / COTE_PAR_SCEAU);
}

/** Format d'affichage : « 1 234 » ou « 61,5 ». */
export function formaterCote(x: number): string {
  const [entier, decimale] = arrondir(Math.abs(x)).toFixed(1).split('.') as [string, string];
  const groupes = entier.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${x < 0 ? '−' : ''}${groupes}${decimale === '0' ? '' : `,${decimale}`}`;
}

/** « ▲ +5 », « ▼ −3 » ou « = 0 » : le sens est toujours écrit, jamais indiqué par la seule couleur. */
export function formaterTendance(t: { variation: number; sens: Sens }): string {
  if (t.sens === 'stable') return '= 0';
  return `${t.sens === 'hausse' ? '▲ +' : '▼ −'}${formaterCote(Math.abs(t.variation))}`;
}
