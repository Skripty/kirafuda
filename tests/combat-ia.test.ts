import { describe, expect, it } from 'vitest';
import { iaGloutonne, iaNormale } from '../src/core/combat/ia';
import { DECKS_DEPART, DEFIS_COMBAT } from '../src/core/combat/defis';
import { deckStandard } from '../src/core/combat/decks';
import { actionsLegales, appliquer, creerPartie, validerDeck } from '../src/core/combat/moteur';
import { rngAGraine } from '../src/core/rng';
import { partie as creerPartieTest, bib } from './outils-combat';

describe('IA de combat', () => {
  it('attache l’énergie à un personnage qui a une attaque à dégâts', () => {
    const p = creerPartieTest({ actif: 'per-013', banc: ['per-010'], elements: ['terre'], energie: 'terre' }, { actif: 'per-014' });
    const action = iaNormale()(p, bib);
    expect(action).toMatchObject({ type: 'attacher', cible: p.joueurs[0].banc[0]!.uid });
    expect(iaGloutonne('test-energie')(p, bib)).toMatchObject({ type: 'attacher', cible: p.joueurs[0].banc[0]!.uid });
  });

  it('se replie si l’attaque de l’actif ne fait rien et que le banc peut frapper', () => {
    const p = creerPartieTest({ actif: 'per-032', banc: ['per-010'], energies: [['feu'], ['terre']], elements: ['terre'] }, { actif: 'per-014' });
    const action = iaNormale()(p, bib);
    expect(action).toMatchObject({ type: 'repli', cible: p.joueurs[0].banc[0]!.uid });
    expect(iaGloutonne('test-repli')(p, bib)).toMatchObject({ type: 'repli', cible: p.joueurs[0].banc[0]!.uid });
  });

  it('ne brûle pas au hasard une énergie pour le talent défensif d’Eren', () => {
    const p = creerPartieTest({ actif: 'per-025', energies: [['terre']], elements: ['terre'] }, { actif: 'per-014' });
    const action = iaNormale()(p, bib);
    expect(action.type).not.toBe('talent');
    expect(iaGloutonne('test-talent')(p, bib).type).not.toBe('talent');
  });

  it('génère six défis et des decks de 20 cartes valides ; deux decks de départ figés et valides', () => {
    expect(DEFIS_COMBAT.map((d) => d.serie)).toEqual([
      'Jujutsu Kaisen', 'One Piece', 'Demon Slayer', 'Solo Leveling', "L'Attaque des Titans", 'Chainsaw Man',
    ]);
    expect(DECKS_DEPART.map((d) => d.id)).toEqual(['the-boxer', 'spy-x-family']);
    for (const d of DECKS_DEPART) {
      expect(d.cartes).toHaveLength(20);
      expect(validerDeck(d, bib)).toEqual([]);
    }
    for (const serie of DEFIS_COMBAT.map((d) => d.serie)) {
      const deck = deckStandard(serie, bib, rngAGraine(`validation:${serie}`));
      expect(deck?.cartes).toHaveLength(20);
      expect(validerDeck(deck!, bib)).toEqual([]);
    }
  });

  it('prend une décision normale en moins de 300 ms sur un tour fourni en actions', () => {
    const p = creerPartieTest({
      actif: 'per-010', banc: ['per-012'], main: ['sou-onigiri', 'sou-parchemin-invocation', 'sou-entrainement-intensif', 'sou-talisman', 'per-008'],
      energies: [['terre'], []], elements: ['terre', 'feu', 'foudre'], energie: 'feu',
    }, { actif: 'per-014', elements: ['feu'] });
    const debut = performance.now();
    const action = iaNormale()(p, bib);
    expect(action).toBeDefined();
    expect(performance.now() - debut).toBeLessThan(300);
  });

  it('termine une partie complète contre une autre IA normale', () => {
    const a = DECKS_DEPART[0]!;
    const b = deckStandard('Demon Slayer', bib, rngAGraine('partie-complete-ia'))!;
    let p = creerPartie(bib, [a, b], 'partie-complete-ia-normale').partie;
    const ias = [iaNormale(), iaNormale()];
    let actions = 0;
    while (p.phase !== 'fin' && actions < 800) {
      const legales = actionsLegales(p, bib);
      expect(legales.length).toBeGreaterThan(0);
      const joueur = legales[0]!.joueur;
      p = appliquer(p, ias[joueur]!(p, bib), bib).partie;
      actions++;
    }
    expect(p.phase).toBe('fin');
    expect(p.gagnant).not.toBeNull();
  });
});
