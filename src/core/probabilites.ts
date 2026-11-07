// Probabilités affichées et historique des ouvertures (logique pure).
// Règle 3 : les probabilités affichées sont exactement celles du fichier du booster.
import { FINITIONS, ORDRE_FINITIONS, TOTAL_POIDS } from './regles';
import { indexer } from './extension';
import type { Booster, Extension, FinitionId, Ouverture, TablePoids } from './types';

/**
 * Pourcentage exact d'un poids sur 100 000, sans arrondi : 70000 → « 70 % », 50 → « 0,05 % », 1 → « 0,001 % ».
 * Calcul en entiers : 1 point de poids = 0,001 %.
 */
export function formaterPourcentage(poids: number): string {
  if (!Number.isInteger(poids) || poids < 0 || poids > TOTAL_POIDS) throw new RangeError(`Poids invalide : ${poids}`);
  const entier = Math.floor(poids / 1000);
  const decimales = String(poids % 1000).padStart(3, '0').replace(/0+$/, '');
  return `${entier}${decimales ? `,${decimales}` : ''} %`;
}

/** Valeur approchée (pour les quotients qui ne tombent pas juste), toujours précédée de « ≈ ». */
export function formaterApproche(pourcentage: number): string {
  const arrondi = Math.round(pourcentage * 1000) / 1000;
  return `≈ ${String(arrondi).replace('.', ',')} %`;
}

/** Une rareté d’une table : poids exact, nombre de cartes de cette rareté, chance d’une carte précise (approchée). */
export interface LigneFinition { finition: FinitionId; poids: number; pourcentage: string; cartes: number; parCarte: string }
export interface TableAffichee { titre: string; finitions: LigneFinition[] }

export interface Probabilites {
  /** Chance qu'un booster soit exceptionnel. */
  tauxExceptionnel: string;
  /** Chance qu'il soit normal (complément exact). */
  tauxNormal: string;
  emplacements: TableAffichee[];
  exceptionnelle: TableAffichee;
}

function table(titre: string, finitions: TablePoids<FinitionId>, extension: Extension): TableAffichee {
  const index = indexer(extension);
  return {
    titre,
    finitions: ORDRE_FINITIONS.filter((f) => (finitions[f] ?? 0) > 0).map((f) => {
      const poids = finitions[f]!;
      const n = index.parFinition(f).length;
      return { finition: f, poids, pourcentage: formaterPourcentage(poids), cartes: n, parCarte: n > 0 ? formaterApproche((poids / 1000) / n) : '—' };
    }),
  };
}

/** Tables lues dans le fichier du booster, dans l'ordre des raretés (poids nuls omis). */
export function probabilites(booster: Booster, extension: Extension): Probabilites {
  return {
    tauxExceptionnel: formaterPourcentage(booster.tauxExceptionnel),
    tauxNormal: formaterPourcentage(TOTAL_POIDS - booster.tauxExceptionnel),
    emplacements: booster.emplacements.map((t) =>
      table(`Emplacement${t.emplacements.length > 1 ? 's' : ''} ${t.emplacements.join(', ')}`, t.finitions, extension)),
    exceptionnelle: table('Booster exceptionnel (toutes ses cartes)', booster.tableExceptionnelle.finitions, extension),
  };
}

// ---------- Historique ----------

/**
 * Ouvertures de la plus récente à la plus ancienne. Avec un filtre de finition, seules les ouvertures
 * déjà révélées qui contiennent cette finition sont gardées : un filtre ne doit jamais trahir
 * le contenu d'un booster pas encore révélé.
 */
export function filtrerHistorique(historique: Ouverture[], finition: FinitionId | null): Ouverture[] {
  const recentes = [...historique].reverse();
  if (finition === null) return recentes;
  return recentes.filter((o) => o.vue && o.cartes.some((c) => c.finition === finition));
}

/** Nombre de cartes obtenues par finition, dans les ouvertures révélées. */
export function cartesParFinition(historique: Ouverture[]): Record<FinitionId, number> {
  const compte = Object.fromEntries(ORDRE_FINITIONS.map((f) => [f, 0])) as Record<FinitionId, number>;
  for (const o of historique) if (o.vue) for (const c of o.cartes) compte[c.finition]++;
  return compte;
}

/** Libellé court d'une finition : « ★★ Illustration alternative ». */
export const libelleFinition = (f: FinitionId): string => `${FINITIONS[f].symbole} ${FINITIONS[f].nom}`;
