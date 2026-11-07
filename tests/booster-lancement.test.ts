import { describe, expect, it } from 'vitest';
import boosterJson from '../src/data/booster-lancement.json';
import type { Booster, FinitionId } from '../src/core/types';
import { FINITIONS, ORDRE_FINITIONS, TOTAL_POIDS } from '../src/core/regles';
import { rngAGraine } from '../src/core/rng';

const booster = boosterJson as unknown as Booster;
const table = (emplacement: number) => booster.emplacements.find((t) => t.emplacements.includes(emplacement))!;
const TIRAGES = 1_000_000;

describe('finitions des emplacements 4 et 5 (taux de Pokémon TCG Pocket)', () => {
  it('poids exacts du GDD', () => {
    expect(table(4).finitions).toEqual({ 'peu-commune': 90000, holo: 5000, 'holo-integrale': 1666, pleine: 2572, alternative: 500, immersive: 222, couronne: 40 });
    expect(table(5).finitions).toEqual({ 'peu-commune': 60000, holo: 20000, 'holo-integrale': 6664, pleine: 10288, alternative: 2000, immersive: 888, couronne: 160 });
  });

  it('les deux tables totalisent exactement 100 000', () => {
    for (const e of [4, 5]) {
      expect(Object.values(table(e).finitions).reduce((a, x) => a + (x ?? 0), 0)).toBe(TOTAL_POIDS);
    }
  });

  it('emplacements 1 à 3 et booster exceptionnel inchangés', () => {
    expect(table(1).finitions).toEqual({ commune: 100000 });
    expect(booster.tauxExceptionnel).toBe(50);
    expect(booster.tableExceptionnelle.finitions).toEqual({ pleine: 55000, alternative: 30000, immersive: 12000, couronne: 3000 });
  });

  for (const e of [4, 5]) {
    it(`emplacement ${e} : sur ${TIRAGES.toLocaleString('fr-FR')} tirages (graine fixe), chaque fréquence est à moins de 0,2 point de son poids`, () => {
      const t = table(e).finitions;
      const rng = rngAGraine(`frequences-emplacement-${e}`);
      const comptes = new Map<FinitionId, number>();
      for (let i = 0; i < TIRAGES; i++) {
        const f = rng.ponderer(t);
        comptes.set(f, (comptes.get(f) ?? 0) + 1);
      }
      for (const f of ORDRE_FINITIONS) {
        const attendu = ((t[f] ?? 0) / TOTAL_POIDS) * 100;
        const observe = ((comptes.get(f) ?? 0) / TIRAGES) * 100;
        expect(Math.abs(observe - attendu), `${f} : ${observe.toFixed(3)} % pour ${attendu} %`).toBeLessThan(0.2);
      }
    });
  }
});

describe('finition holo intégrale', () => {
  it('♦♦♦♦, « Holo intégrale », cote ×5, entre holo et pleine, mise en page fenêtre', () => {
    expect(FINITIONS['holo-integrale']).toEqual({ nom: 'Holo intégrale', symbole: '♦♦♦♦', pleineCarte: false, multiplicateurCote: 5 });
    const i = ORDRE_FINITIONS.indexOf('holo-integrale');
    expect(ORDRE_FINITIONS[i - 1]).toBe('holo');
    expect(ORDRE_FINITIONS[i + 1]).toBe('pleine');
  });
});
