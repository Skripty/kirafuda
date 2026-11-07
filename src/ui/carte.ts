// Élément DOM d'une carte (rendu de docs/reference/atelier-des-cartes.html).
// Chaque carte a une rareté fixe ; PV et attaques viennent de son personnage (règle 5 : la rareté ne donne aucune puissance).
import './carte.css';
import './carte-base.css';
import { EFFETS, ELEMENTS, FAIBLESSE, FINITIONS } from '../core/regles';
import { candidatsAffichage, type CandidatImage } from '../core/images';
import { indexer } from '../core/extension';
import { rngAGraine } from '../core/rng';
import type { Attaque, Carte, Extension } from '../core/types';

export interface OptionsCarte {
  /** Holo qui suit le pointeur et pivot horizontal léger (par défaut : oui). */
  interactive?: boolean;
  /** Modifie l'adresse des images (ex. numéro de version dans la page d'admin, pour contourner le cache). */
  transformerSrc?: (chemin: string) => string;
}

const NB_PARTICULES = 24;
const BASE = import.meta.env.BASE_URL;
/** Adresse versionnée par défaut : « ?v=<empreinte des images> » (cache long, voir public/_headers). */
const versionner = (chemin: string): string => `${chemin}?v=${__VERSION_IMAGES__}`;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, classe?: string, texte?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texte !== undefined) e.textContent = texte;
  return e;
}

/** Silhouette neutre : la fenêtre d'illustration n'est jamais vide. */
function remplacement(): HTMLElement {
  const div = el('div', 'carte-remplacement');
  div.innerHTML =
    '<span>Pas encore d’image</span>' +
    '<svg viewBox="0 0 100 110" aria-hidden="true"><path d="M16 110 Q20 76 50 72 Q80 76 84 110Z"/><circle cx="50" cy="50" r="20"/></svg>';
  return div;
}

/**
 * Image qui essaie les candidats dans l'ordre (règle de repli).
 * Si aucun n'existe, l'image est retirée et `siAucune` est appelé.
 */
function imageAvecRepli(
  candidats: CandidatImage[],
  siAucune: () => void,
  transformerSrc: (chemin: string) => string,
): HTMLImageElement | null {
  if (candidats.length === 0) {
    siAucune();
    return null;
  }
  const img = el('img', 'couvre');
  img.alt = '';
  img.draggable = false;
  img.decoding = 'async';
  img.loading = 'lazy'; // la collection affiche jusqu'à 140 cartes
  let i = 0;
  const essayer = (): void => {
    const { src, cadrage: { zoom, x, y } } = candidats[i]!;
    img.style.objectPosition = `${x}% ${y}%`;
    img.style.transformOrigin = `${x}% ${y}%`;
    img.style.transform = `scale(${zoom / 100})`;
    img.src = BASE + transformerSrc(src);
  };
  img.addEventListener('error', () => {
    i++;
    if (i < candidats.length) essayer();
    else {
      img.remove();
      siAucune();
    }
  });
  essayer();
  return img;
}

function illustration(carte: Carte, base: Carte | undefined, transformerSrc: (chemin: string) => string): HTMLElement {
  const art = el('div', 'carte-art');
  const fond = el('div', 'carte-calque fond');
  fond.append(el('div', 'carte-scene'));
  art.append(fond);

  // Illustration fixe ; pour l'immersive, l'animation (WebP animé) d'abord, sauf en mode animations réduites
  // (une image animée ne peut pas être mise en pause : on montre alors l'image fixe).
  const reduit = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const img = imageAvecRepli(candidatsAffichage(carte, base, reduit), () => fond.append(remplacement()), transformerSrc);
  if (img) fond.append(img);

  art.append(el('div', 'carte-film holo'));
  return art;
}

