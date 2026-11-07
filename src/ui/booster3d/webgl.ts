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
  dos: ['#26282d', '#17181b'], dosSertiClair: '#44474f', dosSertiSombre: '#26282d', soudure: '#2f3137',
  texte: '#F2F2F0', texteDoux: '#8B8F98',
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

// ---------- Couleurs ----------
const hex = (c: string): [number, number, number] => {
  const m = /^#?([0-9a-f]{6})$/i.exec(c.trim());
  const n = m ? parseInt(m[1]!, 16) : 0x9aa0ac;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
/** Mélange de deux couleurs : t = part de b. */
function melanger(a: string, b: string, t: number): string {
  const x = hex(a), y = hex(b);
  return `rgb(${x.map((v, i) => Math.round(v + (y[i]! - v) * t)).join(',')})`;
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
  try { await document.fonts.load(`600 66px ${POLICE}`); await document.fonts.load(`400 36px ${POLICE}`); } catch { /* police de repli */ }
}

function dessinerTextures(p: ParamsTextures): { avant: HTMLCanvasElement; masque: HTMLCanvasElement; arriere: HTMLCanvasElement; noir: HTMLCanvasElement } {
  const a = (c: string, t: number): string => melanger(c, p.accent, t);
  // Face avant
  const [avant, c] = toile();
  const g = c.createLinearGradient(0, 0, TW * .6, TH);
  g.addColorStop(0, a(COULEURS.fond[0]!, ACCENT_FOND)); g.addColorStop(.52, a(COULEURS.fond[1]!, ACCENT_FOND)); g.addColorStop(1, a(COULEURS.fond[2]!, ACCENT_FOND));
  c.fillStyle = g; c.fillRect(0, 0, TW, TH);
  sertis(c, 0, TH * SERTI, a(COULEURS.sertiClair, ACCENT_SERTI), a(COULEURS.sertiSombre, ACCENT_SERTI));
  sertis(c, TH * (1 - SERTI), TH * SERTI, a(COULEURS.sertiClair, ACCENT_SERTI), a(COULEURS.sertiSombre, ACCENT_SERTI));
  c.strokeStyle = 'rgba(255,255,255,.28)'; c.lineWidth = 4; c.setLineDash([18, 12]);
  c.beginPath(); c.moveTo(TW * .05, TH * COUPE); c.lineTo(TW * .95, TH * COUPE); c.stroke(); c.setLineDash([]);
  const gk = c.createLinearGradient(TW * .45, TH * .42, TW * .66, TH * .30); ACCENT_K.forEach((x, i) => gk.addColorStop(i / 2, x));
  dessinerK(c, TW / 2, TH * .42, TW * .36, COULEURS.texte, gk);
  c.textAlign = 'center'; c.fillStyle = a(COULEURS.texte, ACCENT_NOM); c.font = `600 66px ${POLICE}`; c.fillText(p.nom, TW / 2, TH * .76);
  c.fillStyle = COULEURS.texteDoux; c.font = `400 36px ${POLICE}`; c.fillText(p.detail, TW / 2, TH * .76 + 56);
  // Masque du film irisé (rouge = intensité)
  const [masque, m] = toile();
  m.fillStyle = 'rgb(18,0,0)'; m.fillRect(0, 0, TW, TH);
  m.fillStyle = 'rgb(45,0,0)'; m.fillRect(0, 0, TW, TH * SERTI); m.fillRect(0, TH * (1 - SERTI), TW, TH * SERTI);
  dessinerK(m, TW / 2, TH * .42, TW * .36, 'rgb(110,0,0)', 'rgb(255,0,0)');
  // Face arrière : soudure verticale au centre
  const [arriere, r] = toile();
  const gr = r.createLinearGradient(0, 0, TW, TH); gr.addColorStop(0, a(COULEURS.dos[0]!, ACCENT_FOND)); gr.addColorStop(1, a(COULEURS.dos[1]!, ACCENT_FOND));
  r.fillStyle = gr; r.fillRect(0, 0, TW, TH);
  sertis(r, 0, TH * SERTI, a(COULEURS.dosSertiClair, ACCENT_SERTI), a(COULEURS.dosSertiSombre, ACCENT_SERTI));
  sertis(r, TH * (1 - SERTI), TH * SERTI, a(COULEURS.dosSertiClair, ACCENT_SERTI), a(COULEURS.dosSertiSombre, ACCENT_SERTI));
  r.fillStyle = COULEURS.soudure; r.fillRect(TW * .46, TH * SERTI, TW * .08, TH * (1 - 2 * SERTI));
  r.fillStyle = 'rgba(255,255,255,.05)'; for (let y = TH * SERTI; y < TH * (1 - SERTI); y += 10) r.fillRect(TW * .46, y, TW * .08, 3);
  r.textAlign = 'center'; r.fillStyle = COULEURS.texteDoux; r.font = `600 34px ${POLICE}`; r.fillText('KIRAFUDA', TW * .25, TH * .5);
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
