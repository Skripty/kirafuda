// npm run fonctions              : regroupe chaque fonction serveur (supabase/fonctions/<nom>.ts) avec le code de
//                                  src/core et les données du draft en un seul fichier, supabase/functions/<nom>/index.ts.
// npm run fonctions -- --verifier : ne change rien ; échoue si un fichier déployable n'est plus à jour.
// npm run deployer-fonctions     : régénère, puis déploie les deux fonctions sur Supabase (docs/SUPABASE.md, 10.2).
//                                  Projet : --projet <ref>, sinon lu dans VITE_SUPABASE_URL (.env).
import { build, type Rollup } from 'vite';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { FONCTIONS, empreinteDe, enTete, verifierFonction } from './empreinte-fonctions';

const racine = process.cwd();
const args = process.argv.slice(2);
const fichierDe = (nom: string): string => path.join(racine, 'supabase', 'functions', nom, 'index.ts');

async function generer(nom: string): Promise<void> {
  const sortie = (await build({
    configFile: false,
    logLevel: 'warn',
    publicDir: false,
    build: {
      lib: { entry: path.join(racine, 'supabase', 'fonctions', `${nom}.ts`), formats: ['es'], fileName: () => 'index.js' },
      write: false,
      minify: false,
      target: 'es2022',
      reportCompressedSize: false,
      rollupOptions: { output: { inlineDynamicImports: true } },
    },
  })) as Rollup.RollupOutput[];
  const morceaux = sortie.flatMap((s) => s.output).filter((o): o is Rollup.OutputChunk => o.type === 'chunk');
  const code = morceaux.map((o) => o.code).join('\n');
  // Fichiers réellement regroupés (relevés par le build) : seuls eux comptent pour l'empreinte.
  const sources = [...new Set(morceaux.flatMap((o) => o.moduleIds))]
    .filter((id) => !id.startsWith('\0') && path.isAbsolute(id.split('?')[0]!))
    .map((id) => path.relative(racine, id.split('?')[0]!).split(path.sep).join('/'))
    .filter((r) => !r.startsWith('..') && !r.startsWith('node_modules/'))
    .sort();
  const cible = fichierDe(nom);
  mkdirSync(path.dirname(cible), { recursive: true });
  writeFileSync(cible, `${enTete(nom, empreinteDe(racine, sources), sources)}// @ts-nocheck\n${code}`);
  console.log(`${path.relative(racine, cible)} : ${(Buffer.byteLength(code) / 1024).toFixed(0)} Ko, ${sources.length} fichiers sources`);
}

/** Outil Supabase, version fixée (ses options changent d'une version majeure à l'autre). */
const CLI_SUPABASE = 'supabase@3.0.0';

/** Identifiant du projet : --projet <ref>, sinon https://<ref>.supabase.co dans .env. */
function projet(): string {
  const i = args.indexOf('--projet');
  if (i >= 0 && args[i + 1]) return args[i + 1]!;
  const env = existsSync(path.join(racine, '.env')) ? readFileSync(path.join(racine, '.env'), 'utf8') : '';
  const ref = /^VITE_SUPABASE_URL\s*=\s*https:\/\/([a-z0-9]+)\.supabase\.co/m.exec(env)?.[1];
  if (!ref) {
    console.error('Projet Supabase introuvable : ajoute VITE_SUPABASE_URL dans .env, ou lance npm run deployer-fonctions -- --projet <ref>.');
    process.exit(1);
  }
  return ref;
}

if (args.includes('--verifier')) {
  let enRetard = 0;
  for (const nom of FONCTIONS) {
    const cible = fichierDe(nom);
    const raison = existsSync(cible) ? verifierFonction(racine, readFileSync(cible, 'utf8')) : 'fichier absent';
    if (raison) { enRetard++; console.error(`✗ ${nom} n'est pas à jour (${raison}) : lance npm run deployer-fonctions.`); }
    else console.log(`✓ ${nom} à jour`);
  }
  process.exit(enRetard > 0 ? 1 : 0);
}

for (const nom of FONCTIONS) await generer(nom);

if (args.includes('--deployer')) {
  const ref = projet();
  for (const nom of FONCTIONS) {
    console.log(`\nDéploiement de ${nom} sur le projet ${ref}…`);
    // --no-verify-jwt : la fonction vérifie elle-même le joueur (Supabase Auth). --use-api : sans Docker.
    // --yes : confirme le changement sur le projet en ligne (c'est la raison de cette commande).
    const r = spawnSync('npx', ['--yes', CLI_SUPABASE, 'functions', 'deploy', nom, `--remote=${ref}`, '--no-verify-jwt', '--use-api', '--yes'],
      { cwd: racine, stdio: 'inherit', shell: process.platform === 'win32' });
    if (r.status !== 0) {
      console.error(`\n✗ Échec du déploiement de ${nom}. Première fois sur cet ordinateur ? Lance d'abord : npx ${CLI_SUPABASE} login`);
      process.exit(r.status ?? 1);
    }
  }
  console.log('\n✓ Les deux fonctions sont déployées.');
}
