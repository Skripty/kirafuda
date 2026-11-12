// npm run simuler (mode par défaut) : ouvre 100 000 boosters et compare les fréquences observées aux taux configurés.
// Les taux d'un emplacement sont comparés aux seuls boosters normaux ; ceux de la table
// exceptionnelle, aux seuls boosters exceptionnels (peu nombreux : écarts plus grands attendus).
// Affiche aussi la fréquence d'une carte précise par rareté (tirage : rareté, puis carte à poids égaux).
import extensionJson from '../src/data/extension-lancement.json';
import boosterJson from '../src/data/booster-lancement.json';
import type { Booster, Extension } from '../src/core/types';
import { FINITIONS, ORDRE_FINITIONS, TOTAL_POIDS } from '../src/core/regles';
import { indexer } from '../src/core/extension';
import { rngSecurise } from '../src/core/rng';
import { tirerBooster } from '../src/core/tirage';
import { validerDonnees } from '../src/core/validation';

const OUVERTURES = 100_000;
const extension = extensionJson as unknown as Extension;
const booster = boosterJson as unknown as Booster;

const erreurs = validerDonnees(extension, booster);
if (erreurs.length > 0) {
  console.error('Données invalides :\n- ' + erreurs.join('\n- '));
  throw new Error('Simulation annulée.');
}

const index = indexer(extension);
const pct = (x: number): string => `${x.toFixed(3).padStart(8)} %`;

/** Compteurs d'un groupe de tirages : raretés, nombre de cartes. */
interface Groupe { nom: string; finitions: Map<string, number>; total: number }
const groupe = (nom: string): Groupe => ({ nom, finitions: new Map(), total: 0 });

const groupesNormaux = booster.emplacements.map((t) => groupe(`Emplacement${t.emplacements.length > 1 ? 's' : ''} ${t.emplacements.join(', ')}`));
const groupeExceptionnel = groupe('Table exceptionnelle');
const parCarte = new Map<string, number>();
let exceptionnels = 0;

const rng = rngSecurise();
const debut = performance.now();
for (let i = 0; i < OUVERTURES; i++) {
  const tirage = tirerBooster(booster, extension, rng, { avecSoutiens: true });
  if (tirage.exceptionnel) exceptionnels++;
  for (const c of tirage.cartes) {
    const g = tirage.exceptionnel
      ? groupeExceptionnel
      : groupesNormaux[booster.emplacements.findIndex((t) => t.emplacements.includes(c.emplacement))]!;
    g.finitions.set(c.finition, (g.finitions.get(c.finition) ?? 0) + 1);
    g.total++;
    parCarte.set(c.carteId, (parCarte.get(c.carteId) ?? 0) + 1);
  }
}
const duree = performance.now() - debut;

function afficherTable(titre: string, config: Record<string, number | undefined>, observes: Map<string, number>, total: number): void {
  console.log(`  ${titre}`);
  console.log(`    ${''.padEnd(16)}${'configuré'.padStart(10)}${'observé'.padStart(10)}${'écart'.padStart(10)}`);
  for (const cle of ORDRE_FINITIONS) {
    const poids = config[cle] ?? 0;
    const n = observes.get(cle) ?? 0;
    if (poids === 0 && n === 0) continue;
    const attendu = (poids / TOTAL_POIDS) * 100;
    const observe = total > 0 ? (n / total) * 100 : 0;
    const ecart = observe - attendu;
    console.log(`    ${cle.padEnd(16)}${pct(attendu)}${pct(observe)}${`${ecart >= 0 ? '+' : ''}${ecart.toFixed(3)}`.padStart(10)}`);
  }
}

console.log(`\nSimulation : ${OUVERTURES.toLocaleString('fr-FR')} boosters « ${booster.nom} » (${Math.round(duree)} ms)\n`);
console.log(`Boosters exceptionnels : ${exceptionnels} — configuré ${pct((booster.tauxExceptionnel / TOTAL_POIDS) * 100)}, observé ${pct((exceptionnels / OUVERTURES) * 100)}\n`);

booster.emplacements.forEach((table, i) => {
  const g = groupesNormaux[i]!;
  console.log(`${g.nom} (${g.total.toLocaleString('fr-FR')} cartes, boosters normaux)`);
  afficherTable('Raretés', table.finitions, g.finitions, g.total);
  console.log('');
});

console.log(`${groupeExceptionnel.nom} (${groupeExceptionnel.total} cartes, boosters exceptionnels)`);
afficherTable('Raretés', booster.tableExceptionnelle.finitions, groupeExceptionnel.finitions, groupeExceptionnel.total);

// Une carte précise par rareté (la première par numéro). Attendu par booster :
// Σ emplacements (poids de la rareté ÷ 100 000) ÷ nombre de cartes de cette rareté, entre boosters normaux et exceptionnels.
const tau = booster.tauxExceptionnel / TOTAL_POIDS;
console.log('\nUne carte précise par rareté (nombre de tirages pour 100 boosters) :');
console.log(`    ${'rareté'.padEnd(20)}${'carte'.padEnd(30)}${'cartes'.padStart(7)}${'attendu'.padStart(10)}${'observé'.padStart(10)}`);
for (const f of ORDRE_FINITIONS) {
  const cartesF = index.parFinition(f);
  if (cartesF.length === 0) continue;
  const carte = cartesF[0]!;
  const normal = booster.emplacements.reduce((s, t) => s + t.emplacements.length * ((t.finitions[f] ?? 0) / TOTAL_POIDS), 0);
  const exceptionnel = booster.cartesParBooster * ((booster.tableExceptionnelle.finitions[f] ?? 0) / TOTAL_POIDS);
  const attendu = (((1 - tau) * normal + tau * exceptionnel) / cartesF.length) * 100;
  const observe = ((parCarte.get(carte.id) ?? 0) / OUVERTURES) * 100;
  const nom = `${carte.id} ${index.personnageDe(carte).nom}`.slice(0, 28);
  console.log(`    ${`${FINITIONS[f].symbole} ${f}`.padEnd(20)}${nom.padEnd(30)}${String(cartesF.length).padStart(7)}${attendu.toFixed(3).padStart(10)}${observe.toFixed(3).padStart(10)}`);
}

console.log('\nCartes d’une même rareté à poids égaux (nombre de tirages par carte) :');
for (const f of ORDRE_FINITIONS) {
  const comptes = index.parFinition(f).map((c) => parCarte.get(c.id) ?? 0);
  if (comptes.length === 0) continue;
  const moyenne = comptes.reduce((a, b) => a + b, 0) / comptes.length;
  console.log(`  ${`${FINITIONS[f].symbole} ${f}`.padEnd(20)}: ${String(comptes.length).padStart(2)} cartes, min ${Math.min(...comptes)}, max ${Math.max(...comptes)}, moyenne ${moyenne.toFixed(0)}`);
}
console.log('');
