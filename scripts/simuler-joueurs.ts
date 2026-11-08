// npm run simuler -- joueurs : simule 500 joueurs de chaque profil sur 365 jours, avec les vraies règles
// (connexion plafonnée, calendrier de bienvenue, quêtes du jour, de débutant et de la semaine, participation
// au draft, boosters garantis, tirage normal par tirage.ts) et affiche les jours médians pour :
// 100 cartes de base, première ♛, et une carte précise de chaque rareté ★★, ★★★ et ♛
// (la première de la liste de l'extension pour cette rareté).
//
// Profils :
// - assidu : joue tous les jours, fait toutes les quêtes du jour (inspecter, cote, probabilités, revente
//   d'un doublon), participe au draft chaque semaine ;
// - occasionnel : joue 3 jours sur 7 en moyenne, ouvre ses boosters et réclame ce qui est fini, sans chercher
//   les quêtes du jour ; participe au draft une semaine sur deux.
// Les deux échangent leurs points en boutique contre la carte de base manquante la moins chère.
import extensionJson from '../src/data/extension-lancement.json';
import boosterJson from '../src/data/booster-lancement.json';
import populariteJson from '../src/data/popularite.json';
import populariteBaseJson from '../src/data/popularite-base.json';
import { lireFichierPopularite, versPopularite, type BasePopularite } from '../src/core/popularite';
import quetesJson from '../src/data/quetes.json';
import type { Booster, Carte, Extension, FinitionId, Popularite, Sauvegarde } from '../src/core/types';
import { FINITIONS, ORDRE_FINITIONS } from '../src/core/regles';
import { rngAGraine, type Rng } from '../src/core/rng';
import { ouvrir } from '../src/core/ouverture';
import { acheter, doublonsRevendables, prixAchat, revendre, soldePoints } from '../src/core/boutique';
import { sauvegardeParDefaut } from '../src/core/sauvegarde';
import { validerDonnees } from '../src/core/validation';
import {
  appliquerConnexion, appliquerEvenements, evenementCarte, evenementsOuverture, lundiLocal, quetesDuJour, reclamer,
  validerConfigQuetes, vueQuetes, type CibleReclamation, type ConfigQuetes, type ContexteQuetes, type Evenement,
} from '../src/core/quetes';

const JOUEURS = 500;
const JOURS = 365;
const extension = extensionJson as unknown as Extension;
const booster = boosterJson as unknown as Booster;
const basePop = populariteBaseJson as BasePopularite;
const luPop = lireFichierPopularite(populariteJson, basePop);
if (!('fichier' in luPop)) throw new Error(luPop.erreurs.join(' '));
const pop: Popularite = versPopularite(luPop.fichier, basePop);
const config = quetesJson as unknown as ConfigQuetes;

const erreurs = [...validerDonnees(extension, booster), ...validerConfigQuetes(config)];
if (erreurs.length > 0) {
  console.error('Données invalides :\n- ' + erreurs.join('\n- '));
  throw new Error('Simulation annulée.');
}

type Profil = 'assidu' | 'occasionnel';
const rang = (f: FinitionId): number => ORDRE_FINITIONS.indexOf(f);
/** Carte précise visée pour une rareté : la première de la liste de l'extension. */
const cartePrecise = (f: FinitionId): Carte => {
  const c = extension.cartes.find((x) => x.finition === f);
  if (!c) throw new Error(`Aucune carte de rareté « ${f} ».`);
  return c;
};
const nomCarte = (c: Carte): string =>
  `${FINITIONS[c.finition].symbole} ${extension.personnages.find((p) => p.id === c.personnage)!.nom} (n° ${c.numero})`;
const CIBLES = (['alternative', 'immersive', 'couronne'] as const).map(cartePrecise);

