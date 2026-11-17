// Le composant carte, réutilisé partout (collection, ouverture de booster, combat, decks, boutique, draft, admin).
// Spécification : docs/design/cartes-reference.dc.html (tâche 31) ; styles dans carte.css, motifs SVG dans carte-motifs.ts.
//
// Une carte est d'abord décrite par un « modèle » (nom, PV, type, talent, attaques…), tiré de la fiche du personnage
// (src/data/fiches-combat.json, recopiée dans l'extension) ou d'une carte Soutien ; puis un seul rendu, qui ne dépend
// que de la rareté :
//   ♦ à ♦♦♦♦ : illustration dans une fenêtre, plaque de nom, bannière d'infos, panneau du texte ;
//   ★ à ♛    : pleine illustration, texte posé sur l'image (voile sombre en haut et en bas).
// Rien n'est inventé : un champ absent n'est pas affiché. Règle 5 : la rareté ne change que l'apparence.
import '../styles/tokens.css';
import './carte.css';
import { ELEMENTS, FAIBLESSE, FINITIONS } from '../core/regles';
import { ENERGIES, TYPES_PERSONNAGE, texteDegats } from '../core/combat/fiches';
import { BONUS_FAIBLESSE } from '../core/combat/moteur';
import { candidatsAffichage, type CandidatImage } from '../core/images';
import { indexer } from '../core/extension';
import type { Attaque, Carte, CodeEnergie, ElementId, Extension, FinitionId, Personnage } from '../core/types';
import { iconeElement } from './element';
import { preparerMotifs, preparerScene } from './carte-motifs';

export interface OptionsCarte {
  /** Au survol : la carte s'incline et un éclat passe (par défaut : oui). Non pour les vignettes minuscules. */
  interactive?: boolean;
  /**
   * Animations des cartes rares : « toujours » (par défaut), ou seulement pour la carte survolée (« survol »),
   * dans les grilles de nombreuses cartes (collection, decks).
   */
  animations?: 'toujours' | 'survol';
  /** Modifie l'adresse des images (ex. numéro de version dans la page d'admin, pour contourner le cache). */
  transformerSrc?: (chemin: string) => string;
}

/** Ce qu'une carte affiche, quelle que soit sa nature (personnage ou carte Soutien). */
export interface ModeleCarte {
  id: string;
  finition: FinitionId;
  /** Couleurs de la carte (Neutre pour une carte Soutien). */
  element: ElementId;
  /** Médaillon d'élément (pas pour une carte Soutien). */
  medaillon: boolean;
  /** Carte Soutien : pas de PV, pas de Faiblesse ni de Repli ; repli d'image sans silhouette. */
  soutien: boolean;
  nom: string;
  pv: number | null;
  /** Étiquette du type : Base, Héros, Éveillé, Objet, Soutien, Terrain. */
  type: string;
  /** Ligne à côté de l'étiquette : « ↱ Relève : série » (Éveillé), règle d'une carte Soutien. */
  sousTitre: string;
  /** Bannière des cartes à fenêtre : « N°017 · Chainsaw Man · Rang A ». */
  infos: string;
  talent: { etiquette: string; nom: string; texte: string } | null;
  attaques: Attaque[];
  /** Faiblesse : un élément, null (aucune, Neutre), ou absente (carte Soutien). */
  faiblesse?: ElementId | null;
  /** Repli : nombre d'énergies, ou null (carte Soutien). */
  repli: number | null;
  /** Règle écrite dans la barre du bas, à la place de Faiblesse et Repli (carte Soutien). */
  regle?: string;
  /** Numéro affiché : « 017/132 », « S05/20 ». */
  numero: string;
  /** Images à essayer dans l'ordre (règle 7 : sinon, le décor de repli). */
  images: CandidatImage[];
  /** Repli d'une carte Soutien sans image : tracé du symbole de son type (grille 24 × 24). */
  glyphe?: string;
  /** Taille du texte d'effet (1 = normale, au moins 0,74) quand le talent et les effets sont longs. */
  densite: number;
  /** Description pour les lecteurs d'écran. */
  libelle: string;
}

