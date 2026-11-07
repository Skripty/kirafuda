import { describe, expect, it } from 'vitest';
import extensionJson from '../src/data/extension-lancement.json';
import boosterJson from '../src/data/booster-lancement.json';
import type { Booster, Extension, FinitionId, Ouverture } from '../src/core/types';
import { TOTAL_POIDS } from '../src/core/regles';
import { cartesParFinition, filtrerHistorique, formaterApproche, formaterPourcentage, probabilites } from '../src/core/probabilites';

const extension = extensionJson as unknown as Extension;
const booster = boosterJson as unknown as Booster;

/** Relit un pourcentage affiché (« 0,05 % ») en poids sur 100 000, pour comparer au fichier. */
const enPoids = (texte: string): number => {
  const [entier, dec = ''] = texte.replace(' %', '').split(',') as [string, string?];
  return Number(entier) * 1000 + Number(dec.padEnd(3, '0'));
};

describe('pourcentages exacts', () => {
  it('format exact, sans arrondi', () => {
    expect(formaterPourcentage(100_000)).toBe('100 %');
    expect(formaterPourcentage(70_000)).toBe('70 %');
    expect(formaterPourcentage(89_000)).toBe('89 %');
    expect(formaterPourcentage(700)).toBe('0,7 %');
    expect(formaterPourcentage(250)).toBe('0,25 %');
    expect(formaterPourcentage(50)).toBe('0,05 %');
    expect(formaterPourcentage(1)).toBe('0,001 %');
    expect(formaterPourcentage(0)).toBe('0 %');
    expect(formaterPourcentage(99_950)).toBe('99,95 %');
  });

  it('refuse un poids invalide', () => {
    for (const p of [-1, 1.5, 100_001]) expect(() => formaterPourcentage(p)).toThrow(RangeError);
  });

  it('valeur approchée toujours signalée par ≈', () => {
    expect(formaterApproche(25 / 30)).toBe('≈ 0,833 %');
    expect(formaterApproche(1.4)).toBe('≈ 1,4 %');
  });
});

describe('tables lues dans le fichier du booster', () => {
  const p = probabilites(booster, extension);

  it('chaque pourcentage affiché correspond exactement au poids du fichier', () => {
    booster.emplacements.forEach((t, i) => {
      const affichee = p.emplacements[i]!;
      for (const l of affichee.finitions) expect(enPoids(l.pourcentage)).toBe(t.finitions[l.finition]);
      // Rien d'oublié : toutes les entrées non nulles du fichier sont affichées.
      expect(affichee.finitions.length).toBe(Object.values(t.finitions).filter((x) => (x ?? 0) > 0).length);
    });
    for (const l of p.exceptionnelle.finitions) expect(enPoids(l.pourcentage)).toBe(booster.tableExceptionnelle.finitions[l.finition]);
    expect(enPoids(p.tauxExceptionnel)).toBe(booster.tauxExceptionnel);
    expect(enPoids(p.tauxExceptionnel) + enPoids(p.tauxNormal)).toBe(TOTAL_POIDS);
  });

  it('valeurs du booster Lancement', () => {
    expect(p.tauxExceptionnel).toBe('0,05 %');
    expect(p.tauxNormal).toBe('99,95 %');
    expect(p.emplacements.map((t) => t.titre)).toEqual(['Emplacements 1, 2, 3', 'Emplacement 4', 'Emplacement 5']);
    expect(p.emplacements[1]!.finitions.map((l) => `${l.finition} ${l.pourcentage}`)).toEqual([
      'peu-commune 90 %', 'holo 5 %', 'holo-integrale 1,666 %', 'pleine 2,572 %', 'alternative 0,5 %', 'immersive 0,222 %', 'couronne 0,04 %',
    ]);
  });

  it('chance d’une carte précise = poids de la rareté ÷ nombre de cartes de cette rareté', () => {
    const couronne = p.emplacements[2]!.finitions.find((l) => l.finition === 'couronne')!;
    const n = extension.cartes.filter((c) => c.finition === 'couronne').length;
    expect(couronne.cartes).toBe(n);
    expect(couronne.parCarte).toBe(formaterApproche(0.16 / n));
    expect(p.emplacements[0]!.finitions).toEqual([{ finition: 'commune', poids: 100000, pourcentage: '100 %', cartes: 50, parCarte: formaterApproche(100 / 50) }]);
  });
});

describe('historique', () => {
  const ouverture = (id: string, finitions: FinitionId[], vue = true): Ouverture => ({
    id, date: '2026-11-05T20:00:00.000Z', boosterId: 'booster-lancement', exceptionnelle: false, pointsGagnes: 5, vue,
    cartes: finitions.map((f, i) => ({ carteId: `lan-00${i + 1}`, finition: f, emplacement: i + 1, nouveau: true, exemplaires: 1 })),
  });
  const h = [
    ouverture('a', ['commune', 'holo']),
    ouverture('b', ['commune', 'couronne']),
    ouverture('c', ['commune', 'pleine'], false), // pas encore révélée
  ];

  it('de la plus récente à la plus ancienne', () => {
    expect(filtrerHistorique(h, null).map((o) => o.id)).toEqual(['c', 'b', 'a']);
  });

  it('filtre par finition', () => {
    expect(filtrerHistorique(h, 'holo').map((o) => o.id)).toEqual(['a']);
    expect(filtrerHistorique(h, 'commune').map((o) => o.id)).toEqual(['b', 'a']);
    expect(filtrerHistorique(h, 'alternative')).toEqual([]);
  });

  it('un booster pas encore révélé n’est jamais trahi par un filtre ni par les comptes', () => {
    expect(filtrerHistorique(h, 'pleine')).toEqual([]);
    expect(cartesParFinition(h)).toEqual({ commune: 2, 'peu-commune': 0, holo: 1, 'holo-integrale': 0, pleine: 0, alternative: 0, immersive: 0, couronne: 1 });
  });

  it('ne modifie pas l’historique d’origine', () => {
    const copie = structuredClone(h);
    filtrerHistorique(h, null);
    expect(h).toEqual(copie);
  });
});