type Objectif = 'base100' | 'couronne' | `carte:${string}`;
const OBJECTIFS: { id: Objectif; nom: string }[] = [
  { id: 'base100', nom: '100 cartes de base' },
  { id: 'couronne', nom: 'Première ♛' },
  ...CIBLES.map((c) => ({ id: `carte:${c.id}` as Objectif, nom: `Carte ${nomCarte(c)}` })),
];
const cartesBase = extension.cartes.filter((c) => !c.secrete);
const finitionDe = new Map(extension.cartes.map((c) => [c.id, c.finition]));
/** Cartes de base, les moins chères d'abord (achat en boutique). */
const baseParPrix = [...cartesBase].sort((a, b) => prixAchat(a.finition) - prixAchat(b.finition) || a.numero - b.numero);

interface Resultat {
  jours: Partial<Record<Objectif, number>>;
  boostersJour1: number;
  boosters: number;
  joursJoues: number;
}

function simulerJoueur(profil: Profil, graine: number): Resultat {
  const rng: Rng = rngAGraine(`joueur:${profil}:${graine}`);
  const assidu = profil === 'assidu';
  let s: Sauvegarde = sauvegardeParDefaut();
  const resultat: Resultat = { jours: {}, boostersJour1: 0, boosters: 0, joursJoues: 0 };
  let semaineDraft: string | null = null;

  const debut = new Date(2027, 0, 4, 20, 0); // un lundi, 20 h
  for (let j = 0; j < JOURS; j++) {
    const maintenant = new Date(debut.getFullYear(), debut.getMonth(), debut.getDate() + j, 20, 0);
    // L'occasionnel joue 3 jours sur 7 en moyenne (et toujours le premier jour).
    if (!assidu && j > 0 && rng.entier(7) >= 3) continue;
    resultat.joursJoues++;
    const ctx: ContexteQuetes = { config, extensions: [extension], maintenant };
    const evenements = (e: Evenement[]): void => { s = appliquerEvenements(s, e, ctx); };
    s = appliquerConnexion(s, ctx).sauvegarde;

    // Draft : participation, une fois par semaine (quetes.json ; hors podium du classement).
    const semaine = lundiLocal(maintenant);
    if (semaineDraft !== semaine && (assidu || rng.entier(2) === 0)) {
      semaineDraft = semaine;
      s = { ...s, sceaux: s.sceaux + config.hebdomadaire.recompensesDraft.participation };
      evenements([{ type: 'draft-joue' }]);
    }

    const tirageJour = quetesDuJour(jourDe(maintenant), config, [extension]);
    let encore = true;
    let tours = 0;
    while (encore && tours++ < 50) {
      encore = false;
      while (s.sceaux >= booster.cout.quantite) {
        const r = ouvrir(s, booster, extension, rng, maintenant, config.tableGarantie.finitions);
        if (!r.ok) break;
        s = r.sauvegarde;
        evenements(evenementsOuverture(r.ouverture, extension));
        resultat.boosters++;
        if (j === 0) resultat.boostersJour1++;
      }
      // Quêtes faciles : l'assidu les fait toutes ; tout le monde inspecte une carte au moins une fois (débutant).
      if (assidu) {
        const ids = new Set(tirageJour.quetes.map((q) => q.id));
        if (ids.has('inspecter-3')) evenements([{ type: 'carte-inspectee' }, { type: 'carte-inspectee' }, { type: 'carte-inspectee' }]);
        if (ids.has('cote')) evenements([{ type: 'cote-consultee' }]);
        if (ids.has('probabilites')) evenements([{ type: 'probabilites-consultees' }]);
        if (ids.has('revendre') && (s.quetes.progresJour.revendre ?? 0) === 0) {
          const d = doublonsRevendables(s, extension, pop)[0];
          if (d) {
            const r = revendre(s, pop, extension, d.carte.id, 1);
            if (r.ok) { s = r.sauvegarde; evenements([{ type: 'doublon-revendu' }]); }
          }
        }
      }
      if ((s.quetes.cumuls['carte-inspectee'] ?? 0) === 0 && s.historique.length > 0) evenements([{ type: 'carte-inspectee' }]);

      // Boutique : la carte de base manquante la moins chère, tant que les points suffisent.
      for (;;) {
        const manquante = baseParPrix.find((c) => (s.collection[c.id] ?? 0) === 0);
        if (!manquante || soldePoints(s, extension) < prixAchat(manquante.finition)) break;
        const r = acheter(s, extension, manquante.id);
        if (!r.ok) break;
        s = r.sauvegarde;
        evenements([{ type: 'achat-boutique' }, evenementCarte(extension, manquante.id, true)!]);
      }

      // Réclamer tout ce qui est fini ; de nouveaux sceaux relancent la boucle.
      const v = vueQuetes(s, ctx);
      const cibles: CibleReclamation[] = [
        ...(v.bonus.pret && !v.bonus.reclame ? [{ type: 'bonus-jour' as const }] : []),
        ...(v.semaine.faite && !v.semaine.reclamee ? [{ type: 'semaine' as const }] : []),
        ...v.debutant.filter((l) => l.faite && !l.reclamee).map((l) => ({ type: 'debutant' as const, id: l.id })),
      ];
      for (const c of cibles) {
        const r = reclamer(s, c, ctx);
        if (r.ok) { s = r.sauvegarde; encore = true; }
      }
    }

    // Objectifs atteints (jour 1 = premier jour).
    const jour = j + 1;
    const possedees = Object.keys(s.collection);
    const meilleure = Math.max(...possedees.map((id) => rang(finitionDe.get(id)!)), -1);
    if (!resultat.jours.base100 && cartesBase.every((c) => (s.collection[c.id] ?? 0) > 0)) resultat.jours.base100 = jour;
    for (const c of CIBLES) {
      const id: Objectif = `carte:${c.id}`;
      if (!resultat.jours[id] && (s.collection[c.id] ?? 0) > 0) resultat.jours[id] = jour;
    }
    if (!resultat.jours.couronne && meilleure >= rang('couronne')) resultat.jours.couronne = jour;
  }
  return resultat;
}