const BASE = import.meta.env.BASE_URL;
/** Adresse versionnée par défaut : « ?v=<empreinte des images> » (cache long, voir public/_headers). */
const versionner = (chemin: string): string => `${chemin}?v=${__VERSION_IMAGES__}`;
const reduit = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const SVG = 'http://www.w3.org/2000/svg';
/** Logo K (tige et branche), viewBox 512. */
const K_TIGE = 'M60 32h89.6v448H60zM172 256h100.8L452 480H351.2z';
const K_BRANCHE = 'M172 256 351.2 32H452L272.8 256z';

/** Effets de chaque rareté (maquette) : sur l'illustration, sur toute la face, et le reste. */
interface Effets {
  art: ('cosmos' | 'glace' | 'film' | 'etincelles' | 'trame-or')[];
  face: ('stries' | 'glace' | 'film' | 'etincelles' | 'etincelles2' | 'or')[];
  /** Opacité du holo craquelé et du film, quand la rareté en a. */
  glace?: number;
  film?: number;
  /** Bande du cadre qui glisse (★★, ★★★). */
  cadreAnime?: boolean;
  /** Reflet qui passe dans la bande du cadre, halo, image en profondeur au survol (★★★, ♛). */
  reflet?: boolean;
  halo?: boolean;
  profond?: boolean;
  particules?: boolean;
}
const EFFETS: Record<FinitionId, Effets> = {
  commune: { art: [], face: [] },
  'peu-commune': { art: [], face: [] },
  holo: { art: ['cosmos', 'etincelles'], face: [] },
  'holo-integrale': { art: ['cosmos'], face: ['stries', 'glace'], glace: 0.35 },
  pleine: { art: [], face: [] },
  alternative: { art: ['glace', 'film'], face: ['etincelles'], glace: 0.6, film: 0.3, cadreAnime: true },
  immersive: { art: ['cosmos', 'glace'], face: ['etincelles', 'etincelles2', 'film'], glace: 0.4, film: 0.45, cadreAnime: true, reflet: true, halo: true, profond: true, particules: true },
  couronne: { art: ['trame-or'], face: ['or', 'etincelles'], reflet: true, halo: true, profond: true },
};

function el<K extends keyof HTMLElementTagNameMap>(tag: K, classe?: string, texte?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texte !== undefined) e.textContent = texte;
  return e;
}
const decor = <T extends HTMLElement>(e: T): T => { e.setAttribute('aria-hidden', 'true'); return e; };

/**
 * Image qui essaie les candidats dans l'ordre (règle de repli).
 * Si aucun n'existe, l'image est retirée et `siAucune` est appelé.
 */
function imageAvecRepli(candidats: CandidatImage[], siAucune: () => void, transformerSrc: (chemin: string) => string): HTMLImageElement | null {
  if (candidats.length === 0) { siAucune(); return null; }
  const img = el('img', 'carte-image');
  img.alt = '';
  img.draggable = false;
  img.decoding = 'async';
  img.loading = 'lazy'; // la collection affiche toutes les cartes
  let i = 0;
  const essayer = (): void => {
    const { src, cadrage: { zoom, x, y } } = candidats[i]!;
    img.style.objectPosition = `${x}% ${y}%`;
    img.style.transformOrigin = `${x}% ${y}%`;
    img.style.transform = zoom === 100 ? '' : `scale(${zoom / 100})`;
    img.src = BASE + transformerSrc(src);
  };
  img.addEventListener('error', () => {
    i++;
    if (i < candidats.length) essayer();
    else { img.remove(); siAucune(); }
  });
  essayer();
  return img;
}

