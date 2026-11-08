// npm run simuler -- combat [parties] : parties entre des decks de série générés automatiquement, jouées par deux IA
// simples (hasard et gloutonne, réparties au hasard). Rapport : victoires par série et par IA, cartes les plus jouées
// par les gagnants, durée moyenne, parties bloquées ou anormalement longues. Tout est déterministe (graines).
import { catalogue } from '../src/catalogue';
import { fusionner, toutesLesExtensions } from '../src/core/catalogue';
import { rngAGraine } from '../src/core/rng';
import soutiensJson from '../src/data/soutiens.json';
import { bibliotheque, type CarteSoutien, type IdJoueur } from '../src/core/combat/etat';
import { actionsLegales, appliquer, creerPartie } from '../src/core/combat/moteur';
import { deckDeSerie, seriesDe } from '../src/core/combat/decks';
import { iaGloutonne, iaHasard, type IA } from '../src/core/combat/ia';

declare const process: { argv: string[]; exitCode?: number };

const PARTIES = Number(process.argv.find((x) => /^\d+$/.test(x)) ?? 2000);
/** Au-delà, la partie est « anormalement longue » (arrêtée et signalée). */
const TOURS_MAX = 120;
const ACTIONS_MAX = 4000;

const bib = bibliotheque(fusionner(toutesLesExtensions(catalogue)).personnages, soutiensJson.soutiens as unknown as CarteSoutien[]);
const series = seriesDe(bib);
const decks = new Map(series.map((s) => [s, deckDeSerie(s, bib)]));
const jouables = series.filter((s) => decks.get(s));
const exclues = series.filter((s) => !decks.get(s));
const rng = rngAGraine('simulation-combat');

const stats = new Map(jouables.map((s) => [s, { parties: 0, victoires: 0 }]));
const ia = { glouton: { parties: 0, victoires: 0 }, hasard: { parties: 0, victoires: 0 } };
const jouees = new Map<string, number>();
const durees: number[] = [];
const anomalies: string[] = [];
/** Parties trop longues ou bloquées, par paire d'IA (« glouton / hasard »…). */
const parPaire = new Map<string, { parties: number; anomalies: number; tours: number[] }>();
const nomCarte = (id: string): string => bib.personnages.get(id)?.nom ?? bib.soutiens.get(id)?.nom ?? id;
const debut = Date.now();

for (let n = 0; n < PARTIES; n++) {
  const a = jouables[rng.entier(jouables.length)]!;
  let b = jouables[rng.entier(jouables.length - 1)]!;
  if (b === a) b = jouables[jouables.length - 1]!;
  const types = (['glouton', 'hasard'] as const).map(() => (rng.entier(2) === 0 ? 'glouton' : 'hasard'));
  const paire = [...types].sort().join(' / ');
  if (!parPaire.has(paire)) parPaire.set(paire, { parties: 0, anomalies: 0, tours: [] });
  parPaire.get(paire)!.parties++;
  const ias: IA[] = types.map((t, i) => (t === 'glouton' ? iaGloutonne(`g:${n}:${i}`) : iaHasard(`h:${n}:${i}`)));
  const graine = `partie:${n}`;
  let partie = creerPartie(bib, [deckDeSerie(a, bib)!, deckDeSerie(b, bib)!], graine).partie;
  const cartesJouees: [Set<string>, Set<string>] = [new Set(), new Set()];
  let actions = 0;
  let probleme: string | null = null;
  try {
    while (partie.phase !== 'fin') {
      if (++actions > ACTIONS_MAX) { probleme = `plus de ${ACTIONS_MAX} actions`; break; }
      if (partie.tour > TOURS_MAX) { probleme = `plus de ${TOURS_MAX} tours`; break; }
      const legales = actionsLegales(partie, bib);
      if (legales.length === 0) { probleme = 'aucune action possible'; break; }
      const qui: IdJoueur = partie.phase === 'mise-en-place' ? (partie.joueurs[0].pret ? 1 : 0)
        : partie.phase === 'choix-premier' ? partie.gagnantPiece
          : partie.attente ? partie.attente.joueurs[0]! : partie.joueurActif;
      const action = ias[qui]!(partie, bib);
      if (action.type === 'poser' || action.type === 'releve' || action.type === 'jouer') cartesJouees[qui].add(partie.cartes[action.carte]!);
      if (action.type === 'mise-en-place') for (const u of [action.actif, ...action.banc]) cartesJouees[qui].add(partie.cartes[u]!);
      partie = appliquer(partie, action, bib, { verifier: false }).partie;
    }
  } catch (e) {
    probleme = `erreur : ${(e as Error).message}`;
  }
  if (probleme) { parPaire.get(paire)!.anomalies++; anomalies.push(`partie ${n} (${a} contre ${b}, ${types.join(' / ')}) : ${probleme}`); continue; }
  durees.push(partie.tour);
  parPaire.get(paire)!.tours.push(partie.tour);
  const g = partie.gagnant!;
  const noms = [a, b];
  for (const i of [0, 1] as IdJoueur[]) {
    stats.get(noms[i]!)!.parties++;
    ia[types[i]!].parties++;
    if (i === g) { stats.get(noms[i]!)!.victoires++; ia[types[i]!].victoires++; }
  }
  for (const id of cartesJouees[g]) jouees.set(id, (jouees.get(id) ?? 0) + 1);
}

