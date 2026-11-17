// Carte Soutien (tâche 29) : Objet ♦, Soutien ♦♦ ou Terrain ♦♦♦. Même composant que les cartes de personnage
// (carte.ts, tâche 31) : cadre, ornements, fenêtre d'illustration, plaque de nom (sans PV ni médaillon d'élément),
// étiquette du type et sa règle, texte de l'effet, numéro « S01/20 » et symbole de rareté toujours écrit.
// Image : public/cartes/<id>/illustration.webp ; sinon, décor de repli avec le symbole du type (règle 7).
import { FINITIONS } from '../core/regles';
import { CADRAGE_DEFAUT } from '../core/images';
import { indexer } from '../core/extension';
import type { Carte, CarteSoutien, Extension } from '../core/types';
import { creerCarte, rendreCarte, type ModeleCarte, type OptionsCarte } from './carte';

export const TYPES_SOUTIEN: Record<CarteSoutien['type'], { nom: string; regle: string; glyphe: string }> = {
  objet: { nom: 'Objet', regle: 'Autant que voulu par tour', glyphe: 'M6 8h12l-1 12H7zM9 8a3 3 0 0 1 6 0' },
  soutien: { nom: 'Soutien', regle: 'Un seul par tour', glyphe: 'M12 4a3.5 3.5 0 1 0 0 7a3.5 3.5 0 1 0 0-7zM5 20c1-4 4-6 7-6s6 2 7 6' },
  terrain: { nom: 'Terrain', regle: 'Un seul en jeu', glyphe: 'M3 19l6-10 4 6 3-4 5 8z' },
};

/** « S01/20 ». */
export function numeroSoutien(soutien: CarteSoutien, total: number): string {
  const chiffres = Math.max(2, String(total).length);
  return `S${String(soutien.numero ?? 0).padStart(chiffres, '0')}/${String(total).padStart(chiffres, '0')}`;
}

/** Modèle d'une carte Soutien pour le composant carte. */
export function modeleDeSoutien(soutien: CarteSoutien, extension: Extension): ModeleCarte {
  const info = FINITIONS[soutien.finition];
  const type = TYPES_SOUTIEN[soutien.type];
  const numero = numeroSoutien(soutien, extension.soutiens?.length ?? 0);
  return {
    id: soutien.id,
    finition: soutien.finition,
    element: 'neutre',
    medaillon: false,
    soutien: true,
    nom: soutien.nom,
    pv: null,
    type: type.nom,
    sousTitre: type.regle,
    infos: `${numero.split('/')[0]} · Carte ${type.nom}`,
    talent: { etiquette: 'Effet', nom: '', texte: soutien.texte },
    attaques: [],
    repli: null,
    numero,
    images: [{ src: `cartes/${soutien.id}/illustration.webp`, cadrage: { ...CADRAGE_DEFAUT }, origine: 'carte' }],
    glyphe: type.glyphe,
    densite: 1,
    libelle: `${soutien.nom}, carte ${type.nom}, ${info.nom} ${info.symbole}, n° ${numero}. ${soutien.texte}`,
  };
}

export function creerCarteSoutien(soutien: CarteSoutien, extension: Extension, options: OptionsCarte = {}): HTMLElement {
  return rendreCarte(modeleDeSoutien(soutien, extension), options);
}

/** Une carte du jeu par son id : carte de personnage ou carte Soutien (null si l'id est inconnu). */
export function creerCarteDuJeu(id: string, extension: Extension, options: OptionsCarte = {}): HTMLElement | null {
  const index = indexer(extension);
  const carte: Carte | undefined = index.carte(id);
  if (carte) return creerCarte(carte, extension, options);
  const soutien = index.soutien(id);
  return soutien ? creerCarteSoutien(soutien, extension, options) : null;
}

/** Nom affiché d'une carte du jeu (personnage ou carte Soutien). */
export function nomCarteDuJeu(id: string, extension: Extension): string | null {
  const index = indexer(extension);
  const carte = index.carte(id);
  if (carte) return index.personnageDe(carte).nom;
  return index.soutien(id)?.nom ?? null;
}