function jourDe(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Médiane des jours ; un joueur qui n'a pas atteint l'objectif compte comme « au-delà de 365 ». */
function mediane(valeurs: (number | undefined)[]): string {
  const tri = valeurs.map((v) => v ?? Infinity).sort((a, b) => a - b);
  const m = tri[Math.floor((tri.length - 1) / 2)]!;
  return m === Infinity ? `> ${JOURS}` : String(m);
}
const pourcentage = (valeurs: (number | undefined)[]): string => `${Math.round((valeurs.filter((v) => v !== undefined).length / valeurs.length) * 100)} %`;

const debutChrono = performance.now();
console.log(`Simulation : ${JOUEURS} joueurs par profil, ${JOURS} jours (règles de src/data/quetes.json).\n`);
for (const profil of ['assidu', 'occasionnel'] as const) {
  const resultats = Array.from({ length: JOUEURS }, (_, i) => simulerJoueur(profil, i));
  console.log(`Profil ${profil}`);
  const jour1 = resultats.map((r) => r.boostersJour1).sort((a, b) => a - b);
  const moyenne = (xs: number[]): string => (xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1);
  console.log(`  Boosters le premier jour : médiane ${jour1[Math.floor((jour1.length - 1) / 2)]} (de ${jour1[0]} à ${jour1.at(-1)})`);
  console.log(`  Jours joués : ${moyenne(resultats.map((r) => r.joursJoues))} en moyenne · boosters par jour joué : ${moyenne(resultats.map((r) => r.boosters / r.joursJoues))}`);
  console.log(`  ${'Objectif'.padEnd(34)}${'jour médian'.padStart(12)}${'atteint en 1 an'.padStart(18)}`);
  for (const o of OBJECTIFS) {
    const valeurs = resultats.map((r) => r.jours[o.id]);
    console.log(`  ${o.nom.padEnd(34)}${mediane(valeurs).padStart(12)}${pourcentage(valeurs).padStart(18)}`);
  }
  console.log('');
}
console.log(`Durée : ${((performance.now() - debutChrono) / 1000).toFixed(1)} s`);