function attaque(a: Attaque): HTMLElement {
  const ligne = el('div', 'carte-attaque');
  const cout = el('span', 'carte-cout');
  cout.setAttribute('aria-label', `Coût ${a.cout}`);
  for (let i = 0; i < Math.max(0, Math.min(3, a.cout)); i++) cout.append(el('i'));

  const nom = el('span', 'carte-attaque-nom');
  nom.append(el('b', undefined, a.nom));
  if (a.effet) {
    const valeur = a.effet.valeur !== undefined ? ` ${a.effet.valeur}` : '';
    nom.append(el('small', undefined, `${EFFETS[a.effet.type].nom}${valeur}`));
  }
  ligne.append(cout, nom, el('span', 'carte-degats', String(a.degats)));
  return ligne;
}

/** Particules de la finition immersive : positions tirées d'une graine fixe par carte (pas de Math.random). */
function particules(carte: Carte): HTMLElement {
  const rng = rngAGraine(`particules:${carte.id}`);
  const conteneur = el('div', 'carte-particules');
  conteneur.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < NB_PARTICULES; i++) {
    const p = el('span', 'carte-particule');
    const duree = 6 + rng.entier(80) / 10; // 6 à 14 s
    p.style.setProperty('--px', `${rng.entier(1000) / 10}%`);
    p.style.setProperty('--taille', `${1 + rng.entier(26) / 10}`);
    p.style.setProperty('--duree', `${duree}s`);
    p.style.setProperty('--delai', `${-(rng.entier(Math.round(duree * 10)) / 10)}s`);
    p.append(el('i'));
    conteneur.append(p);
  }
  return conteneur;
}

/** Holo qui suit le pointeur et pivot horizontal léger (pivot seulement, jamais vertical). */
function rendreInteractive(racine: HTMLElement, corps: HTMLElement): void {
  racine.addEventListener('pointermove', (e) => {
    const r = corps.getBoundingClientRect();
    if (r.width === 0) return;
    const x = Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1);
    racine.style.setProperty('--x', ((x - 0.5) * 2).toFixed(3));
  });
  const reinitialiser = (): void => racine.style.setProperty('--x', '0');
  racine.addEventListener('pointerleave', reinitialiser);
  racine.addEventListener('pointercancel', reinitialiser);
}

/**
 * Précharge les images de cartes qui vont s'afficher (ex. le booster qu'on vient d'ouvrir, pendant l'animation).
 * Mêmes adresses et même ordre de repli que l'affichage : la carte retournée trouve son image déjà en cache.
 * Les autres images du jeu se chargent à la demande (loading="lazy").
 */
export function prechargerImages(cartes: Carte[], extension: Extension): void {
  const index = indexer(extension);
  const reduit = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  for (const carte of cartes) {
    const base = carte.secrete ? index.base(carte.personnage) : undefined;
    // Le rendu ♦ à ♦♦♦♦ n'a jamais d'animation ; ★ et plus suivent les animations réduites.
    const candidats = candidatsAffichage(carte, base, FINITIONS[carte.finition].pleineCarte ? reduit : false);
    let i = 0;
    const essayer = (): void => {
      const c = candidats[i];
      if (!c) return;
      const img = new Image();
      img.decoding = 'async';
      img.addEventListener('error', () => { i++; essayer(); });
      img.src = BASE + versionner(c.src);
    };
    essayer();
  }
}

export function numeroCarte(numero: number, total: number): string {
  const chiffres = Math.max(3, String(total).length);
  return `${String(numero).padStart(chiffres, '0')}/${String(total).padStart(chiffres, '0')}`;
}

// ---------- Cartes de base ♦ à ♦♦♦♦ (maquette docs/reference/refonte/Carte.dc.html) ----------

const SVG = 'http://www.w3.org/2000/svg';

/** Icône d'élément au trait (tracé tiré de regles.ts). */
function icone(glyphe: string, taille: number, epaisseur: number, classe: string, libelle?: string): SVGSVGElement {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', classe);
  if (taille > 0) {
    svg.setAttribute('width', String(taille));
    svg.setAttribute('height', String(taille));
  }
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke-width', String(epaisseur));
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  if (libelle) {
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', libelle);
  } else svg.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS(SVG, 'path');
  p.setAttribute('d', glyphe);
  svg.append(p);
  return svg;
}

