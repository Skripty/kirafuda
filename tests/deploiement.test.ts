// Mise en ligne (Cloudflare Pages) : ce que le build publie, cache, .gitignore, poids des images.
// Modules Node chargés dynamiquement : le projet n'a pas de types Node (aucune dépendance ajoutée).
import { beforeAll, describe, expect, it } from 'vitest';

const charger = (specificateur: string): Promise<any> => import(/* @vite-ignore */ specificateur);
let fs: any, path: any;
let projet = '';
const lire = (...chemin: string[]): string => fs.readFileSync(path.join(projet, ...chemin), 'utf8');

beforeAll(async () => {
  fs = await charger('node:fs');
  path = await charger('node:path');
  projet = path.resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
});

/** Fichiers du projet atteints par les imports relatifs depuis un point d'entrée. */
function grapheImports(entree: string): Set<string> {
  const vus = new Set<string>();
  const pile = [path.join(projet, entree)];
  while (pile.length) {
    const fichier = pile.pop()!;
    if (vus.has(fichier)) continue;
    vus.add(fichier);
    if (!/\.ts$/.test(fichier)) continue;
    const texte = fs.readFileSync(fichier, 'utf8');
    for (const m of texte.matchAll(/(?:from|import)\s*\(?\s*'(\.{1,2}\/[^']+)'/g)) {
      let cible = path.resolve(path.dirname(fichier), m[1]);
      if (!fs.existsSync(cible) && fs.existsSync(`${cible}.ts`)) cible = `${cible}.ts`;
      if (fs.existsSync(cible) && fs.statSync(cible).isFile()) pile.push(cible);
    }
  }
  return new Set([...vus].map((f) => path.relative(projet, f).split(path.sep).join('/')));
}

describe('build : seulement le jeu', () => {
  it('le jeu (src/main.ts) n’importe ni l’admin, ni le plugin d’admin, ni docs/', () => {
    const graphe = [...grapheImports('src/main.ts')];
    expect(graphe.length).toBeGreaterThan(20);
    expect(graphe.filter((f) => /^(src\/admin|outils|docs|sauvegardes-admin|scripts|supabase)\//.test(f))).toEqual([]);
  });

  it('une seule entrée (index.html) ; le plugin d’admin ne tourne qu’avec npm run dev', () => {
    expect(lire('vite.config.ts')).not.toMatch(/input\s*:/);
    expect(lire('outils', 'vite-admin.ts')).toMatch(/apply: 'serve'/);
  });

  it('public/ ne contient que les images, les icônes des éléments, le logo et _headers', () => {
    expect(fs.readdirSync(path.join(projet, 'public')).sort()).toEqual(['_headers', 'cartes', 'elements', 'logo']);
  });
});

describe('cache (public/_headers)', () => {
  const regles = (): Map<string, string> => {
    const m = new Map<string, string>();
    let chemin = '';
    for (const ligne of lire('public', '_headers').split('\n')) {
      if (!ligne.trim() || ligne.startsWith('#')) continue;
      if (!/^\s/.test(ligne)) chemin = ligne.trim();
      else if (/^\s+Cache-Control:/.test(ligne)) m.set(chemin, ligne.split(':')[1]!.trim());
    }
    return m;
  };

  it('index.html jamais en cache ; fichiers versionnés et images en cache long', () => {
    const r = regles();
    expect(r.get('/')).toBe('no-cache');
    expect(r.get('/index.html')).toBe('no-cache');
    expect(r.get('/assets/*')).toBe('public, max-age=31536000, immutable');
    expect(r.get('/cartes/*')).toBe('public, max-age=31536000, immutable');
  });

  it('les images des cartes sont demandées avec la version des images (?v=)', () => {
    expect(lire('src', 'ui', 'carte.ts')).toMatch(/\?v=\$\{__VERSION_IMAGES__\}/);
    expect(lire('vite.config.ts')).toMatch(/__VERSION_IMAGES__/);
  });
});

describe('.gitignore', () => {
  it('ignore les dépendances, le build, les copies de l’admin, les originaux d’images et les .env', () => {
    const lignes = lire('.gitignore').split(/\r?\n/).map((l) => l.trim());
    for (const l of ['node_modules/', 'dist/', 'sauvegardes-admin/', 'originaux-images/', '.env', '.env.*']) expect(lignes).toContain(l);
  });
});

describe('images publiées', () => {
  /** Hauteur lue dans l'en-tête d'un WebP. */
  const hauteurWebp = (o: Uint8Array): number => {
    const t = String.fromCharCode(...o.subarray(12, 16));
    if (t === 'VP8X') return 1 + (o[27]! | (o[28]! << 8) | (o[29]! << 16));
    if (t === 'VP8 ') return (o[28]! | (o[29]! << 8)) & 0x3fff;
    if (t === 'VP8L') return (((o[21]! | (o[22]! << 8) | (o[23]! << 16) | (o[24]! << 24)) >>> 14) & 0x3fff) + 1;
    return 0;
  };

  it('images fixes ≤ 2 Mo, animations ≤ 5 Mo, aucune au-dessus de 1400 px de haut, aucun GIF (sinon : npm run images)', () => {
    const dossier = path.join(projet, 'public', 'cartes');
    const problemes: string[] = [];
    for (const id of fs.readdirSync(dossier)) {
      for (const nom of fs.readdirSync(path.join(dossier, id))) {
        const o = fs.readFileSync(path.join(dossier, id, nom)) as Uint8Array;
        const max = (nom.startsWith('animation.') ? 5 : 2) * 1024 * 1024;
        if (o.length > max) problemes.push(`${id}/${nom} : ${o.length} octets`);
        if (nom.endsWith('.gif')) problemes.push(`${id}/${nom} : GIF`);
        if (nom.endsWith('.webp') && hauteurWebp(o) > 1400) problemes.push(`${id}/${nom} : ${hauteurWebp(o)} px de haut`);
      }
    }
    expect(problemes).toEqual([]);
  });

  it('npm run images existe ; Cloudflare Pages lit la version de Node dans .node-version', () => {
    expect(JSON.parse(lire('package.json')).scripts.images).toBe('node scripts/images.mjs');
    expect(lire('.node-version').trim()).toMatch(/^\d+$/);
  });
});
