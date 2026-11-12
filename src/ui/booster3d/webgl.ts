// Booster en vraie 3D, en WebGL pur (aucune dépendance) : portage de docs/reference/booster-webgl.html.
// Le sachet est un maillage bombé (avant + arrière), sertissages en relief en haut et en bas.
// Éclairage : diffus + spéculaire + reflet d'environnement + film irisé limité par un masque (le K surtout).
// Les textures sont dessinées en canvas selon le booster (nom de l'extension, couleur d'accent).

// ---------- Réglages ----------
export const W = 2.8, H = 5.0;            // taille du sachet (unités 3D)
export const BOMBE = 0.15;                // épaisseur au centre
export const SERTI = 0.058;               // hauteur des sertissages (fraction de H)
export const COUPE = 0.095;               // ligne de déchirure, depuis le haut (fraction de H)
export const MAX_Y = 0.30, MAX_X = 0.16;  // inclinaison max (radians)
export const RAIDEUR = 0.05, AMORTI = 0.84; // ressort plus doux
export const FONDU = 0.035;               // vitesse d'entrée/sortie de l'influence du curseur (par image)
export const ACCENT_K = ['#FF5FC8', '#6CCBFF', '#A9F26A']; // dégradé holo du K (logo)
export const CAM: [number, number, number] = [0, 0, 12.4];
export const CHAMP = 28;                  // champ de vision vertical (degrés)
export const DUREE_OUVERTURE = 1150;      // ms : le haut s'envole, puis le corps descend
/** Part de l'accent de l'extension dans le fond, les sertissages et le nom (0 = aucun). */
export const ACCENT_FOND = 0.3, ACCENT_SERTI = 0.4, ACCENT_NOM = 0.55;
const TW = 1024, TH = Math.round(1024 * H / W);
const COULEURS = {
  fond: ['#3b3e46', '#1c1d21', '#27292e'], sertiClair: '#4b4e56', sertiSombre: '#2a2c31',
  dos: ['#2A1A66', '#150A33'], dosSertiClair: '#7A68D6', dosSertiSombre: '#2C1C6B', soudure: '#21134F',
  texte: '#F2F2F0', texteDoux: '#8B8F98',
};
/** Sachet illustré : nuit violette (couleurs du visuel, dessinées en canvas). */
const NUIT = {
  haut: '#1A0F45', milieu: '#3B1C82', bas: '#160A33', lune: '#FFD3EA', petale: '#FF9AD5', filet: '#F3EAFF', contour: '#1B0B4A',
  plaque: 'rgba(18,9,48,.88)', lilas: '#C9B8FF', sertiClair: '#8E7BE6', sertiSombre: '#2C1C6B',
};
const POLICE = 'Poppins, sans-serif';

/** Rectangle occupé par le sachet au repos, en fractions de la scène (pour poser un élément par-dessus). */
export function zoneSachet(aspect: number): { gauche: number; haut: number; largeur: number; hauteur: number } {
  const visibleH = 2 * CAM[2] * Math.tan((CHAMP * Math.PI) / 360);
  const hauteur = H / visibleH;
  const largeur = W / (visibleH * aspect);
  return { gauche: (1 - largeur) / 2, haut: (1 - hauteur) / 2, largeur, hauteur };
}

export interface ParamsTextures {
  /** « Renforts · 02 ». */
  nom: string;
  /** « 5 cartes ». */
  detail: string;
  /** Couleur d'accent de l'extension (#rrggbb). */
  accent: string;
  /** Illustrations de trois personnages du booster, déjà chargées (la première au centre). */
  vedettes?: CanvasImageSource[];
}

export interface EtatRendu {
  /** Inclinaison visée (radians). */
  cible: { x: number; y: number };
  /** Le sachet suit le curseur (sinon : balancement au repos). */
  suit: boolean;
  /** Progression de la déchirure (0 à 1). */
  coupe: number;
  /** Instant de l'ouverture (performance.now), ou null. */
  ouvertA: number | null;
}

