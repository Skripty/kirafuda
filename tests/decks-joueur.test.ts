import { describe, expect, it } from 'vitest';
import extensionJson from '../src/data/extension-lancement.json';
import type { Extension } from '../src/core/types';
import { exemplairesParPersonnage, suggererElements, validerDeckPossede } from '../src/core/combat/decks-joueur';
import { deckStandard } from '../src/core/combat/decks';
import { validerDeck } from '../src/core/combat/moteur';
import { bib } from './outils-combat';
import { sauvegardeParDefaut } from '../src/core/sauvegarde';
import { rngAGraine } from '../src/core/rng';

const extension = extensionJson as unknown as Extension;

describe('constructeur de decks', () => {
  it('additionne les exemplaires des cartes de plusieurs raretés du même personnage', () => {
    const base = extension.cartes.find((c) => !c.secrete)!;
    const autre = extension.cartes.find((c) => c.personnage === base.personnage && c.id !== base.id);
    const sauvegarde = { ...sauvegardeParDefaut(), collection: { [base.id]: 1, ...(autre ? { [autre.id]: 2 } : {}) } };
    expect(exemplairesParPersonnage(sauvegarde, [extension]).get(base.personnage)).toBe(autre ? 3 : 1);
  });

  it('suggère jusqu’à trois éléments à partir des coûts des attaques', () => {
    const personnages = ['per-001', 'per-002', 'per-003'].filter((id) => bib.personnages.has(id));
    const suggestion = suggererElements(personnages, bib);
    expect(suggestion.length).toBeGreaterThanOrEqual(1);
    expect(suggestion.length).toBeLessThanOrEqual(3);
    expect(suggestion).not.toContain('neutre');
  });

  it('réutilise les règles du moteur et refuse les cartes non possédées', () => {
    const deck = deckStandard('Jujutsu Kaisen', bib, rngAGraine('deck-joueur-test'))!;
    expect(validerDeck(deck, bib)).toEqual([]);
    const toutesLesCartes = new Set(deck.cartes);
    expect(validerDeckPossede(deck, bib, toutesLesCartes)).toEqual([]);
    toutesLesCartes.delete(deck.cartes[0]!);
    expect(validerDeckPossede(deck, bib, toutesLesCartes).join(' ')).toMatch(/n'est pas possédée/);
  });
});
