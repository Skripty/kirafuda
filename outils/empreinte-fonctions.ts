// Empreinte des sources des fonctions serveur : src/core, src/data, src/catalogue.ts et supabase/fonctions.
// Elle est écrite en tête de chaque fichier déployable : un test vérifie qu'ils ont été regénérés après un changement.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

export const FONCTIONS = ['soumettre-draft', 'reclamer-draft'] as const;
const SOURCES = ['src/core', 'src/data', 'src/catalogue.ts', 'supabase/fonctions'];

export function empreinteFonctions(racine: string): string {
  const hash = createHash('sha256');
  const ajouter = (chemin: string): void => {
    if (statSync(chemin).isDirectory()) { for (const n of readdirSync(chemin).sort()) ajouter(path.join(chemin, n)); return; }
    // Fins de ligne normalisées : même empreinte sous Windows et ailleurs.
    hash.update(path.relative(racine, chemin).split(path.sep).join('/')).update('\0').update(readFileSync(chemin, 'utf8').replace(/\r\n/g, '\n'));
  };
  for (const s of SOURCES) ajouter(path.join(racine, s));
  return hash.digest('hex').slice(0, 16);
}

export const enTete = (nom: string, empreinte: string): string =>
  `// Fonction Supabase « ${nom} » — FICHIER GÉNÉRÉ par \`npm run fonctions\`, ne pas modifier à la main.\n`
  + `// Sources : supabase/fonctions/${nom}.ts, src/core, src/data. Empreinte des sources : ${empreinte}\n`;