export interface RenduWebGL {
  image(t: number, e: EtatRendu): void;
  liberer(): void;
}

// ---------- Textures (dessinées en 2D) ----------
const K_PATHS = { tige: 'M60 32h89.6v448H60zM172 256h100.8L452 480H351.2z', branche: 'M172 256 351.2 32H452L272.8 256z' };
function dessinerK(ctx: CanvasRenderingContext2D, cx: number, cy: number, largeur: number, couleurTige: string | CanvasGradient, couleurBranche: string | CanvasGradient): void {
  ctx.save(); const s = largeur / 512; ctx.translate(cx - 256 * s, cy - 256 * s); ctx.scale(s, s);
  ctx.fillStyle = couleurTige; ctx.fill(new Path2D(K_PATHS.tige));
  ctx.fillStyle = couleurBranche; ctx.fill(new Path2D(K_PATHS.branche));
  ctx.restore();
}
function sertis(ctx: CanvasRenderingContext2D, y: number, h: number, clair: string, sombre: string): void {
  ctx.fillStyle = sombre; ctx.fillRect(0, y, TW, h);
  ctx.fillStyle = clair; for (let x = 0; x < TW; x += 12) ctx.fillRect(x, y, 4, h);
}
function toile(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas'); c.width = TW; c.height = TH;
  return [c, c.getContext('2d')!];
}

/** Charge Poppins avant de dessiner les textures (le texte du sachet). */
export async function chargerPolices(): Promise<void> {
  try { await Promise.all(['800 190px', '700 74px', '600 34px', '500 32px'].map((f) => document.fonts.load(`${f} ${POLICE}`))); } catch { /* police de repli */ }
}

