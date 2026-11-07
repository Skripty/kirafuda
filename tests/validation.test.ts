import { describe, expect, it } from 'vitest';
import extensionJson from '../src/data/extension-lancement.json';
import boosterJson from '../src/data/booster-lancement.json';
import type { Booster, Extension } from '../src/core/types';
import { validerDonnees } from '../src/core/validation';

// Chaque test part d'une copie fraîche des vraies données, puis y introduit une seule erreur.
const extension = (): Extension => structuredClone(extensionJson) as unknown as Extension;
const booster = (): Booster => structuredClone(boosterJson) as unknown as Booster;

/** Contourne le typage pour simuler une valeur invalide venue du JSON. */
const forcer = <T>(valeur: unknown): T => valeur as T;

describe('validation des données', () => {
  it('accepte les données de lancement telles quelles', () => {
    expect(validerDonnees(extension(), booster())).toEqual([]);
  });

  it('le booster n’a plus de rangs : chaque table ne contient que des finitions', () => {
    const b = booster();
    for (const t of [...b.emplacements, b.tableExceptionnelle]) expect(Object.keys(t).filter((k) => k !== 'emplacements')).toEqual(['finitions']);
  });

  describe('tables de poids : total exact de 100 000', () => {
    it('refuse une table d’emplacement qui ne totalise pas 100 000', () => {
      const b = booster();
      b.emplacements[2]!.finitions.couronne = 159;
      const erreurs = validerDonnees(extension(), b);
      expect(erreurs).toEqual(['Booster, emplacement 5, finitions : les poids totalisent 99 999 au lieu de 100 000.']);
    });

    it('refuse une table exceptionnelle qui ne totalise pas 100 000', () => {
      const b = booster();
      b.tableExceptionnelle.finitions.pleine = 50000;
      expect(validerDonnees(extension(), b)[0]).toMatch(/table exceptionnelle, finitions : les poids totalisent 95 000/);
    });

    it('refuse un poids non entier ou négatif, et une finition inconnue', () => {
      const b = booster();
      b.emplacements[0]!.finitions = forcer({ commune: 99999.5, holo: 0.5 });
      b.emplacements[1]!.finitions = forcer({ 'peu-commune': 100000, secrete: 0 });
      const erreurs = validerDonnees(extension(), b);
      expect(erreurs.some((e) => e.includes('« commune »') && e.includes('entier'))).toBe(true);
      expect(erreurs.some((e) => e.includes('finition « secrete » inconnue'))).toBe(true);
    });
  });

  describe('chaque finition avec un poids non nul a au moins une carte', () => {
    it('refuse une rareté tirable sans aucune carte', () => {
      const e = extension();
      e.cartes.forEach((c) => { if (c.finition === 'couronne') c.finition = 'immersive'; });
      const erreurs = validerDonnees(e, booster());
      expect(erreurs.length).toBeGreaterThan(0);
      expect(erreurs.every((x) => x.includes('« couronne »') && x.includes('aucune carte de cette rareté'))).toBe(true);
    });

    it('accepte une rareté absente si son poids est nul partout', () => {
      const e = extension();
      e.cartes.forEach((c) => { if (c.finition === 'couronne') c.finition = 'immersive'; });
      const b = booster();
      for (const t of [...b.emplacements, b.tableExceptionnelle]) {
        if (t.finitions.couronne) {
          t.finitions.immersive = (t.finitions.immersive ?? 0) + t.finitions.couronne;
          t.finitions.couronne = 0;
        }
      }
      expect(validerDonnees(e, b)).toEqual([]);
    });
  });

  describe('chaque carte référence un personnage existant', () => {
    it('refuse un personnage inconnu', () => {
      const e = extension();
      e.cartes[0]!.personnage = 'per-999';
      const erreurs = validerDonnees(e, booster());
      expect(erreurs).toContain('Carte lan-001 : personnage « per-999 » inconnu.');
    });

    it('chaque personnage a exactement une carte de base', () => {
      const e = extension();
      const secrete = e.cartes.find((c) => c.secrete)!;
      e.cartes = e.cartes.filter((c) => c.secrete || c.personnage !== secrete.personnage).concat();
      const erreurs = validerDonnees(e, booster());
      expect(erreurs.some((x) => x.includes(`Personnage ${secrete.personnage} : 0 carte de base au lieu d’une.`))).toBe(true);
    });
  });

  describe('éléments, rangs et finitions existent dans regles.ts', () => {
    it('refuse un élément inconnu sur un personnage', () => {
      const e = extension();
      e.personnages[0]!.element = forcer('plasma');
      expect(validerDonnees(e, booster())).toEqual(['Personnage per-001 : élément « plasma » inconnu (absent de src/core/regles.ts).']);
    });

    it('refuse un rang inconnu', () => {
      const e = extension();
      e.personnages[0]!.rang = forcer('SS');
      expect(validerDonnees(e, booster())[0]).toMatch(/rang « SS » inconnu/);
    });

    it('refuse une finition inconnue sur une carte', () => {
      const e = extension();
      e.cartes[0]!.finition = forcer('secrete');
      expect(validerDonnees(e, booster())).toContain('Carte lan-001 : finition « secrete » inconnue (absente de src/core/regles.ts).');
    });

    it('refuse un calque d’image inconnu (plus de personnage détouré ni de fond)', () => {
      const e = extension();
      e.cartes.find((c) => c.finition === 'alternative')!.images = forcer({ perso: { zoom: 100, x: 50, y: 50 } });
      expect(validerDonnees(e, booster())[0]).toMatch(/calque d’image « perso » impossible/);
    });
  });

  describe('numéros uniques de 1 à 140', () => {
    it('refuse un numéro en double (et signale le numéro manquant)', () => {
      const e = extension();
      e.cartes[1]!.numero = 1;
      const erreurs = validerDonnees(e, booster());
      expect(erreurs).toContain('Carte lan-002 : numéro 1 déjà utilisé par lan-001.');
      expect(erreurs).toContain('Extension « lancement » : aucune carte ne porte le numéro 2.');
    });

    it('refuse un numéro hors de l’intervalle', () => {
      const e = extension();
      e.cartes.find((c) => c.numero === 140)!.numero = 141;
      expect(validerDonnees(e, booster()).some((x) => x.includes('numéro 141 hors de l\'intervalle 1 à 140'))).toBe(true);
    });

    it('une carte secrète doit avoir un numéro au-delà de 100, une carte de base de 1 à 100', () => {
      const e = extension();
      e.cartes.find((c) => c.numero === 127)!.secrete = false;
      expect(validerDonnees(e, booster()).some((x) => x.includes('une carte de base doit avoir un numéro de 1 à 100'))).toBe(true);
    });

    it('refuse un nombre de cartes différent du total annoncé', () => {
      const e = extension();
      e.cartes = e.cartes.filter((c) => c.numero !== 140);
      const erreurs = validerDonnees(e, booster());
      expect(erreurs).toContain('Extension « lancement » : 139 cartes pour un total annoncé de 140.');
      expect(erreurs).toContain('Extension « lancement » : aucune carte ne porte le numéro 140.');
    });
  });
});
