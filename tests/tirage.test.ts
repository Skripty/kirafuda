import { describe, expect, it } from 'vitest';
import extensionJson from '../src/data/extension-lancement.json';
import boosterJson from '../src/data/booster-lancement.json';
import type { Booster, Extension } from '../src/core/types';
import { rngAGraine } from '../src/core/rng';
import { tirerBooster } from '../src/core/tirage';

const extension = extensionJson as unknown as Extension;
const booster = boosterJson as unknown as Booster;
const carteParId = new Map(extension.cartes.map((c) => [c.id, c]));

/** Booster dont le taux exceptionnel est forcé (0 = jamais, 100 000 = toujours). */
const avecTaux = (tauxExceptionnel: number): Booster => ({ ...booster, tauxExceptionnel });

describe('tirerBooster (rareté, puis carte de cette rareté)', () => {
  it('renvoie 5 cartes, emplacements 1 à 5, toutes existantes, avec la rareté de la carte', () => {
    const { cartes } = tirerBooster(booster, extension, rngAGraine('tirage'));
    expect(cartes).toHaveLength(5);
    expect(cartes.map((c) => c.emplacement)).toEqual([1, 2, 3, 4, 5]);
    for (const c of cartes) {
      expect(carteParId.has(c.carteId)).toBe(true);
      expect(c.finition).toBe(carteParId.get(c.carteId)!.finition);
    }
  });

  it('même graine = même booster', () => {
    const a = rngAGraine(123);
    const b = rngAGraine(123);
    for (let i = 0; i < 50; i++) expect(tirerBooster(booster, extension, a)).toEqual(tirerBooster(booster, extension, b));
  });

  it('résultat figé pour la graine « kirafuda »', () => {
    // Si ce test change, l'ordre des tirages a changé : à vérifier avant d'accepter (npx vitest -u).
    expect(tirerBooster(booster, extension, rngAGraine('kirafuda'))).toMatchSnapshot();
  });

  it('chaque carte tirée a une rareté autorisée par la table de son emplacement', () => {
    const rng = rngAGraine('respect-des-tables');
    const b = avecTaux(0);
    for (let i = 0; i < 2000; i++) {
      const { exceptionnel, cartes } = tirerBooster(b, extension, rng);
      expect(exceptionnel).toBe(false);
      for (const c of cartes) {
        const table = b.emplacements.find((t) => t.emplacements.includes(c.emplacement))!;
        expect(table.finitions[c.finition] ?? 0).toBeGreaterThan(0);
      }
      // Emplacements 1 à 3 : toujours une carte commune (donc jamais une secrète).
      for (const c of cartes.slice(0, 3)) {
        expect(c.finition).toBe('commune');
        expect(carteParId.get(c.carteId)!.secrete).toBe(false);
      }
    }
  });

  it('booster exceptionnel : toutes les cartes sont ★ et plus (table exceptionnelle)', () => {
    const rng = rngAGraine('exceptionnel');
    const b = avecTaux(100_000);
    for (let i = 0; i < 500; i++) {
      const { exceptionnel, cartes } = tirerBooster(b, extension, rng);
      expect(exceptionnel).toBe(true);
      for (const c of cartes) expect(b.tableExceptionnelle.finitions[c.finition] ?? 0).toBeGreaterThan(0);
    }
  });

  it('taux exceptionnel de 0,05 % : environ 1 booster sur 2 000', () => {
    const rng = rngAGraine('taux-exceptionnel');
    let n = 0;
    for (let i = 0; i < 100_000; i++) if (tirerBooster(booster, extension, rng).exceptionnel) n++;
    expect(n).toBeGreaterThan(20);
    expect(n).toBeLessThan(80);
  });

  it('tire les cartes d’une même rareté à poids égaux', () => {
    // Booster où tous les emplacements tirent la rareté ★★★ (3 cartes immersives), 100 000 cartes tirées.
    const b: Booster = { ...avecTaux(0), emplacements: [{ emplacements: [1, 2, 3, 4, 5], finitions: { immersive: 100_000 } }] };
    const rng = rngAGraine('poids-egaux');
    const comptes = new Map<string, number>();
    for (let i = 0; i < 20_000; i++) {
      for (const c of tirerBooster(b, extension, rng).cartes) comptes.set(c.carteId, (comptes.get(c.carteId) ?? 0) + 1);
    }
    const immersives = extension.cartes.filter((c) => c.finition === 'immersive');
    expect(comptes.size).toBe(immersives.length);
    const attendu = 100_000 / immersives.length;
    for (const n of comptes.values()) expect(Math.abs(n - attendu) / attendu).toBeLessThan(0.03);
  });

  it('aucun tirage de rang : le rang du personnage n’influence pas le tirage', () => {
    // Toutes les communes ont la même chance, quel que soit le rang de leur personnage.
    const b: Booster = { ...avecTaux(0), emplacements: [{ emplacements: [1, 2, 3, 4, 5], finitions: { commune: 100_000 } }] };
    const rng = rngAGraine('sans-rang');
    const comptes = new Map<string, number>();
    for (let i = 0; i < 20_000; i++) for (const c of tirerBooster(b, extension, rng).cartes) comptes.set(c.carteId, (comptes.get(c.carteId) ?? 0) + 1);
    const n = extension.cartes.filter((c) => c.finition === 'commune').length;
    for (const v of comptes.values()) expect(Math.abs(v - 100_000 / n) / (100_000 / n)).toBeLessThan(0.08);
  });

  it('signale clairement un emplacement sans table', () => {
    const b: Booster = { ...avecTaux(0), emplacements: booster.emplacements.slice(0, 2) };
    expect(() => tirerBooster(b, extension, rngAGraine(1))).toThrow(/emplacement 5/);
  });
});
