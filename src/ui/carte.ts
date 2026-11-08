// Élément DOM d'une carte (rendu de docs/reference/atelier-des-cartes.html).
// Chaque carte a une rareté fixe ; PV et attaques viennent de son personnage (règle 5 : la rareté ne donne aucune puissance).
import './carte.css';
import './carte-base.css';
import './carte-combat.css';
import { ELEMENTS, FAIBLESSE, FINITIONS } from '../core/regles';
import { ENERGIES, TYPES_PERSONNAGE, texteDegats } from '../core/combat';
import { iconeElement } from './element';
import { candidatsAffichage, type CandidatImage } from '../core/images';
import { indexer } from '../core/extension';
import { rngAGraine } from '../core/rng';
import type { Attaque, Carte, CodeEnergie, Extension, Personnage } from '../core/types';

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

// ---------- Données de combat (fiche du personnage), communes aux deux mises en page ----------

/** Une énergie : icône de l'élément (public/elements), ou ◇ gris pour l'énergie quelconque. Décorative : le sens est dans l'étiquette. */
function energie(code: CodeEnergie): HTMLElement {
  const element = ENERGIES[code];
  if (element) return iconeElement(element, 'cc-energie', null);
  const q = el('span', 'cc-energie cc-quelconque', '◇');
  q.setAttribute('aria-hidden', 'true');
  return q;
}

/** « 2 Lumière et 1 quelconque ». */
function texteEnergies(codes: CodeEnergie[]): string {
  const n = new Map<CodeEnergie, number>();
  for (const c of codes) n.set(c, (n.get(c) ?? 0) + 1);
  const parties = [...n].map(([c, k]) => {
    const element = ENERGIES[c];
    return `${k} ${element ? ELEMENTS[element].nom : 'quelconque'}`;
  });
  return parties.length > 1 ? `${parties.slice(0, -1).join(', ')} et ${parties.at(-1)}` : parties[0] ?? '0';
}

function coutAttaque(a: Attaque): HTMLElement {
  const c = el('span', 'cc-cout');
  c.setAttribute('role', 'img');
  c.setAttribute('aria-label', `Coût : ${texteEnergies(a.cout)}`);
  for (const code of a.cout) c.append(energie(code));
  return c;
}

function attaque(a: Attaque): HTMLElement {
  const ligne = el('div', 'cc-attaque');
  const nom = el('span', 'cc-attaque-nom');
  nom.append(el('b', undefined, a.nom));
  if (a.effet.trim()) nom.append(el('small', undefined, a.effet.trim()));
  ligne.append(coutAttaque(a), nom, el('span', 'cc-degats', texteDegats(a.degats)));
  return ligne;
}

/** « Base · One Piece » ou « Éveillé · Relève : One Piece ». */
function identite(p: Personnage): HTMLElement {
  const ligne = el('div', 'cc-identite');
  ligne.append(
    el('span', `cc-type cc-type-${p.type}`, TYPES_PERSONNAGE[p.type].nom),
    el('span', 'cc-serie', p.type === 'eveille' ? `Relève : ${p.serie}` : p.serie),
  );
  return ligne;
}

function talent(p: Personnage): HTMLElement | null {
  if (!p.talent) return null;
  const bloc = el('p', 'cc-talent');
  bloc.append(el('span', 'cc-talent-etiquette', 'Talent'), el('b', undefined, p.talent.nom), ` ${p.talent.texte}`);
  return bloc;
}

function repli(p: Personnage): HTMLElement {
  const r = el('span', 'cc-repli', 'Repli');
  r.setAttribute('role', 'img');
  r.setAttribute('aria-label', p.repli === 0 ? 'Repli : aucune énergie' : `Repli : ${p.repli} énergie${p.repli > 1 ? 's' : ''} quelconque${p.repli > 1 ? 's' : ''}`);
  if (p.repli === 0) r.append(el('span', 'cc-repli-zero', '0'));
  for (let i = 0; i < p.repli; i++) r.append(energie('q'));
  return r;
}

/**
 * Densité du texte de combat (1 = taille normale, au moins 0,74) : plus le talent et les effets sont longs, plus
 * le texte est petit, pour tenir dans la carte sans toucher à l'illustration. Calculée sur le nombre de caractères
 * (même résultat partout, sans mesurer la page).
 */
export function densiteTexte(p: Personnage): number {
  const caracteres = (p.talent ? p.talent.nom.length + p.talent.texte.length + 8 : 0)
    + p.attaques.reduce((n, a) => n + a.nom.length + a.effet.length + 14, 0);
  return Math.max(0.74, Math.min(1, 1 - (caracteres - 90) / 480));
}

