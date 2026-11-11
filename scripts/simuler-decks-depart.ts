// Vérifie deux propositions de decks de départ contre les défis, en alternant les sièges.
// Tout est déterministe. Les chiffres portent sur des parties de deux IA gloutonnes.
import { catalogue } from '../src/catalogue';
import { fusionner, toutesLesExtensions } from '../src/core/catalogue';
import { rngAGraine } from '../src/core/rng';
import soutiensJson from '../src/data/soutiens.json';
import { bibliotheque, type CarteSoutien, type Deck, type IdJoueur } from '../src/core/combat/etat';
import { actionsLegales, appliquer, creerPartie, validerDeck } from '../src/core/combat/moteur';
import { deckStandard } from '../src/core/combat/decks';
import { DECKS_DEPART, DEFIS_COMBAT } from '../src/core/combat/defis';
import { iaGloutonne } from '../src/core/combat/ia';

declare const process: { argv: string[]; exitCode?: number };

const PARTIES_PAR_SIEGE = Number(process.argv.find((x) => /^\d+$/.test(x)) ?? 200);
const ANORMALES_MAX = 120;
const bib = bibliotheque(fusionner(toutesLesExtensions(catalogue)).personnages, soutiensJson.soutiens as unknown as CarteSoutien[]);
const propositions = [
  { id: 'depart-a', nom: 'The Boxer', serie: 'The Boxer' },
  { id: 'depart-b', nom: 'Spy x Family', serie: 'Spy x Family' },
] as const;
// Les decks mesurés sont ceux figés dans le jeu (src/core/combat/defis.ts).
const decksCandidats = DECKS_DEPART.map((d) => ({ nom: d.nom, cartes: [...d.cartes], elements: [...d.elements] }));

function jouer(deck0: Deck, deck1: Deck, graine: string): 0 | 1 | null {
  let partie = creerPartie(bib, [deck0, deck1], graine).partie;
  const ias = [iaGloutonne(`${graine}:ia0`), iaGloutonne(`${graine}:ia1`)];
  let actions = 0;
  while (partie.phase !== 'fin') {
    if (++actions > 4000 || partie.tour > ANORMALES_MAX) return null;
    const legales = actionsLegales(partie, bib);
    if (!legales.length) return null;
    const joueur: IdJoueur = partie.phase === 'mise-en-place' ? (partie.joueurs[0].pret ? 1 : 0)
      : partie.phase === 'choix-premier' ? partie.gagnantPiece
        : partie.attente ? partie.attente.joueurs[0]! : partie.joueurActif;
    try { partie = appliquer(partie, ias[joueur]!(partie, bib), bib, { verifier: false }).partie; }
    catch { return null; }
  }
  return partie.gagnant;
}

interface Rapport { parties: number; victoires: number; anomalies: number }
function faceContreFace(a: Deck, b: Deck, graine: string): Rapport {
  const rapport = { parties: 0, victoires: 0, anomalies: 0 };
  for (let i = 0; i < PARTIES_PAR_SIEGE; i++) {
    for (const [deck0, deck1, joueurA] of [[a, b, 0], [b, a, 1]] as const) {
      const gagnant = jouer(deck0, deck1, `${graine}:${i}:${joueurA}`);
      if (gagnant === null) { rapport.anomalies++; continue; }
      rapport.parties++;
      if (gagnant === joueurA) rapport.victoires++;
    }
  }
  return rapport;
}

for (const d of decksCandidats) {
  const erreurs = validerDeck(d, bib);
  if (erreurs.length) throw new Error(erreurs.join('\n'));
}

const nomCarte = (id: string): string => bib.personnages.get(id)?.nom ?? bib.soutiens.get(id)?.nom ?? id;
const taux = (x: Rapport): string => `${(x.victoires / Math.max(1, x.parties) * 100).toFixed(1).replace('.', ',')} %`;
const lignes = [`Simulation des decks de départ · ${PARTIES_PAR_SIEGE * 2} parties par duel, sièges alternés, IA gloutonne, graine fixe.`];
for (let i = 0; i < propositions.length; i++) {
  const p = propositions[i]!; const d = decksCandidats[i]!;
  lignes.push('', `${p.nom} — éléments ${d.elements.join(', ')} — ${d.cartes.length} cartes :`);
  const personnes = new Map<string, number>();
  for (const id of d.cartes) personnes.set(id, (personnes.get(id) ?? 0) + 1);
  for (const [id, n] of personnes) lignes.push(`  ${n} × ${nomCarte(id)}${bib.personnages.has(id) ? ` · ${bib.personnages.get(id)!.serie}` : ''}`);
}

const adversaires = [
  { id: 'les-deux-departs', nom: propositions[1]!.nom, deck: decksCandidats[1]! },
  ...DEFIS_COMBAT.map((defi) => ({ id: defi.id, nom: defi.nom, deck: deckStandard(defi.serie, bib, rngAGraine(`deck-defi:${defi.id}`))! })),
];
lignes.push('', `Taux de victoire du deck ${propositions[0]!.nom} :`);
for (const adversaire of adversaires) {
  const stats = faceContreFace(decksCandidats[0]!, adversaire.deck, `rapport:${adversaire.id}`);
  lignes.push(`  vs ${adversaire.nom.padEnd(25)} ${taux(stats)} (${stats.victoires}/${stats.parties}) · anomalies ${stats.anomalies}`);
}

const tousAdversaires = [
  { id: 'les-deux-departs', nom: propositions[0]!.nom, deck: decksCandidats[0]! },
  ...DEFIS_COMBAT.map((defi) => ({ id: defi.id, nom: defi.nom, deck: deckStandard(defi.serie, bib, rngAGraine(`deck-defi:${defi.id}`))! })),
];
lignes.push('', `Taux de victoire du deck ${propositions[1]!.nom} :`);
for (const adversaire of tousAdversaires) {
  const stats = faceContreFace(decksCandidats[1]!, adversaire.deck, `rapport:${adversaire.id}`);
  lignes.push(`  vs ${adversaire.nom.padEnd(25)} ${taux(stats)} (${stats.victoires}/${stats.parties}) · anomalies ${stats.anomalies}`);
}
console.log(lignes.join('\n'));
if (PARTIES_PAR_SIEGE < 1) process.exitCode = 1;
