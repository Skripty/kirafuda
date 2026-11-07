import { describe, expect, it } from 'vitest';
import extensionJson from '../src/data/extension-lancement.json';
import boosterJson from '../src/data/booster-lancement.json';
import themesJson from '../src/data/themes-draft.json';
import type { Booster, ElementId, Extension, Personnage, Rang } from '../src/core/types';
import { rngAGraine } from '../src/core/rng';
import { tirerBooster } from '../src/core/tirage';
import { indexer } from '../src/core/extension';
import { assembler } from '../src/core/catalogue';
import { catalogue } from '../src/catalogue';
import {
  ADVERSAIRES, BAREME, SEMAINE_DEBUT_SAC, SEUIL_ELIGIBILITE, THEMES_AVANT_SAC,
  correspondAuTheme, estCritereEquipe, genererDraft, lundiSemaineIso, progressionEquipe, scorer, semaineIso,
  signaleParCarte, themeEligible, themesDesSemaines, validerThemes, type SourceDraft, type Theme,
} from '../src/core/draft';

const lancement: SourceDraft = { extension: extensionJson as unknown as Extension, booster: boosterJson as unknown as Booster };
/** Lancement avec ses deux vagues (Renforts compris) : un seul booster. */
const toutes: SourceDraft = { extension: assembler(catalogue[0]!), booster: lancement.booster };
const themes = themesJson.themes as Theme[];
const theme = (id: string): Theme => themes.find((t) => t.id === id)!;
const perso = (id: string, element: ElementId, serie: string, rang: Rang = 'C'): Personnage => ({
  id, nom: id, serie, rang, element, pv: 100,
  attaques: [{ nom: 'a', cout: 1, degats: 20, effet: null }, { nom: 'b', cout: 2, degats: 80, effet: null }],
});
const themeDuJour = (sem: string): string => genererDraft(sem, [lancement], themes).theme.id;
/** Semaines successives à partir de SEMAINE_DEBUT_SAC. */
const semaines = (n: number): string[] =>
  Array.from({ length: n }, (_, i) => semaineIso(new Date(lundiSemaineIso(SEMAINE_DEBUT_SAC).getTime() + i * 7 * 86_400_000)));

describe('themes-draft.json', () => {
  it('15 thèmes valides (séries de toutes les extensions), dont 3 critères d’équipe', () => {
    expect(validerThemes(themes, toutes.extension)).toEqual([]);
    expect(themes).toHaveLength(15);
    expect(themes.filter((t) => estCritereEquipe(t.critere)).map((t) => t.id)).toEqual(['sans-tete-affiche', 'arc-en-ciel', 'duos']);
  });

  it('critères d’équipe mal écrits : erreurs claires', () => {
    const mauvais: Theme[] = [
      { id: 'a', nom: 'A', description: 'x', critere: { type: 'rang-max', valeur: 'Z' as Rang } },
      { id: 'b', nom: 'B', description: 'x', critere: { type: 'elements-differents-min', valeur: 6 } },
      { id: 'c', nom: 'C', description: 'x', critere: { type: 'paires-serie-min', valeur: 3 } },
    ];
    expect(validerThemes(mauvais, lancement.extension)).toEqual([
      'Thème du draft 1 (« a ») : rang inconnu « Z » (C, B, A, S).',
      'Thème du draft 2 (« b ») : nombre d\'éléments de 1 à 5 attendu.',
      'Thème du draft 3 (« c ») : nombre de paires de 1 à 2 attendu.',
    ]);
  });
});

