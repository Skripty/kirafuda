// Données de combat des personnages (docs/COMBAT.md) : type Base / Éveillé, PV, Repli, talent, attaques.
// Source : src/data/fiches-combat.json (fichier d'équilibrage) ; `npm run fiches` les recopie dans les personnages
// des fichiers d'extension. Ici : lecture, validation et valeurs pour le draft ; les règles sont dans moteur.ts.
// La rareté ne change rien : toutes les cartes d'un personnage ont sa fiche (règle 5).
import { ELEMENTS } from '../regles';
import type { Attaque, CodeEnergie, ElementId, Extension, Personnage, Rang, Talent, TypePersonnage } from '../types';
import { validerEffetsAttaque, validerEffetsTalent } from './effets';

/** Code d'énergie → élément (null pour ◇, l'énergie quelconque). */
export const ENERGIES: Record<CodeEnergie, ElementId | null> = {
  f: 'feu', e: 'eau', g: 'glace', z: 'foudre', v: 'vent', t: 'terre', l: 'lumiere', n: 'tenebres', q: null,
};

/** Code d'énergie d'un élément (Neutre n'en a pas : il paie en ◇). */
export const codeEnergie = (e: ElementId): CodeEnergie | null =>
  (Object.entries(ENERGIES).find(([, el]) => el === e)?.[0] as CodeEnergie | undefined) ?? null;

/**
 * Types de personnage (docs/COMBAT.md) : rangs permis, points rapportés à l'adversaire s'il est mis K.-O.,
 * et pose directe depuis la main (Base, Héros) ou entrée par Relève seulement (Éveillé).
 */
export const TYPES_PERSONNAGE: Record<TypePersonnage, { nom: string; rangs: Rang[]; points: number; posable: boolean }> = {
  base: { nom: 'Base', rangs: ['C', 'B'], points: 1, posable: true },
  eveille: { nom: 'Éveillé', rangs: ['A', 'S'], points: 2, posable: false },
  heros: { nom: 'Héros', rangs: ['C', 'B'], points: 2, posable: true },
};

/**
 * Valeur des dégâts d'une attaque pour le draft (tâche 25) : un nombre compte tel quel ; « N× » (N par face)
 * compte 1,5 × N (« 30× » = 45) ; « A / B » (pile ou face) compte la moyenne (« 50 / 0 » = 25) ; pas de dégâts : 0.
 * NaN si le texte n'est pas reconnu (la validation le refuse).
 */
export function valeurDegats(d: number | string): number {
  if (typeof d === 'number') return d;
  const t = d.trim();
  if (t === '') return 0;
  const fois = /^(\d+)\s*×$/.exec(t);
  if (fois) return Number(fois[1]) * 1.5;
  const pile = /^(\d+)\s*\/\s*(\d+)$/.exec(t);
  if (pile) return (Number(pile[1]) + Number(pile[2])) / 2;
  return Number.NaN;
}

/** Texte des dégâts à afficher (« 40 », « 30× », « 50 / 0 », ou vide). */
export const texteDegats = (d: number | string): string => (typeof d === 'number' ? String(d) : d.trim());

// ---------- Fiches ----------

/** Fiche de src/data/fiches-combat.json. */
export interface FicheCombat {
  personnage: string;
  nom: string;
  serie: string;
  rang: Rang;
  element: ElementId;
  type: TypePersonnage;
  pv: number;
  repli: number;
  talent: Talent | null;
  attaques: Attaque[];
  /** Vague 3 (tâche 30) : ignorée pour l'instant. */
  nouveau: boolean;
}

export interface FichierFiches { fiches: FicheCombat[] }

const estObjet = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const texte = (x: unknown): x is string => typeof x === 'string' && x.trim() !== '';
const entier = (x: unknown, min: number, max: number): x is number => typeof x === 'number' && Number.isInteger(x) && x >= min && x <= max;