function dessinerTextures(p: ParamsTextures): { avant: HTMLCanvasElement; masque: HTMLCanvasElement; arriere: HTMLCanvasElement; noir: HTMLCanvasElement } {
  // Face avant : nuit violette, lune, pétales ; trois personnages du booster en vignettes inclinées ; titre et plaque.
  const [avant, c] = toile();
  const [titre, edition] = p.nom.split(' · ');
  const g = c.createLinearGradient(0, 0, TW * .5, TH);
  g.addColorStop(0, NUIT.haut); g.addColorStop(.5, NUIT.milieu); g.addColorStop(1, NUIT.bas);
  c.fillStyle = g; c.fillRect(0, 0, TW, TH);
  const halo = (x: number, y: number, r: number, couleur: string): void => {
    const h = c.createRadialGradient(x, y, 0, x, y, r); h.addColorStop(0, couleur); h.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = h; c.fillRect(x - r, y - r, 2 * r, 2 * r);
  };
  halo(TW * .5, TH * .55, TW * .85, 'rgba(255,95,200,.42)');
  halo(TW * .12, TH * .3, TW * .6, 'rgba(108,203,255,.3)');
  // Lune
  halo(TW * .74, TH * .3, TW * .34, 'rgba(255,190,225,.55)');
  c.fillStyle = NUIT.lune; c.beginPath(); c.arc(TW * .74, TH * .3, TW * .13, 0, Math.PI * 2); c.fill();
  // Étoiles et faisceaux (positions fixes)
  c.fillStyle = 'rgba(255,255,255,.75)';
  for (let i = 0; i < 70; i++) { const r = 1 + (i * 7) % 4; c.globalAlpha = .25 + ((i * 13) % 10) / 14; c.beginPath(); c.arc((i * 211) % TW, TH * SERTI + ((i * 397) % Math.round(TH * .5)), r, 0, Math.PI * 2); c.fill(); }
  c.globalAlpha = 1;
  c.save(); c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) { c.fillStyle = `rgba(190,150,255,${.05 + i * .012})`; c.beginPath(); const x = TW * (-.2 + i * .3); c.moveTo(x, TH); c.lineTo(x + TW * .16, TH); c.lineTo(x + TW * .75, 0); c.lineTo(x + TW * .66, 0); c.fill(); }
  c.restore();

  // Vignettes : parallélogrammes inclinés, image recadrée sur le haut (les visages).
  const vignette = (img: CanvasImageSource | undefined, x0: number, x1: number, y0: number, y1: number, devant: boolean): void => {
    const s = TW * .035;
    const chemin = (): void => { c.beginPath(); c.moveTo(x0 + s, y0); c.lineTo(x1 + s, y0); c.lineTo(x1 - s, y1); c.lineTo(x0 - s, y1); c.closePath(); };
    c.save(); c.shadowColor = devant ? 'rgba(255,95,200,.9)' : 'rgba(108,203,255,.6)'; c.shadowBlur = devant ? 70 : 40; chemin(); c.fillStyle = NUIT.bas; c.fill(); c.restore();
    c.save(); chemin(); c.clip();
    const l = x1 - x0 + 2 * s, h = y1 - y0;
    if (img) {
      const iw = (img as HTMLImageElement).naturalWidth || (img as HTMLCanvasElement).width, ih = (img as HTMLImageElement).naturalHeight || (img as HTMLCanvasElement).height;
      const e = Math.max(l / iw, h / ih);
      c.drawImage(img, x0 - s + (l - iw * e) / 2, y0 + (h - ih * e) * .25, iw * e, ih * e);
    } else {
      const gv = c.createLinearGradient(x0, y0, x1, y1); gv.addColorStop(0, NUIT.milieu); gv.addColorStop(1, NUIT.haut); c.fillStyle = gv; c.fillRect(x0 - s, y0, l, h);
    }
    // Les vignettes de côté sont fondues dans la nuit ; toutes s'assombrissent vers le bas.
    const voile = c.createLinearGradient(0, y0, 0, y1); voile.addColorStop(0, devant ? 'rgba(30,12,70,0)' : 'rgba(40,20,110,.3)'); voile.addColorStop(1, 'rgba(22,10,51,.82)');
    c.fillStyle = voile; c.fillRect(x0 - s, y0, l, h);
    c.restore();
    c.save(); chemin(); c.lineWidth = devant ? 9 : 5; c.strokeStyle = devant ? NUIT.filet : 'rgba(205,190,255,.7)'; c.stroke(); c.restore();
  };
  const v = p.vedettes ?? [];
  vignette(v[1], TW * .07, TW * .43, TH * .37, TH * .71, false);
  vignette(v[2], TW * .57, TW * .93, TH * .37, TH * .71, false);
  vignette(v[0], TW * .25, TW * .75, TH * .33, TH * .78, true);
  if (!v.length) {
    const gk0 = c.createLinearGradient(TW * .45, TH * .58, TW * .66, TH * .46); ACCENT_K.forEach((x, i) => gk0.addColorStop(i / 2, x));
    dessinerK(c, TW / 2, TH * .555, TW * .3, COULEURS.texte, gk0);
  }
  // Pétales
  c.fillStyle = NUIT.petale;
  for (let i = 0; i < 16; i++) {
    c.save(); c.translate((i * 173 + 60) % TW, TH * .12 + ((i * 431) % Math.round(TH * .72))); c.rotate(i * 1.3); c.globalAlpha = .55 + (i % 4) * .1;
    c.beginPath(); c.ellipse(0, 0, 20 + (i % 3) * 6, 9, 0, 0, Math.PI * 2); c.fill(); c.restore();
  }

  // Titre incliné : dégradé clair, contour sombre, lueur. Sa taille s'adapte à la largeur du sachet.
  const ecrireTitre = (ctx: CanvasRenderingContext2D, remplissage: string | CanvasGradient, lueur: boolean): void => {
    const texte = (titre ?? p.nom).toUpperCase();
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    let taille = 190; ctx.font = `800 ${taille}px ${POLICE}`;
    taille = Math.min(taille, Math.floor(taille * (TW * .8) / ctx.measureText(texte).width)); ctx.font = `800 ${taille}px ${POLICE}`;
    ctx.translate(TW / 2, TH * .205); ctx.transform(1, 0, -.2, 1, 0, 0);
    if (lueur) { ctx.shadowColor = 'rgba(255,95,200,.95)'; ctx.shadowBlur = 46; ctx.lineJoin = 'round'; ctx.lineWidth = 18; ctx.strokeStyle = NUIT.contour; ctx.strokeText(texte, 0, 0); ctx.shadowBlur = 0; }
    ctx.fillStyle = remplissage; ctx.fillText(texte, 0, 0);
    ctx.restore();
  };
  const gt = c.createLinearGradient(0, TH * .16, 0, TH * .25); gt.addColorStop(0, '#FFFFFF'); gt.addColorStop(.55, '#EADFFF'); gt.addColorStop(1, '#B9A0FF');
  ecrireTitre(c, gt, true);
  // Logo K au-dessus du titre, pastille sous le titre.
  const gk = c.createLinearGradient(TW * .47, TH * .125, TW * .55, TH * .095); ACCENT_K.forEach((x, i) => gk.addColorStop(i / 2, x));
  dessinerK(c, TW / 2, TH * .118, TW * .09, COULEURS.texte, gk);
  const plaque = (y: number, l: number, h: number, bord: string): void => {
    const x = (TW - l) / 2, b = h * .5;
    c.beginPath(); c.moveTo(x + b, y); c.lineTo(x + l - b, y); c.lineTo(x + l, y + h / 2); c.lineTo(x + l - b, y + h); c.lineTo(x + b, y + h); c.lineTo(x, y + h / 2); c.closePath();
    c.fillStyle = NUIT.plaque; c.fill(); c.lineWidth = 4; c.strokeStyle = bord; c.stroke();
  };
  c.textAlign = 'center'; c.textBaseline = 'middle';
  plaque(TH * .262, TW * .5, 62, 'rgba(205,190,255,.8)');
  c.fillStyle = COULEURS.texte; c.font = `600 34px ${POLICE}`; c.fillText(`BOOSTER · ${edition ?? ''}`.trim(), TW / 2, TH * .262 + 33);
  // Plaque du bas : nombre de cartes.
  plaque(TH * .815, TW * .68, 150, NUIT.filet);
  c.fillStyle = COULEURS.texte; c.font = `700 74px ${POLICE}`; c.fillText(p.detail.toUpperCase(), TW / 2, TH * .815 + 58);
  c.fillStyle = NUIT.lilas; c.font = `500 32px ${POLICE}`; c.fillText('KIRAFUDA · CARTES À COLLECTIONNER', TW / 2, TH * .815 + 114);
  c.textBaseline = 'alphabetic';
  // Sertissages et ligne de déchirure
  sertis(c, 0, TH * SERTI, NUIT.sertiClair, NUIT.sertiSombre);
  sertis(c, TH * (1 - SERTI), TH * SERTI, NUIT.sertiClair, NUIT.sertiSombre);
  c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 4; c.setLineDash([18, 12]);
  c.beginPath(); c.moveTo(TW * .05, TH * COUPE); c.lineTo(TW * .95, TH * COUPE); c.stroke(); c.setLineDash([]);

  // Masque du film irisé (rouge = intensité) : léger partout, fort sur le titre, le K et le filet de la vignette centrale.
  const [masque, m] = toile();
  m.fillStyle = 'rgb(24,0,0)'; m.fillRect(0, 0, TW, TH);
  // Les illustrations restent nettes : presque pas de film irisé sur les vignettes.
  m.fillStyle = 'rgb(6,0,0)'; m.fillRect(TW * .04, TH * .33, TW * .92, TH * .45);
  m.fillStyle = 'rgb(70,0,0)'; m.fillRect(0, 0, TW, TH * SERTI); m.fillRect(0, TH * (1 - SERTI), TW, TH * SERTI);
  ecrireTitre(m, 'rgb(210,0,0)', false);
  dessinerK(m, TW / 2, TH * .118, TW * .09, 'rgb(140,0,0)', 'rgb(255,0,0)');
  { const s = TW * .035, x0 = TW * .25, x1 = TW * .75, y0 = TH * .33, y1 = TH * .78;
    m.beginPath(); m.moveTo(x0 + s, y0); m.lineTo(x1 + s, y0); m.lineTo(x1 - s, y1); m.lineTo(x0 - s, y1); m.closePath(); m.lineWidth = 12; m.strokeStyle = 'rgb(230,0,0)'; m.stroke(); }
  // Face arrière : soudure verticale au centre
  const [arriere, r] = toile();
  const gr = r.createLinearGradient(0, 0, TW, TH); gr.addColorStop(0, COULEURS.dos[0]!); gr.addColorStop(1, COULEURS.dos[1]!);
  r.fillStyle = gr; r.fillRect(0, 0, TW, TH);
  sertis(r, 0, TH * SERTI, COULEURS.dosSertiClair, COULEURS.dosSertiSombre);
  sertis(r, TH * (1 - SERTI), TH * SERTI, COULEURS.dosSertiClair, COULEURS.dosSertiSombre);
  r.fillStyle = COULEURS.soudure; r.fillRect(TW * .46, TH * SERTI, TW * .08, TH * (1 - 2 * SERTI));
  r.fillStyle = 'rgba(255,255,255,.05)'; for (let y = TH * SERTI; y < TH * (1 - SERTI); y += 10) r.fillRect(TW * .46, y, TW * .08, 3);
  r.textAlign = 'center'; r.fillStyle = NUIT.lilas; r.font = `600 34px ${POLICE}`; r.fillText('KIRAFUDA', TW * .25, TH * .5);
  const noir = document.createElement('canvas'); noir.width = 2; noir.height = 2;
  { const n = noir.getContext('2d')!; n.fillStyle = '#000'; n.fillRect(0, 0, 2, 2); }
  return { avant, masque, arriere, noir };
}

