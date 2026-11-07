// Booster 3D de l'accueil et de l'écran d'ouverture.
// - WebGL (webgl.ts) ; repli CSS sans inclinaison (css.ts) si WebGL est indisponible ou si les animations sont réduites.
// - Tous les gestes se mesurent sur .b3d-scene, qui ne tourne jamais : tiers haut = déchirure (validée à 75 %),
//   le reste = inclinaison. Le glissé a toujours un équivalent par bouton (l'appelant appelle ouvrir()).
// - Une seule boucle de rendu (boucle.ts), en pause si l'onglet est caché ou le booster hors écran ;
//   les ressources WebGL sont libérées quand le booster quitte la page (ou par detruire()).
import './booster3d.css';
import { SEUIL_DECHIRURE } from '../../core/revelation';
import type { Booster, Extension } from '../../core/types';
import { styleAccent } from '../booster';
import { inscrire } from './boucle';
import { creerRenduCss } from './css';
import { DUREE_OUVERTURE, MAX_X, MAX_Y, chargerPolices, creerRenduWebGL, zoneSachet, type EtatRendu, type RenduWebGL } from './webgl';

// ---------- Réglages ----------
/** Le tiers haut de la scène sert à déchirer. */
export const ZONE_COUPE = 0.30;
/** Déchirure validée à 75 % (même seuil que la machine à états). */
export const SEUIL = SEUIL_DECHIRURE;
/** Distance horizontale pour une déchirure complète, en fraction de la largeur de la scène (WebGL ; CSS : largeur du sachet). */
export const LARGEUR_COUPE_WEBGL = 0.7, LARGEUR_COUPE_CSS = 0.76;
/** Proportions de la scène (largeur / hauteur). */
export const ASPECT_SCENE = 3 / 4.4;

export interface OptionsBooster3D {
  extension: Extension;
  booster: Booster;
  /** Écran d'ouverture : la déchirure est possible. Accueil : inclinaison seulement. */
  dechirable: boolean;
  /** Élément posé sur le sachet (indice honnête de l'écran d'ouverture), masqué à l'ouverture. */
  superposition?: HTMLElement;
  /** Le doigt se pose dans la zone de déchirure : false si la déchirure n'est pas possible maintenant. */
  surDebutCoupe?: () => boolean;
  /** Déchirure validée (75 % atteints). */
  surCoupeValidee?: () => void;
  /** Relâché avant 75 %. */
  surCoupeAnnulee?: () => void;
  /** Forcer le repli CSS (tests). */
  forcerCss?: boolean;
}

export interface Booster3D {
  /** La scène (à insérer dans la page). */
  scene: HTMLElement;
  /** Rendu utilisé. */
  mode: 'webgl' | 'css';
  /** Joue l'ouverture (le haut s'envole, le sachet descend) ; se résout à la fin. */
  ouvrir(): Promise<void>;
  /** Libère tout (boucle, WebGL). Fait aussi tout seul quand la scène quitte la page. */
  detruire(): void;
}

const animationsReduites = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const borner = (x: number): number => Math.max(-1, Math.min(1, x));

/** Couleur d'accent de l'extension, lue dans tokens.css (--booster-accent-<id>). */
function accentDe(extensionId: string): string {
  const css = getComputedStyle(document.documentElement);
  const id = extensionId.replace(/[^a-z0-9-]/g, '');
  return (css.getPropertyValue(`--booster-accent-${id}`) || css.getPropertyValue('--booster-accent-defaut') || '#9aa0ac').trim();
}