// ---------- Morceaux ----------
/** Calque d'effet ; « mobile » : calque plus grand qui glisse (holo animé). */
function fx(nom: string, ...calques: ('mobile' | 'poussiere' | 'lignes')[]): HTMLElement {
  const d = decor(el('div', `fx fx-${nom}`));
  for (const c of calques) d.append(el('i', c === 'mobile' ? 'mobile a' : c));
  return d;
}
function effetArt(nom: Effets['art'][number], e: Effets): HTMLElement {
  switch (nom) {
    case 'cosmos': return fx('cosmos', 'poussiere', 'mobile');
    case 'glace': { const d = fx('glace', 'mobile'); d.style.setProperty('--op', String(e.glace ?? 0.4)); return d; }
    case 'film': { const d = fx('film', 'mobile'); d.style.setProperty('--op', String(e.film ?? 0.3)); return d; }
    case 'etincelles': return decor(el('div', 'fx fx-etincelles e1 a'));
    case 'trame-or': return fx('trame-or');
  }
}
function effetFace(nom: Effets['face'][number], e: Effets): HTMLElement {
  switch (nom) {
    case 'stries': return fx('stries', 'lignes', 'mobile');
    case 'glace': { const d = fx('glace', 'mobile'); d.style.setProperty('--op', String(e.glace ?? 0.35)); return d; }
    case 'film': { const d = fx('film', 'mobile'); d.style.setProperty('--op', String(e.film ?? 0.45)); return d; }
    case 'etincelles': return decor(el('div', 'fx fx-etincelles e1 a'));
    case 'etincelles2': return decor(el('div', 'fx fx-etincelles e2 a'));
    case 'or': return fx('or');
  }
}

/** Une énergie dans son creux : icône de l'élément, ou ◇ gris pour l'énergie quelconque. */
function creux(code: CodeEnergie): HTMLElement {
  const c = el('span', 'carte-creux');
  const element = ENERGIES[code];
  if (element) c.append(iconeElement(element, '', null));
  else c.append(el('span', 'carte-quelconque', '◇'));
  return c;
}

/** « 2 Lumière et 1 quelconque ». */
function texteEnergies(codes: CodeEnergie[]): string {
  const n = new Map<CodeEnergie, number>();
  for (const c of codes) n.set(c, (n.get(c) ?? 0) + 1);
  const parties = [...n].map(([c, k]) => `${k} ${ENERGIES[c] ? ELEMENTS[ENERGIES[c]!].nom : 'quelconque'}`);
  return parties.length > 1 ? `${parties.slice(0, -1).join(', ')} et ${parties.at(-1)}` : parties[0] ?? '0';
}

function attaque(a: Attaque): HTMLElement {
  const bloc = el('div', 'carte-attaque');
  const ligne = el('div', 'carte-attaque-ligne');
  const cout = el('span', 'carte-cout');
  cout.setAttribute('role', 'img');
  cout.setAttribute('aria-label', `Coût : ${texteEnergies(a.cout)}`);
  for (const code of a.cout) cout.append(creux(code));
  ligne.append(cout, el('span', 'carte-attaque-nom', a.nom));
  const degats = texteDegats(a.degats);
  if (degats) ligne.append(el('span', 'carte-degats', degats));
  bloc.append(ligne);
  if (a.effet.trim()) bloc.append(el('div', 'carte-effet', a.effet.trim()));
  return bloc;
}

function logoK(): SVGSVGElement {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 512 512');
  svg.setAttribute('class', 'carte-k');
  svg.setAttribute('aria-hidden', 'true');
  for (const [d, classe] of [[K_TIGE, 'tige'], [K_BRANCHE, 'branche']] as const) {
    const p = document.createElementNS(SVG, 'path');
    p.setAttribute('d', d);
    p.setAttribute('class', classe);
    svg.append(p);
  }
  return svg;
}

/** Barre du bas : Faiblesse +20, Repli, symbole de rareté + K + numéro (ou la règle d'une carte Soutien). */
function barreBas(m: ModeleCarte): HTMLElement {
  const bas = el('div', 'carte-bas');
  if (m.regle) bas.append(el('span', 'carte-bas-regle', m.regle));
  if (m.faiblesse !== undefined) {
    const f = el('span');
    f.append('Faiblesse');
    if (m.faiblesse) f.append(iconeElement(m.faiblesse, '', `Faiblesse : ${ELEMENTS[m.faiblesse].nom}`), el('span', 'valeur', `+${BONUS_FAIBLESSE}`));
    else f.append(el('span', 'valeur', '—'));
    bas.append(f);
  }
  if (m.repli !== null) {
    const r = el('span');
    r.setAttribute('aria-label', m.repli === 0 ? 'Repli : aucune énergie' : `Repli : ${m.repli} énergie${m.repli > 1 ? 's' : ''} quelconque${m.repli > 1 ? 's' : ''}`);
    r.append('Repli', el('span', 'valeur repli', m.repli === 0 ? '0' : '◇'.repeat(m.repli)));
    bas.append(r);
  }
  const rarete = el('span', 'carte-bas-rarete');
  rarete.append(el('span', 'carte-symbole', FINITIONS[m.finition].symbole), logoK(), el('span', 'carte-num', m.numero));
  bas.append(rarete);
  return bas;
}

