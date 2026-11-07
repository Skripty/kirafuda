import { describe, expect, it } from 'vitest';
import type { Sauvegarde } from '../src/core/types';
import {appliquerRecompenseQuotidienne, jourLocal, delaiAvantRecompense, formaterDelai, prochaineRecompense, progressionJournee } from '../src/core/economie';
import { sauvegardeParDefaut } from '../src/core/sauvegarde';

const avec = (sceaux: number, derniere: string | null): Sauvegarde => ({
  ...sauvegardeParDefaut(),
  sceaux,
  derniereRecompenseQuotidienne: derniere,
});

describe('récompense quotidienne', () => {
  it('tout premier lancement : +2 sceaux et la journée est marquée', () => {
    const r = appliquerRecompenseQuotidienne(avec(0, null), '2026-11-05');
    expect(r.nouvelleJournee).toBe(true);
    expect(r.sceauxGagnes).toBe(2);
    expect(r.sauvegarde.sceaux).toBe(2);
    expect(r.sauvegarde.derniereRecompenseQuotidienne).toBe('2026-11-05');
  });

  it('deuxième lancement le même jour : rien, et la sauvegarde d’origine est renvoyée', () => {
    const s = avec(2, '2026-11-05');
    const r = appliquerRecompenseQuotidienne(s, '2026-11-05');
    expect(r).toEqual({ sauvegarde: s, nouvelleJournee: false, sceauxGagnes: 0 });
    expect(r.sauvegarde).toBe(s);
  });

  it('nouvelle journée : +2, même après plusieurs jours d’absence (pas de cumul)', () => {
    expect(appliquerRecompenseQuotidienne(avec(3, '2026-11-05'), '2026-11-06').sauvegarde.sceaux).toBe(5);
    expect(appliquerRecompenseQuotidienne(avec(3, '2026-10-01'), '2026-11-06').sauvegarde.sceaux).toBe(5);
  });

  it('plafond de 10 : on complète jusqu’à 10 seulement', () => {
    expect(appliquerRecompenseQuotidienne(avec(8, '2026-11-04'), '2026-11-05').sauvegarde.sceaux).toBe(10);
    const r = appliquerRecompenseQuotidienne(avec(9, '2026-11-04'), '2026-11-05');
    expect(r.sceauxGagnes).toBe(1);
    expect(r.sauvegarde.sceaux).toBe(10);
  });

  it('au plafond ou au-dessus : 0 sceau, stock inchangé, mais la journée est marquée', () => {
    for (const sceaux of [10, 14]) {
      const r = appliquerRecompenseQuotidienne(avec(sceaux, '2026-11-04'), '2026-11-05');
      expect(r.nouvelleJournee).toBe(true);
      expect(r.sceauxGagnes).toBe(0);
      expect(r.sauvegarde.sceaux).toBe(sceaux);
      expect(r.sauvegarde.derniereRecompenseQuotidienne).toBe('2026-11-05');
    }
  });

  it('horloge reculée : aucun sceau', () => {
    const r = appliquerRecompenseQuotidienne(avec(1, '2026-11-05'), '2026-11-04');
    expect(r.nouvelleJournee).toBe(false);
    expect(r.sauvegarde.sceaux).toBe(1);
  });

  it('ne modifie pas la sauvegarde d’origine', () => {
    const s = avec(0, null);
    appliquerRecompenseQuotidienne(s, '2026-11-05');
    expect(s).toEqual(avec(0, null));
  });
});

describe('jourLocal', () => {
  it('donne le jour local au format AAAA-MM-JJ', () => {
    expect(jourLocal(new Date(2026, 0, 3, 0, 0, 1))).toBe('2026-01-03');
    expect(jourLocal(new Date(2026, 11, 31, 23, 59, 59))).toBe('2026-12-31');
  });
});

describe('prochaine récompense (accueil)', () => {
  it('délai jusqu’à minuit, heure locale', () => {
    expect(delaiAvantRecompense(new Date(2026, 10, 6, 16, 48, 0))).toBe((7 * 60 + 12) * 60_000);
    expect(delaiAvantRecompense(new Date(2026, 10, 6, 23, 59, 30))).toBe(30_000);
  });

  it('part de la journée écoulée', () => {
    expect(progressionJournee(new Date(2026, 10, 6, 0, 0, 0))).toBe(0);
    expect(progressionJournee(new Date(2026, 10, 6, 12, 0, 0))).toBeCloseTo(0.5, 5);
  });

  it('sceaux de la prochaine récompense, plafond compris', () => {
    expect([0, 7, 8, 9, 10, 14].map(prochaineRecompense)).toEqual([2, 2, 2, 1, 0, 0]);
  });

  it('durée lisible', () => {
    expect(formaterDelai((7 * 60 + 12) * 60_000)).toBe('7 h 12');
    expect(formaterDelai(45 * 60_000)).toBe('45 min');
    expect(formaterDelai(30_000)).toBe('1 min');
  });
});