/**
 * Vérifie les données de combat d'un personnage (ou d'une fiche) : type selon le rang (Éveillés uniquement en
 * rang A et S, Bases et Héros en C et B), PV, Repli, talent, 1 ou 2 attaques aux coûts valides (énergies de son
 * élément et ◇ ; ◇ seulement pour un Neutre et pour tout personnage de rang C) et aux dégâts lisibles.
 */
export function validerCombat(p: Partial<Personnage> & { id?: unknown }, ref: string, exigerEffets = true): string[] {
  const e: string[] = [];
  const type = p.type as unknown;
  if (type !== 'base' && type !== 'eveille' && type !== 'heros') {
    e.push(`${ref} : type « base », « eveille » ou « heros » attendu (fiche de combat manquante ? lance npm run fiches).`);
  } else if (p.rang && !TYPES_PERSONNAGE[type].rangs.includes(p.rang)) {
    e.push(`${ref} : un ${TYPES_PERSONNAGE[type].nom} doit être de rang ${TYPES_PERSONNAGE[type].rangs.join(' ou ')} (rang ${p.rang}).`);
  }
  if (!entier(p.pv, 10, 400) || p.pv % 10 !== 0) e.push(`${ref} : PV entiers de 10 à 400, multiples de 10, attendus.`);
  if (!entier(p.repli, 0, 4)) e.push(`${ref} : Repli entier de 0 à 4 attendu.`);
  // Effets structurés (moteur de combat) : un talent en a toujours ; une attaque, dès qu'elle a un texte d'effet.
  if (estObjet(p.talent) && (p.talent.effets !== undefined || exigerEffets)) {
    if (exigerEffets && (!Array.isArray(p.talent.effets) || p.talent.effets.length === 0)) e.push(`${ref} : talent sans effets structurés (src/core/combat/effets.ts).`);
    else if (p.talent.effets !== undefined) e.push(...validerEffetsTalent(p.talent.effets, `${ref}, talent`));
  }
  if (p.talent !== null && (!estObjet(p.talent) || !texte(p.talent.nom) || !texte(p.talent.texte))) {
    e.push(`${ref} : talent null, ou nom et texte attendus.`);
  }
  if (!Array.isArray(p.attaques) || p.attaques.length < 1 || p.attaques.length > 2) {
    e.push(`${ref} : 1 ou 2 attaques attendues.`);
    return e;
  }
  const propre = p.element && Object.hasOwn(ELEMENTS, p.element) ? codeEnergie(p.element) : null;
  p.attaques.forEach((a, i) => {
    const ra = `${ref}, attaque ${i + 1}`;
    if (!estObjet(a)) { e.push(`${ra} : objet attendu.`); return; }
    if (!texte(a.nom)) e.push(`${ra} : nom attendu.`);
    if (!Array.isArray(a.cout) || a.cout.length < 1 || a.cout.length > 4) {
      e.push(`${ra} : coût de 1 à 4 énergies attendu.`);
    } else {
      for (const c of a.cout as unknown[]) {
        if (typeof c !== 'string' || !Object.hasOwn(ENERGIES, c)) e.push(`${ra} : énergie « ${String(c)} » inconnue (f, e, g, z, v, t, l, n ou q).`);
        // Élément inconnu : déjà signalé par la validation de l'extension, pas de seconde erreur ici.
        // Rang C : toutes ses attaques ne coûtent que des ◇ (3e équilibrage).
        else if (c !== 'q' && p.rang === 'C') e.push(`${ra} : énergie « ${c} » ; un personnage de rang C ne paie qu'en ◇ (q).`);
        else if (c !== 'q' && c !== propre && p.element && Object.hasOwn(ELEMENTS, p.element)) {
          e.push(`${ra} : énergie « ${c} » ; seules ${propre ? `« ${propre} » (${ELEMENTS[p.element!].nom}) et ` : ''}« q » (◇) sont permises.`);
        }
      }
    }
    if (typeof a.degats !== 'number' && typeof a.degats !== 'string') e.push(`${ra} : dégâts attendus (nombre ou texte).`);
    else if (Number.isNaN(valeurDegats(a.degats)) || valeurDegats(a.degats) < 0) e.push(`${ra} : dégâts « ${String(a.degats)} » illisibles (ex. 40, « 30× », « 50 / 0 », ou vide).`);
    if (typeof a.effet !== 'string') e.push(`${ra} : effet texte attendu ('' s'il n'y en a pas).`);
    if (a.effets !== undefined) e.push(...validerEffetsAttaque(a.effets, ra));
    if (exigerEffets && typeof a.effet === 'string' && a.effet.trim() && !a.effets?.length) e.push(`${ra} : texte d'effet sans effets structurés (src/core/combat/effets.ts).`);
    if (exigerEffets && a.effets === undefined) e.push(`${ra} : champ « effets » attendu ([] s'il n'y en a pas).`);
  });
  return e;
}

