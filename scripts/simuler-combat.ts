// npm run simuler -- combat [parties] : parties entre decks standardisés de série, jouées par deux IA gloutonnes.
// Decks : 7 personnages × 2 + les 6 mêmes cartes Soutien (src/core/combat/decks.ts, deckStandard).
// Rapport : victoires par série, par personnage (decks qui le contiennent), dégâts et K.-O. par personnage,
// cartes au-dessus de 60 % ou en dessous de 40 %, durée, parties bloquées ou anormalement longues.
// Tout est déterministe (graines).
import { catalogue } from '../src/catalogue';
import { fusionner, toutesLesExtensions } from '../src/core/catalogue';
import { rngAGraine } from '../src/core/rng';
import soutiensJson from '../src/data/soutiens.json';
import { bibliotheque, type CarteSoutien, type IdJoueur } from '../src/core/combat/etat';
import { actionsLegales, appliquer, creerPartie } from '../src/core/combat/moteur';
import { complementDe, deckStandard, seriesDe, SOUTIENS_STANDARD } from '../src/core/combat/decks';
import { iaGloutonne } from '../src/core/combat/ia';

declare const process: { argv: string[]; exitCode?: number };

const PARTIES = Number(process.argv.find((x) => /^\d+$/.test(x)) ?? 5000);
/** Au-delà, la partie est « anormalement longue » (arrêtée et signalée). */
const TOURS_MAX = 120;
const ACTIONS_MAX = 4000;
const HAUT = 0.6;
const BAS = 0.4;

const bib = bibliotheque(fusionner(toutesLesExtensions(catalogue)).personnages, soutiensJson.soutiens as unknown as CarteSoutien[]);
const rng = rngAGraine('simulation-combat');
const series = seriesDe(bib);
const jouables = series.filter((s) => deckStandard(s, bib, rngAGraine('verification')));
const exclues = series.filter((s) => !jouables.includes(s));

interface Stat { parties: number; victoires: number }
interface StatPerso extends Stat { degats: number; ko: number }
const parSerie = new Map(jouables.map((s) => [s, { parties: 0, victoires: 0 } as Stat]));
const parPerso = new Map<string, StatPerso>();
const durees: number[] = [];
/** Points marqués, selon le type du personnage mis K.-O. */
const pointsParType: Record<string, number> = { base: 0, eveille: 0, heros: 0 };
const anomalies: string[] = [];
const debut = Date.now();
const nom = (id: string): string => bib.personnages.get(id)?.nom ?? bib.soutiens.get(id)?.nom ?? id;
const pc = (v: number, t: number): string => (t ? `${((v / t) * 100).toFixed(1).replace('.', ',')} %` : '—');
const dec = (x: number): string => x.toFixed(1).replace('.', ',');