describe('critères d’équipe (sur les 5 cartes gardées)', () => {
  it('rang-max : aucun personnage au-dessus du rang ; chaque carte se signale', () => {
    const t = theme('sans-tete-affiche'); // rang B maximum
    const bonne = [perso('1', 'feu', 'X', 'C'), perso('2', 'eau', 'Y', 'B'), perso('3', 'vent', 'Z', 'B'), perso('4', 'terre', 'W', 'C'), perso('5', 'glace', 'V', 'C')];
    expect(progressionEquipe(bonne, t)).toMatchObject({ respecte: true, texte: 'Aucun personnage au-dessus du rang B' });
    const avecA = [...bonne.slice(0, 3), perso('6', 'feu', 'U', 'A'), perso('7', 'eau', 'T', 'S')];
    expect(progressionEquipe(avecA, t)).toMatchObject({ respecte: false, valeur: 2, texte: '2 personnages au-dessus du rang B' });
    expect(signaleParCarte(t)).toBe(true);
    expect([correspondAuTheme(perso('x', 'feu', 'X', 'B'), t), correspondAuTheme(perso('y', 'feu', 'X', 'A'), t)]).toEqual([true, false]);
  });

  it('elements-differents-min : « 3 éléments sur 5 » ; ne se signale pas carte par carte', () => {
    const t = theme('arc-en-ciel');
    const trois = [perso('1', 'feu', 'X'), perso('2', 'feu', 'Y'), perso('3', 'eau', 'Z'), perso('4', 'vent', 'W'), perso('5', 'eau', 'V')];
    expect(progressionEquipe(trois, t)).toMatchObject({ valeur: 3, objectif: 5, respecte: false, texte: '3 éléments sur 5' });
    const cinq = [perso('1', 'feu', 'X'), perso('2', 'eau', 'Y'), perso('3', 'vent', 'Z'), perso('4', 'terre', 'W'), perso('5', 'neutre', 'V')];
    expect(progressionEquipe(cinq, t)).toMatchObject({ valeur: 5, respecte: true });
    expect(signaleParCarte(t)).toBe(false);
  });

  it('paires-serie-min : paires de personnages d’une même série (3 d’une série = 1 paire)', () => {
    const t = theme('duos');
    const deuxPaires = [perso('1', 'feu', 'X'), perso('2', 'eau', 'X'), perso('3', 'vent', 'Y'), perso('4', 'terre', 'Y'), perso('5', 'glace', 'Z')];
    expect(progressionEquipe(deuxPaires, t)).toMatchObject({ valeur: 2, respecte: true, texte: '2 paires sur 2' });
    const trois = [perso('1', 'feu', 'X'), perso('2', 'eau', 'X'), perso('3', 'vent', 'X'), perso('4', 'terre', 'Y'), perso('5', 'glace', 'Z')];
    expect(progressionEquipe(trois, t)).toMatchObject({ valeur: 1, respecte: false, texte: '1 paire sur 2' });
  });

  it('dans le détail du score : +95 si respecté, ligne à 0 sinon ; les autres catégories ne changent pas', () => {
    const t = theme('arc-en-ciel');
    const cinq = [perso('1', 'feu', 'X'), perso('2', 'eau', 'Y'), perso('3', 'vent', 'Z'), perso('4', 'terre', 'W'), perso('5', 'neutre', 'V')];
    const ligne = (eq: Personnage[]) => scorer(eq, t, 'feu').lignes.filter((l) => l.categorie === 'Thème');
    expect(ligne(cinq)).toEqual([{ categorie: 'Thème', libelle: 'Thème « Arc-en-ciel » respecté : 5 éléments sur 5', points: BAREME.critereEquipeRespecte }]);
    expect(ligne(cinq.slice(0, 3))).toEqual([{ categorie: 'Thème', libelle: 'Thème « Arc-en-ciel » pas encore respecté : 3 éléments sur 5', points: 0 }]);
    expect(ligne([])).toEqual([]);
    expect(BAREME.critereEquipeRespecte).toBe(5 * BAREME.parCarteDuTheme + BAREME.equipeEntiereDuTheme);
  });
});

describe('éligibilité d’un thème pour le draft de la semaine', () => {
  const feu = (i: number): Personnage => perso(`f${i}`, 'feu', 'X');
  const eau = (i: number): Personnage => perso(`e${i}`, 'eau', 'X');
  const t = theme('orage-de-feu'); // Feu ou Foudre

  it(`critère par carte : au moins ${SEUIL_ELIGIBILITE * 100} % des personnages du draft`, () => {
    // 2 sur 15 = 13 % : non ; 3 sur 15 = 20 % : oui.
    expect(themeEligible(t, [feu(1), feu(2), ...Array.from({ length: 13 }, (_, i) => eau(i))])).toBe(false);
    expect(themeEligible(t, [feu(1), feu(2), feu(3), ...Array.from({ length: 12 }, (_, i) => eau(i))])).toBe(true);
  });

  it('les personnages en double ne comptent qu’une fois', () => {
    const doublons = [feu(1), feu(1), feu(1), ...Array.from({ length: 12 }, (_, i) => eau(i))]; // 1 sur 13 différents
    expect(themeEligible(t, doublons)).toBe(false);
  });

  it('critère d’équipe : toujours éligible', () => {
    for (const id of ['sans-tete-affiche', 'arc-en-ciel', 'duos']) expect(themeEligible(theme(id), [eau(1)])).toBe(true);
  });

  it('chaque thème tiré était éligible pour le draft de sa semaine (2 ans)', () => {
    const tires = themesDesSemaines(semaines(104).at(-1)!, [toutes], themes);
    for (const [sem, th] of tires) {
      const d = genererDraft(sem, [toutes], themes);
      const index = indexer(toutes.extension);
      const persos = d.cartes.map((c) => index.personnageDe(index.carte(c.carteId)!));
      expect(themeEligible(th, persos), `${sem} : ${th.id}`).toBe(true);
    }
  });
});

