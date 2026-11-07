import { describe, expect, it } from 'vitest';
import extensionJson from '../src/data/extension-lancement.json';
import boosterJson from '../src/data/booster-lancement.json';
import type { Booster, Extension, Sauvegarde } from '../src/core/types';
import { FILTRES_VIDES, completion, completionParRarete, entreesCollection, filtrer, series, versions } from '../src/core/collection';
import { sauvegardeParDefaut } from '../src/core/sauvegarde';
import { ouvrir } from '../src/core/ouverture';
import { rngAGraine } from '../src/core/rng';

const extension = extensionJson as unknown as Extension;
const booster = boosterJson as unknown as Booster;
const avec = (collection: Record<string, number>): Sauvegarde => ({ ...sauvegardeParDefaut(), collection });

describe('entrées de la collection (140 emplacements)', () => {
  it('une entrée par carte : les 100 de base, puis les 40 secrètes', () => {
    const e = entreesCollection(sauvegardeParDefaut(), extension);
    expect(e).toHaveLength(140);
    expect(e.map((x) => x.carte.numero)).toEqual(Array.from({ length: 140 }, (_, i) => i + 1));
    expect(e.slice(0, 100).every((x) => !x.carte.secrete)).toBe(true);
    expect(e.slice(100).every((x) => x.carte.secrete)).toBe(true);
    expect(e.every((x) => x.exemplaires === 0)).toBe(true);
  });

  it('compte les exemplaires par id de carte, avec le personnage de la carte', () => {
    const e = entreesCollection(avec({ 'lan-001': 3, 'lan-125': 1 }), extension);
    const luffy = e.find((x) => x.carte.id === 'lan-001')!;
    expect(luffy.exemplaires).toBe(3);
    expect(luffy.personnage.nom).toBe('Monkey D. Luffy');
    expect(e.find((x) => x.carte.id === 'lan-125')!.exemplaires).toBe(1);
  });

  it('versions : toutes les cartes du même personnage', () => {
    const e = entreesCollection(sauvegardeParDefaut(), extension);
    expect(versions(e.find((x) => x.carte.id === 'lan-001')!, e).map((x) => x.carte.id)).toEqual(['lan-001', 'lan-125', 'lan-135']);
  });

  it('ignore les clés de cartes absentes de l’extension', () => {
    const e = entreesCollection(avec({ 'lan-999': 4 }), extension);
    expect(e.reduce((a, x) => a + x.exemplaires, 0)).toBe(0);
  });

  it('reflète exactement la sauvegarde après des ouvertures réelles', () => {
    const rng = rngAGraine('collection');
    let s: Sauvegarde = { ...sauvegardeParDefaut(), sceaux: 30 };
    for (let i = 0; i < 30; i++) {
      const r = ouvrir(s, booster, extension, rng);
      if (!r.ok) throw new Error('refusée');
      s = r.sauvegarde;
    }
    const total = entreesCollection(s, extension).reduce((a, x) => a + x.exemplaires, 0);
    expect(total).toBe(150);
    expect(total).toBe(Object.values(s.collection).reduce((a, b) => a + b, 0));
  });
});

describe('complétion', () => {
  it('compte les cartes possédées, au total, en base et en secrètes', () => {
    const c = completion(entreesCollection(avec({ 'lan-001': 2, 'lan-002': 1, 'lan-125': 1 }), extension));
    expect(c).toEqual({ possedees: 3, total: 140, base: { possedees: 2, total: 100 }, secretes: { possedees: 1, total: 40 } });
  });
});

describe('filtres', () => {
  const toutes = entreesCollection(avec({ 'lan-001': 1, 'lan-002': 2, 'lan-125': 1 }), extension);
  const ids = (f: Partial<typeof FILTRES_VIDES>) => filtrer(toutes, { ...FILTRES_VIDES, ...f }).map((e) => e.carte.id);

  it('sans filtre : les 140 cartes, possédées ou non', () => {
    expect(ids({})).toHaveLength(140);
  });

  it('par série et par élément (ceux du personnage)', () => {
    const one = ids({ serie: 'One Piece' });
    expect(one).toContain('lan-125'); // carte secrète de Luffy
    expect(filtrer(toutes, { ...FILTRES_VIDES, element: 'feu' }).every((e) => e.personnage.element === 'feu')).toBe(true);
  });

  it('par rareté de la carte', () => {
    expect(filtrer(toutes, { ...FILTRES_VIDES, finition: 'couronne' }).map((e) => e.carte.finition)).toEqual(['couronne', 'couronne', 'couronne']);
  });

  it('par possession', () => {
    expect(ids({ possession: 'possedees' })).toEqual(['lan-001', 'lan-002', 'lan-125']);
    expect(ids({ possession: 'manquantes' })).toHaveLength(137);
  });

  it('séries triées et sans doublon', () => {
    const l = series(extension);
    expect(new Set(l).size).toBe(l.length);
    expect([...l].sort((a, b) => a.localeCompare(b, 'fr'))).toEqual(l);
  });
});

describe('complétion par rareté (accueil)', () => {
  it('une ligne par rareté de base, puis « ★ et + » regroupées', () => {
    const lignes = completionParRarete(entreesCollection(avec({ 'lan-001': 1, 'lan-002': 2, 'lan-125': 1 }), extension));
    expect(lignes.map((l) => l.libelle)).toEqual(['♦', '♦♦', '♦♦♦', '♦♦♦♦', '★ et +']);
    expect(lignes.map((l) => l.total)).toEqual([50, 30, 15, 5, 40]);
    expect(lignes.reduce((a, l) => a + l.possedees, 0)).toBe(3);
    expect(lignes.find((l) => l.libelle === '★ et +')!.possedees).toBe(1); // lan-125
  });
});