// ---------- Géométrie du sachet ----------
const lisse = (a: number, b: number, x: number): number => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function hauteur(u: number, v: number): number {
  const ax = Math.abs(2 * u - 1);
  const fx = Math.sqrt(Math.max(0, 1 - Math.pow(ax, 4)));           // bords arrondis
  const fy = lisse(SERTI, SERTI + .1, v) * lisse(SERTI, SERTI + .1, 1 - v);
  let z = BOMBE * fx * fy;
  if (v < SERTI || v > 1 - SERTI) z += .012 * (.5 + .5 * Math.sin(u * W * 52)); // stries des sertissages
  return z + .006;
}
interface Surface { pos: WebGLBuffer; nor: WebGLBuffer; uv: WebGLBuffer; idx: WebGLBuffer; n: number }
function surface(gl: WebGLRenderingContext, v0: number, v1: number, avant: boolean): Surface {
  const NX = 64, NY = Math.max(4, Math.round(96 * (v1 - v0)));
  const pos: number[] = [], nor: number[] = [], uv: number[] = [], idx: number[] = [];
  const e = 1e-3;
  for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) {
    const u = i / NX, v = v0 + (v1 - v0) * j / NY;
    const z = hauteur(u, v);
    const dx = (hauteur(Math.min(1, u + e), v) - hauteur(Math.max(0, u - e), v)) / (2 * e * W);
    const dy = (hauteur(u, Math.min(1, v + e)) - hauteur(u, Math.max(0, v - e))) / (2 * e * H);
    const s = avant ? 1 : -1;
    pos.push((u - .5) * W, (v - .5) * H, s * z);
    const n = [-dx * s, -dy * s, s]; const l = Math.hypot(n[0]!, n[1]!, n[2]!); nor.push(n[0]! / l, n[1]! / l, n[2]! / l);
    uv.push(avant ? u : 1 - u, 1 - v);
  }
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
    const a = j * (NX + 1) + i, b = a + 1, c = a + NX + 1, d = c + 1;
    if (avant) idx.push(a, b, d, a, d, c); else idx.push(a, d, b, a, c, d);
  }
  const buf = (data: BufferSource, type: number = gl.ARRAY_BUFFER): WebGLBuffer => { const b = gl.createBuffer()!; gl.bindBuffer(type, b); gl.bufferData(type, data, gl.STATIC_DRAW); return b; };
  return { pos: buf(new Float32Array(pos)), nor: buf(new Float32Array(nor)), uv: buf(new Float32Array(uv)), idx: buf(new Uint16Array(idx), gl.ELEMENT_ARRAY_BUFFER), n: idx.length };
}