for (let n = 0; n < PARTIES; n++) {
  const a = jouables[rng.entier(jouables.length)]!;
  let b = jouables[rng.entier(jouables.length - 1)]!;
  if (b === a) b = jouables[jouables.length - 1]!;
  const decks = [deckStandard(a, bib, rng)!, deckStandard(b, bib, rng)!] as const;
  const ias = [iaGloutonne(`g:${n}:0`), iaGloutonne(`g:${n}:1`)];
  let partie = creerPartie(bib, [decks[0], decks[1]], `partie:${n}`).partie;
  // Dégâts et K.-O. infligés par les attaques de chaque personnage, dans cette partie.
  const contribution = new Map<string, { degats: number; ko: number }>();
  let actions = 0;
  let probleme: string | null = null;
  try {
    while (partie.phase !== 'fin') {
      if (++actions > ACTIONS_MAX) { probleme = `plus de ${ACTIONS_MAX} actions`; break; }
      if (partie.tour > TOURS_MAX) { probleme = `plus de ${TOURS_MAX} tours`; break; }
      if (actionsLegales(partie, bib).length === 0) { probleme = 'aucune action possible'; break; }
      const qui: IdJoueur = partie.phase === 'mise-en-place' ? (partie.joueurs[0].pret ? 1 : 0)
        : partie.phase === 'choix-premier' ? partie.gagnantPiece
          : partie.attente ? partie.attente.joueurs[0]! : partie.joueurActif;
      const action = ias[qui]!(partie, bib);
      const attaquant = action.type === 'attaquer' ? partie.joueurs[qui].actif?.id : undefined;
      const r = appliquer(partie, action, bib, { verifier: false });
      for (const e of r.journal) if (e.type === 'ko' && e.cible) pointsParType[bib.personnages.get(partie.cartes[e.cible]!)!.type] += e.valeur ?? 0;
      if (attaquant) {
        const adv = qui === 0 ? 'J2-' : 'J1-';
        const c = contribution.get(attaquant) ?? { degats: 0, ko: 0 };
        for (const e of r.journal) {
          if (e.type === 'degats' && e.cible?.startsWith(adv)) c.degats += e.valeur ?? 0;
          if (e.type === 'ko' && e.joueur !== qui) c.ko++;
        }
        contribution.set(attaquant, c);
      }
      partie = r.partie;
    }
  } catch (e) {
    probleme = `erreur : ${(e as Error).message}`;
  }
  if (probleme) { anomalies.push(`partie ${n} (${a} contre ${b}) : ${probleme}`); continue; }
  durees.push(partie.tour);
  const g = partie.gagnant!;
  [a, b].forEach((s, i) => {
    const st = parSerie.get(s)!;
    st.parties++;
    if (i === g) st.victoires++;
    for (const id of new Set(decks[i]!.cartes.filter((x) => bib.personnages.has(x)))) {
      const sp = parPerso.get(id) ?? { parties: 0, victoires: 0, degats: 0, ko: 0 };
      sp.parties++;
      if (i === g) sp.victoires++;
      // Un personnage peut être dans les deux decks (complément) : sa contribution est partagée entre eux.
      const c = contribution.get(id);
      const dansLesDeux = decks[0].cartes.includes(id) && decks[1].cartes.includes(id);
      if (c) { sp.degats += dansLesDeux ? c.degats / 2 : c.degats; sp.ko += dansLesDeux ? c.ko / 2 : c.ko; }
      parPerso.set(id, sp);
    }
  });
}

const lignes: string[] = [];
const taux = (s: Stat): number => s.victoires / Math.max(1, s.parties);
lignes.push(`Simulation de combat : ${PARTIES} parties, IA gloutonne contre IA gloutonne, en ${((Date.now() - debut) / 1000).toFixed(0)} s (graine « simulation-combat »).`);
lignes.push(`Decks standardisés : 7 personnages × 2 + ${SOUTIENS_STANDARD.map(nom).join(', ')}.`);
lignes.push(`Parties terminées : ${durees.length} · bloquées ou anormales : ${anomalies.length}`);
lignes.push(`Durée moyenne : ${dec(durees.reduce((x, y) => x + y, 0) / Math.max(1, durees.length))} tours `
  + `(médiane ${[...durees].sort((x, y) => x - y)[Math.floor(durees.length / 2)] ?? '—'}, max ${Math.max(0, ...durees)})`);

lignes.push('', 'Victoires par série :');
for (const [s, v] of [...parSerie].sort((x, y) => taux(y[1]) - taux(x[1]))) {
  const signal = taux(v) > HAUT ? '  ▲ plus de 60 %' : taux(v) < BAS ? '  ▼ moins de 40 %' : '';
  lignes.push(`  ${s.padEnd(32)} ${pc(v.victoires, v.parties).padStart(8)}  (${v.victoires}/${v.parties})${signal}`);
}
if (exclues.length) lignes.push('', `Séries sans deck (aucun Base ni Héros à elles) : ${exclues.join(', ')}.`);
lignes.push('', 'Compléments (séries de moins de 7 personnages, toujours les mêmes) :');
for (const s of jouables) { const c = complementDe(s, bib); if (c.length) lignes.push(`  ${s.padEnd(32)} ${c.map((p) => `${p.nom} (${p.serie})`).join(', ')}`); }

