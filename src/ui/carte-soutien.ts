// Carte Soutien (tâche 29) : pas de PV ni d'attaques. Bandeau du type (Objet / Soutien / Terrain), nom,
// illustration (public/cartes/<id>/illustration.webp, visuel de remplacement si elle manque), texte de l'effet,
// numéro « S01/20 » et symbole de rareté toujours écrit.
import './carte.css';
import './carte-soutien.css';
import { FINITIONS } from '../core/regles';
import { indexer } from '../core/extension';
import type { Carte, CarteSoutien, Extension } from '../core/types';
import { creerCarte, type OptionsCarte } from './carte';

const BASE = import.meta.env.BASE_URL;

export const TYPES_SOUTIEN: Record<CarteSoutien['type'], { nom: string; regle: string; glyphe: string }> = {
  objet: { nom: 'Objet', regle: 'Autant que voulu par tour', glyphe: 'M6 8h12l-1 12H7zM9 8a3 3 0 0 1 6 0' },
  soutien: { nom: 'Soutien', regle: 'Un seul par tour', glyphe: 'M12 4a3.5 3.5 0 1 0 0 7a3.5 3.5 0 1 0 0-7zM5 20c1-4 4-6 7-6s6 2 7 6' },
  terrain: { nom: 'Terrain', regle: 'Un seul en jeu', glyphe: 'M3 19l6-10 4 6 3-4 5 8z' },
};

function el<K extends keyof HTMLElementTagNameMap>(tag: K, classe?: string, texte?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texte !== undefined) e.textContent = texte;
  return e;
}

/** « S01/20 ». */
export function numeroSoutien(soutien: CarteSoutien, total: number): string {
  const chiffres = Math.max(2, String(total).length);
  return `S${String(soutien.numero ?? 0).padStart(chiffres, '0')}/${String(total).padStart(chiffres, '0')}`;
}

export function creerCarteSoutien(soutien: CarteSoutien, extension: Extension, options: OptionsCarte = {}): HTMLElement {
  const info = FINITIONS[soutien.finition];
  const type = TYPES_SOUTIEN[soutien.type];
  const total = extension.soutiens?.length ?? 0;
  const numero = numeroSoutien(soutien, total);
  const racine = el('article', `carte carte-soutien cs-${soutien.type} f-${soutien.finition}`);
  racine.dataset.carte = soutien.id;
  racine.dataset.finition = soutien.finition;
  racine.setAttribute('aria-label', `${soutien.nom}, carte ${type.nom}, ${info.nom} ${info.symbole}, n° ${numero}`);

  const corps = el('div', 'carte-corps cs-corps');
  const interieur = el('div', 'cs-interieur');
  const bandeau = el('div', 'cs-bandeau');
  bandeau.append(el('span', 'cs-type', type.nom), el('span', 'cs-regle', type.regle));

  const illu = el('div', 'cs-illu');
  // Visuel de remplacement, toujours présent sous l'image : une carte n'est jamais vide (règle 7).
  const remplacement = el('div', 'cs-remplacement');
  remplacement.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${type.glyphe}"/></svg>`;
  illu.append(remplacement);
  const img = el('img', 'couvre');
  img.alt = '';
  img.decoding = 'async';
  img.loading = 'lazy';
  img.draggable = false;
  img.addEventListener('error', () => img.remove());
  const chemin = `cartes/${soutien.id}/illustration.webp`;
  img.src = BASE + (options.transformerSrc ? options.transformerSrc(chemin) : `${chemin}?v=${__VERSION_IMAGES__}`);
  illu.append(img);

  const pied = el('div', 'cs-pied');
  pied.append(el('span', 'cs-numero', numero), el('span', 'cs-symbole', info.symbole));
  interieur.append(bandeau, el('h3', 'cs-nom', soutien.nom), illu, el('p', 'cs-texte', soutien.texte), pied);
  corps.append(interieur);
  racine.append(corps);
  return racine;
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
