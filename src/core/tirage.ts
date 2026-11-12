// Tirage d'un booster (GDD, « Boosters », système TCG Pocket).
// Ordre : booster exceptionnel ou non, puis pour chaque emplacement : une rareté dans la table,
// puis une carte de cette rareté à poids égaux (personnages et, dans les boosters du jeu, cartes Soutien).
// Logique pure : le résultat est figé avant toute animation.
import { TOTAL_POIDS } from './regles';
import { indexer } from './extension';
import type { Booster, CarteTiree, Extension, FinitionId, TablePoids } from './types';
import type { Rng } from './rng';

export interface TirageBooster {
  /** Booster exceptionnel : toutes ses cartes viennent de la table exceptionnelle. */
  exceptionnel: boolean;
  cartes: CarteTiree[];
}

/** Table des raretés utilisée pour un emplacement donné. */
export function tableDeLEmplacement(booster: Booster, emplacement: number, exceptionnel: boolean): TablePoids<FinitionId> {
  if (exceptionnel) return booster.tableExceptionnelle.finitions;
  const table = booster.emplacements.find((t) => t.emplacements.includes(emplacement));
  if (!table) throw new Error(`Booster « ${booster.id} » : aucune table pour l'emplacement ${emplacement}.`);
  return table.finitions;
}

export interface OptionsTirage {
  /**
   * Booster garanti (tout premier booster, jour 7 du calendrier) : la carte du dernier emplacement
   * est tirée dans cette table (tableGarantie de quetes.json). Le reste du tirage est normal.
   */
  tableGarantie?: TablePoids<FinitionId>;
  /**
   * Boosters du jeu : les cartes Soutien de l'extension se tirent avec les personnages de même rareté.
   * Le draft ne les prend pas (ses 15 cartes sont des personnages : il n'active pas cette option).
   */
  avecSoutiens?: boolean;
}

export function tirerBooster(booster: Booster, extension: Extension, rng: Rng, options: OptionsTirage = {}): TirageBooster {
  const index = indexer(extension);
  const exceptionnel = rng.entier(TOTAL_POIDS) < booster.tauxExceptionnel;

  const cartes: CarteTiree[] = [];
  for (let emplacement = 1; emplacement <= booster.cartesParBooster; emplacement++) {
    const garantie = options.tableGarantie !== undefined && emplacement === booster.cartesParBooster;
    const finition = rng.ponderer(garantie ? options.tableGarantie! : tableDeLEmplacement(booster, emplacement, exceptionnel));
    const candidates = options.avecSoutiens ? index.tirables(finition) : index.parFinition(finition).map((c) => c.id);
    if (candidates.length === 0) {
      throw new Error(`Extension « ${extension.id} » : aucune carte de rareté « ${finition} » à tirer.`);
    }
    cartes.push({ carteId: candidates[rng.entier(candidates.length)]!, finition, emplacement });
  }
  return { exceptionnel, cartes };
}