lignes.push('', 'Par personnage (decks qui le contiennent) : victoires · dégâts infligés par ses attaques et K.-O., en moyenne par partie :');
const persos = [...parPerso].sort((x, y) => taux(y[1]) - taux(x[1]));
for (const [id, v] of persos) {
  const signal = taux(v) > HAUT ? '  ▲' : taux(v) < BAS ? '  ▼' : '';
  const p = bib.personnages.get(id)!;
  lignes.push(`  ${`${p.nom} (${p.serie})`.padEnd(48)} ${pc(v.victoires, v.parties).padStart(8)}  ${String(v.parties).padStart(5)} parties  `
    + `${dec(v.degats / v.parties).padStart(6)} dégâts  ${dec(v.ko / v.parties).padStart(4)} K.-O.${signal}`);
}
lignes.push('', 'Héros (posés comme un Base, 2 points s’ils sont mis K.-O.) :');
for (const [id, v] of persos.filter(([id]) => bib.personnages.get(id)!.type === 'heros')) {
  const p = bib.personnages.get(id)!;
  lignes.push(`  ${`${p.nom} (${p.serie})`.padEnd(48)} ${pc(v.victoires, v.parties).padStart(8)}  ${dec(v.degats / v.parties).padStart(6)} dégâts  ${dec(v.ko / v.parties).padStart(4)} K.-O.`);
}
const totalPoints = Object.values(pointsParType).reduce((x, y) => x + y, 0);
lignes.push('', `Points marqués (${totalPoints}), selon le personnage mis K.-O. :`);
lignes.push(`  Éveillés ${pc(pointsParType.eveille!, totalPoints)} · Héros ${pc(pointsParType.heros!, totalPoints)} · Éveillés et Héros ${pc(pointsParType.eveille! + pointsParType.heros!, totalPoints)} · Bases ${pc(pointsParType.base!, totalPoints)}`);
const hauts = persos.filter(([, v]) => taux(v) > HAUT);
const bas = persos.filter(([, v]) => taux(v) < BAS);
lignes.push('', `Au-dessus de 60 % (${hauts.length}) : ${hauts.map(([id, v]) => `${nom(id)} ${pc(v.victoires, v.parties)}`).join(' · ') || 'aucune'}`);
lignes.push(`En dessous de 40 % (${bas.length}) : ${bas.map(([id, v]) => `${nom(id)} ${pc(v.victoires, v.parties)}`).join(' · ') || 'aucune'}`);

