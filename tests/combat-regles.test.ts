// Moteur de combat : chaque règle de docs/COMBAT.md (mise en place, tour, Relève, repli, points, dégâts, états,
// cartes Soutien, decks). Personnage « neutre » de référence : Einar (per-066, Neutre, Base C, 80 PV, [qq] 40, pas de talent).
import { describe, expect, it } from 'vitest';
import { creerPartie, validerDeck, actionsLegales, appliquer, type Action } from '../src/core/combat/moteur';
import { deckDeSerie } from '../src/core/combat/decks';
import { iaHasard } from '../src/core/combat/ia';
import type { Deck, Partie } from '../src/core/combat/etat';
import { attaque, avecPieces, bib, degats, jouer, legales, partie, perso, texte, types } from './outils-combat';

const EINAR = 'per-066';
const THOMAS = 'per-045'; // Terre, Base C, 90 PV, [tqq] 60, pas de talent

describe('mise en place', () => {
  const deckOP = deckDeSerie('One Piece', bib)!;
  const deckJJK = deckDeSerie('Jujutsu Kaisen', bib)!;

  it('5 cartes chacun, au moins un Base ; mise en place puis pile ou face', () => {
    const { partie: p } = creerPartie(bib, [deckOP, deckJJK], 'mep');
    for (const J of p.joueurs) {
      expect(J.main).toHaveLength(5);
      expect(J.deck).toHaveLength(15);
      expect(J.main.some((u) => bib.personnages.get(p.cartes[u]!)?.type === 'base')).toBe(true);
    }
    expect(p.phase).toBe('mise-en-place');
    const a0 = legales(p);
    expect(a0.every((a) => a.type === 'mise-en-place' && a.joueur === 0)).toBe(true);
    // Actif : un Base ; banc : 3 au plus, que des Bases.
    for (const a of a0 as Extract<Action, { type: 'mise-en-place' }>[]) {
      expect(a.banc.length).toBeLessThanOrEqual(3);
      for (const u of [a.actif, ...a.banc]) expect(bib.personnages.get(p.cartes[u]!)?.type).toBe('base');
    }
    let q = jouer(p, a0[0]!).p;
    q = jouer(q, legales(q)[0]!).p;
    expect(q.phase).toBe('choix-premier');
    expect(legales(q).map((a) => a.joueur)).toEqual([q.gagnantPiece, q.gagnantPiece]);
    // Le gagnant choisit de ne pas commencer : l'autre commence, sans énergie ni attaque au premier tour.
    q = jouer(q, { type: 'commencer', joueur: q.gagnantPiece, premier: false }).p;
    expect(q.joueurActif).toBe(q.gagnantPiece === 0 ? 1 : 0);
    expect(q.joueurs[q.joueurActif].energie).toBeNull();
    expect(types(q)).not.toContain('attaquer');
    expect(types(q)).not.toContain('releve');
  });

  it('une main sans Base est remélangée et repiochée (Base garanti)', () => {
    const soutiens = ['sou-onigiri', 'sou-fumigene', 'sou-antidote', 'sou-talisman', 'sou-boussole', 'sou-kunai', 'sou-bandage', 'sou-entrainement-intensif', 'sou-reperage', 'sou-mentor'];
    const deck: Deck = { nom: 'Un seul Base', cartes: [EINAR, ...soutiens.flatMap((s) => [s, s]).slice(0, 19)], elements: ['feu'] };
    for (const g of ['a', 'b', 'c', 'd', 'e']) {
      const { partie: p, journal } = creerPartie(bib, [deck, deckOP], g);
      expect(p.joueurs[0].main.map((u) => p.cartes[u])).toContain(EINAR);
      if (journal.some((e) => e.type === 'main-sans-base')) expect(texte(journal)).toMatch(/main sans Base/);
    }
  });

  it('decks : 20 cartes, au moins un Base, 2 exemplaires au plus, 1 à 3 éléments', () => {
    expect(validerDeck(deckOP, bib)).toEqual([]);
    expect(validerDeck({ ...deckOP, cartes: deckOP.cartes.slice(1) }, bib).join(' ')).toMatch(/19 cartes/);
    const c0 = deckOP.cartes[0]!;
    expect(validerDeck({ ...deckOP, cartes: [...deckOP.cartes.slice(2, 18), c0, c0, c0, c0] }, bib).join(' ')).toMatch(/4 exemplaires .* \(2 au plus\)/);
    expect(validerDeck({ ...deckOP, elements: [] }, bib).join(' ')).toMatch(/1 à 3/);
    expect(validerDeck({ ...deckOP, elements: ['feu', 'eau', 'vent', 'terre'] }, bib).join(' ')).toMatch(/1 à 3/);
    expect(validerDeck({ ...deckOP, elements: ['neutre'] }, bib).join(' ')).toMatch(/impossible/);
    const sansBase = { nom: 'x', cartes: Array.from({ length: 20 }, (_, i) => ['per-001', 'per-002', 'sou-onigiri', 'sou-kunai', 'sou-talisman', 'sou-mentor', 'sou-antidote', 'sou-bandage', 'sou-boussole', 'sou-fumigene'][i % 10]!), elements: ['feu' as const] };
    expect(validerDeck(sansBase, bib).join(' ')).toMatch(/au moins un Base/);
  });

  it('même graine = même partie (déterministe)', () => {
    const jouerTout = (graine: string): string => {
      let p: Partie = creerPartie(bib, [deckOP, deckJJK], graine).partie;
      const ia = [iaHasard('x'), iaHasard('y')];
      for (let k = 0; k < 300 && p.phase !== 'fin'; k++) {
        const j = p.phase === 'mise-en-place' ? (p.joueurs[0].pret ? 1 : 0) : p.phase === 'choix-premier' ? p.gagnantPiece : p.attente ? p.attente.joueurs[0]! : p.joueurActif;
        p = appliquer(p, ia[j]!(p, bib), bib).partie;
      }
      return JSON.stringify(p);
    };
    expect(jouerTout('meme')).toBe(jouerTout('meme'));
    expect(jouerTout('meme')).not.toBe(jouerTout('autre'));
  });
});