// ---------- Shaders ----------
const VS = `
  attribute vec3 aPos; attribute vec3 aNor; attribute vec2 aUv;
  uniform mat4 uModel, uVue, uProj;
  varying vec3 vN, vP; varying vec2 vUv;
  void main(){ vec4 p = uModel * vec4(aPos,1.); vP = p.xyz; vN = mat3(uModel[0].xyz, uModel[1].xyz, uModel[2].xyz) * aNor; vUv = aUv; gl_Position = uProj * uVue * p; }`;
const FS = `
  precision highp float;
  uniform sampler2D uTex, uMasque; uniform vec3 uCam; uniform float uCoupe, uAvant;
  varying vec3 vN, vP; varying vec2 vUv;
  void main(){
    vec3 N = normalize(vN); vec3 V = normalize(uCam - vP);
    if (!gl_FrontFacing) N = -N;
    vec3 base = pow(texture2D(uTex, vUv).rgb, vec3(2.2));
    float m = texture2D(uMasque, vUv).r;
    vec3 L1 = normalize(vec3(-.5,.8,.9)), L2 = normalize(vec3(.8,-.3,.6));
    float dif = max(dot(N,L1),0.)*.8 + max(dot(N,L2),0.)*.25;
    float spec = pow(max(dot(N,normalize(L1+V)),0.),80.)*.9 + pow(max(dot(N,normalize(L2+V)),0.),40.)*.2;
    vec3 R = reflect(-V,N);
    float bande = exp(-pow((R.x*1.3 + R.y*.7)*2.4, 2.));
    vec3 env = vec3(.02) + vec3(.42,.45,.52)*bande;
    float teinte = dot(N,V)*1.6 + R.x*1.3 + R.y*.6 + vUv.y*.5;
    vec3 irise = .5 + .5*cos(6.2832*(teinte + vec3(0.,.33,.67)));
    vec3 col = base*(.18 + dif*.75) + env*.12 + vec3(spec)*.4 + m*irise*(.03 + .5*bande);
    if (uAvant > .5) {
      float along = (vUv.x - .05)/.9;
      if (abs(vUv.y - ${COUPE.toFixed(3)}) < .003 && along >= 0. && along <= uCoupe) {
        col = mix(col, (.5 + .5*cos(6.2832*(along + vec3(0.,.33,.67))))*1.5, .9);
      }
    }
    col = col/(col + .75)*1.5;
    gl_FragColor = vec4(pow(col, vec3(1./2.2)), 1.);
  }`;

