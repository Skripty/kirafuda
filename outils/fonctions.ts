// npm run fonctions            : regroupe chaque fonction serveur (supabase/fonctions/<nom>.ts) avec src/core et
//                                les données du jeu en un seul fichier, supabase/functions/<nom>/index.ts (déployé).
// npm run fonctions -- --verifier : ne change rien ; échoue si un fichier déployable n'est plus à jour.
// Le serveur recalcule le draft et le score avec exactement le code du jeu : après une modification de src/core
// ou de src/data, relancer `npm run fonctions` puis redéployer (docs/SUPABASE.md, section 10).
import { build, type Rollup } from 'vite';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { empreinteFonctions, FONCTIONS, enTete } from './empreinte-fonctions';

const racine = process.cwd();
const verifier = process.argv.includes('--verifier');
const empreinte = empreinteFonctions(racine);
let enRetard = 0;

for (const nom of FONCTIONS) {
  const cible = path.join(racine, 'supabase', 'functions', nom, 'index.ts');
  if (verifier) {
    const actuel = existsSync(cible) ? readFileSync(cible, 'utf8') : '';
    if (!actuel.startsWith(enTete(nom, empreinte))) {
      console.error(`✗ ${path.relative(racine, cible)} n'est pas à jour : lance npm run fonctions, puis redéploie la fonction.`);
      enRetard++;
    } else console.log(`✓ ${nom} à jour (${empreinte})`);
    continue;
  }
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
  const code = sortie.flatMap((s) => s.output).filter((o): o is Rollup.OutputChunk => o.type === 'chunk').map((o) => o.code).join('\n');
  mkdirSync(path.dirname(cible), { recursive: true });
  writeFileSync(cible, `${enTete(nom, empreinte)}// @ts-nocheck\n${code}`);
  console.log(`${path.relative(racine, cible)} : ${(Buffer.byteLength(code) / 1024).toFixed(0)} Ko`);
}
if (enRetard > 0) process.exit(1);
