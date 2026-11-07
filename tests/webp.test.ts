// Conversion des images (src/admin/webp.ts) : la partie sans navigateur (dimensions, choix des images gardées, assemblage).
import { describe, expect, it } from 'vitest';
import { HAUTEUR_MAX, POIDS_MAX, POIDS_MAX_ANIMATION, QUALITE_WEBP, assemblerWebpAnime, dimensionsReduites, garderImages } from '../src/admin/webp';

const ascii = (o: Uint8Array, d: number, f: number): string => String.fromCharCode(...o.subarray(d, f));
const u32 = (o: Uint8Array, i: number): number => o[i]! | (o[i + 1]! << 8) | (o[i + 2]! << 16) | (o[i + 3]! << 24);
const u24 = (o: Uint8Array, i: number): number => o[i]! | (o[i + 1]! << 8) | (o[i + 2]! << 16);

/** Faux morceau VP8 de `n` octets de données (contenu sans importance pour l'assemblage). */
function morceau(type: string, n: number): { type: string; octets: Uint8Array } {
  const o = new Uint8Array(8 + n + (n & 1));
  o.set([...type].map((c) => c.charCodeAt(0)));
  o.set([n & 0xff, (n >> 8) & 0xff, 0, 0], 4);
  return { type, octets: o };
}

describe('règles de mise en ligne des images', () => {
  it('hauteur max 1400 px, qualité 85, 2 Mo au plus (image fixe), 5 Mo au plus (animation)', () => {
    expect([HAUTEUR_MAX, QUALITE_WEBP, POIDS_MAX, POIDS_MAX_ANIMATION]).toEqual([1400, 0.85, 2 * 1024 * 1024, 5 * 1024 * 1024]);
  });

  it('réduit à 1400 px de haut en gardant les proportions, sans jamais agrandir', () => {
    expect(dimensionsReduites(2000, 2800)).toEqual({ largeur: 1000, hauteur: 1400 });
    expect(dimensionsReduites(225, 350)).toEqual({ largeur: 225, hauteur: 350 });
    expect(dimensionsReduites(1050, 591)).toEqual({ largeur: 1050, hauteur: 591 });
  });
});

describe('animation : images gardées sous 5 Mo', () => {
  const images = Array.from({ length: 10 }, (_, i) => ({ i, duree: 40 + i }));
  const total = images.reduce((s, x) => s + x.duree, 0);

  it('tout tient : rien n’est retiré', () => {
    expect(garderImages(images, 10)).toBe(images);
  });

  it('garde des images réparties sur toute l’animation, la durée totale ne change pas', () => {
    const g = garderImages(images, 4);
    expect(g.map((x) => x.i)).toEqual([0, 2, 5, 7]);
    expect(g.map((x) => x.duree)).toEqual([40 + 41, 42 + 43 + 44, 45 + 46, 47 + 48 + 49]);
    expect(g.reduce((s, x) => s + x.duree, 0)).toBe(total);
  });

  it('une seule image gardée : elle dure toute l’animation', () => {
    expect(garderImages(images, 1)).toEqual([{ i: 0, duree: total }]);
  });
});

describe('assemblage d’un WebP animé', () => {
  const images = [
    { morceaux: [morceau('VP8 ', 11)], alpha: false, taille: 20, duree: 40 },
    { morceaux: [morceau('ALPH', 4), morceau('VP8 ', 6)], alpha: true, taille: 26, duree: 1000 },
  ];
  const o = assemblerWebpAnime(images, 225, 350, 0);

  it('en-tête RIFF WEBP avec la bonne taille', () => {
    expect(ascii(o, 0, 4)).toBe('RIFF');
    expect(ascii(o, 8, 12)).toBe('WEBP');
    expect(u32(o, 4)).toBe(o.length - 8);
  });

  it('VP8X : animation + transparence, dimensions du canevas ; ANIM : boucle sans fin', () => {
    expect(ascii(o, 12, 16)).toBe('VP8X');
    expect(o[20]).toBe(0x02 | 0x10);
    expect([u24(o, 24) + 1, u24(o, 27) + 1]).toEqual([225, 350]);
    expect(ascii(o, 30, 34)).toBe('ANIM');
    expect([o[42], o[43]]).toEqual([0, 0]);
  });

  it('une image ANMF par image, pleine taille, avec sa durée, sans fusion', () => {
    const anmf: { taille: number; duree: number; drapeaux: number; l: number; h: number; premier: string }[] = [];
    for (let i = 44; i < o.length;) {
      const taille = u32(o, i + 4);
      expect(ascii(o, i, i + 4)).toBe('ANMF');
      anmf.push({ taille, l: u24(o, i + 14) + 1, h: u24(o, i + 17) + 1, duree: u24(o, i + 20), drapeaux: o[i + 23]!, premier: ascii(o, i + 24, i + 28) });
      i += 8 + taille;
    }
    expect(anmf).toEqual([
      { taille: 16 + 20, l: 225, h: 350, duree: 40, drapeaux: 0x02, premier: 'VP8 ' },
      { taille: 16 + 12 + 14, l: 225, h: 350, duree: 1000, drapeaux: 0x02, premier: 'ALPH' },
    ]);
  });
});
