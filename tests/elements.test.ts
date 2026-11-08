// Icônes et couleurs des 9 éléments : une icône par élément (public/elements/<element>.webp), et les mêmes
// couleurs dans src/core/regles.ts et src/styles/tokens.css (relevées sur les icônes).
import { beforeAll, describe, expect, it } from 'vitest';
import { ELEMENTS } from '../src/core/regles';
import type { ElementId } from '../src/core/types';

const charger = (specificateur: string): Promise<any> => import(/* @vite-ignore */ specificateur);
let fs: any, path: any;
let projet = '';
beforeAll(async () => {
  fs = await charger('node:fs');
  path = await charger('node:path');
  projet = path.resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
});

const ids = Object.keys(ELEMENTS) as ElementId[];

describe('éléments', () => {
  it('chaque élément a son icône WebP (256 × 256 px, avec transparence)', () => {
    expect(ids.length).toBe(9);
    for (const id of ids) {
      const fichier = path.join(projet, 'public', 'elements', `${id}.webp`);
      expect(fs.existsSync(fichier), `public/elements/${id}.webp manquant`).toBe(true);
      const o: Uint8Array = fs.readFileSync(fichier);
      const texte = (a: number, b: number): string => String.fromCharCode(...o.subarray(a, b));
      expect(texte(0, 4) + texte(8, 12), id).toBe('RIFFWEBP');
      // En-tête VP8X : transparence (bit alpha) et dimensions (sur 24 bits, moins un).
      expect(texte(12, 16), `${id} : WebP étendu (VP8X) attendu`).toBe('VP8X');
      expect(o[20]! & 0x10, `${id} : transparence attendue`).toBe(0x10);
      const l = 1 + (o[24]! | (o[25]! << 8) | (o[26]! << 16));
      const h = 1 + (o[27]! | (o[28]! << 8) | (o[29]! << 16));
      expect([l, h], id).toEqual([256, 256]);
    }
  });

  it('couleurs : mêmes valeurs dans regles.ts et tokens.css', () => {
    const tokens: string = fs.readFileSync(path.join(projet, 'src', 'styles', 'tokens.css'), 'utf8');
    for (const id of ids) {
      const m = new RegExp(`--element-${id}:\\s*(#[0-9a-fA-F]{6});`).exec(tokens);
      expect(m?.[1]?.toUpperCase(), `--element-${id}`).toBe(ELEMENTS[id].couleur.toUpperCase());
    }
  });
});