/** Silhouette de la maquette, quand l'illustration manque. */
function silhouetteBase(): HTMLElement {
  const div = el('div', 'cb-remplacement');
  div.innerHTML =
    '<svg viewBox="0 0 200 140" preserveAspectRatio="xMidYMax meet" aria-hidden="true">'
    + '<circle cx="100" cy="58" r="26"/><path d="M44 140c4-30 28-46 56-46s52 16 56 46z"/></svg>'
    + '<span>Pas encore d’image</span>';
  return div;
}

function attaqueBase(a: Attaque): HTMLElement {
  const ligne = el('div', 'cb-attaque');
  const cout = el('span', 'cb-cout');
  cout.setAttribute('aria-label', `Coût ${a.cout}`);
  for (let i = 0; i < Math.max(0, Math.min(3, a.cout)); i++) cout.append(el('i'));
  const nom = el('span', 'cb-attaque-nom');
  nom.append(el('b', undefined, a.nom));
  if (a.effet) nom.append(el('small', undefined, `${EFFETS[a.effet.type].nom}${a.effet.valeur !== undefined ? ` ${a.effet.valeur}` : ''}`));
  ligne.append(cout, nom, el('span', 'cb-degats', String(a.degats)));
  return ligne;
}

/**
 * Carte de base : fond sombre teinté par l'élément, filigrane, pastille d'élément avec icône,
 * coûts en pastilles, cadre selon la rareté (graphite, acier, acier + holo sur l'illustration,
 * argent + holo sur toute la carte). Le holo suit le pointeur (transform seulement).
 */
function creerCarteBase(carte: Carte, extension: Extension, options: OptionsCarte): HTMLElement {
  const index = indexer(extension);
  const perso = index.personnageDe(carte);
  const base = carte.secrete ? index.base(carte.personnage) : undefined;
  const info = FINITIONS[carte.finition];
  const element = ELEMENTS[perso.element];
  const faible = FAIBLESSE[perso.element];
  const numero = numeroCarte(carte.numero, extension.total);
  const transformerSrc = options.transformerSrc ?? versionner;

  const racine = el('article', `carte carte-base f-${carte.finition}`);
  racine.dataset.carte = carte.id;
  racine.dataset.finition = carte.finition;
  racine.setAttribute('aria-label', `${perso.nom}, ${info.nom} ${info.symbole}, rang ${perso.rang}, n° ${numero}`);
  racine.style.setProperty('--aff', element.couleur);

  const corps = el('div', 'carte-corps cb-corps'); // cadre selon la rareté
  const interieur = el('div', 'cb-interieur');

  interieur.append(icone(element.glyphe, 0, 1.2, 'cb-filigrane'));

  const entete = el('div', 'cb-entete');
  const titres = el('div', 'cb-titres');
  titres.append(el('span', 'cb-serie', perso.serie), el('span', 'cb-nom', perso.nom));
  const pv = el('div', 'cb-pv');
  pv.append(el('span', undefined, 'PV'), el('strong', undefined, String(perso.pv)));
  const pastille = el('span', 'cb-element');
  pastille.title = element.nom;
  pastille.append(icone(element.glyphe, 0, 2.2, 'cb-element-icone', `Élément ${element.nom}`));
  entete.append(titres, pv, pastille);

  const illu = el('div', 'cb-illu');
  const img = imageAvecRepli(candidatsAffichage(carte, base, false), () => illu.prepend(silhouetteBase()), transformerSrc);
  if (img) illu.append(img);
  if (carte.finition === 'holo' || carte.finition === 'holo-integrale') illu.append(el('div', 'carte-film cb-film-illu'));

  const attaques = el('div', 'cb-attaques');
  attaques.append(attaqueBase(perso.attaques[0]), attaqueBase(perso.attaques[1]));

  const pied = el('div', 'cb-pied');
  if (faible) {
    const f = ELEMENTS[faible];
    const pf = el('span', 'cb-faible');
    pf.title = f.nom;
    pf.style.setProperty('--faible', f.couleur);
    pf.append(icone(f.glyphe, 0, 2.6, 'cb-faible-icone', `Faiblesse : ${f.nom}`));
    pied.append(el('span', undefined, 'Faiblesse'), pf);
  }
  pied.append(el('span', 'cb-espace'), el('span', 'cb-numero', numero), el('span', 'cb-symbole', info.symbole), el('span', 'cb-rang', perso.rang));

  interieur.append(entete, illu, attaques, el('div', 'cb-espace'), pied);
  // Holo intégrale : film sur toute la carte.
  if (carte.finition === 'holo-integrale') interieur.append(el('div', 'carte-film cb-film-total'));
  corps.append(interieur);
  racine.append(corps);

  if (options.interactive !== false) rendreInteractive(racine, corps);
  return racine;
}

