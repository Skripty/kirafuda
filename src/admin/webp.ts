// Conversion des images des cartes en WebP, dans le navigateur (Chrome ou Edge).
// Utilisé par la page d'admin à chaque envoi, et par `npm run images` (scripts/images.mjs),
// qui charge ce fichier tel quel dans Chrome sans tête : il ne doit donc rien importer.
//
// Règles de mise en ligne (tâche 22) : hauteur maximale 1400 px, WebP qualité 85,
// 2 Mo au plus pour une image fixe, 5 Mo au plus pour une animation (chargée seulement à l'affichage de la carte).
// - Image fixe : réduite à 1400 px de haut si besoin, encodée en WebP.
// - Animation (GIF ou WebP animé) : chaque image est encodée en WebP, puis assemblée en WebP animé.
//   Si le fichier dépasse 5 Mo, on garde moins d'images, réparties sur toute la durée
//   (chaque image gardée dure jusqu'à la suivante : la durée totale ne change pas).

export const HAUTEUR_MAX = 1400;
export const QUALITE_WEBP = 0.85;
/** Poids maximal d'une image fixe. */
export const POIDS_MAX = 2 * 1024 * 1024;
/** Poids maximal d'une animation (WebP animé) : elle ne se charge qu'à l'affichage de la carte. */
export const POIDS_MAX_ANIMATION = 5 * 1024 * 1024;

export interface ResultatWebp {
  octets: Uint8Array<ArrayBuffer>;
  largeur: number;
  hauteur: number;
  /** Nombre d'images de l'animation produite (1 pour une image fixe). */
  images: number;
  /** Nombre d'images de la source. */
  imagesSource: number;
}

/** Dimensions réduites pour respecter la hauteur maximale (jamais agrandies). */
export function dimensionsReduites(largeur: number, hauteur: number): { largeur: number; hauteur: number } {
  const echelle = Math.min(1, HAUTEUR_MAX / hauteur);
  return { largeur: Math.max(1, Math.round(largeur * echelle)), hauteur: Math.max(1, Math.round(hauteur * echelle)) };
}

async function encoder(canvas: OffscreenCanvas): Promise<Uint8Array<ArrayBuffer>> {
  const blob = await canvas.convertToBlob({ type: 'image/webp', quality: QUALITE_WEBP });
  if (blob.type !== 'image/webp') throw new Error('Ce navigateur ne sait pas produire de WebP : utilise Chrome ou Edge.');
  return new Uint8Array(await blob.arrayBuffer());
}

/** Image fixe (PNG, JPEG, WebP, GIF : première image) → WebP, hauteur ≤ 1400 px, qualité 85. */
export async function imageFixeEnWebp(source: Blob): Promise<ResultatWebp> {
  const bitmap = await createImageBitmap(source);
  const { largeur, hauteur } = dimensionsReduites(bitmap.width, bitmap.height);
  const canvas = new OffscreenCanvas(largeur, hauteur);
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, largeur, hauteur);
  bitmap.close();
  return { octets: await encoder(canvas), largeur, hauteur, images: 1, imagesSource: 1 };
}

// ---------- WebP animé ----------

interface Morceau { type: string; octets: Uint8Array } // morceau RIFF complet (en-tête + données + remplissage)
interface ImageEncodee { morceaux: Morceau[]; alpha: boolean; taille: number; duree: number } // durée en ms

const ascii = (o: Uint8Array, debut: number, fin: number): string => String.fromCharCode(...o.subarray(debut, fin));

/** Morceaux d'image d'un WebP fixe : ALPH (transparence) et VP8 / VP8L (l'image). */
function morceauxImage(webp: Uint8Array): { morceaux: Morceau[]; alpha: boolean } {
  if (ascii(webp, 0, 4) !== 'RIFF' || ascii(webp, 8, 12) !== 'WEBP') throw new Error('WebP invalide.');
  const vue = new DataView(webp.buffer, webp.byteOffset, webp.byteLength);
  const morceaux: Morceau[] = [];
  let alpha = false;
  for (let i = 12; i + 8 <= webp.length;) {
    const type = ascii(webp, i, i + 4);
    const taille = vue.getUint32(i + 4, true);
    const fin = i + 8 + taille + (taille & 1);
    if (type === 'ALPH' || type === 'VP8 ' || type === 'VP8L') {
      morceaux.push({ type, octets: webp.subarray(i, Math.min(fin, webp.length)) });
      if (type !== 'VP8 ') alpha = true;
    }
    i = fin;
  }
  if (!morceaux.some((m) => m.type !== 'ALPH')) throw new Error('WebP sans image.');
  return { morceaux, alpha };
}

const u24 = (v: number): number[] => [v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff];
const u32 = (v: number): number[] => [v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >>> 24) & 0xff];
const enTete = (type: string, taille: number): number[] => [...[...type].map((c) => c.charCodeAt(0)), ...u32(taille)];
const TAILLE_ANMF = 8 + 16; // en-tête du morceau + description de l'image