const pc = (v: number, t: number): string => (t ? `${((v / t) * 100).toFixed(1).replace('.', ',')} %` : '—');
const lignes: string[] = [];
lignes.push(`Simulation de combat : ${PARTIES} parties en ${((Date.now() - debut) / 1000).toFixed(0)} s (graine « simulation-combat »).`);
lignes.push(`Parties terminées : ${durees.length} · bloquées ou anormales : ${anomalies.length}`);
lignes.push(`Durée moyenne : ${(durees.reduce((x, y) => x + y, 0) / Math.max(1, durees.length)).toFixed(1).replace('.', ',')} tours `
  + `(médiane ${[...durees].sort((x, y) => x - y)[Math.floor(durees.length / 2)] ?? '—'}, max ${Math.max(0, ...durees)})`);
const moyenne = (l: number[]): string => (l.reduce((x, y) => x + y, 0) / Math.max(1, l.length)).toFixed(1).replace('.', ',');
for (const [paire, s] of [...parPaire].sort()) lignes.push(`  ${paire.padEnd(18)} ${moyenne(s.tours).padStart(5)} tours en moyenne (${s.tours.length} parties terminées)`);
lignes.push('', 'Victoires par IA :');
for (const [nom, s] of Object.entries(ia)) lignes.push(`  ${nom.padEnd(8)} ${pc(s.victoires, s.parties).padStart(8)}  (${s.victoires}/${s.parties})`);
lignes.push('', 'Victoires par série (decks générés : personnages ×2 + cartes Soutien) :');
for (const [s, v] of [...stats].sort((x, y) => y[1].victoires / Math.max(1, y[1].parties) - x[1].victoires / Math.max(1, x[1].parties))) {
  lignes.push(`  ${s.padEnd(32)} ${pc(v.victoires, v.parties).padStart(8)}  (${v.victoires}/${v.parties})`);
}
if (exclues.length) lignes.push('', `Séries sans deck possible (aucun Base) : ${exclues.join(', ')}.`);
lignes.push('', '10 cartes les plus jouées par les gagnants (nombre de parties gagnées où la carte a été jouée) :');
for (const [id, n] of [...jouees].sort((x, y) => y[1] - x[1]).slice(0, 10)) lignes.push(`  ${String(n).padStart(5)}  ${nomCarte(id)}`);
lignes.push('', 'Les mêmes, personnages seulement (les cartes Soutien de complément sont dans tous les decks) :');
for (const [id, n] of [...jouees].filter(([id]) => bib.personnages.has(id)).sort((x, y) => y[1] - x[1]).slice(0, 10)) {
  lignes.push(`  ${String(n).padStart(5)}  ${nomCarte(id)} (${bib.personnages.get(id)!.serie})`);
}
lignes.push('', `Parties bloquées ou anormalement longues (plus de ${TOURS_MAX} tours), par paire d'IA :`);
for (const [paire, s] of [...parPaire].sort()) lignes.push(`  ${paire.padEnd(18)} ${String(s.anomalies).padStart(4)} sur ${s.parties}`);
lignes.push('', anomalies.length ? 'Détail :' : 'Aucune partie bloquée ni anormale.');
for (const x of (process.argv.includes('--tout') ? anomalies : anomalies.slice(0, 15))) lignes.push(`  ${x}`);
if (anomalies.length > 15 && !process.argv.includes('--tout')) lignes.push(`  … et ${anomalies.length - 15} autres.`);
console.log(lignes.join('\n'));
if (anomalies.some((x) => !x.includes('tours'))) process.exitCode = 1; // une partie bloquée (erreur, aucune action) est un échec
