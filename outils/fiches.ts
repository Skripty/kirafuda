// npm run fiches : recopie les fiches de combat (src/data/fiches-combat.json) dans les personnages des fichiers
// d'extension (src/data/extension-*.json, listés dans extensions.json). Les fiches « nouveau » sont ignorées.
// À relancer après chaque rééquilibrage des fiches ; un test vérifie que les extensions sont à jour.
// npm run fiches -- --verifier : ne change rien ; échoue si une extension n'est pas à jour.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { appliquerFiches, validerFiches, type FichierFiches } from '../src/core/combat';
import { serialiserExtension } from '../src/core/edition';
import type { Extension } from '../src/core/types';

const donnees = path.join(process.cwd(), 'src', 'data');
const lire = (nom: string): any => JSON.parse(readFileSync(path.join(donnees, nom), 'utf8'));
const verifier = process.argv.includes('--verifier');

const fiches = lire('fiches-combat.json') as FichierFiches;
const erreursFiches = validerFiches(fiches);
if (erreursFiches.length) { console.error(erreursFiches.join('\n')); process.exit(1); }

let aChanger = 0;
for (const e of lire('extensions.json').extensions as { vagues: { fichier: string }[] }[]) {
  for (const { fichier } of e.vagues) {
    const avant = readFileSync(path.join(donnees, fichier), 'utf8');
    const { extension, erreurs } = appliquerFiches(JSON.parse(avant) as Extension, fiches);
    if (erreurs.length) { console.error(`${fichier} :\n${erreurs.join('\n')}`); process.exit(1); }
    const apres = serialiserExtension(extension);
    if (apres === avant) { console.log(`✓ ${fichier} à jour`); continue; }
    aChanger++;
    if (verifier) console.error(`✗ ${fichier} n'est pas à jour : lance npm run fiches.`);
    else { writeFileSync(path.join(donnees, fichier), apres); console.log(`${fichier} : ${extension.personnages.length} personnages mis à jour`); }
  }
}
if (verifier && aChanger) process.exit(1);