/** Vérifie le fichier des fiches : identifiants uniques, chaque fiche valide (y compris celles marquées « nouveau »). */
export function validerFiches(f: unknown): string[] {
  if (!estObjet(f) || !Array.isArray(f.fiches)) return ['Fiches de combat : liste « fiches » attendue.'];
  const e: string[] = [];
  const vus = new Set<string>();
  for (const [i, fiche] of (f.fiches as unknown[]).entries()) {
    if (!estObjet(fiche) || !texte(fiche.personnage)) { e.push(`Fiche ${i + 1} : personnage attendu.`); continue; }
    if (vus.has(fiche.personnage)) e.push(`Fiche ${fiche.personnage} : en double.`);
    vus.add(fiche.personnage);
    // Les fiches « nouveau » (vague 3) n'ont pas encore leurs effets structurés.
    e.push(...validerCombat(fiche as Partial<Personnage>, `Fiche ${fiche.personnage} (${String(fiche.nom)})`, fiche.nouveau !== true));
  }
  return e;
}

/** Les données de combat d'une fiche, dans l'ordre des champs du personnage. */
export const combatDe = (f: FicheCombat): Pick<Personnage, 'type' | 'pv' | 'repli' | 'talent' | 'attaques'> => ({
  type: f.type,
  pv: f.pv,
  repli: f.repli,
  talent: f.talent ? { nom: f.talent.nom, texte: f.talent.texte, ...(f.talent.effets ? { effets: structuredClone(f.talent.effets) } : {}) } : null,
  attaques: f.attaques.map((a) => ({ nom: a.nom, cout: [...a.cout], degats: a.degats, effet: a.effet, ...(a.effets ? { effets: structuredClone(a.effets) } : {}) })),
});

/**
 * Recopie les fiches dans les personnages d'une extension (fiches « nouveau » ignorées). Chaque personnage doit
 * avoir sa fiche, avec les mêmes nom, série, rang et élément. Les anciens champs de combat sont remplacés.
 */
export function appliquerFiches(extension: Extension, fichier: FichierFiches): { extension: Extension; erreurs: string[] } {
  const parId = new Map(fichier.fiches.filter((f) => !f.nouveau).map((f) => [f.personnage, f]));
  const erreurs: string[] = [];
  const personnages = extension.personnages.map((p): Personnage => {
    const f = parId.get(p.id);
    if (!f) { erreurs.push(`Personnage ${p.id} (${p.nom}) : aucune fiche dans fiches-combat.json.`); return p; }
    for (const k of ['nom', 'serie', 'rang', 'element'] as const) {
      if (p[k] !== f[k]) erreurs.push(`Personnage ${p.id} : ${k} « ${p[k]} » dans l'extension, « ${f[k]} » dans sa fiche.`);
    }
    return { id: p.id, nom: p.nom, serie: p.serie, rang: p.rang, element: p.element, ...combatDe(f) };
  });
  return { extension: { ...extension, personnages }, erreurs };
}
