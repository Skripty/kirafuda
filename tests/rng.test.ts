import { describe, expect, it } from 'vitest';
import boosterJson from '../src/data/booster-lancement.json';
import type { Booster, FinitionId, Rang, TablePoids } from '../src/core/types';
import { rngAGraine, rngSecurise, type Rng } from '../src/core/rng';
import { TOTAL_POIDS } from '../src/core/regles';

const booster = boosterJson as unknown as Booster;

const suite = (rng: Rng, n: number, longueur: number): number[] =>
  Array.from({ length: longueur }, () => rng.entier(n));

/** Tire `tirages` fois et renvoie l'écart maximal, en points de pourcentage, entre fréquence observée et poids. */
function ecartMaximal<K extends string>(rng: Rng, table: TablePoids<K>, tirages: number): number {
  const comptes = new Map<K, number>();
  for (let i = 0; i < tirages; i++) {
    const cle = rng.ponderer(table);
    comptes.set(cle, (comptes.get(cle) ?? 0) + 1);
  }
  let ecart = 0;
  for (const [cle, poids] of Object.entries(table) as [K, number][]) {
    const attendu = (poids / TOTAL_POIDS) * 100;
    const observe = ((comptes.get(cle) ?? 0) / tirages) * 100;
    ecart = Math.max(ecart, Math.abs(observe - attendu));
  }
  return ecart;
}

describe('rng à graine', () => {
  it('même graine numérique = mêmes résultats', () => {
    expect(suite(rngAGraine(42), 1000, 200)).toEqual(suite(rngAGraine(42), 1000, 200));
  });

  it('même graine texte = mêmes résultats, y compris pour les tirages pondérés', () => {
    const table = booster.emplacements[2]!.finitions;
    const a = rngAGraine('draft-2026-S45');
    const b = rngAGraine('draft-2026-S45');
    for (let i = 0; i < 200; i++) expect(a.ponderer(table)).toBe(b.ponderer(table));
  });

  it('graines différentes = suites différentes', () => {
    expect(suite(rngAGraine(1), 1_000_000, 20)).not.toEqual(suite(rngAGraine(2), 1_000_000, 20));
    expect(suite(rngAGraine('a'), 1_000_000, 20)).not.toEqual(suite(rngAGraine('b'), 1_000_000, 20));
  });

  it('suite figée : la graine 2026 donne toujours les mêmes valeurs', () => {
    // Protège le draft : si l'algorithme change, les drafts passés ne seraient plus reproductibles.
    expect(suite(rngAGraine(2026), 100_000, 5)).toMatchSnapshot();
  });
});

describe('entier(n)', () => {
  it('reste dans [0, n[ et atteint toutes les valeurs', () => {
    for (const rng of [rngAGraine(7), rngSecurise()]) {
      const vus = new Set<number>();
      for (let i = 0; i < 10_000; i++) {
        const x = rng.entier(6);
        expect(Number.isInteger(x) && x >= 0 && x < 6).toBe(true);
        vus.add(x);
      }
      expect(vus.size).toBe(6);
    }
  });

  it('entier(1) vaut toujours 0', () => {
    expect(suite(rngSecurise(), 1, 50).every((x) => x === 0)).toBe(true);
  });

  it('refuse un n invalide', () => {
    const rng = rngAGraine(1);
    for (const n of [0, -3, 2.5, Number.NaN, 2 ** 32 + 1]) {
      expect(() => rng.entier(n)).toThrow(RangeError);
    }
  });
});

describe('ponderer(table)', () => {
  it('refuse une table qui ne totalise pas 100 000', () => {
    expect(() => rngAGraine(1).ponderer<Rang>({ C: 60000, B: 30000 })).toThrow(/90000/);
  });

  it('refuse un poids négatif ou non entier', () => {
    expect(() => rngAGraine(1).ponderer<Rang>({ C: 100001, B: -1 })).toThrow(RangeError);
    expect(() => rngAGraine(1).ponderer<Rang>({ C: 99999.5, B: 0.5 })).toThrow(RangeError);
  });

  it("ne tire jamais une clé de poids nul", () => {
    const rng = rngAGraine(3);
    for (let i = 0; i < 10_000; i++) expect(rng.ponderer<Rang>({ C: 0, B: 100000, S: 0 })).toBe('B');
  });

  it('tire une clé de poids 1 (0,001 %) environ une fois sur 100 000', () => {
    const rng = rngAGraine(11);
    let rares = 0;
    for (let i = 0; i < 1_000_000; i++) if (rng.ponderer<Rang>({ C: 99999, S: 1 }) === 'S') rares++;
    expect(rares).toBeGreaterThan(0);
    expect(rares).toBeLessThan(30);
  });
});

describe('fréquences sur 1 000 000 de tirages : écart < 0,2 point', () => {
  const tables: [string, TablePoids<Rang | FinitionId>][] = [
    ['finitions, emplacement 4', booster.emplacements[1]!.finitions],
    ['finitions, emplacement 5', booster.emplacements[2]!.finitions],
  ];

  for (const [nom, table] of tables) {
    it(`mode à graine — ${nom}`, () => {
      expect(ecartMaximal(rngAGraine(nom), table, 1_000_000)).toBeLessThan(0.2);
    });
    it(`mode sécurisé — ${nom}`, () => {
      expect(ecartMaximal(rngSecurise(), table, 1_000_000)).toBeLessThan(0.2);
    });
  }
});

describe('aucun Math.random dans src/core', () => {
  it('aucun fichier de src/core ne l’utilise', () => {
    const sources = import.meta.glob('../src/core/**/*.ts', { query: '?raw', import: 'default', eager: true });
    expect(Object.keys(sources).length).toBeGreaterThan(0);
    const fautifs = Object.entries(sources)
      .filter(([, code]) => /Math\s*\.\s*random/.test(code as string))
      .map(([chemin]) => chemin);
    expect(fautifs).toEqual([]);
  });
});