describe('tour', () => {
  it('piocher 1 carte, recevoir 1 énergie parmi les éléments du deck ; l’énergie non attachée est perdue', () => {
    const p = partie({ actif: EINAR, energie: 'feu', deck: [EINAR] }, { actif: EINAR, deck: [EINAR, THOMAS], elements: ['eau', 'glace'] });
    const q = jouer(p, { type: 'passer', joueur: 0 }).p;
    expect(q.joueurs[0].energie).toBeNull();
    expect(q.joueurActif).toBe(1);
    expect(q.tour).toBe(6);
    expect(q.joueurs[1].main).toHaveLength(1);
    expect(['eau', 'glace']).toContain(q.joueurs[1].energie);
  });

  it('deck vide : on ne pioche pas, sans pénalité', () => {
    const q = jouer(partie({ actif: EINAR }, { actif: EINAR }), { type: 'passer', joueur: 0 }).p;
    expect(q.joueurs[1].main).toHaveLength(0);
    expect(q.phase).toBe('jeu');
  });

  it('une seule énergie attachée par tour, à l’actif ou au banc', () => {
    const p = partie({ actif: EINAR, banc: [THOMAS], energie: 'feu' }, { actif: EINAR });
    expect(legales(p).filter((a) => a.type === 'attacher')).toHaveLength(2);
    const q = jouer(p, { type: 'attacher', joueur: 0, cible: 'A-per-045' }).p;
    expect(perso(q, 'A-per-045').energies).toEqual(['feu']);
    expect(types(q)).not.toContain('attacher');
  });

  it('banc : 3 personnages au plus', () => {
    const p = partie({ actif: EINAR, banc: [THOMAS, THOMAS, THOMAS], main: [EINAR] }, { actif: EINAR });
    expect(types(p)).not.toContain('poser');
    const q = partie({ actif: EINAR, banc: [THOMAS], main: [EINAR] }, { actif: EINAR });
    expect(jouer(q, { type: 'poser', joueur: 0, carte: 'A-per-066#2' }).p.joueurs[0].banc).toHaveLength(2);
  });

  it('le premier joueur ne peut pas attaquer à son premier tour ; l’attaque termine le tour', () => {
    const p = partie({ actif: EINAR, energies: [['feu', 'feu']] }, { actif: EINAR });
    p.joueurs[0].toursJoues = 1;
    expect(types(p)).not.toContain('attaquer');
    p.joueurs[0].toursJoues = 2;
    const q = attaque(p, 0).p;
    expect(degats(q, 'B-per-066')).toBe(40);
    expect(q.joueurActif).toBe(1);
  });
});

