// Comptes (tâche 23) : aucune clé secrète dans le jeu, et règles d'accès de la base (Row Level Security).
import { beforeAll, describe, expect, it } from 'vitest';
import { cleSecrete, configSupabase } from '../src/en-ligne/supabase';

const charger = (specificateur: string): Promise<any> => import(/* @vite-ignore */ specificateur);
let fs: any, path: any;
let projet = '';
beforeAll(async () => {
  fs = await charger('node:fs');
  path = await charger('node:path');
  projet = path.resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
});

const jwt = (charge: object): string => `eyJhbGciOiJIUzI1NiJ9.${btoa(JSON.stringify(charge)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')}.signature`;

describe('clé publique seulement', () => {
  it('reconnaît une clé secrète (service_role, sb_secret_) et accepte les clés publiques', () => {
    expect(cleSecrete('sb_secret_abc123')).toBe(true);
    expect(cleSecrete(jwt({ role: 'service_role', iss: 'supabase' }))).toBe(true);
    expect(cleSecrete(jwt({ role: 'anon', iss: 'supabase' }))).toBe(false);
    expect(cleSecrete('sb_publishable_abc123')).toBe(false);
  });

  it('configuration : absente → jeu sans compte ; clé secrète refusée ; clé publique acceptée', () => {
    expect(configSupabase({})).toBeNull();
    expect(configSupabase({ VITE_SUPABASE_URL: 'https://abc.supabase.co' })).toBeNull();
    const erreur = console.error;
    console.error = () => {};
    try {
      expect(configSupabase({ VITE_SUPABASE_URL: 'https://abc.supabase.co', VITE_SUPABASE_ANON_KEY: 'sb_secret_x' })).toBeNull();
      expect(configSupabase({ VITE_SUPABASE_URL: 'https://abc.supabase.co', VITE_SUPABASE_ANON_KEY: jwt({ role: 'service_role' }) })).toBeNull();
    } finally {
      console.error = erreur;
    }
    expect(configSupabase({ VITE_SUPABASE_URL: 'https://abc.supabase.co/', VITE_SUPABASE_ANON_KEY: 'sb_publishable_x' }))
      .toEqual({ url: 'https://abc.supabase.co', cle: 'sb_publishable_x' });
  });

  it('le code du jeu ne contient aucune clé ni variable secrète', () => {
    const fichiers: string[] = [];
    const parcourir = (d: string): void => {
      for (const n of fs.readdirSync(d)) {
        const c = path.join(d, n);
        if (fs.statSync(c).isDirectory()) parcourir(c);
        else if (/\.(ts|json|html|css)$/.test(n)) fichiers.push(c);
      }
    };
    parcourir(path.join(projet, 'src'));
    const suspects = fichiers.filter((f) => {
      const t: string = fs.readFileSync(f, 'utf8');
      // Seule exception : la vérification qui refuse une clé secrète (src/en-ligne/supabase.ts).
      const sansGarde = f.endsWith(path.join('en-ligne', 'supabase.ts')) ? t.replace(/'sb_secret_'|'service_role'|service_role|sb_secret_/g, '') : t;
      return /service_role|sb_secret_|SERVICE_ROLE|eyJhbGciOi[A-Za-z0-9_-]{20,}|sb_publishable_[A-Za-z0-9_-]{8,}/.test(sansGarde);
    });
    expect(suspects.map((f) => path.relative(projet, f))).toEqual([]);
    // Le jeu ne lit que les deux variables publiques.
    const variables = new Set<string>();
    for (const f of fichiers) for (const m of (fs.readFileSync(f, 'utf8') as string).matchAll(/VITE_[A-Z0-9_]+/g)) variables.add(m[0]);
    expect([...variables].sort()).toEqual(['VITE_SUPABASE_ANON_KEY', 'VITE_SUPABASE_URL']);
  });

  it('.env (s’il existe) ne contient pas de clé secrète, et il est ignoré par git', () => {
    expect(fs.readFileSync(path.join(projet, '.gitignore'), 'utf8')).toMatch(/^\.env$/m);
    const chemin = path.join(projet, '.env');
    if (!fs.existsSync(chemin)) return;
    for (const ligne of (fs.readFileSync(chemin, 'utf8') as string).split(/\r?\n/)) {
      const [nom, ...reste] = ligne.split('=');
      if (!nom || nom.startsWith('#') || reste.length === 0) continue;
      expect(nom.trim(), 'seules les variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY sont attendues').toMatch(/^VITE_SUPABASE_(URL|ANON_KEY)$/);
      expect(cleSecrete(reste.join('=').trim())).toBe(false);
    }
  });
});