// ---------- Cartes Soutien (tâche 29) : mêmes decks de personnages, 6 cartes Soutien tirées parmi les 20 ----------
// Chaque deck reçoit 6 cartes Soutien au hasard (2 exemplaires au plus de chacune) : on mesure, pour chaque carte,
// les victoires des decks qui la contiennent et combien de fois l'IA la joue.
const PARTIES_SOUTIENS = PARTIES;
const tousSoutiens = [...bib.soutiens.values()];
const parSoutien = new Map(tousSoutiens.map((s) => [s.id, { parties: 0, victoires: 0, jouees: 0, exemplaires: 0 }]));
const rngS = rngAGraine('simulation-soutiens');
const tirerSoutiens = (): string[] => {
  const choisis: string[] = [];
  while (choisis.length < 6) {
    const s = tousSoutiens[rngS.entier(tousSoutiens.length)]!.id;
    if (choisis.filter((x) => x === s).length < 2) choisis.push(s);
  }
  return choisis;
};
let termineesS = 0;
const dureesS: number[] = [];
for (let n = 0; n < PARTIES_SOUTIENS; n++) {
  const a = jouables[rngS.entier(jouables.length)]!;
  let b = jouables[rngS.entier(jouables.length - 1)]!;
  if (b === a) b = jouables[jouables.length - 1]!;
  const decks = [a, b].map((s) => {
    const d = deckStandard(s, bib, rngS)!;
    return { ...d, cartes: [...d.cartes.filter((x) => bib.personnages.has(x)), ...tirerSoutiens()] };
  });
  const ias = [iaGloutonne(`s:${n}:0`), iaGloutonne(`s:${n}:1`)];
  let partie = creerPartie(bib, [decks[0]!, decks[1]!], `soutiens:${n}`).partie;
  const jouees: [Map<string, number>, Map<string, number>] = [new Map(), new Map()];
  let actions = 0;
  let probleme: string | null = null;
  try {
    while (partie.phase !== 'fin') {
      if (++actions > ACTIONS_MAX) { probleme = `plus de ${ACTIONS_MAX} actions`; break; }
      if (partie.tour > TOURS_MAX) { probleme = `plus de ${TOURS_MAX} tours`; break; }
      if (actionsLegales(partie, bib).length === 0) { probleme = 'aucune action possible'; break; }
      const qui: IdJoueur = partie.phase === 'mise-en-place' ? (partie.joueurs[0].pret ? 1 : 0)
        : partie.phase === 'choix-premier' ? partie.gagnantPiece
          : partie.attente ? partie.attente.joueurs[0]! : partie.joueurActif;
      const action = ias[qui]!(partie, bib);
      if (action.type === 'jouer') {
        const id = partie.cartes[action.carte]!;
        jouees[qui].set(id, (jouees[qui].get(id) ?? 0) + 1);
      }
      partie = appliquer(partie, action, bib, { verifier: false }).partie;
    }
  } catch (e) {
    probleme = `erreur : ${(e as Error).message}`;
  }
  if (probleme) { anomalies.push(`partie Soutiens ${n} (${a} contre ${b}) : ${probleme}`); continue; }
  termineesS++;
  dureesS.push(partie.tour);
  decks.forEach((d, i) => {
    const soutiens = d.cartes.filter((x) => bib.soutiens.has(x));
    for (const id of new Set(soutiens)) {
      const st = parSoutien.get(id)!;
      st.parties++;
      st.exemplaires += soutiens.filter((x) => x === id).length;
      if (i === partie.gagnant) st.victoires++;
      st.jouees += jouees[i as 0 | 1].get(id) ?? 0;
    }
  });
}
lignes.push('', `Cartes Soutien : ${PARTIES_SOUTIENS} parties de plus (${termineesS} terminées, durée moyenne ${dec(dureesS.reduce((x, y) => x + y, 0) / Math.max(1, dureesS.length))} tours), mêmes personnages,`);
lignes.push('6 cartes Soutien tirées au hasard parmi les 20 dans chaque deck. Victoires des decks qui contiennent la carte · part des exemplaires joués par l’IA :');
const typeSoutien = { objet: 'Objet ♦', soutien: 'Soutien ♦♦', terrain: 'Terrain ♦♦♦' };
for (const [id, v] of [...parSoutien].sort((x, y) => taux(y[1]) - taux(x[1]))) {
  const s = bib.soutiens.get(id)!;
  const signal = taux(v) > 0.55 ? '  ▲ plus de 55 %' : taux(v) < 0.45 ? '  ▼ moins de 45 %' : '';
  lignes.push(`  ${s.nom.padEnd(26)} ${typeSoutien[s.type].padEnd(12)} ${pc(v.victoires, v.parties).padStart(8)}  ${String(v.parties).padStart(5)} decks  jouée ${pc(v.jouees, v.exemplaires).padStart(8)}${signal}`);
}

lignes.push('', anomalies.length ? `Parties bloquées ou anormalement longues (plus de ${TOURS_MAX} tours) :` : 'Aucune partie bloquée ni anormale.');
for (const x of anomalies.slice(0, 20)) lignes.push(`  ${x}`);
if (anomalies.length > 20) lignes.push(`  … et ${anomalies.length - 20} autres.`);
console.log(lignes.join('\n'));
if (anomalies.some((x) => !x.includes('tours'))) process.exitCode = 1; // une partie bloquée (erreur, aucune action) est un échec
