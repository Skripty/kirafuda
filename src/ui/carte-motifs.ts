// Motifs et décors des cartes, dessinés en SVG (data-URI) : trame hishi ou asanoha, grain, holo craquelé, poussière
// d'étoiles, étincelles, ornements du cadre (filets, perles, coins, losanges, gemme, crochets de la fenêtre) et décor
// peint de repli (carte sans image). Spécification : docs/design/cartes-reference.dc.html (fonctions asanoha, hishi,
// bruit, craquele, etincelles, poussiere, scene, ornements).
//
// Chaque SVG est généré une seule fois (cache par élément et par rareté), puis posé dans une feuille de style partagée
// sous forme de variable CSS (--svg-…) : les cartes ne portent jamais ces longues chaînes elles-mêmes.
// Les couleurs viennent des jetons de src/styles/tokens.css, lus une fois.
// Le hasard des motifs est un générateur à graine fixe (même dessin à chaque fois) : ce n'est que du décor.
import type { ElementId, FinitionId } from '../core/types';

const ELEMENTS: ElementId[] = ['feu', 'eau', 'glace', 'foudre', 'vent', 'terre', 'lumiere', 'tenebres', 'neutre'];

// ---------- Outils ----------
const url = (svg: string): string => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
/** Générateur à graine (Park–Miller), pour un dessin identique à chaque fois. */
const alea = (graine: number): (() => number) => { let g = graine; return () => { g = (g * 16807) % 2147483647; return g / 2147483647; }; };
const f1 = (n: number): number => Math.round(n * 10) / 10;

const jetons = new Map<string, string>();
/** Valeur d'un jeton de tokens.css (couleur), lue une fois. */
function jeton(nom: string): string {
  let v = jetons.get(nom);
  if (v === undefined) {
    v = typeof document !== 'undefined' ? getComputedStyle(document.documentElement).getPropertyValue(nom).trim() : '';
    if (!v) v = '#888888';
    jetons.set(nom, v);
  }
  return v;
}
/** Couleurs d'un élément : accent, fond sombre, reflet clair. */
const couleursElement = (e: ElementId): { a: string; d: string; l: string } =>
  ({ a: jeton(`--carte-el-${e}`), d: jeton(`--carte-el-${e}-sombre`), l: jeton(`--carte-el-${e}-clair`) });

