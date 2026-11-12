// Ouverture d'un booster (logique pure).
// Règle 1 : le tirage précède l'animation. Cette fonction calcule tout le résultat ; l'appelant
// l'enregistre, puis seulement ensuite l'animation le met en scène.
// Règle 6 : une seule nouvelle sauvegarde complète (sceaux, collection, points, historique), ou rien.
import { tirerBooster } from './tirage';
import type { Rng } from './rng';
import type { Booster, Extension, FinitionId, Ouverture, Sauvegarde, TablePoids } from './types';

export type ResultatOuverture =
  | { ok: true; sauvegarde: Sauvegarde; ouverture: Ouverture }
  | {
      ok: false;
      raison: 'solde-insuffisant';
      /** Sceaux qui manquent pour ouvrir. */
      manque: number;
      /** La sauvegarde d'origine, inchangée (même objet). */
      sauvegarde: Sauvegarde;
    };

/** Identifiant d'ouverture : horodatage + suffixe aléatoire (tiré après les cartes, il ne change pas le tirage). */
function identifiant(maintenant: Date, rng: Rng): string {
  const suffixe = rng.entier(0x1_0000_0000).toString(16).padStart(8, '0');
  return `o-${maintenant.getTime().toString(36)}-${suffixe}`;
}

/**
 * Ouvre un booster. Ne modifie jamais `sauvegarde` : renvoie une nouvelle sauvegarde complète.
 * Une carte est « nouvelle » si le joueur ne la possédait pas encore (la collection compte par id de carte) ;
 * un deuxième exemplaire dans le même booster est donc un doublon.
 */
export function ouvrir(
  sauvegarde: Sauvegarde,
  booster: Booster,
  extension: Extension,
  rng: Rng,
  maintenant: Date = new Date(),
  /** Table de la 5e carte d'un booster garanti (tableGarantie de quetes.json) ; obligatoire s'il en reste un. */
  tableGarantie?: TablePoids<FinitionId>,
): ResultatOuverture {
  const cout = booster.cout.quantite;
  if (sauvegarde.sceaux < cout) {
    return { ok: false, raison: 'solde-insuffisant', manque: cout - sauvegarde.sceaux, sauvegarde };
  }

  // Booster garanti en attente (tout premier booster, jour 7 du calendrier) : une ★ ou plus en 5e position.
  const garanti = sauvegarde.quetes.boostersGarantis > 0;
  if (garanti && !tableGarantie) throw new Error('Booster garanti en attente : la table garantie (quetes.json) est obligatoire.');
  const tirage = tirerBooster(booster, extension, rng, { avecSoutiens: true, ...(garanti ? { tableGarantie } : {}) });

  const collection = { ...sauvegarde.collection };
  const cartes: Ouverture['cartes'] = tirage.cartes.map((c) => {
    const avant = collection[c.carteId] ?? 0;
    collection[c.carteId] = avant + 1;
    return { ...c, nouveau: avant === 0, exemplaires: avant + 1 };
  });

  const ouverture: Ouverture = {
    id: identifiant(maintenant, rng),
    date: maintenant.toISOString(),
    boosterId: booster.id,
    exceptionnelle: tirage.exceptionnel,
    cartes,
    pointsGagnes: booster.pointsParOuverture,
    // Pas encore vue : l'animation la marquera vue. Fermer la page avant ne perd aucune carte.
    vue: false,
  };

  const nouvelle: Sauvegarde = {
    ...sauvegarde,
    sceaux: sauvegarde.sceaux - cout,
    collection,
    points: {
      ...sauvegarde.points,
      [booster.extension]: (sauvegarde.points[booster.extension] ?? 0) + booster.pointsParOuverture,
    },
    historique: [...sauvegarde.historique, ouverture],
    quetes: garanti ? { ...sauvegarde.quetes, boostersGarantis: sauvegarde.quetes.boostersGarantis - 1 } : sauvegarde.quetes,
  };

  return { ok: true, sauvegarde: nouvelle, ouverture };
}