/** Carte de l'extension, dans sa rareté. « extension » fournit le personnage (PV, attaques) et la carte de base (repli d'image). */
export function creerCarte(carte: Carte, extension: Extension, options: OptionsCarte = {}): HTMLElement {
  // ♦ à ♦♦♦♦ : nouveau rendu (refonte). ★ et plus : rendu de l'Atelier, inchangé.
  if (!FINITIONS[carte.finition].pleineCarte) return creerCarteBase(carte, extension, options);
  const index = indexer(extension);
  const perso = index.personnageDe(carte);
  const base = carte.secrete ? index.base(carte.personnage) : undefined;
  const finition = carte.finition;
  const infoFinition = FINITIONS[finition];
  const element = ELEMENTS[perso.element];
  const faiblesse = FAIBLESSE[perso.element];
  const numero = numeroCarte(carte.numero, extension.total);

  const racine = el('article', `carte f-${finition}${infoFinition.pleineCarte ? ' pleine-carte' : ''}`);
  racine.dataset.carte = carte.id;
  racine.dataset.finition = finition;
  racine.setAttribute(
    'aria-label',
    `${perso.nom}, ${infoFinition.nom} ${infoFinition.symbole}${carte.secrete ? ', carte secrète' : ''}, rang ${perso.rang}, n° ${numero}`,
  );
  racine.style.setProperty('--aff', element.couleur);

  const corps = el('div', 'carte-corps');

  const entete = el('div', 'carte-entete');
  const pastille = el('span', 'carte-element', element.abreviation);
  pastille.title = element.nom;
  pastille.setAttribute('aria-label', `Élément ${element.nom}`);
  entete.append(el('span', 'carte-nom', perso.nom), el('span', 'carte-pv', `PV ${perso.pv}`), pastille);

  const texte = el('div', 'carte-texte');
  const pied = el('div', 'carte-pied');
  pied.append(
    el('span', undefined, `Faiblesse : ${faiblesse ? ELEMENTS[faiblesse].nom : '—'}`),
    el('span', undefined, `${numero} ${infoFinition.symbole} · ${perso.rang}`),
  );
  texte.append(el('span', 'carte-serie', perso.serie), attaque(perso.attaques[0]), attaque(perso.attaques[1]), pied);

  corps.append(illustration(carte, base, options.transformerSrc ?? versionner), entete, texte, el('div', 'carte-film foil'));
  if (finition === 'holo-integrale') {
    // Film holo qui suit le pointeur sur toute la carte, cadre compris.
    const integrale = el('div', 'carte-integrale');
    integrale.setAttribute('aria-hidden', 'true');
    integrale.append(el('div', 'carte-film'));
    corps.append(integrale);
  }
  if (finition === 'immersive') corps.append(particules(carte));
  racine.append(corps);

  if (options.interactive !== false) rendreInteractive(racine, corps);
  return racine;
}