// ---------- Matrices (colonnes) ----------
type M4 = number[];
const mul = (a: M4, b: M4): M4 => { const o: M4 = new Array<number>(16).fill(0); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r]! += a[k * 4 + r]! * b[c * 4 + k]!; return o; };
const trans = (x: number, y: number, z: number): M4 => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
const rotX = (a: number): M4 => { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]; };
const rotY = (a: number): M4 => { const c = Math.cos(a), s = Math.sin(a); return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]; };
const rotZ = (a: number): M4 => { const c = Math.cos(a), s = Math.sin(a); return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; };
const persp = (fov: number, asp: number, n: number, f: number): M4 => { const t = 1 / Math.tan(fov / 2); return [t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, 2 * f * n / (n - f), 0]; };
const ease = (t: number): number => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

/** Crée le rendu WebGL dans `canvas`, ou null si WebGL est indisponible (ou les shaders refusés). */
export function creerRenduWebGL(canvas: HTMLCanvasElement, params: ParamsTextures): RenduWebGL | null {
  const gl = canvas.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: true });
  if (!gl) return null;
  const creesTex: WebGLTexture[] = [], creesBuf: WebGLBuffer[] = [], creesSh: WebGLShader[] = [];

  function texture(src: HTMLCanvasElement): WebGLTexture {
    const t = gl!.createTexture()!; gl!.bindTexture(gl!.TEXTURE_2D, t);
    gl!.pixelStorei(gl!.UNPACK_FLIP_Y_WEBGL, false);
    gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, src);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
    creesTex.push(t);
    return t;
  }
  function prog(vs: string, fs: string): WebGLProgram {
    const sh = (t: number, s: string): WebGLShader => { const o = gl!.createShader(t)!; gl!.shaderSource(o, s); gl!.compileShader(o); creesSh.push(o); if (!gl!.getShaderParameter(o, gl!.COMPILE_STATUS)) throw new Error(gl!.getShaderInfoLog(o) ?? 'shader'); return o; };
    const p = gl!.createProgram()!; gl!.attachShader(p, sh(gl!.VERTEX_SHADER, vs)); gl!.attachShader(p, sh(gl!.FRAGMENT_SHADER, fs)); gl!.linkProgram(p);
    if (!gl!.getProgramParameter(p, gl!.LINK_STATUS)) throw new Error(gl!.getProgramInfoLog(p) ?? 'programme'); return p;
  }

  let P: WebGLProgram;
  try { P = prog(VS, FS); } catch { gl.getExtension('WEBGL_lose_context')?.loseContext(); return null; }
  gl.useProgram(P);
  const A = { pos: gl.getAttribLocation(P, 'aPos'), nor: gl.getAttribLocation(P, 'aNor'), uv: gl.getAttribLocation(P, 'aUv') };
  const U = (n: string): WebGLUniformLocation | null => gl.getUniformLocation(P, n);
  const u = { model: U('uModel'), vue: U('uVue'), proj: U('uProj'), tex: U('uTex'), masque: U('uMasque'), cam: U('uCam'), coupe: U('uCoupe'), avant: U('uAvant') };
  gl.uniform1i(u.tex, 0); gl.uniform1i(u.masque, 1);
  gl.enable(gl.DEPTH_TEST);

  const t = dessinerTextures(params);
  const texAvant = texture(t.avant), texMasque = texture(t.masque), texArriere = texture(t.arriere), texNoir = texture(t.noir);
  const vCoupe = 1 - COUPE;
  const corps = [surface(gl, 0, vCoupe, true), surface(gl, 0, vCoupe, false)] as const;
  const haut = [surface(gl, vCoupe, 1, true), surface(gl, vCoupe, 1, false)] as const;
  for (const s of [...corps, ...haut]) creesBuf.push(s.pos, s.nor, s.uv, s.idx);

  function dessiner(s: Surface, model: M4, tex: WebGLTexture, masque: WebGLTexture, avant: boolean): void {
    gl!.uniformMatrix4fv(u.model, false, new Float32Array(model));
    gl!.activeTexture(gl!.TEXTURE0); gl!.bindTexture(gl!.TEXTURE_2D, tex);
    gl!.activeTexture(gl!.TEXTURE1); gl!.bindTexture(gl!.TEXTURE_2D, masque);
    gl!.uniform1f(u.avant, avant ? 1 : 0);
    gl!.bindBuffer(gl!.ARRAY_BUFFER, s.pos); gl!.enableVertexAttribArray(A.pos); gl!.vertexAttribPointer(A.pos, 3, gl!.FLOAT, false, 0, 0);
    gl!.bindBuffer(gl!.ARRAY_BUFFER, s.nor); gl!.enableVertexAttribArray(A.nor); gl!.vertexAttribPointer(A.nor, 3, gl!.FLOAT, false, 0, 0);
    gl!.bindBuffer(gl!.ARRAY_BUFFER, s.uv); gl!.enableVertexAttribArray(A.uv); gl!.vertexAttribPointer(A.uv, 2, gl!.FLOAT, false, 0, 0);
    gl!.bindBuffer(gl!.ELEMENT_ARRAY_BUFFER, s.idx); gl!.drawElements(gl!.TRIANGLES, s.n, gl!.UNSIGNED_SHORT, 0);
  }

  // La taille suit la scène (et non la fenêtre).
  function taille(): void {
    // Taille de mise en page (clientWidth) : une animation d'entrée en scale() ne doit pas réduire la résolution.
    const dpr = Math.min(2, devicePixelRatio || 1);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr)), h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl!.viewport(0, 0, canvas.width, canvas.height);
  }
  const redim = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(taille) : null;
  redim?.observe(canvas);
  taille();

  // ---------- Ressort et influence du curseur ----------
  let pos = { x: 0, y: 0 }, vit = { x: 0, y: 0 };
  let influence = 0; // 0 = balancement au repos, 1 = suit le curseur ; passe de l'un à l'autre en douceur
  let libere = false;

  return {
    image(temps: number, e: EtatRendu): void {
      if (libere || gl.isContextLost()) return;
      const ouvert = e.ouvertA !== null;
      influence += ((e.suit && !ouvert ? 1 : 0) - influence) * FONDU;
      const repos = ouvert ? 0 : Math.sin(temps / 1700) * .07;
      const cx = e.cible.x * influence, cy = e.cible.y * influence + repos * (1 - influence);
      vit = { x: (vit.x + (cx - pos.x) * RAIDEUR) * AMORTI, y: (vit.y + (cy - pos.y) * RAIDEUR) * AMORTI };
      pos = { x: pos.x + vit.x, y: pos.y + vit.y };
      const flotte = ouvert ? 0 : Math.sin(temps / 875) * .08;

      const k = ouvert ? (temps - e.ouvertA!) / 1000 : 0;
      const descente = ease((k - .35) / .8) * 6.5;          // le corps descend
      const envol = ease(k / .7);                            // le haut s'envole
      const base = mul(trans(0, flotte - descente, 0), mul(rotY(pos.y), rotX(pos.x)));
      const pivotY = (vCoupe - .5) * H;
      const local = mul(trans(W * .5, pivotY, 0), mul(trans(envol * 1.6, envol * 2.6, envol * .8), mul(rotZ(-envol * .7), trans(-W * .5, -pivotY, 0))));
      const modelHaut = mul(mul(trans(0, flotte, 0), mul(rotY(pos.y), rotX(pos.x))), local);

      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.uniformMatrix4fv(u.proj, false, new Float32Array(persp(CHAMP * Math.PI / 180, canvas.width / canvas.height, .1, 50)));
      gl.uniformMatrix4fv(u.vue, false, new Float32Array(trans(-CAM[0], -CAM[1], -CAM[2])));
      gl.uniform3fv(u.cam, CAM); gl.uniform1f(u.coupe, e.coupe);
      if (descente < 6.4) { dessiner(corps[0], base, texAvant, texMasque, true); dessiner(corps[1], base, texArriere, texNoir, false); }
      if (envol < 1 || !ouvert) { dessiner(haut[0], modelHaut, texAvant, texMasque, true); dessiner(haut[1], modelHaut, texArriere, texNoir, false); }
    },
    liberer(): void {
      if (libere) return;
      libere = true;
      redim?.disconnect();
      for (const b of creesBuf) gl.deleteBuffer(b);
      for (const x of creesTex) gl.deleteTexture(x);
      for (const s of creesSh) gl.deleteShader(s);
      gl.deleteProgram(P);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      canvas.width = 1; canvas.height = 1;
    },
  };
}
