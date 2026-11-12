// De bout en bout : publier la popularité de la semaine par le plugin d'admin réel (outils/vite-admin.ts),
// dans une copie temporaire de src/data, puis relire popularite.json comme le jeu.
// Modules Node et plugin chargés dynamiquement : le projet n'a pas de types Node (aucune dépendance ajoutée).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { lireFichierPopularite, versPopularite, type BasePopularite } from '../src/core/popularite';

const charger = (specificateur: string): Promise<any> => import(/* @vite-ignore */ specificateur);

let fs: any, path: any, os: any, Readable: any;
let racine = '';
let gestionnaire: (req: any, res: any, suite: () => void) => Promise<void>;

async function requete(methode: string, url: string, corps?: unknown): Promise<{ statut: number; corps: any }> {
  const octets = corps === undefined ? undefined : new TextEncoder().encode(JSON.stringify(corps));
  const req = Readable.from(octets ? [octets] : []);
  Object.assign(req, { method: methode, url, headers: { host: 'localhost:5173', 'content-type': 'application/json', 'content-length': String(octets?.length ?? 0) } });
  return new Promise((resoudre, rejeter) => {
    const res = { statusCode: 200, setHeader() {}, end(texte: string) { resoudre({ statut: this.statusCode, corps: JSON.parse(texte) }); } };
    gestionnaire(req, res, () => rejeter(new Error('route non gérée'))).catch(rejeter);
  });
}
const lireJson = async (...chemin: string[]): Promise<any> => JSON.parse(await fs.readFile(path.join(racine, ...chemin), 'utf8'));

beforeAll(async () => {
  fs = await charger('node:fs/promises');
  path = await charger('node:path');
  os = await charger('node:os');
  ({ Readable } = await charger('node:stream'));
  const projet = path.resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
  racine = await fs.mkdtemp(path.join(os.tmpdir(), 'kirafuda-pop-'));
  await fs.mkdir(path.join(racine, 'src', 'data'), { recursive: true });
  for (const f of ['extensions.json', 'extension-lancement.json', 'extension-renforts.json', 'extension-vague3.json', 'booster-lancement.json', 'popularite-base.json']) {
    await fs.copyFile(path.join(projet, 'src', 'data', f), path.join(racine, 'src', 'data', f));
  }
  // Un ancien fichier (format d'avant la tâche 21) : il doit être migré automatiquement.
  await fs.writeFile(path.join(racine, 'src', 'data', 'popularite.json'), JSON.stringify({
    semaine: '2026-S45', semainePrecedente: '2026-S44', courante: { 'per-001': 12 }, precedente: { 'per-001': 40 },
  }));
  const { adminImages } = await charger(new URL('../outils/vite-admin.ts', import.meta.url).href);
  const plugin = adminImages();
  plugin.configResolved({ root: racine });
  plugin.configureServer({ middlewares: { use: (f: typeof gestionnaire) => { gestionnaire = f; } } });
});

afterAll(async () => {
  if (racine) await fs.rm(racine, { recursive: true, force: true });
});

describe('admin : popularité de la semaine, de bout en bout', () => {
  let semaine = '';

  it('lecture : l’ancien fichier est migré (base + 0), réécrit au nouveau format, avec une copie', async () => {
    const r = await requete('GET', '/__admin/popularite');
    expect(r.statut).toBe(200);
    expect(r.corps.migre).toBe(true);
    expect(r.corps.fichier.courante['per-001']).toEqual({ popularite: 95, ajustement: 0 });
    semaine = r.corps.semaineAPublier;
    expect(semaine > '2026-S45').toBe(true);
    const disque = await lireJson('src', 'data', 'popularite.json');
    expect(disque.courante['per-001']).toEqual({ popularite: 95, ajustement: 0 });
    expect(await fs.readdir(path.join(racine, 'sauvegardes-admin'))).toHaveLength(1);
    // Relue une deuxième fois : plus de migration.
    expect((await requete('GET', '/__admin/popularite')).corps.migre).toBe(false);
  });

  it('refuse un coup de pouce non autorisé : rien n’est écrit', async () => {
    const avant = await fs.readFile(path.join(racine, 'src', 'data', 'popularite.json'), 'utf8');
    const r = await requete('POST', '/__admin/popularite/publier', { semaine, coups: [{ cible: { type: 'serie', serie: 'Naruto' }, valeur: 50 }] });
    expect(r.statut).toBe(400);
    expect(r.corps.erreurs[0]).toMatch(/valeur 50 non autorisée/);
    expect(await fs.readFile(path.join(racine, 'src', 'data', 'popularite.json'), 'utf8')).toBe(avant);
  });

  it('publier +10 sur Jujutsu Kaisen : popularite.json écrit (copie de l’ancien), la popularité de la série monte', async () => {
    const r = await requete('POST', '/__admin/popularite/publier', { semaine, coups: [{ cible: { type: 'serie', serie: 'Jujutsu Kaisen' }, valeur: 10 }] });
    expect(r.statut).toBe(200);
    expect(r.corps.ok).toBe(true);
    expect(await fs.readdir(path.join(racine, 'sauvegardes-admin'))).toHaveLength(2);
    const disque = await lireJson('src', 'data', 'popularite.json');
    expect(disque.semaine).toBe(semaine);
    expect(disque.semainePrecedente).toBe('2026-S45');
    // Comme le jeu : lecture + popularité de la semaine (Gojo, base 96 → 100 ; Itadori, base 78 → 88).
    const base = await lireJson('src', 'data', 'popularite-base.json') as BasePopularite;
    const lu = lireFichierPopularite(disque, base);
    if (!('fichier' in lu)) throw new Error(lu.erreurs.join(' '));
    const pop = versPopularite(lu.fichier, base);
    expect([pop.courante['per-007'], pop.precedente['per-007']]).toEqual([100, 96]);
    expect([pop.courante['per-008'], pop.precedente['per-008']]).toEqual([88, 78]);
    expect(pop.courante['per-001']).toBe(pop.precedente['per-001']); // One Piece : pas de coup de pouce
  });

  it('refuse de publier deux fois la même semaine', async () => {
    const r = await requete('POST', '/__admin/popularite/publier', { semaine, coups: [] });
    expect(r.statut).toBe(409);
    expect(r.corps.erreurs[0]).toMatch(/déjà publiée/);
  });
});