/** Mélange de deux couleurs #rrggbb : t = part de b (pour dériver la gemme et le filet de la couleur de l'élément). */
function melange(a: string, b: string, t: number): string {
  const lire = (c: string): number[] => {
    const m = /^#?([0-9a-f]{6})$/i.exec(c.trim());
    const n = m ? parseInt(m[1]!, 16) : 0x888888;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const x = lire(a);
  const y = lire(b);
  return `#${x.map((v, i) => Math.round(v + (y[i]! - v) * t).toString(16).padStart(2, '0')).join('')}`;
}

// ---------- Motifs ----------
/** Trame asanoha (étoiles à six branches), tuile de 30 × 51,96. */
function asanoha(coul: string, ep: number): string {
  const h = 51.96;
  const L = [[0, 0], [30, 0], [15, 26], [-15, 26], [45, 26], [0, h], [30, h]] as const;
  const T = [[0, 1, 2], [2, 5, 6], [0, 3, 2], [3, 5, 2], [1, 2, 4], [2, 6, 4]] as const;
  let d = '';
  for (const t of T) {
    const p = t.map((i) => L[i]!);
    const gx = (p[0]![0] + p[1]![0] + p[2]![0]) / 3;
    const gy = (p[0]![1] + p[1]![1] + p[2]![1]) / 3;
    d += `M${p[0]![0]} ${p[0]![1]}L${p[1]![0]} ${p[1]![1]}L${p[2]![0]} ${p[2]![1]}Z`;
    for (const q of p) d += `M${f1(gx)} ${f1(gy)}L${q[0]} ${q[1]}`;
  }
  return url(`<svg xmlns="http://www.w3.org/2000/svg" width="30" height="51.96"><path d="${d}" fill="none" stroke="${coul}" stroke-width="${ep}"/></svg>`);
}
/** Trame hishi (losanges), tuile de 18 × 18. */
const hishi = (coul: string): string =>
  url(`<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"><path d="M9 0L18 9L9 18L0 9Z M9 4.5L13.5 9L9 13.5L4.5 9Z" fill="none" stroke="${coul}" stroke-width="0.7"/></svg>`);
/** Grain (bruit fractal blanc), tuile de 160 × 160. */
const bruit = (): string =>
  url('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0.6 0 0 0 -0.1"/></filter><rect width="160" height="160" filter="url(#n)"/></svg>');
/** Masque du holo craquelé (taches nettes), à la taille de la face. */
const craquele = (): string =>
  url('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="428"><filter id="c"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="4"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  10 0 0 0 -5"/></filter><rect width="300" height="428" filter="url(#c)"/></svg>');
/** Étincelles à quatre branches, semées sur la face. */
function etincelles(graine: number, n: number, coul: string): string {
  const r = alea(graine);
  let d = '';
  for (let i = 0; i < n; i++) {
    const x = f1(r() * 300);
    const y = f1(r() * 428);
    const s = f1(2 + r() * 5);
    d += `<path transform="translate(${x} ${y})" d="M0 -${s}Q0 0 ${s} 0Q0 0 0 ${s}Q0 0 -${s} 0Q0 0 0 -${s}Z" fill="${coul}"/>`;
  }
  return url(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="428">${d}</svg>`);
}
/** Poussière d'étoiles du holo cosmos : champ irrégulier (jamais une grille de points), nébuleuse légère. */
function poussiere(): string {
  const r = alea(97);
  const couleurs = [1, 2, 3, 4, 5].map((i) => jeton(`--carte-poussiere-${i}`));
  let d = '';
  for (let i = 0; i < 110; i++) {
    const x = f1(r() * 300);
    const y = f1(r() * 428);
    const t = r();
    const col = couleurs[Math.floor(r() * 5)]!;
    if (t < 0.12) {
      const k = f1(2 + r() * 3);
      d += `<path transform="translate(${x} ${y})" d="M0 -${k}Q0 0 ${k} 0Q0 0 0 ${k}Q0 0 -${k} 0Q0 0 0 -${k}Z" fill="${col}"/>`;
    } else d += `<circle cx="${x}" cy="${y}" r="${f1(0.3 + t * t * 1.4)}" fill="${col}" opacity="${f1(0.35 + r() * 0.65)}"/>`;
  }
  return url(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="428"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="3" seed="8"/><feColorMatrix values="1.4 0 0 0 0  0 0.6 0 0 0.1  0 0 1.6 0 0  0 0 0 0 0.22"/></filter><rect width="300" height="428" filter="url(#n)"/>${d}</svg>`);
}

// ---------- Décor peint par élément (repli d'une carte sans image) ----------
interface OptionsScene { plein: boolean; graine: number; silhouette: boolean }

function scene(el: ElementId, W: number, H: number, o: OptionsScene): string {
  const r = alea(o.graine);
  const { a, d, l } = couleursElement(el);
  const ombre = jeton('--carte-scene-silhouette');
  const rayons = o.plein;
  const cx = W / 2;
  const cy = o.plein ? H * 0.3 : H * 0.42;
  const hor = o.plein ? H * 0.5 : H * 0.74;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
  s += `<defs><linearGradient id="ciel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}" stop-opacity="0"/><stop offset="1" stop-color="${a}" stop-opacity="0.55"/></linearGradient>`;
  s += `<radialGradient id="lueur"><stop offset="0" stop-color="${l}" stop-opacity="0.95"/><stop offset="0.35" stop-color="${a}" stop-opacity="0.55"/><stop offset="1" stop-color="${a}" stop-opacity="0"/></radialGradient>`;
  s += `<linearGradient id="flamme" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${a}"/><stop offset="0.6" stop-color="${l}"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient>`;
  s += '<radialGradient id="vign" cx="0.5" cy="0.45" r="0.75"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.7"/></radialGradient>';
  s += '<filter id="f3"><feGaussianBlur stdDeviation="3"/></filter><filter id="f8"><feGaussianBlur stdDeviation="8"/></filter></defs>';
  s += `<rect width="${W}" height="${H}" fill="${d}"/><rect width="${W}" height="${H}" fill="url(#ciel)"/>`;
  // étoiles
  for (let i = 0; i < 40; i++) s += `<circle cx="${f1(r() * W)}" cy="${f1(r() * hor)}" r="${f1(0.3 + r() * 0.9)}" fill="#fff" opacity="${f1(0.2 + r() * 0.6)}"/>`;
  // rayons
  const nb = rayons ? 22 : 34;
  for (let i = 0; i < nb; i++) {
    const an = (i / nb) * Math.PI * 2 + r() * 0.1;
    const an2 = an + (rayons ? 0.08 : 0.012);
    const R1 = W * 0.18;
    const R2 = W * 1.4;
    if (rayons) s += `<path d="M${f1(cx + Math.cos(an) * R1)} ${f1(cy + Math.sin(an) * R1)}L${f1(cx + Math.cos(an) * R2)} ${f1(cy + Math.sin(an) * R2)}L${f1(cx + Math.cos(an2) * R2)} ${f1(cy + Math.sin(an2) * R2)}Z" fill="${l}" opacity="${f1(0.05 + r() * 0.08)}"/>`;
    else s += `<line x1="${f1(cx + Math.cos(an) * W * 0.32)}" y1="${f1(cy + Math.sin(an) * W * 0.32)}" x2="${f1(cx + Math.cos(an) * R2)}" y2="${f1(cy + Math.sin(an) * R2)}" stroke="${l}" stroke-width="${f1(0.4 + r() * 1.4)}" opacity="${f1(0.05 + r() * 0.12)}"/>`;
  }
  s += `<circle cx="${cx}" cy="${f1(cy)}" r="${f1(W * 0.62)}" fill="url(#lueur)"/>`;
  // relief
  const crete = (base: number, amp: number, pas: number, coul: string, op: number): string => {
    let p = `M-10 ${H}`;
    for (let x = -10; x <= W + 10; x += pas) p += `L${x} ${f1(base - r() * amp)}`;
    return `<path d="${p}L${W + 10} ${H}Z" fill="${coul}" opacity="${op}"/>`;
  };
  s += crete(hor - 6, 46, 18, a, 0.28) + crete(hor + 12, 26, 12, d, 0.9);
  // effets d'élément
  let fx = '';
  let av = '';
  if (el === 'feu') {
    for (let i = 0; i < 12; i++) {
      const x = r() * W;
      const hf = H * (0.22 + r() * 0.38);
      const w = 9 + r() * 18;
      const y = H + 4;
      const flm = `<path d="M${f1(x - w)} ${y}C${f1(x - w)} ${f1(y - hf * 0.5)} ${f1(x - w * 0.2)} ${f1(y - hf * 0.6)} ${f1(x + (r() - 0.5) * 10)} ${f1(y - hf)}C${f1(x + w * 0.3)} ${f1(y - hf * 0.55)} ${f1(x + w)} ${f1(y - hf * 0.4)} ${f1(x + w)} ${y}Z" fill="url(#flamme)" opacity="${f1(0.45 + r() * 0.45)}"/>`;
      if (i < 9) fx += flm; else av += flm.replace('opacity="', 'filter="url(#f3)" opacity="');
    }
    for (let i = 0; i < 26; i++) av += `<circle cx="${f1(r() * W)}" cy="${f1(r() * H)}" r="${f1(0.6 + r() * 1.6)}" fill="${l}" opacity="${f1(0.4 + r() * 0.6)}"/>`;
  } else if (el === 'eau') {
    for (let k = 0; k < 4; k++) {
      const y0 = hor + k * 13;
      const ph = r() * 6;
      let p = `M-10 ${f1(y0)}`;
      for (let x = -10; x <= W + 10; x += 6) p += `L${x} ${f1(y0 + Math.sin(x / 16 + ph + k) * (4 + k))}`;
      fx += `<path d="${p}L${W + 10} ${H}L-10 ${H}Z" fill="${a}" opacity="${f1(0.25 + k * 0.15)}"/><path d="${p}" fill="none" stroke="${l}" stroke-width="1" opacity="0.55"/>`;
    }
    for (let i = 0; i < 16; i++) av += `<circle cx="${f1(r() * W)}" cy="${f1(r() * H)}" r="${f1(1 + r() * 3)}" fill="none" stroke="${l}" stroke-width="0.7" opacity="${f1(0.3 + r() * 0.5)}"/>`;
  } else if (el === 'foudre') {
    for (let i = 0; i < 5; i++) s += `<ellipse cx="${f1(r() * W)}" cy="${f1(r() * H * 0.15)}" rx="${f1(40 + r() * 50)}" ry="${f1(14 + r() * 12)}" fill="#000" opacity="0.4" filter="url(#f8)"/>`;
    for (let i = 0; i < 5; i++) {
      let x = r() * W;
      let yb = 0;
      let pb = `M${f1(x)} 0`;
      while (yb < hor) { yb += 10 + r() * 18; x += (r() - 0.5) * 30; pb += `L${f1(x)} ${f1(yb)}`; }
      fx += `<path d="${pb}" fill="none" stroke="${a}" stroke-width="6" opacity="0.5" filter="url(#f3)"/><path d="${pb}" fill="none" stroke="${l}" stroke-width="1.5" stroke-linejoin="round"/>`;
    }
  } else if (el === 'tenebres') {
    const mx = W * 0.8;
    const my = H * (o.plein ? 0.12 : 0.2);
    const mr = W * 0.09;
    s += `<circle cx="${f1(mx)}" cy="${f1(my)}" r="${f1(mr * 1.8)}" fill="${l}" opacity="0.15" filter="url(#f8)"/><circle cx="${f1(mx)}" cy="${f1(my)}" r="${f1(mr)}" fill="${l}"/><circle cx="${f1(mx - mr * 0.45)}" cy="${f1(my - mr * 0.2)}" r="${f1(mr * 0.9)}" fill="${d}"/>`;
    for (let i = 0; i < 9; i++) {
      const x = r() * W;
      fx += `<path d="M${f1(x)} ${H}C${f1(x + (r() - 0.5) * 80)} ${f1(H * 0.7)} ${f1(x + (r() - 0.5) * 80)} ${f1(H * 0.5)} ${f1(x + (r() - 0.5) * 60)} ${f1(H * (0.25 + r() * 0.3))}" fill="none" stroke="${a}" stroke-width="${f1(1.5 + r() * 4)}" stroke-linecap="round" opacity="${f1(0.35 + r() * 0.4)}"${i % 3 === 0 ? ' filter="url(#f3)"' : ''}/>`;
    }
    for (let i = 0; i < 5; i++) fx += `<ellipse cx="${f1(r() * W)}" cy="${f1(hor + r() * 30)}" rx="${f1(50 + r() * 50)}" ry="12" fill="${a}" opacity="0.22" filter="url(#f8)"/>`;
  } else if (el === 'lumiere') {
    s += `<circle cx="${cx}" cy="${f1(cy - H * 0.06)}" r="${f1(W * 0.16)}" fill="#fff" opacity="0.9" filter="url(#f3)"/>`;
    for (let i = 0; i < 18; i++) av += `<circle cx="${f1(r() * W)}" cy="${f1(r() * H)}" r="${f1(1 + r() * 3.5)}" fill="#fff" opacity="${f1(0.3 + r() * 0.6)}"${i % 2 ? ' filter="url(#f3)"' : ''}/>`;
  } else if (el === 'vent') {
    for (let i = 0; i < 7; i++) {
      const x = r() * W;
      const y1 = r() * H;
      const rr = 10 + r() * 22;
      fx += `<path d="M${f1(x - 60)} ${f1(y1 + rr)}C${f1(x - 20)} ${f1(y1 + rr)} ${f1(x + rr)} ${f1(y1 + rr)} ${f1(x + rr)} ${f1(y1)}A${f1(rr)} ${f1(rr)} 0 1 0 ${f1(x)} ${f1(y1 - rr)}A${f1(rr * 0.5)} ${f1(rr * 0.5)} 0 1 0 ${f1(x + rr * 0.3)} ${f1(y1)}" fill="none" stroke="${l}" stroke-width="1.4" stroke-linecap="round" opacity="${f1(0.3 + r() * 0.4)}"/>`;
    }
    for (let i = 0; i < 14; i++) av += `<ellipse transform="translate(${f1(r() * W)} ${f1(r() * H)}) rotate(${Math.round(r() * 180)})" rx="4" ry="1.6" fill="${a}" opacity="${f1(0.5 + r() * 0.5)}"/>`;
  } else if (el === 'glace') {
    for (let i = 0; i < 10; i++) {
      const x = r() * W;
      const hg = H * (0.2 + r() * 0.35);
      const wg = 6 + r() * 10;
      fx += `<path d="M${f1(x - wg)} ${H}L${f1(x - wg * 0.6)} ${f1(H - hg * 0.7)}L${f1(x)} ${f1(H - hg)}L${f1(x + wg * 0.6)} ${f1(H - hg * 0.7)}L${f1(x + wg)} ${H}Z" fill="${l}" opacity="0.28" stroke="${l}" stroke-width="0.6"/>`;
    }
    for (let i = 0; i < 30; i++) av += `<circle cx="${f1(r() * W)}" cy="${f1(r() * H)}" r="${f1(0.5 + r() * 1.4)}" fill="#fff" opacity="${f1(0.4 + r() * 0.6)}"/>`;
  } else if (el === 'terre') {
    for (let i = 0; i < 9; i++) {
      const x = r() * W;
      const yr = r() * hor;
      const sr = 4 + r() * 10;
      let pr = 'M';
      for (let j = 0; j < 6; j++) {
        const ag = (j / 6) * Math.PI * 2;
        pr += `${f1(x + Math.cos(ag) * sr * (0.7 + r() * 0.5))} ${f1(yr + Math.sin(ag) * sr * (0.7 + r() * 0.5))}${j < 5 ? 'L' : 'Z'}`;
      }
      fx += `<path d="${pr}" fill="${d}" stroke="${l}" stroke-width="0.6" opacity="0.85"/>`;
    }
  }
  s += fx;
  // aura et silhouette générique (personnage) ; une carte Soutien n'en a pas
  if (o.silhouette) {
    const by = o.plein ? H * 0.56 : H + 4;
    const sc = o.plein ? 1.0 : H / 230;
    s += `<ellipse cx="${cx}" cy="${f1(by - 95 * sc)}" rx="${f1(120 * sc)}" ry="${f1(110 * sc)}" fill="none" stroke="${a}" stroke-width="10" opacity="0.35" filter="url(#f8)"/>`;
    s += `<ellipse cx="${cx}" cy="${f1(by - 95 * sc)}" rx="${f1(96 * sc)}" ry="${f1(118 * sc)}" fill="none" stroke="${l}" stroke-width="1" opacity="0.35"/>`;
    const corps = 'M-100 0C-95 -50 -70 -80 -38 -92L-18 -100L0 -78L18 -100L38 -92C70 -80 95 -50 100 0Z M-14 -100L-12 -120L12 -120L14 -100Z M0 -179A30 34 0 1 1 0 -111A30 34 0 1 1 0 -179Z M-34 -138L-48 -158L-32 -160L-42 -190L-16 -176L-6 -204L8 -180L28 -198L26 -170L48 -178L34 -150L40 -128L30 -140L28 -160L-28 -160L-30 -136Z M-38 -92L-26 -60L-18 -100Z M38 -92L26 -60L18 -100Z';
    const t = `translate(${cx} ${f1(by)}) scale(${f1(sc * 100) / 100})`;
    s += `<path transform="${t}" d="${corps}" fill="none" stroke="${a}" stroke-width="${f1(7 / sc)}" stroke-linejoin="round" opacity="0.8" filter="url(#f3)"/>`;
    s += `<path transform="${t}" d="${corps}" fill="${ombre}" fill-opacity="0.92" stroke="${l}" stroke-width="${f1(1.2 / sc)}" stroke-opacity="0.65" stroke-linejoin="round"/>`;
  }
  s += av;
  s += `<rect width="${W}" height="${H}" fill="url(#vign)"/></svg>`;
  return url(s);
}

// ---------- Ornements du cadre ----------
interface OptionsOrnements { filet: string; gemme: string; gemme2: string; monture: string; fenetre: boolean }

/** Filets (simple et perlé), coins renforcés, losanges (haut, côtés), gemme de rareté en bas, crochets de la fenêtre. 320 × 448. */
function ornements(o: OptionsOrnements): string {
  const c = o.filet;
  let s = '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="448" viewBox="0 0 320 448">';
  s += `<defs><radialGradient id="g" cx="0.35" cy="0.3"><stop offset="0" stop-color="#ffffff"/><stop offset="0.25" stop-color="${o.gemme}"/><stop offset="1" stop-color="${o.gemme2}"/></radialGradient><linearGradient id="m" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="0.5" stop-color="${o.monture}"/><stop offset="1" stop-color="${jeton('--carte-monture-ombre')}"/></linearGradient></defs>`;
  s += `<rect x="4.5" y="4.5" width="311" height="439" rx="12.5" fill="none" stroke="${c}" stroke-width="0.9"/>`;
  s += `<rect x="7.5" y="7.5" width="305" height="433" rx="9.5" fill="none" stroke="${c}" stroke-width="2.2" stroke-dasharray="0 8" stroke-linecap="round" opacity="0.75"/>`;
  const coin = 'M4.5 36L4.5 17Q4.5 4.5 17 4.5L36 4.5';
  for (const q of [[0, 0, 1, 1], [320, 0, -1, 1], [0, 448, 1, -1], [320, 448, -1, -1]] as const) {
    const t = `translate(${q[0]} ${q[1]}) scale(${q[2]} ${q[3]})`;
    s += `<path transform="${t}" d="${coin}" fill="none" stroke="${c}" stroke-width="2.6" stroke-linecap="round"/>`;
    s += `<path transform="${t}" d="M36 1.5L39 4.5L36 7.5L33 4.5Z M1.5 36L4.5 33L7.5 36L4.5 39Z" fill="${c}"/>`;
  }
  // crête haute et losanges latéraux
  s += `<path d="M128 5H150 M170 5H192" stroke="${c}" stroke-width="2" stroke-linecap="round"/><path d="M160 0.5L165 5L160 9.5L155 5Z" fill="url(#m)" stroke="${c}" stroke-width="0.6"/>`;
  s += `<path d="M1.5 224L5 220L8.5 224L5 228Z M311.5 224L315 220L318.5 224L315 228Z" fill="${c}"/>`;
  // gemme de rareté
  s += `<path d="M120 443H146 M174 443H200" stroke="${c}" stroke-width="2" stroke-linecap="round"/>`;
  s += '<circle cx="160" cy="442" r="9" fill="url(#m)" stroke="rgba(0,0,0,0.6)" stroke-width="0.8"/><circle cx="160" cy="442" r="5.6" fill="url(#g)"/><ellipse cx="158" cy="439.6" rx="2" ry="1.2" fill="#fff" opacity="0.85"/>';
  if (o.fenetre) {
    const x0 = 20;
    const y0 = 64;
    const x1 = 300;
    const y1 = 236;
    s += `<path d="M${x0} ${y0 + 14}V${y0}H${x0 + 14} M${x1 - 14} ${y0}H${x1}V${y0 + 14} M${x0} ${y1 - 14}V${y1}H${x0 + 14} M${x1 - 14} ${y1}H${x1}V${y1 - 14}" fill="none" stroke="${c}" stroke-width="1.6"/>`;
    s += `<path d="M160 ${y0 - 3}L163 ${y0}L160 ${y0 + 3}L157 ${y0}Z" fill="${c}"/>`;
  }
  return url(`${s}</svg>`);
}

/** Couleurs des ornements selon la rareté : de l'élément pour ♦♦ à ♦♦♦♦, propres à la rareté pour ★ et plus. */
function configOrnements(f: FinitionId, e: ElementId): OptionsOrnements {
  const { a } = couleursElement(e);
  const blanc = '#ffffff';
  const noir = '#000000';
  switch (f) {
    case 'commune': return { filet: jeton('--carte-filet-graphite'), gemme: jeton('--carte-gemme-graphite'), gemme2: jeton('--carte-gemme-graphite-fond'), monture: jeton('--carte-monture-graphite'), fenetre: true };
    case 'peu-commune': return { filet: a, gemme: melange(a, blanc, 0.35), gemme2: melange(a, noir, 0.55), monture: jeton('--carte-monture-acier'), fenetre: true };
    case 'holo': return { filet: melange(a, blanc, 0.45), gemme: melange(a, blanc, 0.2), gemme2: melange(a, noir, 0.5), monture: jeton('--carte-monture-holo'), fenetre: true };
    case 'holo-integrale': return { filet: jeton('--carte-filet-argent'), gemme: melange(a, blanc, 0.45), gemme2: melange(a, noir, 0.6), monture: blanc, fenetre: true };
    case 'couronne': return { filet: jeton('--carte-filet-or'), gemme: jeton('--carte-gemme-couronne'), gemme2: jeton('--carte-gemme-couronne-fond'), monture: jeton('--carte-or-nom'), fenetre: false };
    default: return { filet: jeton('--carte-filet-holo'), gemme: jeton(`--carte-gemme-${f}`), gemme2: jeton(`--carte-gemme-${f}-fond`), monture: blanc, fenetre: false };
  }
}

/** Trame du fond : hishi (♦), asanoha à la couleur de l'élément (♦♦, ♦♦♦), plus claire (♦♦♦♦), or gravé (♛). */
function trame(f: FinitionId, e: ElementId): string | null {
  const { a } = couleursElement(e);
  switch (f) {
    case 'commune': return hishi('rgba(255,255,255,0.5)');
    case 'peu-commune': case 'holo': return asanoha(a, 0.6);
    case 'holo-integrale': return asanoha(melange(a, '#ffffff', 0.45), 0.7);
    case 'couronne': return asanoha('rgba(255,241,194,0.5)', 0.7);
    default: return null;
  }
}

/** Étincelles propres à chaque rareté (graine, nombre, couleur), comme dans la maquette. */
const ETINCELLES: Partial<Record<FinitionId, [number, number, string][]>> = {
  holo: [[3, 14, '#ffffff']],
  alternative: [[9, 10, '#ffffff']],
  immersive: [[12, 20, '#ffffff'], [13, 16, '--carte-gemme-immersive']],
  couronne: [[17, 22, '--carte-or-nom']],
};

// ---------- Feuille de style partagée ----------
let feuille: CSSStyleSheet | null = null;
const faites = new Set<string>();
function regle(cle: string, css: () => string): void {
  if (faites.has(cle) || typeof document === 'undefined') return;
  faites.add(cle);
  if (!feuille) {
    const style = document.createElement('style');
    style.id = 'carte-motifs';
    document.head.append(style);
    feuille = style.sheet;
  }
  feuille?.insertRule(css(), feuille.cssRules.length);
}

/** Variables SVG d'une carte (rareté × élément) : générées et posées une seule fois. */
export function preparerMotifs(f: FinitionId, e: ElementId): void {
  regle('communs', () => `.carte { --svg-bruit: ${bruit()}; --svg-craquele: ${craquele()}; --svg-poussiere: ${poussiere()}; }`);
  const sel = `.carte.r-${f}.el-${e}`;
  regle(`orn:${f}:${e}`, () => {
    const t = trame(f, e);
    return `${sel} { --svg-ornements: ${ornements(configOrnements(f, e))};${t ? ` --svg-trame: ${t};` : ''} }`;
  });
  const liste = ETINCELLES[f];
  if (liste) {
    regle(`etincelles:${f}`, () => `.carte.r-${f} { ${liste.map(([g, n, c], i) =>
      `--svg-etincelles-${i + 1}: ${etincelles(g, n, c.startsWith('--') ? jeton(c) : c)};`).join(' ')} }`);
  }
}

/** Décor peint de repli (carte sans image), pour un élément et une mise en page : généré une seule fois. */
export function preparerScene(e: ElementId, plein: boolean, silhouette: boolean): void {
  const variante = `${plein ? 'pleine' : 'fenetre'}${silhouette ? '' : '.sans-silhouette'}`;
  regle(`scene:${e}:${variante}`, () => {
    const graine = 11 + ELEMENTS.indexOf(e) * 7 + (plein ? 3 : 0);
    const svg = plein ? scene(e, 300, 428, { plein: true, graine, silhouette }) : scene(e, 280, 172, { plein: false, graine, silhouette });
    return `.carte.sans-image.el-${e}.${variante} { --svg-scene: ${svg}; }`;
  });
}