// ---------- Rendu ----------
/** Rend une carte décrite par son modèle. Un seul rendu pour toutes les cartes du jeu. */
export function rendreCarte(m: ModeleCarte, options: OptionsCarte = {}): HTMLElement {
  const plein = FINITIONS[m.finition].pleineCarte;
  const effets = EFFETS[m.finition];
  preparerMotifs(m.finition, m.element);

  const classes = ['carte', `r-${m.finition}`, `el-${m.element}`, plein ? 'pleine' : 'fenetre'];
  if (m.soutien) classes.push('soutien', 'sans-silhouette');
  if (options.interactive !== false) classes.push('vivante');
  if (options.animations === 'survol') classes.push('survol');
  const racine = el('article', classes.join(' '));
  racine.dataset.carte = m.id;
  racine.dataset.finition = m.finition;
  racine.setAttribute('aria-label', m.libelle);
  racine.style.setProperty('--densite', m.densite.toFixed(3));
  racine.style.setProperty('--cout-max', String(Math.max(3, ...m.attaques.map((a) => a.cout.length))));

  const volume = el('div', 'carte-volume');
  if (effets.halo) volume.append(decor(el('div', 'carte-halo a')));

  // Cadre
  const cadre = decor(el('div', 'carte-cadre'));
  if (effets.cadreAnime) cadre.append(el('i', 'carte-cadre-holo a'));

  // Face
  const face = el('div', 'carte-face');
  if (!plein) face.append(decor(el('div', 'carte-motif')));

  const art = decor(el('div', `carte-art${effets.profond ? ' profond' : ''}`));
  const sansImage = (): void => {
    racine.classList.add('sans-image');
    preparerScene(m.element, plein, !m.soutien);
    if (m.glyphe) {
      const g = el('div', 'carte-glyphe');
      g.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${m.glyphe}"/></svg>`;
      art.prepend(g);
    }
  };
  const img = imageAvecRepli(m.images, sansImage, options.transformerSrc ?? versionner);
  if (img) art.append(img);
  for (const nom of effets.art) art.append(effetArt(nom, effets));
  if (plein) art.append(el('div', 'carte-voile'));
  face.append(art);

  const ligneType = el('div', 'carte-type-ligne');
  ligneType.append(el('span', 'carte-type', m.type));
  if (m.sousTitre) ligneType.append(el('span', 'carte-releve', m.sousTitre));

  const plaque = el('div', 'carte-plaque');
  const contenu = el('div', 'carte-plaque-contenu');
  contenu.append(el('span', 'carte-nom', m.nom));
  if (m.pv !== null) contenu.append(el('span', 'carte-pv-libelle', 'PV'), el('span', 'carte-pv', String(m.pv)));
  plaque.append(contenu);
  face.append(ligneType, plaque);

  if (m.medaillon) {
    const med = el('div', 'carte-medaillon');
    const creuxMed = el('div', 'carte-medaillon-creux');
    creuxMed.append(iconeElement(m.element, 'carte-medaillon-icone', `Élément ${ELEMENTS[m.element].nom}`));
    med.append(creuxMed);
    face.append(med);
  }
  if (!plein && m.infos) {
    const banniere = el('div', 'carte-banniere');
    banniere.append(decor(el('span', undefined, '◆')), el('span', undefined, m.infos), decor(el('span', undefined, '◆')));
    face.append(banniere);
  }

  const panneau = el('div', 'carte-panneau');
  if (m.talent) {
    const t = el('div', 'carte-talent');
    const tete = el('div', 'carte-talent-tete');
    tete.append(el('span', 'carte-talent-etiquette', m.talent.etiquette));
    if (m.talent.nom) tete.append(el('span', 'carte-talent-nom', m.talent.nom));
    t.append(tete, el('div', 'carte-talent-texte', m.talent.texte));
    panneau.append(t);
  }
  for (const a of m.attaques) panneau.append(attaque(a));
  panneau.append(el('div', 'carte-espace'), barreBas(m));
  face.append(panneau);

  for (const nom of effets.face) face.append(effetFace(nom, effets));
  if (effets.particules) {
    const p = decor(el('div', 'carte-particules'));
    for (let i = 0; i < 6; i++) p.append(el('i', 'a'));
    face.append(p);
  }
  face.append(decor(el('div', 'carte-eclat')));

  volume.append(cadre, face, decor(el('div', 'carte-ornements')));
  if (effets.reflet) {
    const reflet = decor(el('div', 'carte-reflet'));
    const coupe = el('span');
    coupe.append(el('i', 'a'));
    reflet.append(coupe);
    volume.append(reflet);
  }
  racine.append(volume);
  return racine;
}