describe('tirage du thème en sac', () => {
  it('jamais deux semaines de suite, y compris au passage d’un cycle à l’autre et depuis l’ancien tirage', () => {
    const liste = [themeDuJour('2026-S45'), ...semaines(104).map(themeDuJour)];
    for (let i = 1; i < liste.length; i++) expect(liste[i], `semaine ${i}`).not.toBe(liste[i - 1]);
  });

  it('chaque thème revient une fois avant qu’un autre ne se répète (thèmes toujours éligibles)', () => {
    // 7 thèmes d'équipe, toujours éligibles : chaque cycle de 7 semaines est une permutation des 7.
    const equipe: Theme[] = Array.from({ length: 7 }, (_, i) => ({ id: `e${i}`, nom: `E${i}`, description: '', critere: { type: 'elements-differents-min', valeur: 2 } }));
    const tires = [...themesDesSemaines(semaines(28).at(-1)!, [lancement], equipe).values()].map((x) => x.id);
    for (let c = 0; c < 4; c++) expect(new Set(tires.slice(c * 7, c * 7 + 7)).size).toBe(7);
    for (let i = 1; i < tires.length; i++) expect(tires[i]).not.toBe(tires[i - 1]);
  });

  it('les mêmes thèmes pour tous : même graine, même suite', () => {
    const a = [...themesDesSemaines(semaines(30).at(-1)!, [lancement], themes).values()].map((x) => x.id);
    const b = [...themesDesSemaines(semaines(30).at(-1)!, [structuredClone(lancement)], structuredClone(themes)).values()].map((x) => x.id);
    expect(b).toEqual(a);
  });

  it('un thème rarement éligible ne bloque pas le cycle (on passe au cycle suivant)', () => {
    const introuvable: Theme = { id: 'rare', nom: 'Rare', description: '', critere: { type: 'pv-min', valeur: 10_000 } };
    const tires = [...themesDesSemaines(semaines(20).at(-1)!, [lancement], [...themes.slice(10), introuvable]).values()].map((x) => x.id);
    expect(tires).toHaveLength(20);
    expect(tires).not.toContain('rare');
  });
});

describe('le draft d’une semaine déjà commencée ne change pas', () => {
  it(`jusqu’à la semaine d’avant ${SEMAINE_DEBUT_SAC} : exactement l’ancien tirage (thème parmi les ${THEMES_AVANT_SAC} premiers, adversaire, cartes)`, () => {
    for (const sem of ['2026-S44', '2026-S45']) {
      const rng = rngAGraine(`draft:lancement:${sem}`);
      const ancienTheme = themes[rng.entier(THEMES_AVANT_SAC)]!;
      const ancienAdversaire = ADVERSAIRES[rng.entier(ADVERSAIRES.length)]!;
      const ancienneCartes = [0, 1, 2].flatMap(() => tirerBooster(lancement.booster, lancement.extension, rng).cartes);
      const d = genererDraft(sem, [lancement], themes);
      expect([d.theme.id, d.adversaire, d.cartes]).toEqual([ancienTheme.id, ancienAdversaire, ancienneCartes]);
    }
  });

  it('le thème d’une semaine ne dépend pas des semaines à venir (rejoué depuis le début du sac)', () => {
    const s50 = semaines(5).at(-1)!;
    expect(themesDesSemaines(s50, [lancement], themes).get(s50)).toEqual(themesDesSemaines(semaines(40).at(-1)!, [lancement], themes).get(s50));
  });

  it('lundi d’une semaine ISO (temps universel)', () => {
    expect(lundiSemaineIso('2026-S46').toISOString()).toBe('2026-11-09T00:00:00.000Z');
    expect(lundiSemaineIso('2026-S01').toISOString()).toBe('2025-12-29T00:00:00.000Z');
    expect(semaineIso(lundiSemaineIso('2026-S53'))).toBe('2026-S53');
  });
});