export function creerBooster3D(o: OptionsBooster3D): Booster3D {
  const reduit = animationsReduites();
  const edition = String(o.extension.edition).padStart(2, '0');
  const nom = `${o.extension.nom} · ${edition}`;
  const detail = `${o.booster.cartesParBooster} cartes`;

  const scene = document.createElement('div');
  scene.className = o.dechirable ? 'b3d-scene dechirable' : 'b3d-scene';
  scene.dataset.extension = o.extension.id;
  scene.setAttribute('style', styleAccent(o.extension.id));
  scene.setAttribute('role', 'img');
  scene.setAttribute('aria-label', `${o.booster.nom}, édition ${edition}, ${detail}`);
  const ombre = document.createElement('div');
  ombre.className = 'b3d-ombre';
  ombre.setAttribute('aria-hidden', 'true');
  scene.append(ombre);

  // ---------- Rendu : WebGL, sinon CSS ----------
  let webgl: RenduWebGL | null = null;
  let css: ReturnType<typeof creerRenduCss> | null = null;
  const canvas = document.createElement('canvas');
  canvas.className = 'b3d-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const essaiWebgl = !reduit && !o.forcerCss && (() => {
    try { return !!document.createElement('canvas').getContext('webgl'); } catch { return false; }
  })();
  if (essaiWebgl) {
    scene.append(canvas);
    scene.classList.add('webgl');
  } else {
    css = creerRenduCss(nom, detail);
    scene.append(css.element);
    scene.classList.add('css');
  }

  // Superposition (indice) : posée sur le sachet au repos.
  if (o.superposition) {
    const zone = document.createElement('div');
    zone.className = 'b3d-zone-sachet';
    if (essaiWebgl) {
      const z = zoneSachet(ASPECT_SCENE);
      Object.assign(zone.style, { left: `${(z.gauche * 100).toFixed(2)}%`, top: `${(z.haut * 100).toFixed(2)}%`, width: `${(z.largeur * 100).toFixed(2)}%`, height: `${(z.hauteur * 100).toFixed(2)}%` });
    }
    zone.append(o.superposition);
    (css ? css.element.querySelector('.b3d-incline')! : scene).append(zone);
  }

  // ---------- État partagé ----------
  const etat: EtatRendu = { cible: { x: 0, y: 0 }, suit: false, coupe: 0, ouvertA: null };
  let survol = false;
  let geste: { mode: 'couper'; x0: number } | { mode: 'incliner' } | null = null;
  let detruit = false;

  // ---------- Boucle (WebGL seulement : le repli CSS n'a rien à animer en JS) ----------
  let desinscrire: (() => void) | null = null;
  if (essaiWebgl) {
    void chargerPolices().then(() => {
      if (detruit) return;
      webgl = creerRenduWebGL(canvas, { nom, detail, accent: accentDe(o.extension.id) });
      if (!webgl) {
        // WebGL refusé au dernier moment : repli CSS.
        canvas.remove();
        scene.classList.replace('webgl', 'css');
        css = creerRenduCss(nom, detail);
        scene.append(css.element);
        return;
      }
      desinscrire = inscrire(scene, (t) => {
        etat.suit = !reduit && etat.ouvertA === null && (geste ? geste.mode === 'incliner' : survol);
        webgl!.image(t, etat);
      }, () => { webgl?.liberer(); webgl = null; });
    });
  }

  // ---------- Gestes (mesurés sur la scène) ----------
  const norm = (e: PointerEvent): { nx: number; ny: number } => {
    const r = scene.getBoundingClientRect();
    return { nx: (e.clientX - r.left) / r.width, ny: (e.clientY - r.top) / r.height };
  };
  const zoneCoupe = (e: PointerEvent): boolean => o.dechirable && norm(e).ny < ZONE_COUPE;
  const peutIncliner = (): boolean => !reduit && !!webgl;
  const viser = (e: PointerEvent): void => {
    const { nx, ny } = norm(e);
    etat.cible.y = borner(nx * 2 - 1) * MAX_Y;
    etat.cible.x = borner(ny * 2 - 1) * MAX_X;
  };
  const majCoupe = (v: number): void => {
    etat.coupe = v;
    css?.majCoupe(v);
    scene.style.setProperty('--coupe', v.toFixed(3));
  };

  scene.addEventListener('pointerdown', (e) => {
    if (etat.ouvertA !== null || detruit) return;
    if (zoneCoupe(e)) {
      if (o.surDebutCoupe && !o.surDebutCoupe()) return;
      scene.setPointerCapture(e.pointerId);
      geste = { mode: 'couper', x0: e.clientX };
      scene.classList.add('coupe-en-cours');
    } else {
      // Pas de capture : le glissé horizontal de l'accueil (changer de booster) reste possible.
      geste = { mode: 'incliner' };
      if (peutIncliner()) viser(e);
    }
  });
  scene.addEventListener('pointermove', (e) => {
    if (etat.ouvertA !== null) return;
    if (!geste) {
      scene.classList.toggle('zone-coupe', zoneCoupe(e));
      if (e.pointerType === 'mouse' && peutIncliner()) { survol = true; viser(e); }
      return;
    }
    if (geste.mode === 'couper') {
      const largeur = scene.getBoundingClientRect().width * (css ? LARGEUR_COUPE_CSS : LARGEUR_COUPE_WEBGL);
      majCoupe(Math.max(etat.coupe, Math.min(1, Math.abs(e.clientX - geste.x0) / largeur))); // ne recule pas pendant le geste
      if (etat.coupe >= 1) finGeste();
    } else if (peutIncliner()) viser(e);
  });
  function finGeste(): void {
    if (!geste) return;
    const mode = geste.mode;
    geste = null;
    scene.classList.remove('coupe-en-cours');
    if (mode !== 'couper') return;
    if (etat.coupe >= SEUIL) o.surCoupeValidee?.();
    else { majCoupe(0); o.surCoupeAnnulee?.(); }
  }
  scene.addEventListener('pointerup', finGeste);
  scene.addEventListener('pointercancel', finGeste);
  scene.addEventListener('pointerleave', () => { survol = false; if (geste?.mode === 'incliner') geste = null; });

  let ouverture: Promise<void> | null = null;
  return {
    scene,
    get mode() { return css ? 'css' : 'webgl'; },
    ouvrir(): Promise<void> {
      if (ouverture) return ouverture;
      geste = null;
      majCoupe(1);
      scene.classList.remove('zone-coupe', 'coupe-en-cours');
      scene.classList.add('ouvert');
      if (css) {
        ouverture = css.ouvrir(reduit);
      } else {
        etat.ouvertA = performance.now();
        ouverture = new Promise((resoudre) => setTimeout(resoudre, DUREE_OUVERTURE));
      }
      return ouverture;
    },
    detruire(): void {
      if (detruit) return;
      detruit = true;
      if (desinscrire) desinscrire();
      else webgl?.liberer();
      webgl = null;
    },
  };
}