/** Assemble des images WebP pleine taille en un WebP animé (sans fusion : chaque image remplace la précédente). */
export function assemblerWebpAnime(images: ImageEncodee[], largeur: number, hauteur: number, boucles: number): Uint8Array<ArrayBuffer> {
  const alpha = images.some((im) => im.alpha);
  const parties: Uint8Array[] = [];
  parties.push(new Uint8Array([...enTete('VP8X', 10), 0x02 | (alpha ? 0x10 : 0), 0, 0, 0, ...u24(largeur - 1), ...u24(hauteur - 1)]));
  parties.push(new Uint8Array([...enTete('ANIM', 6), 0, 0, 0, 0, boucles & 0xff, (boucles >> 8) & 0xff]));
  for (const im of images) {
    const donnees = im.morceaux.reduce((s, m) => s + m.octets.length, 0);
    // Drapeaux : bit 1 = ne pas fusionner avec l'image précédente ; bit 0 = pas d'effacement.
    parties.push(new Uint8Array([...enTete('ANMF', 16 + donnees), ...u24(0), ...u24(0), ...u24(largeur - 1), ...u24(hauteur - 1), ...u24(Math.min(im.duree, 0xffffff)), 0x02]));
    for (const m of im.morceaux) parties.push(m.octets);
  }
  const corps = parties.reduce((s, p) => s + p.length, 0);
  const sortie = new Uint8Array(12 + corps);
  sortie.set([...enTete('RIFF', 4 + corps), ...[...'WEBP'].map((c) => c.charCodeAt(0))]);
  let pos = 12;
  for (const p of parties) { sortie.set(p, pos); pos += p.length; }
  return sortie;
}

/** Poids du WebP animé si l'on garde ces images. */
const poidsAnime = (images: ImageEncodee[]): number => 12 + 18 + 14 + images.reduce((s, im) => s + TAILLE_ANMF + im.taille, 0);

/**
 * Garde `m` images sur `n`, réparties régulièrement ; chaque image gardée dure jusqu'à la suivante.
 * La durée totale de l'animation ne change pas.
 */
export function garderImages<T extends { duree: number }>(images: T[], m: number): T[] {
  const n = images.length;
  if (m >= n) return images;
  const indices = Array.from({ length: m }, (_, j) => Math.floor((j * n) / m));
  return indices.map((debut, j) => {
    const fin = j + 1 < m ? indices[j + 1]! : n;
    let duree = 0;
    for (let k = debut; k < fin; k++) duree += images[k]!.duree;
    return { ...images[debut]!, duree };
  });
}

/**
 * Animation (GIF, WebP animé) → WebP animé, hauteur ≤ 1400 px, qualité 85, au plus 5 Mo (le plus d'images possible).
 * Demande ImageDecoder (Chrome, Edge).
 */
export async function animationEnWebp(source: Blob, poidsMax = POIDS_MAX_ANIMATION): Promise<ResultatWebp> {
  if (typeof ImageDecoder === 'undefined') throw new Error('Ce navigateur ne sait pas décoder les animations : utilise Chrome ou Edge.');
  const type = source.type || 'image/gif';
  if (!(await ImageDecoder.isTypeSupported(type))) throw new Error(`Format d’animation non pris en charge : ${type}.`);
  const decodeur = new ImageDecoder({ data: await source.arrayBuffer(), type });
  try {
    await decodeur.tracks.ready;
    await decodeur.completed;
    const piste = decodeur.tracks.selectedTrack ?? decodeur.tracks[0];
    if (!piste) throw new Error('Animation illisible.');
    const n = piste.frameCount;
    const boucles = Number.isFinite(piste.repetitionCount) ? Math.min(piste.repetitionCount, 0xffff) : 0; // 0 = sans fin
    let canvas: OffscreenCanvas | null = null;
    let dims = { largeur: 0, hauteur: 0 };
    const images: ImageEncodee[] = [];
    for (let i = 0; i < n; i++) {
      // ImageDecoder rend chaque image déjà composée (pleine taille) : on peut en retirer sans casser l'animation.
      const { image } = await decodeur.decode({ frameIndex: i });
      if (!canvas) {
        dims = dimensionsReduites(image.displayWidth, image.displayHeight);
        canvas = new OffscreenCanvas(dims.largeur, dims.hauteur);
      }
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, dims.largeur, dims.hauteur);
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(image, 0, 0, dims.largeur, dims.hauteur);
      // Durée en microsecondes ; un GIF sans durée (ou à 0) se joue à 10 images par seconde, comme dans les navigateurs.
      const duree = image.duration && image.duration > 10_000 ? Math.round(image.duration / 1000) : 100;
      image.close();
      const { morceaux, alpha } = morceauxImage(await encoder(canvas));
      images.push({ morceaux, alpha, duree, taille: morceaux.reduce((s, m) => s + m.octets.length, 0) });
    }
    if (!canvas || images.length === 0) throw new Error('Animation vide.');
    // Le plus d'images possible sous le poids maximal.
    let m = images.length;
    while (m > 1 && poidsAnime(garderImages(images, m)) > poidsMax) {
      const ratio = poidsMax / poidsAnime(garderImages(images, m));
      m = Math.max(1, Math.min(m - 1, Math.floor(m * ratio)));
    }
    while (m < images.length && poidsAnime(garderImages(images, m + 1)) <= poidsMax) m++;
    const gardees = garderImages(images, m);
    return {
      octets: assemblerWebpAnime(gardees, dims.largeur, dims.hauteur, boucles),
      largeur: dims.largeur, hauteur: dims.hauteur, images: gardees.length, imagesSource: n,
    };
  } finally {
    decodeur.close();
  }
}
