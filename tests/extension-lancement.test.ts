import { describe, expect, it } from 'vitest';
import extensionJson from '../src/data/extension-lancement.json';
import type { Extension } from '../src/core/types';
import { validerExtension } from '../src/core/validation';

const extension = extensionJson as unknown as Extension;

describe('extension de lancement (système TCG Pocket)', () => {
  it('100 personnages, chacun avec sa fiche de combat (type, PV, Repli, talent, 1 ou 2 attaques)', () => {
    expect(extension.personnages).toHaveLength(100);
    for (const p of extension.personnages) {
      expect(p.attaques.length, `personnage ${p.id}`).toBeGreaterThanOrEqual(1);
      expect(p.attaques.length, `personnage ${p.id}`).toBeLessThanOrEqual(2);
      expect(['base', 'eveille', 'heros']).toContain(p.type);
    }
  });

  it('140 cartes : 100 de base (001 à 100) puis 40 secrètes (101 à 140)', () => {
    expect(extension.cartes).toHaveLength(140);
    expect(extension.total).toBe(100);
    expect(extension.totalAvecSecretes).toBe(140);
    expect(extension.cartes.filter((c) => !c.secrete).map((c) => c.numero).sort((a, b) => a - b)).toEqual(Array.from({ length: 100 }, (_, i) => i + 1));
    expect(extension.cartes.filter((c) => c.secrete).every((c) => c.numero > 100)).toBe(true);
  });

  it('les cartes secrètes sont ★ et plus', () => {
    for (const c of extension.cartes.filter((x) => x.secrete)) expect(['pleine', 'alternative', 'immersive', 'couronne']).toContain(c.finition);
  });

  it('les données sont valides', () => {
    expect(validerExtension(extension)).toEqual([]);
  });
});