describe('Relève', () => {
  const itadori = 'per-008';
  const base = (): Partie => partie({ actif: 'per-010', banc: ['per-003'], main: [itadori], energies: [['terre', 'terre']], degats: [30] }, { actif: EINAR });

  it('un Éveillé remplace un personnage de sa série en jeu : énergies, dégâts et position gardés, états retirés', () => {
    const p = base();
    p.joueurs[0].actif!.etats = ['brulure'];
    expect(legales(p).filter((a) => a.type === 'releve').map((a) => (a as { cible: string }).cible)).toEqual(['A-per-010']);
    const q = jouer(p, { type: 'releve', joueur: 0, carte: 'A-per-008', cible: 'A-per-010' }).p;
    const x = q.joueurs[0].actif!;
    expect(x.id).toBe(itadori);
    expect(x.energies).toEqual(['terre', 'terre']);
    expect(x.degats).toBe(30);
    expect(x.etats).toEqual([]);
    expect(q.joueurs[0].defausse).toContain('A-per-010');
  });

  it('seulement sur un personnage en jeu depuis le début du tour, et pas au premier tour du joueur', () => {
    const p = base();
    p.joueurs[0].actif!.entreAuTour = p.tour;
    expect(types(p)).not.toContain('releve');
    const q = base();
    q.joueurs[0].toursJoues = 1;
    expect(types(q)).not.toContain('releve');
  });

  it('un Base ne fait pas de Relève, et un Éveillé ne se pose pas sur le banc', () => {
    const p = partie({ actif: 'per-010', main: ['per-012', itadori] }, { actif: EINAR });
    expect(legales(p).filter((a) => a.type === 'poser').map((a) => (a as { carte: string }).carte)).toEqual(['A-per-012']);
  });
});

describe('repli', () => {
  it('défausse autant d’énergies que le Repli, une fois par tour', () => {
    const p = partie({ actif: 'per-016', banc: [EINAR], energies: [['feu', 'eau', 'vent']] }, { actif: EINAR }); // Nanami : Repli 2
    const q = jouer(p, { type: 'repli', joueur: 0, cible: 'A-per-066' }).p;
    expect(q.joueurs[0].actif!.uid).toBe('A-per-066');
    expect(perso(q, 'A-per-016').energies).toEqual(['feu']);
    expect(types(q)).not.toContain('repli');
  });

  it('pas assez d’énergies, ou Gelé : pas de repli', () => {
    expect(types(partie({ actif: 'per-016', banc: [EINAR], energies: [['feu']] }, { actif: EINAR }))).not.toContain('repli');
    const p = partie({ actif: EINAR, banc: [THOMAS], energies: [['feu']] }, { actif: EINAR });
    p.joueurs[0].actif!.etats = ['gel'];
    expect(types(p)).not.toContain('repli');
  });
});

describe('points et K.-O.', () => {
  it('1 point pour un Base, 2 pour un Éveillé ; l’adversaire choisit son nouvel actif', () => {
    const p = partie({ actif: EINAR, energies: [['feu', 'feu']] }, { actif: EINAR, banc: [THOMAS, 'per-008'], degats: [50] });
    const q = attaque(p, 0).p;
    expect(q.joueurs[0].points).toBe(1);
    expect(q.attente).toEqual({ joueurs: [1], suite: 'fin-de-tour' });
    expect(legales(q).map((a) => a.type)).toEqual(['nouvel-actif', 'nouvel-actif']);
    const r = jouer(q, { type: 'nouvel-actif', joueur: 1, cible: 'B-per-008' }).p;
    expect(r.joueurs[1].actif!.id).toBe('per-008');
    expect(r.joueurActif).toBe(1);
    const s = partie({ actif: 'per-019', energies: [['tenebres', 'tenebres', 'tenebres']] }, { actif: 'per-008', banc: [EINAR], degats: [120] });
    expect(attaque(s, 1).p.joueurs[0].points).toBe(2);
  });

  it('3 points : victoire', () => {
    const p = partie({ actif: EINAR, energies: [['feu', 'feu']], points: 2 }, { actif: EINAR, banc: [THOMAS], degats: [50] });
    const q = attaque(p, 0).p;
    expect(q.phase).toBe('fin');
    expect(q.gagnant).toBe(0);
  });

  it('actif mis K.-O. sans banc : l’adversaire n’a plus de personnage, il perd', () => {
    const q = attaque(partie({ actif: EINAR, energies: [['feu', 'feu']] }, { actif: EINAR, degats: [50] }), 0).p;
    expect(q.gagnant).toBe(0);
    expect(q.raisonFin).toMatch(/plus aucun personnage/);
  });
});