/** Talent et attaques ; la colonne des coûts prend la largeur du plus long coût de la carte. */
function blocCombat(p: Personnage, classe: string): HTMLElement {
  const bloc = el('div', `cc-combat ${classe}`);
  bloc.style.setProperty('--cout-max', String(Math.max(...p.attaques.map((a) => a.cout.length))));
  const t_ = talent(p);
  if (t_) bloc.append(t_);
  const attaques = el('div', 'cc-attaques');
  for (const a of p.attaques) attaques.append(attaque(a));
  bloc.append(attaques);
  return bloc;
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
  racine.style.setProperty('--densite', densiteTexte(perso).toFixed(3));

  const corps = el('div', 'carte-corps cb-corps'); // cadre selon la rareté
  const interieur = el('div', 'cb-interieur');

  interieur.append(icone(element.glyphe, 0, 1.2, 'cb-filigrane'));

  const entete = el('div', 'cb-entete');
  const titres = el('div', 'cb-titres');
  titres.append(identite(perso), el('span', 'cb-nom', perso.nom));
  const pv = el('div', 'cb-pv');
  pv.append(el('span', undefined, 'PV'), el('strong', undefined, String(perso.pv)));
  const pastille = iconeElement(perso.element, 'cb-element', `Élément ${element.nom}`);
  entete.append(titres, pv, pastille);

  const illu = el('div', 'cb-illu');
  const img = imageAvecRepli(candidatsAffichage(carte, base, false), () => illu.prepend(silhouetteBase()), transformerSrc);
  if (img) illu.append(img);
  if (carte.finition === 'holo' || carte.finition === 'holo-integrale') illu.append(el('div', 'carte-film cb-film-illu'));

  // Talent et attaques : prennent la place libre sous l'illustration (dont la taille ne change jamais).
  const combat = blocCombat(perso, 'cb-combat');

  const pied = el('div', 'cb-pied');
  if (faible) {
    const pf = iconeElement(faible, 'cb-faible', `Faiblesse : ${ELEMENTS[faible].nom}`);
    pied.append(el('span', undefined, 'Faiblesse'), pf);
  } else pied.append(el('span', undefined, 'Faiblesse —'));
  pied.append(repli(perso), el('span', 'cb-espace'), el('span', 'cb-numero', numero), el('span', 'cb-symbole', info.symbole), el('span', 'cb-rang', perso.rang));

  interieur.append(entete, illu, combat, pied);
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
  racine.style.setProperty('--densite', densiteTexte(perso).toFixed(3));

  const corps = el('div', 'carte-corps');

  const entete = el('div', 'carte-entete');
  const pastille = iconeElement(perso.element, 'carte-element', `Élément ${element.nom}`);
  entete.append(el('span', 'carte-nom', perso.nom), el('span', 'carte-pv', `PV ${perso.pv}`), pastille);

  const texte = el('div', 'carte-texte');
  const pied = el('div', 'carte-pied');
  const ligneFaible = el('span', 'carte-faible', faiblesse ? 'Faiblesse' : 'Faiblesse : —');
  if (faiblesse) ligneFaible.append(iconeElement(faiblesse, 'carte-faible-icone', `Faiblesse : ${ELEMENTS[faiblesse].nom}`));
  pied.append(
    ligneFaible,
    repli(perso),
    el('span', 'carte-numero', `${numero} ${infoFinition.symbole} · ${perso.rang}`),
  );
  texte.append(identite(perso), blocCombat(perso, 'carte-combat'), pied);

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
  // ★ à ★★★ : bande du cadre en dégradé holo (et reflet pour ★★★), dessinée par-dessus la bordure, hors de l'image.
  if (finition === 'pleine' || finition === 'alternative' || finition === 'immersive') {
    const bande = el('div', 'carte-bande');
    bande.setAttribute('aria-hidden', 'true');
    racine.append(bande);
    if (finition === 'immersive') {
      const reflet = el('div', 'carte-reflet');
      reflet.setAttribute('aria-hidden', 'true');
      const cadreReflet = el('div', 'carte-reflet-cadre');
      cadreReflet.append(el('div', 'carte-reflet-film'));
      reflet.append(cadreReflet);
      racine.append(reflet);
    }
  }

  if (options.interactive !== false) rendreInteractive(racine, corps);
  return racine;
}
