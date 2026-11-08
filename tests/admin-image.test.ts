// De bout en bout : envoyer une image pour une carte Renforts (ren-001) par le plugin d'admin réel
// (outils/vite-admin.ts), dans une copie temporaire du projet (src/data + public/cartes), puis la relire.
// Les modules Node et le plugin sont chargés dynamiquement : le projet n'a pas de types Node (aucune dépendance ajoutée).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cheminImage } from '../src/core/images';

const charger = (specificateur: string): Promise<any> => import(/* @vite-ignore */ specificateur);

interface Reponse { statut: number; corps: any }

let fs: any, path: any, os: any, Readable: any;
let racine = '';
let gestionnaire: (req: any, res: any, suite: () => void) => Promise<void>;

/** Une requête HTTP simulée (flux lisible + méthode, adresse, en-têtes), et sa réponse. */
async function requete(methode: string, url: string, corps?: Uint8Array, type = 'application/octet-stream'): Promise<Reponse> {
  const req = Readable.from(corps ? [corps] : []);
  Object.assign(req, { method: methode, url, headers: { host: 'localhost:5173', 'content-type': type, 'content-length': String(corps?.length ?? 0) } });
  return new Promise((resoudre, rejeter) => {
    const res = {
      statusCode: 200,
      setHeader() {},
      end(texte: string) { resoudre({ statut: this.statusCode, corps: JSON.parse(texte) }); },
    };
    gestionnaire(req, res, () => rejeter(new Error('route non gérée'))).catch(rejeter);
  });
}

/** Un petit fichier WebP valide (en-tête RIFF … WEBP). */
function webp(): Uint8Array {
  const octets = new Uint8Array(64);
  octets.set([...'RIFF'].map((c) => c.charCodeAt(0)), 0);
  new DataView(octets.buffer).setUint32(4, 56, true);
  octets.set([...'WEBPVP8 '].map((c) => c.charCodeAt(0)), 8);
  return octets;
}

beforeAll(async () => {
  fs = await charger('node:fs/promises');
  path = await charger('node:path');
  os = await charger('node:os');
  ({ Readable } = await charger('node:stream'));
  const projet = path.resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
  racine = await fs.mkdtemp(path.join(os.tmpdir(), 'kirafuda-admin-'));
  await fs.mkdir(path.join(racine, 'src', 'data'), { recursive: true });
  for (const f of ['extensions.json', 'extension-lancement.json', 'extension-renforts.json', 'booster-lancement.json']) {
    await fs.copyFile(path.join(projet, 'src', 'data', f), path.join(racine, 'src', 'data', f));
  }
  const { adminImages } = await charger(new URL('../outils/vite-admin.ts', import.meta.url).href);
  const plugin = adminImages();
  plugin.configResolved({ root: racine });
  plugin.configureServer({ middlewares: { use: (f: typeof gestionnaire) => { gestionnaire = f; } } });
});

afterAll(async () => {
  if (racine) await fs.rm(racine, { recursive: true, force: true });
});

describe('admin : image d’une carte Renforts, de bout en bout', () => {
  it('l’admin liste toutes les cartes de Lancement, Renforts compris, avec leur vague', async () => {
    const vagues = await requete('GET', '/__admin/vagues');
    expect(vagues.corps.map((v: any) => [v.id, v.cartes])).toEqual([['lancement', 140], ['renforts', 32]]);
    const ext = await requete('GET', '/__admin/extension');
    expect(ext.corps.cartes).toHaveLength(172);
    expect(ext.corps.cartes.find((c: any) => c.id === 'ren-001')).toMatchObject({ vague: 'renforts', numero: 101 });
  });

  it('POST /__admin/image pour ren-001 : fichier écrit, relu par l’admin, au chemin que le jeu affiche', async () => {
    const r = await requete('POST', '/__admin/image?carte=ren-001&calque=illustration', webp(), 'image/webp');
    expect(r).toEqual({ statut: 200, corps: { ok: true, chemin: 'cartes/ren-001/illustration.webp', octets: 64 } });
    const ecrit = await fs.readFile(path.join(racine, 'public', 'cartes', 'ren-001', 'illustration.webp'));
    expect(new Uint8Array(ecrit)).toEqual(webp());
    expect((await requete('GET', '/__admin/fichiers')).corps['ren-001']).toEqual(['illustration.webp']);
    expect(cheminImage('ren-001', 'illustration')).toBe(r.corps.chemin);
  });

  it('le cadrage d’une carte Renforts est enregistré dans le fichier de sa vague', async () => {
    expect((await requete('GET', '/__admin/extension')).corps.cartes.some((c: { id: string }) => c.id === 'ren-001')).toBe(true);
    const demande = { id: 'ren-001', cadrages: { illustration: { zoom: 130, x: 40, y: 60 } } };
    const r = await requete('POST', '/__admin/carte', new TextEncoder().encode(JSON.stringify(demande)), 'application/json');
    expect(r.statut).toBe(200);
    expect(r.corps).toMatchObject({ ok: true, fichier: 'src/data/extension-renforts.json', carte: { id: 'ren-001', numero: 101, vague: 'renforts' } });
    const renforts = JSON.parse(await fs.readFile(path.join(racine, 'src', 'data', 'extension-renforts.json'), 'utf8'));
    expect(renforts.cartes.find((c: any) => c.id === 'ren-001').images).toEqual({ illustration: { zoom: 130, x: 40, y: 60 } });
    const lancement = JSON.parse(await fs.readFile(path.join(racine, 'src', 'data', 'extension-lancement.json'), 'utf8'));
    expect(lancement.cartes.some((c: any) => c.id === 'ren-001')).toBe(false);
  });

  it('refus clairs : carte inconnue, fichier qui n’est pas un WebP', async () => {
    expect((await requete('POST', '/__admin/image?carte=ren-999&calque=illustration', webp(), 'image/webp')).corps).toEqual({ ok: false, erreurs: ['Carte inconnue « ren-999 ».'] });
    expect((await requete('POST', '/__admin/image?carte=ren-002&calque=illustration', new Uint8Array(20), 'image/webp')).statut).toBe(415);
  });
});