describe('base de données (supabase/migrations)', () => {
  const sql = (): string => {
    const dossier = path.join(projet, 'supabase', 'migrations');
    return (fs.readdirSync(dossier) as string[]).filter((n) => n.endsWith('.sql')).sort().map((n) => fs.readFileSync(path.join(dossier, n), 'utf8')).join('\n');
  };

  it('profils : pseudo unique (sans les majuscules) de 3 à 20 caractères, date de création', () => {
    const s = sql();
    expect(s).toMatch(/create table public\.profils \(\s*id uuid primary key references auth\.users/);
    expect(s).toMatch(/char_length\(pseudo\) between 3 and 20/);
    expect(s).toMatch(/create unique index \w+ on public\.profils \(lower\(pseudo\)\)/);
    expect(s).toMatch(/cree_le timestamptz not null default now\(\)/);
  });

  it('sauvegardes : utilisateur, données JSON, version, date de mise à jour (posée par le serveur)', () => {
    const s = sql();
    expect(s).toMatch(/create table public\.sauvegardes \(\s*utilisateur uuid primary key references auth\.users/);
    expect(s).toMatch(/donnees jsonb not null/);
    expect(s).toMatch(/version integer not null/);
    expect(s).toMatch(/mis_a_jour_le timestamptz/);
    expect(s).toMatch(/before insert or update on public\.sauvegardes/);
  });

  it('Row Level Security : chacun ne lit et n’écrit que ses lignes ; les pseudos sont lisibles par tous', () => {
    const s = sql();
    expect(s).toMatch(/alter table public\.profils enable row level security/);
    expect(s).toMatch(/alter table public\.sauvegardes enable row level security/);
    // Chaque règle de sauvegardes porte sur l'utilisateur connecté.
    const regles = [...s.matchAll(/create policy "[^"]+"\s+on public\.sauvegardes for (\w+)\s+to (\w+)\s+((?:using|with check)[^;]+);/g)];
    expect(regles.map((r) => r[1]).sort()).toEqual(['delete', 'insert', 'select', 'update']);
    for (const r of regles) {
      expect(r[2]).toBe('authenticated');
      expect(r[3]).toMatch(/\(select auth\.uid\(\)\) = utilisateur/);
    }
    expect(s).toMatch(/revoke all on public\.sauvegardes from anon/);
    // Profils : lecture pour tous, écriture de son propre profil seulement.
    expect(s).toMatch(/on public\.profils for select\s+to anon, authenticated\s+using \(true\)/);
    expect(s).toMatch(/on public\.profils for insert\s+to authenticated\s+with check \(\(select auth\.uid\(\)\) = id\)/);
    expect(s).toMatch(/on public\.profils for update\s+to authenticated\s+using \(\(select auth\.uid\(\)\) = id\)/);
    expect(s).not.toMatch(/on public\.profils for delete/);
  });
});

describe('classement du draft (tâche 24)', () => {
  const migration = (): string => fs.readFileSync(path.join(projet, 'supabase', 'migrations', '20261108000000_classement_draft.sql'), 'utf8');

  it('drafts : lecture par tous (pseudo, score, cartes), aucune écriture par les joueurs', () => {
    const s = migration();
    expect(s).toMatch(/create table public\.drafts \(\s*utilisateur uuid not null references public\.profils/);
    expect(s).toMatch(/primary key \(utilisateur, semaine\)/);
    expect(s).toMatch(/cardinality\(cartes\) = 5/);
    expect(s).toMatch(/alter table public\.drafts enable row level security/);
    expect(s).toMatch(/on public\.drafts for select\s+to anon, authenticated\s+using \(true\)/);
    expect(s).not.toMatch(/on public\.drafts for (insert|update|delete|all)/);
    expect(s).toMatch(/revoke all on public\.drafts from anon, authenticated/);
    expect(s).toMatch(/grant select \([^)]*\bcartes\b[^)]*\bscore\b[^)]*\) on public\.drafts to anon, authenticated/);
    expect(s).not.toMatch(/grant (insert|update|delete)[^;]*on public\.drafts/);
    // La vue du classement garde les droits du lecteur et donne le pseudo.
    expect(s).toMatch(/create view public\.classement_draft\s+with \(security_invoker = true\)/);
    expect(s).toMatch(/p\.pseudo/);
  });

  it('récompenses : chacun lit les siennes, écriture par la fonction serveur seulement', () => {
    const s = migration();
    expect(s).toMatch(/alter table public\.recompenses_draft enable row level security/);
    expect(s).toMatch(/on public\.recompenses_draft for select\s+to authenticated\s+using \(\(select auth\.uid\(\)\) = utilisateur\)/);
    expect(s).not.toMatch(/on public\.recompenses_draft for (insert|update|delete|all)/);
    expect(s).toMatch(/revoke all on public\.recompenses_draft from anon, authenticated/);
  });

  it('les fonctions serveur lisent la clé service_role dans leur environnement, jamais dans le dépôt', () => {
    const dossier = path.join(projet, 'supabase', 'fonctions');
    for (const n of fs.readdirSync(dossier) as string[]) {
      const t: string = fs.readFileSync(path.join(dossier, n), 'utf8');
      expect(t, n).not.toMatch(/sb_secret_[A-Za-z0-9]|eyJhbGciOi[A-Za-z0-9_-]{20,}/);
    }
    expect(fs.readFileSync(path.join(dossier, 'contexte.ts'), 'utf8')).toMatch(/Deno\.env\.get\('SUPABASE_SERVICE_ROLE_KEY'\)/);
  });

  it('les fonctions déployées (supabase/functions) sont à jour : sinon, npm run deployer-fonctions', async () => {
    const { verifierFonction, lireEnTete, FONCTIONS } = await charger(path.join(projet, 'outils', 'empreinte-fonctions.ts'));
    for (const nom of FONCTIONS as string[]) {
      const fichier = path.join(projet, 'supabase', 'functions', nom, 'index.ts');
      expect(fs.existsSync(fichier), `${nom} : lance npm run deployer-fonctions`).toBe(true);
      const texte: string = fs.readFileSync(fichier, 'utf8');
      expect(verifierFonction(projet, texte), `${nom} n'est plus à jour : lance npm run deployer-fonctions`).toBeNull();
      // Seuls les fichiers qui servent au draft comptent : ni la cote, ni l'interface, ni les autres données.
      const sources: string[] = lireEnTete(texte).sources;
      expect(sources).toContain('src/core/draft.ts');
      expect(sources).toContain('src/data/themes-draft.json');
      expect(sources.filter((s) => /popularite|attaques\.json|src\/ui\/|src\/en-ligne\/|src\/core\/(cote|economie|boutique|collection)\.ts/.test(s))).toEqual([]);
    }
  });

  it('recadrer une image dans l’admin ne change pas l’empreinte ; modifier les PV d’un personnage, oui', async () => {
    const { empreinteDe } = await charger(path.join(projet, 'outils', 'empreinte-fonctions.ts'));
    const os = await charger('node:os');
    const copie: string = fs.mkdtempSync(path.join(os.tmpdir(), 'kirafuda-empreinte-'));
    const fichier = 'src/data/extension-lancement.json';
    const chemin = path.join(copie, fichier);
    fs.mkdirSync(path.dirname(chemin), { recursive: true });
    fs.copyFileSync(path.join(projet, fichier), chemin);
    const lire = (): any => JSON.parse(fs.readFileSync(chemin, 'utf8'));
    const ecrire = (e: unknown): void => fs.writeFileSync(chemin, JSON.stringify(e, null, 2));
    const avant = empreinteDe(copie, [fichier]);
    try {
      // Ce que fait l'admin : cadrage, zoom et position d'une illustration, nouvelle image sur une autre carte.
      const e = lire();
      e.cartes[0].images = { ...e.cartes[0].images, illustration: { zoom: 137, x: 12, y: 88 } };
      e.cartes[1].images = { illustration: { zoom: 102, x: 50, y: 50 }, perso: { zoom: 100, x: 40, y: 60 } };
      delete e.cartes[2].images;
      ecrire(e);
      expect(empreinteDe(copie, [fichier])).toBe(avant);
      // Les PV d'un personnage servent au score du draft : il faut redéployer.
      e.personnages[0].pv += 10;
      ecrire(e);
      expect(empreinteDe(copie, [fichier])).not.toBe(avant);
      // La rareté d'une carte aussi (tirage des boosters du draft).
      e.personnages[0].pv -= 10;
      e.cartes[0].finition = e.cartes[0].finition === 'commune' ? 'peu-commune' : 'commune';
      ecrire(e);
      expect(empreinteDe(copie, [fichier])).not.toBe(avant);
    } finally {
      fs.rmSync(copie, { recursive: true, force: true });
    }
  });

  it('changer popularite.json ou une quête du jour n’oblige pas à redéployer ; changer le barème, oui', async () => {
    const { empreinteDe } = await charger(path.join(projet, 'outils', 'empreinte-fonctions.ts'));
    const os = await charger('node:os');
    const copie: string = fs.mkdtempSync(path.join(os.tmpdir(), 'kirafuda-empreinte-'));
    const sources = ['src/data/quetes.json', 'src/data/popularite.json', 'src/core/draft.ts'];
    for (const s of sources) { fs.mkdirSync(path.dirname(path.join(copie, s)), { recursive: true }); fs.copyFileSync(path.join(projet, s), path.join(copie, s)); }
    const utilisees = ['src/data/quetes.json', 'src/core/draft.ts'];
    const avant = empreinteDe(copie, utilisees);
    try {
      fs.writeFileSync(path.join(copie, 'src/data/popularite.json'), '{}');
      const q = JSON.parse(fs.readFileSync(path.join(copie, 'src/data/quetes.json'), 'utf8'));
      q.connexion.sceauxParJour = 99;
      fs.writeFileSync(path.join(copie, 'src/data/quetes.json'), JSON.stringify(q, null, 2));
      expect(empreinteDe(copie, utilisees)).toBe(avant);
      q.hebdomadaire.recompensesDraft.podium = [6, 4, 3];
      fs.writeFileSync(path.join(copie, 'src/data/quetes.json'), JSON.stringify(q));
      expect(empreinteDe(copie, utilisees)).not.toBe(avant);
    } finally {
      fs.rmSync(copie, { recursive: true, force: true });
    }
  });
});
