// Mise en scène d'une ouverture déjà tirée et enregistrée (GDD, « Ouverture (états) »).
// Tout ce qui se décide ici est pur et testé : la machine à états, les effets par finition et
// les indices. Règle 4 : un indice ne s'affiche que si le tirage contient vraiment ce qu'il annonce.
import { FINITIONS } from './regles';
import type { FinitionId, Ouverture, Sauvegarde } from './types';

// ---------- Machine à états ----------
// HUB → PRESENTATION → BOOSTER_PRET → DECHIRURE → OUVERT → PILE ⇄ REVELATION → REVELEE → RESULTATS

export type Etape =
  | 'PRESENTATION'
  | 'BOOSTER_PRET'
  | 'DECHIRURE'
  | 'OUVERT'
  | 'PILE'
  | 'REVELATION'
  | 'REVELEE'
  | 'RESULTATS';

export interface EtatOuverture {
  etape: Etape;
  /** Index (0 à n-1) de la carte du dessus de la pile. */
  index: number;
  /** Nombre de cartes du booster. */
  total: number;
}

export type Evenement =
  | 'presente'           // fin de l'entrée du booster
  | 'debut-dechirure'    // le doigt se pose sur la bande
  | 'dechirure-annulee'  // relâché avant 75 %
  | 'dechire'            // 75 % atteints, ou bouton « Ouvrir le booster »
  | 'pile-prete'         // la pile est en place
  | 'toucher'            // toucher la carte du dessus
  | 'retournee'          // fin du retournement
  | 'suivante'           // carte lancée ou touchée
  | 'tout-reveler';      // bouton « Tout révéler », à tout moment

export function etatInitial(total: number): EtatOuverture {
  return { etape: 'PRESENTATION', index: 0, total };
}

/** Transition pure. Un événement sans objet dans l'état courant ne change rien (même objet renvoyé). */
export function transition(etat: EtatOuverture, evenement: Evenement): EtatOuverture {
  const vers = (etape: Etape, index = etat.index): EtatOuverture => ({ ...etat, etape, index });
  if (evenement === 'tout-reveler') return etat.etape === 'RESULTATS' ? etat : vers('RESULTATS', etat.total);

  switch (etat.etape) {
    case 'PRESENTATION':
      return evenement === 'presente' ? vers('BOOSTER_PRET') : etat;
    case 'BOOSTER_PRET':
      if (evenement === 'debut-dechirure') return vers('DECHIRURE');
      if (evenement === 'dechire') return vers('OUVERT'); // équivalent par bouton du glissé
      return etat;
    case 'DECHIRURE':
      if (evenement === 'dechire') return vers('OUVERT');
      if (evenement === 'dechirure-annulee') return vers('BOOSTER_PRET');
      return etat;
    case 'OUVERT':
      return evenement === 'pile-prete' ? vers('PILE') : etat;
    case 'PILE':
      return evenement === 'toucher' ? vers('REVELATION') : etat;
    case 'REVELATION':
      return evenement === 'retournee' ? vers('REVELEE') : etat;
    case 'REVELEE':
      if (evenement !== 'suivante') return etat;
      return etat.index + 1 >= etat.total ? vers('RESULTATS', etat.total) : vers('PILE', etat.index + 1);
    case 'RESULTATS':
      return etat;
  }
}

/** Seuil de la déchirure : 75 % de la largeur du booster. */
export const SEUIL_DECHIRURE = 0.75;

// ---------- Effets par finition ----------

export interface EffetsRevelation {
  /** Lueur avant le retournement (dès holo). */
  lueur: boolean;
  /** Tremblement avant le retournement (dès pleine). */
  tremblement: boolean;
  /** Agrandissement cinématique (immersive). */
  cinematique: boolean;
  /** Écran doré (couronne). */
  ecranDore: boolean;
}

const RANG_FINITION: Record<FinitionId, number> = {
  'commune': 0, 'peu-commune': 1, 'holo': 2, 'holo-integrale': 3, 'pleine': 4, 'alternative': 5, 'immersive': 6, 'couronne': 7,
};

export function effetsRevelation(finition: FinitionId): EffetsRevelation {
  const r = RANG_FINITION[finition];
  return {
    lueur: r >= RANG_FINITION.holo,
    tremblement: r >= RANG_FINITION.pleine,
    cinematique: finition === 'immersive',
    ecranDore: finition === 'couronne',
  };
}

/** Indice sur le booster : un reflet seulement si le booster contient une carte ★ ou plus. */
export function indiceBooster(ouverture: Ouverture): boolean {
  return ouverture.cartes.some((c) => FINITIONS[c.finition].pleineCarte);
}

// ---------- Ouvertures vues ----------

/** Marque une ouverture comme vue (mise à jour complète, sauvegarde d'origine intacte). */
export function marquerVue(sauvegarde: Sauvegarde, ouvertureId: string): Sauvegarde {
  const cible = sauvegarde.historique.find((o) => o.id === ouvertureId);
  if (!cible || cible.vue) return sauvegarde;
  return {
    ...sauvegarde,
    historique: sauvegarde.historique.map((o) => (o.id === ouvertureId ? { ...o, vue: true } : o)),
  };
}

/** Dernière ouverture pas encore révélée (page fermée pendant l'animation), à proposer au retour. */
export function ouvertureNonVue(sauvegarde: Sauvegarde): Ouverture | null {
  for (let i = sauvegarde.historique.length - 1; i >= 0; i--) {
    const o = sauvegarde.historique[i]!;
    if (!o.vue) return o;
  }
  return null;
}