// ---------- Cartes de personnage ----------
/**
 * Densité du texte d'effet (1 = taille normale, au moins 0,74) : plus le talent et les effets sont longs, plus
 * le texte est petit, pour tenir dans la carte. Calculée sur le nombre de caractères (même résultat partout).
 */
export function densiteTexte(p: Personnage): number {
  const caracteres = (p.talent ? p.talent.nom.length + p.talent.texte.length + 8 : 0)
    + p.attaques.reduce((n, a) => n + a.nom.length + a.effet.length + 14, 0);
  return Math.max(0.74, Math.min(1, 1 - (caracteres - 90) / 480));
}

export function numeroCarte(numero: number, total: number): string {
  const chiffres = Math.max(3, String(total).length);
  return `${String(numero).padStart(chiffres, '0')}/${String(total).padStart(chiffres, '0')}`;
}

/** Modèle d'une carte de personnage : sa fiche de combat (PV, talent, attaques) et ses données de carte. */
export function modeleDeCarte(carte: Carte, extension: Extension): ModeleCarte {
  const index = indexer(extension);
  const perso = index.personnageDe(carte);
  const base = carte.secrete ? index.base(carte.personnage) : undefined;
  const info = FINITIONS[carte.finition];
  const numero = numeroCarte(carte.numero, extension.total);
  return {
    id: carte.id,
    finition: carte.finition,
    element: perso.element,
    medaillon: true,
    soutien: false,
    nom: perso.nom,
    pv: perso.pv,
    type: TYPES_PERSONNAGE[perso.type].nom,
    sousTitre: perso.type === 'eveille' ? `↱ Relève : ${perso.serie}` : '',
    infos: `N°${String(carte.numero).padStart(3, '0')} · ${perso.serie} · Rang ${perso.rang}`,
    talent: perso.talent ? { etiquette: 'Talent', nom: perso.talent.nom, texte: perso.talent.texte } : null,
    attaques: perso.attaques,
    faiblesse: FAIBLESSE[perso.element],
    repli: perso.repli,
    numero,
    // L'animation de l'immersive (WebP animé) d'abord, sauf en mode animations réduites.
    images: candidatsAffichage(carte, base, reduit()),
    densite: densiteTexte(perso),
    libelle: `${perso.nom}, ${info.nom} ${info.symbole}${carte.secrete ? ', carte secrète' : ''}, ${TYPES_PERSONNAGE[perso.type].nom}, ${perso.pv} PV, rang ${perso.rang}, n° ${numero}`,
  };
}

/** Carte de l'extension, dans sa rareté. « extension » fournit le personnage (PV, attaques) et la carte de base (repli d'image). */
export function creerCarte(carte: Carte, extension: Extension, options: OptionsCarte = {}): HTMLElement {
  return rendreCarte(modeleDeCarte(carte, extension), options);
}

/**
 * Précharge les images de cartes qui vont s'afficher (ex. le booster qu'on vient d'ouvrir, pendant l'animation).
 * Mêmes adresses et même ordre de repli que l'affichage : la carte retournée trouve son image déjà en cache.
 */
export function prechargerImages(cartes: Carte[], extension: Extension): void {
  const index = indexer(extension);
  for (const carte of cartes) {
    const base = carte.secrete ? index.base(carte.personnage) : undefined;
    const candidats = candidatsAffichage(carte, base, reduit());
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
