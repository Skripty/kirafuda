// Repli CSS du booster (docs/reference/booster-3d.html), sans inclinaison : WebGL indisponible,
// ou animations réduites. Trois éléments imbriqués : .b3d-flotte (animation CSS), .b3d-incline (fixe), le décor.

// ---------- Réglages ----------
/** Durée de l'ouverture (ms) : le haut s'envole, puis le sachet descend (voir booster3d.css). */
export const DUREE_OUVERTURE_CSS = 1150;

export interface RenduCss {
  /** Le sachet, à placer dans la scène. */
  element: HTMLElement;
  majCoupe(v: number): void;
  /** Joue l'ouverture ; se résout à la fin (tout de suite en animations réduites). */
  ouvrir(reduit: boolean): Promise<void>;
}

function el(classe: string): HTMLDivElement {
  const d = document.createElement('div');
  d.className = classe;
  return d;
}

export function creerRenduCss(nom: string, detail: string): RenduCss {
  const flotte = el('b3d-flotte');
  flotte.setAttribute('aria-hidden', 'true');
  const incline = el('b3d-incline');
  const face = el('b3d-face');
  const k = document.createElement('img');
  k.className = 'b3d-embleme';
  k.src = `${import.meta.env.BASE_URL}logo/kirafuda-embleme-sombre.svg`;
  k.alt = '';
  k.draggable = false;
  const texte = el('b3d-texte');
  const b = document.createElement('b');
  b.textContent = nom;
  const s = document.createElement('span');
  s.textContent = detail;
  texte.append(b, s);
  face.append(el('b3d-dents haut'), el('b3d-pointilles'), el('b3d-ligne-coupe'), el('b3d-fleche'), k, texte, el('b3d-dents bas'), el('b3d-film'));
  incline.append(el('b3d-epaisseur'), face, el('b3d-morceau'));
  flotte.append(incline);

  return {
    element: flotte,
    majCoupe(v: number): void {
      incline.style.setProperty('--coupe', v.toFixed(3));
    },
    ouvrir(reduit: boolean): Promise<void> {
      incline.style.setProperty('--coupe', '1');
      flotte.classList.add('ouvert');
      return new Promise((resoudre) => setTimeout(resoudre, reduit ? 0 : DUREE_OUVERTURE_CSS));
    },
  };
}