describe('dégâts', () => {
  it('Faiblesse +20 sur l’actif ; pas au banc', () => {
    // Zoro (Vent) contre Nobara (Terre, faible au Vent).
    const p = partie({ actif: 'per-002', energies: [['vent', 'vent']] }, { actif: 'per-010', banc: ['per-010'] });
    expect(degats(attaque(p, 0).p, 'B-per-010')).toBe(70);
    // Démantèlement (Sukuna, Ténèbres) au banc sur Yuta (Lumière, faible aux Ténèbres) : pas de Faiblesse.
    const s = partie({ actif: 'per-011', energies: [['tenebres', 'tenebres']] }, { actif: EINAR, banc: ['per-013'] });
    expect(degats(attaque(s, 0, { cible: 'B-per-013' }).p, 'B-per-013')).toBe(50);
  });

  it('réductions et boucliers après la Faiblesse, minimum 0', () => {
    // Canute (10) contre Stark (−20) : 0.
    const p = partie({ actif: 'per-064', energies: [['glace']] }, { actif: 'per-051' });
    expect(degats(attaque(p, 0).p, 'B-per-051')).toBe(0);
  });
});

describe('états', () => {
  it('Brûlure : 10 dégâts entre chaque tour', () => {
    const p = partie({ actif: 'per-074', energies: [['feu', 'feu']] }, { actif: EINAR, banc: [THOMAS] }); // Yuri : Black March 40, Brûlée
    const q = attaque(p, 0).p;
    expect(degats(q, 'B-per-066')).toBe(50);
    expect(perso(q, 'B-per-066').etats).toContain('brulure');
    const r = jouer(q, { type: 'passer', joueur: 1 }).p;
    expect(degats(r, 'B-per-066')).toBe(60);
  });

  it('Gel : ni attaque ni repli au prochain tour de son propriétaire, puis disparaît', () => {
    const p = avecPieces(partie({ actif: 'per-060', energies: [['glace', 'glace']] }, { actif: EINAR, banc: [THOMAS], energies: [['feu', 'feu']] }), ['pile']);
    const q = attaque(p, 0).p; // Ritsu : pile, Gelée
    expect(perso(q, 'B-per-066').etats).toContain('gel');
    expect(types(q)).not.toContain('attaquer');
    expect(types(q)).not.toContain('repli');
    const r = jouer(q, { type: 'passer', joueur: 1 }).p;
    expect(perso(r, 'B-per-066').etats).not.toContain('gel');
  });

  it('Étourdi : pile, l’attaque échoue ; disparaît à la fin du prochain tour de son propriétaire', () => {
    const p = partie({ actif: 'ren-per-001', energies: [['foudre', 'foudre']] }, { actif: EINAR, energies: [['feu', 'feu']] }); // Killua : Étourdie
    const q = attaque(p, 0).p;
    expect(perso(q, 'B-per-066').etats).toContain('etourdi');
    const pile = attaque(avecPieces(q, ['pile']), 0);
    expect(degats(pile.p, 'A-ren-per-001')).toBe(0);
    expect(texte(pile.journal)).toMatch(/l'attaque échoue/);
    expect(perso(pile.p, 'B-per-066').etats).not.toContain('etourdi');
    const face = attaque(avecPieces(q, ['face']), 0);
    expect(degats(face.p, 'A-ren-per-001')).toBe(40);
  });

  it('Malédiction : la prochaine attaque subie fait +20, puis disparaît', () => {
    const p = partie({ actif: 'ren-per-014', energies: [['tenebres']] }, { actif: EINAR, energies: [['feu', 'feu']] }); // Turbo Granny
    const q = attaque(p, 0).p;
    expect(degats(q, 'B-per-066')).toBe(20);
    expect(perso(q, 'B-per-066').etats).toEqual(['malediction']);
    // Attaque suivante (Einar, 40) : +20, puis la Malédiction disparaît.
    const r = partie({ actif: EINAR, energies: [['feu', 'feu']] }, { actif: EINAR });
    r.joueurs[1].actif!.etats = ['malediction'];
    const s = attaque(r, 0).p;
    expect(degats(s, 'B-per-066')).toBe(60);
    expect(perso(s, 'B-per-066').etats).toEqual([]);
  });

  it('plusieurs états à la fois ; retirés en allant sur le banc', () => {
    const p = partie({ actif: EINAR }, { actif: EINAR, banc: [THOMAS], energies: [['feu']] }, { joueurActif: 1 });
    p.joueurs[1].actif!.etats = ['brulure', 'malediction'];
    const q = jouer(p, { type: 'repli', joueur: 1, cible: 'B-per-045' }).p;
    expect(perso(q, 'B-per-066').etats).toEqual([]);
  });
});

describe('cartes Soutien', () => {
  it('Objets : autant que voulu ; Soutien : un par tour, jamais au premier tour du premier joueur', () => {
    const p = partie({ actif: EINAR, degats: [40], main: ['sou-onigiri', 'sou-onigiri', 'sou-entrainement-intensif', 'sou-mentor'], deck: [EINAR, EINAR, 'per-008'] }, { actif: EINAR });
    let q = jouer(p, { type: 'jouer', joueur: 0, carte: 'A-sou-onigiri', choix: { cible: 'A-per-066' } }).p;
    q = jouer(q, { type: 'jouer', joueur: 0, carte: 'A-sou-onigiri#2', choix: { cible: 'A-per-066' } }).p;
    expect(degats(q, 'A-per-066')).toBe(0);
    q = jouer(q, { type: 'jouer', joueur: 0, carte: 'A-sou-entrainement-intensif', choix: {} }).p;
    expect(legales(q).some((a) => a.type === 'jouer' && q.cartes[a.carte] === 'sou-mentor')).toBe(false);
    const premier = partie({ actif: EINAR, main: ['sou-mentor'] }, { actif: EINAR });
    premier.joueurs[0].toursJoues = 1;
    expect(types(premier)).not.toContain('jouer');
  });

  it('Terrain : un seul en jeu pour les deux joueurs, un nouveau remplace l’ancien, pas deux du même nom', () => {
    const p = partie({ actif: EINAR, main: ['sou-mur-maria', 'sou-shibuya-nuit'] }, { actif: EINAR, main: ['sou-mur-maria'] });
    let q = jouer(p, { type: 'jouer', joueur: 0, carte: 'A-sou-mur-maria', choix: {} }).p;
    expect(q.terrain?.id).toBe('sou-mur-maria');
    expect(types(q)).not.toContain('jouer'); // un Terrain par tour
    q = jouer(q, { type: 'passer', joueur: 0 }).p;
    expect(types(q)).not.toContain('jouer'); // même nom que celui en jeu
    q.joueurs[1].main.push('B-sou-shibuya-nuit');
    q.cartes['B-sou-shibuya-nuit'] = 'sou-shibuya-nuit';
    q = jouer(q, { type: 'jouer', joueur: 1, carte: 'B-sou-shibuya-nuit', choix: {} }).p;
    expect(q.terrain).toMatchObject({ id: 'sou-shibuya-nuit', proprietaire: 1 });
    expect(q.joueurs[0].defausse).toContain('A-sou-mur-maria');
  });
});

describe('partie complète', () => {
  it('deux IA au hasard : chaque action est légale et la partie se termine', () => {
    for (const g of ['p1', 'p2', 'p3']) {
      let p: Partie = creerPartie(bib, [deckDeSerie('Chainsaw Man', bib)!, deckDeSerie('Demon Slayer', bib)!], g).partie;
      const ia = [iaHasard(`${g}a`), iaHasard(`${g}b`)];
      let k = 0;
      while (p.phase !== 'fin' && k++ < 5000) {
        const j = p.phase === 'mise-en-place' ? (p.joueurs[0].pret ? 1 : 0) : p.phase === 'choix-premier' ? p.gagnantPiece : p.attente ? p.attente.joueurs[0]! : p.joueurActif;
        expect(actionsLegales(p, bib).length).toBeGreaterThan(0);
        p = appliquer(p, ia[j]!(p, bib), bib).partie; // vérifiée : lève une erreur si l'action n'est pas légale
      }
      expect(p.phase).toBe('fin');
    }
  });
});
