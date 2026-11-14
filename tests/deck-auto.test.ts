// Deck automatique : construit à partir des cartes possédées, autour d'un type (élément) ou d'une série.
import { describe, expect, it } from 'vitest';
import { completerDeck, construireDeckAuto, personnagesParElement } from '../src/core/combat/deck-auto';
import { validerDeckPossede } from '../src/core/combat/decks-joueur';
import { validerDeck } from '../src/core/combat/moteur';
import type { ElementId } from '../src/core/types';
import { bib } from './outils-combat';

const tout = (): number => 2;
const posseder = (ids: Record<string, number>) => (id: string): number => ids[id] ?? 0;
const ELEMENTS: ElementId[] = ['feu', 'eau', 'glace', 'foudre', 'vent', 'terre', 'lumiere', 'tenebres', 'neutre'];

describe('deck automatique par type', () => {
  it('avec toute la collection : un deck valide de 20 cartes pour chacun des 9 types', () => {
    for (const element of ELEMENTS) {
      const r = construireDeckAuto({ element }, bib, tout);
      expect(r, element).not.toBeNull();
      expect(r!.manque, element).toBe(0);
      expect(validerDeck(r!.deck, bib), element).toEqual([]);
      if (element !== 'neutre') expect(r!.deck.elements[0], element).toBe(element);
      // Le cœur du deck est du type demandé.
      const persos = r!.deck.cartes.map((id) => bib.personnages.get(id)).filter((p) => !!p);
      expect(persos.filter((p) => p!.element === element).length, element).toBeGreaterThanOrEqual(6);
    }
  });

  it('ne prend jamais plus d’exemplaires que possédés, ni plus de 2', () => {
    const r = construireDeckAuto({ element: 'feu' }, bib, (id) => (id.startsWith('sou-') ? 1 : 2))!;
    const compte = new Map<string, number>();
    for (const id of r.deck.cartes) compte.set(id, (compte.get(id) ?? 0) + 1);
    for (const [id, n] of compte) expect(n, id).toBeLessThanOrEqual(id.startsWith('sou-') ? 1 : 2);
    const possedees = new Set([...bib.personnages.keys(), ...bib.soutiens.keys()]);
    expect(validerDeckPossede(r.deck, bib, possedees)).toEqual([]);
  });

  it('un Éveillé n’entre que si un Base (ou Héros) de sa série est aussi dans le deck', () => {
    const naruto = [...bib.personnages.values()].find((p) => p.nom === 'Naruto Uzumaki')!;
    const kakashi = [...bib.personnages.values()].find((p) => p.nom === 'Kakashi Hatake')!;
    // Naruto (Éveillé, Vent) seul avec quelques Bases Vent d'autres séries : il reste dehors.
    const autresVent = [...bib.personnages.values()].filter((p) => p.element === 'vent' && p.type === 'base' && p.serie !== 'Naruto').slice(0, 3);
    const sans = construireDeckAuto({ element: 'vent' }, bib, posseder(Object.fromEntries([[naruto.id, 2], ...autresVent.map((p) => [p.id, 2])])))!;
    expect(sans.deck.cartes).not.toContain(naruto.id);
    // Avec un Base de Naruto possédé, la série Naruto peut jouer son Éveillé.
    const avec = construireDeckAuto({ serie: 'Naruto' }, bib, posseder({ [naruto.id]: 2, [kakashi.id]: 2 }))!;
    expect(avec.deck.cartes).toContain(naruto.id);
    expect(avec.deck.cartes).toContain(kakashi.id);
  });

  it('aucun Base ni Héros du type possédé : pas de deck', () => {
    const eveille = [...bib.personnages.values()].find((p) => p.type === 'eveille')!;
    expect(construireDeckAuto({ element: eveille.element }, bib, posseder({ [eveille.id]: 2 }))).toBeNull();
  });

  it('petite collection : deck partiel, le nombre de cartes manquantes est donné', () => {
    const base = [...bib.personnages.values()].find((p) => p.element === 'feu' && p.type === 'base')!;
    const r = construireDeckAuto({ element: 'feu' }, bib, posseder({ [base.id]: 1, 'sou-onigiri': 2 }))!;
    expect(r.deck.cartes).toEqual([base.id, 'sou-onigiri', 'sou-onigiri']);
    expect(r.manque).toBe(17);
  });

  it('par série : le deck tourne autour de la série', () => {
    const r = construireDeckAuto({ serie: 'Demon Slayer' }, bib, tout)!;
    expect(validerDeck(r.deck, bib)).toEqual([]);
    const persos = r.deck.cartes.map((id) => bib.personnages.get(id)).filter((p) => !!p);
    expect(persos.filter((p) => p!.serie === 'Demon Slayer').length).toBeGreaterThanOrEqual(10);
  });

  it('même collection → même deck (aucun hasard)', () => {
    expect(construireDeckAuto({ element: 'eau' }, bib, tout)).toEqual(construireDeckAuto({ element: 'eau' }, bib, tout));
  });
});

describe('compléter un deck commencé', () => {
  it('garde les cartes déjà choisies et complète autour de leur type', () => {
    const debut = [...bib.personnages.values()].filter((p) => p.element === 'foudre' && p.type === 'base').slice(0, 2).map((p) => p.id);
    const r = completerDeck({ nom: 'Mon deck', cartes: [debut[0]!, debut[1]!], elements: ['feu'] }, bib, tout);
    expect(r.manque).toBe(0);
    expect(r.deck.nom).toBe('Mon deck');
    expect(r.deck.cartes.slice(0, 2)).toEqual(debut.slice(0, 2));
    expect(r.deck.elements[0]).toBe('foudre');
    expect(validerDeck(r.deck, bib)).toEqual([]);
  });
});

describe('types proposés', () => {
  it('compte les personnages possédés par type, et ceux qui peuvent commencer une partie', () => {
    const n = personnagesParElement(bib, tout);
    const total = [...n.values()].reduce((s, v) => s + v.total, 0);
    expect(total).toBe(bib.personnages.size);
    for (const v of n.values()) expect(v.posables).toBeLessThanOrEqual(v.total);
  });
});
