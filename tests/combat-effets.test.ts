// Moteur de combat : chaque famille d'effets d'attaque et chaque carte Soutien.
// Cible de référence : Einar (per-066, Neutre, 80 PV, pas de talent) et Thomas Andre (per-045, Terre, 90 PV).
import { describe, expect, it } from 'vitest';
import { attaque, avecPieces, degats, inflige, jouer, legales, partie, perso, texte, types } from './outils-combat';

const EINAR = 'per-066';
const THOMAS = 'per-045';
const B = 'B-per-066';

describe('effets d’attaque', () => {
  it('bonus sous condition (Résonance : +40 si l’actif adverse est déjà blessé)', () => {
    const p = (d: number) => partie({ actif: 'per-010', energies: [['terre', 'terre']] }, { actif: THOMAS, degats: [d] });
    expect(degats(attaque(p(0), 1).p, 'B-per-045')).toBe(30);
    expect(degats(attaque(p(10), 1).p, 'B-per-045')).toBe(10 + 70);
  });

  it('bonus par personnage du banc (Monarque des Ombres : +20 par personnage sur ton banc)', () => {
    const p = partie({ actif: 'per-041', banc: [EINAR, EINAR], energies: [['tenebres', 'tenebres', 'feu', 'feu']] }, { actif: 'ren-per-002' });
    expect(inflige(attaque(p, 1).journal, 'B-ren-per-002')).toBe(160);
  });

  it('pièces : 30 par face sur 3 pièces (Rafale), face 50 ou pile rien (Chaos)', () => {
    const fern = partie({ actif: 'per-050', energies: [['vent', 'vent', 'vent']] }, { actif: EINAR });
    expect(degats(attaque(avecPieces(fern, ['face', 'pile', 'face']), 1).p, B)).toBe(60);
    const ebisu = partie({ actif: 'per-093', energies: [['feu']] }, { actif: EINAR });
    expect(degats(attaque(avecPieces(ebisu, ['face']), 0).p, B)).toBe(50);
    expect(degats(attaque(avecPieces(ebisu, ['pile']), 0).p, B)).toBe(0);
  });

  it('cible : un personnage du banc (Poing à distance), n’importe quel personnage (Couteau multifonction)', () => {
    const leorio = partie({ actif: 'ren-per-013', energies: [['feu', 'feu']] }, { actif: EINAR, banc: [THOMAS] });
    expect(legales(leorio).filter((a) => a.type === 'attaquer').map((a) => (a as { choix: { cible?: string } }).choix.cible)).toEqual(['B-per-045']);
    expect(degats(attaque(leorio, 0, { cible: 'B-per-045' }).p, 'B-per-045')).toBe(30);
    const nagumo = partie({ actif: 'per-085', energies: [['tenebres', 'feu']] }, { actif: EINAR, banc: [THOMAS] });
    expect(legales(nagumo).filter((a) => a.type === 'attaquer')).toHaveLength(2);
  });

  it('zone : chaque personnage adverse (Catastravia) ; en plus au banc (Tentacules)', () => {
    const frieren = partie({ actif: 'per-049', energies: [['glace', 'glace', 'feu', 'feu']] }, { actif: EINAR, banc: [THOMAS, EINAR] });
    const q = attaque(frieren, 1).p;
    expect([degats(q, B), degats(q, 'B-per-045'), degats(q, 'B-per-066#2')]).toEqual([40, 40, 40]);
    const muzan = partie({ actif: 'per-039', energies: [['tenebres', 'feu', 'feu']] }, { actif: EINAR, banc: [THOMAS] });
    const r = attaque(muzan, 0).p;
    expect([degats(r, B), degats(r, 'B-per-045')]).toEqual([60, 10]);
  });

  it('ignore les boucliers (Chidori) ; ignore boucliers et réductions (Reelseiden)', () => {
    const sasuke = partie({ actif: 'per-005', energies: [['foudre', 'foudre']] }, { actif: 'per-051' }); // Stark : −20
    sasuke.joueurs[1].actif!.boucliers = [{ valeur: 20, jusqua: 99 }];
    expect(degats(attaque(sasuke, 0).p, 'B-per-051')).toBe(30); // le bouclier est ignoré, pas la réduction
    const ubel = partie({ actif: 'per-053', energies: [['vent', 'vent']] }, { actif: 'per-051' });
    ubel.joueurs[1].actif!.boucliers = [{ valeur: 20, jusqua: 99 }];
    expect(degats(attaque(ubel, 0).p, 'B-per-051')).toBe(40 + 20); // Faiblesse (Terre au Vent), sans réduction ni bouclier
  });

  it('dégâts différés (Poing divergent : la cible subit encore 30)', () => {
    const p = partie({ actif: 'per-008', energies: [['foudre']] }, { actif: THOMAS, banc: [EINAR] });
    const q = attaque(p, 0).p;
    expect(degats(q, 'B-per-045')).toBe(30 + 30);
  });

  it('dégâts à soi (Lance du chasseur) et défausse d’énergies (Violet creux : toutes ; Susano’o : 2)', () => {
    expect(degats(attaque(partie({ actif: 'per-070', energies: [['foudre', 'foudre']] }, { actif: EINAR }), 0).p, 'A-per-070')).toBe(10);
    const gojo = attaque(partie({ actif: 'per-007', energies: [['lumiere', 'lumiere', 'lumiere', 'feu']] }, { actif: 'ren-per-002' }), 1).p;
    expect(perso(gojo, 'A-per-007').energies).toEqual([]);
    const itachi = attaque(partie({ actif: 'per-006', energies: [['tenebres', 'tenebres', 'feu', 'feu']] }, { actif: 'ren-per-002' }), 1).p;
    expect(perso(itachi, 'A-per-006').energies).toHaveLength(2);
  });

  it('échange forcé (Bleu) : l’adversaire choisit son nouvel actif', () => {
    const p = partie({ actif: 'per-007', energies: [['lumiere']] }, { actif: EINAR, banc: [THOMAS] });
    const q = attaque(p, 0).p;
    expect(q.attente).toEqual({ joueurs: [1], suite: 'fin-de-tour' });
    expect(q.joueurs[1].banc.map((x) => x.uid).sort()).toEqual(['B-per-045', B]);
    const r = jouer(q, { type: 'nouvel-actif', joueur: 1, cible: 'B-per-045' }).p;
    expect(r.joueurs[1].actif!.uid).toBe('B-per-045');
    expect(r.joueurActif).toBe(1);
  });

  it('repos : cette attaque (Orbe Rasen-shuriken) ou toute attaque (Gear Fifth) interdite au tour suivant', () => {
    // Cible solide (Gojo, 170 PV, sans énergie donc sans « Infini ») : la partie continue.
    const naruto = partie({ actif: 'per-004', energies: [['vent', 'vent', 'feu', 'feu']] }, { actif: 'per-007' });
    let q = jouer(attaque(naruto, 1).p, { type: 'passer', joueur: 1 }).p;
    expect(legales(q).filter((a) => a.type === 'attaquer').map((a) => (a as { attaque: number }).attaque)).toEqual([0]);
    const luffy = partie({ actif: 'per-001', energies: [['lumiere', 'lumiere', 'feu', 'feu']] }, { actif: 'per-007', degats: [0] });
    luffy.joueurs[1].actif!.boucliers = [{ valeur: 50, jusqua: 99 }]; // Gojo garde des PV après les 180
    q = jouer(attaque(luffy, 1).p, { type: 'passer', joueur: 1 }).p;
    expect(types(q)).not.toContain('attaquer');
    q = jouer(jouer(q, { type: 'passer', joueur: 0 }).p, { type: 'passer', joueur: 1 }).p;
    expect(types(q)).toContain('attaquer');
  });

  it('la cible ne peut pas se replier (Démon Fantôme) ni attaquer (Le vrai guerrier, sur un pile)', () => {
    const himeno = attaque(partie({ actif: 'per-022', energies: [['vent']] }, { actif: EINAR, banc: [THOMAS], energies: [['feu', 'feu']] }), 0).p;
    expect(types(himeno)).not.toContain('repli');
    expect(types(himeno)).toContain('attaquer');
    const thors = attaque(avecPieces(partie({ actif: 'per-067', energies: [['eau', 'eau']] }, { actif: EINAR, energies: [['feu', 'feu']] }), ['pile']), 0).p;
    expect(types(thors)).not.toContain('attaquer');
  });

  it('échange ensuite avec un personnage du banc (Dribble du monstre)', () => {
    const p = partie({ actif: 'ren-per-023', banc: [EINAR], energies: [['eau']] }, { actif: THOMAS });
    const q = attaque(p, 0, { echange: 'A-per-066' }).p;
    expect(q.joueurs[0].actif!.uid).toBe('A-per-066');
    expect(degats(q, 'B-per-045')).toBe(20);
  });

  it('soins : un allié de la série (Reine des murs), soi si la cible est mise K.-O. (Contrat)', () => {
    const historia = partie({ actif: 'per-032', banc: ['per-025', EINAR], energies: [['lumiere']], degats: [0, 50, 50] }, { actif: EINAR });
    expect(legales(historia).filter((a) => a.type === 'attaquer').map((a) => (a as { choix: { cible?: string } }).choix.cible)).toEqual(['A-per-032', 'A-per-025']); // personnages de L'Attaque des Titans seulement
    expect(degats(attaque(historia, 0, { cible: 'A-per-025' }).p, 'A-per-025')).toBe(20);
    // Cible : Askeladd (Neutre, 100 PV) ; Contrat fait 90.
    const makima = (d: number) => partie({ actif: 'per-018', energies: [['tenebres', 'tenebres', 'feu']], degats: [40] }, { actif: 'per-063', banc: [THOMAS], degats: [d] });
    expect(degats(attaque(makima(0), 1).p, 'A-per-018')).toBe(40);
    expect(degats(attaque(makima(10), 1).p, 'A-per-018')).toBe(10);
  });

  it('bouclier jusqu’à ton prochain tour (Titan Cuirassé : −20)', () => {
    const p = attaque(partie({ actif: 'per-031', energies: [['terre', 'terre']] }, { actif: EINAR, energies: [['feu', 'feu']] }), 0).p;
    const q = attaque(p, 0).p;
    expect(degats(q, 'A-per-031')).toBe(20);
    const r = jouer(jouer(q, { type: 'passer', joueur: 0 }).p, { type: 'passer', joueur: 1 }).p;
    expect(perso(r, 'A-per-031').boucliers).toEqual([]);
  });

  it('pioche (Réécriture), défausse au hasard dans la main adverse (Complot), récupère un Objet (Ombre originelle)', () => {
    const han = attaque(partie({ actif: 'per-077', energies: [['vent']], deck: [EINAR, EINAR, EINAR] }, { actif: EINAR }), 0).p;
    expect(han.joueurs[0].main).toHaveLength(2);
    const plotter = attaque(partie({ actif: 'per-081', energies: [['tenebres', 'feu']] }, { actif: EINAR, main: ['sou-onigiri', 'sou-kunai'] }), 0).p;
    expect(plotter.joueurs[1].main).toHaveLength(1);
    expect(plotter.joueurs[1].defausse).toHaveLength(1);
    const ashborn = attaque(partie({ actif: 'per-047', energies: [['tenebres', 'feu']], defausse: ['sou-kunai'] }, { actif: EINAR }), 0, { carte: 'A-sou-kunai' }).p;
    expect(ashborn.joueurs[0].main).toEqual(['A-sou-kunai']);
  });

  it('Copie : utilise une attaque de l’actif adverse sans payer son coût', () => {
    const p = partie({ actif: 'per-013', energies: [['lumiere', 'feu', 'feu']] }, { actif: 'ren-per-002' }); // Gon : Jajanken 80, Gon adulte 180
    expect(legales(p).filter((a) => a.type === 'attaquer').map((a) => (a as { choix: { copie?: number } }).choix.copie)).toEqual([0, 1]);
    const r = attaque(p, 0, { copie: 1 });
    expect(inflige(r.journal, 'B-ren-per-002')).toBe(180);
    // « Gon subit 80 dégâts » : c'est Yuta (80 PV) qui les subit… et Rika le garde à 10 PV.
    expect(degats(r.p, 'A-per-013')).toBe(70);
    expect(texte(r.journal)).toMatch(/copie : Gon adulte/);
  });
});

describe('cartes Soutien', () => {
  const avec = (main: string[], o: Parameters<typeof partie>[0] = {}, adv: Parameters<typeof partie>[1] = { actif: EINAR }) =>
    partie({ actif: EINAR, ...o, main }, adv);
  const jouerCarte = (p: ReturnType<typeof partie>, id: string, choix = {}) => jouer(p, { type: 'jouer', joueur: 0, carte: `A-${id}`, choix });

  it('Fumigène : ce tour, l’actif se replie sans payer', () => {
    const p = partie({ actif: 'per-016', banc: [EINAR], main: ['sou-fumigene'] }, { actif: EINAR });
    expect(types(p)).not.toContain('repli');
    const q = jouerCarte(p, 'sou-fumigene').p;
    expect(jouer(q, { type: 'repli', joueur: 0, cible: 'A-per-066' }).p.joueurs[0].actif!.uid).toBe('A-per-066');
  });

  it('Parchemin d’invocation (un Base au hasard du deck), Mentor (un Éveillé), Boussole (un Objet, pas une Boussole)', () => {
    const q = jouerCarte(avec(['sou-parchemin-invocation'], { deck: ['sou-kunai', THOMAS, 'per-008'] }), 'sou-parchemin-invocation').p;
    expect(q.joueurs[0].main).toEqual(['A-per-045']);
    const m = jouerCarte(avec(['sou-mentor'], { deck: [THOMAS, 'per-008'] }), 'sou-mentor').p;
    expect(m.joueurs[0].main).toEqual(['A-per-008']);
    const b = jouerCarte(avec(['sou-boussole'], { deck: ['sou-boussole', 'sou-mentor', 'sou-kunai'] }), 'sou-boussole').p;
    expect(b.joueurs[0].main).toEqual(['A-sou-kunai']);
  });

  it('Relique maudite : 1 énergie Ténèbres en plus à un personnage Ténèbres, qui subit 10', () => {
    const p = partie({ actif: 'per-012', main: ['sou-relique-maudite'], elements: ['tenebres'] }, { actif: EINAR });
    const q = jouerCarte(p, 'sou-relique-maudite', { cible: 'A-per-012' }).p;
    expect(perso(q, 'A-per-012')).toMatchObject({ energies: ['tenebres'], degats: 10 });
    // Sans Ténèbres parmi les éléments du deck : injouable.
    expect(types(partie({ actif: 'per-012', main: ['sou-relique-maudite'], elements: ['feu'] }, { actif: EINAR }))).not.toContain('jouer');
  });

  it('Antidote (tous les états), Bandage (+20 et Brûlure retirée), Infirmerie (+40 et tous les états)', () => {
    const p = avec(['sou-antidote', 'sou-bandage', 'sou-infirmerie'], { degats: [70] });
    p.joueurs[0].actif!.etats = ['brulure', 'malediction'];
    expect(perso(jouerCarte(p, 'sou-antidote', { cible: 'A-per-066' }).p, 'A-per-066').etats).toEqual([]);
    expect(perso(jouerCarte(p, 'sou-bandage').p, 'A-per-066')).toMatchObject({ degats: 50, etats: ['malediction'] });
    expect(perso(jouerCarte(p, 'sou-infirmerie', { cible: 'A-per-066' }).p, 'A-per-066')).toMatchObject({ degats: 30, etats: [] });
  });

  it('Talisman : l’actif subit 20 de moins jusqu’à ton prochain tour', () => {
    const q = jouer(jouerCarte(avec(['sou-talisman']), 'sou-talisman').p, { type: 'passer', joueur: 0 }).p;
    q.joueurs[1].actif!.energies = ['feu', 'feu'];
    expect(degats(attaque(q, 0).p, 'A-per-066')).toBe(20);
  });

  it('Kunai : 10 à un personnage du banc adverse', () => {
    const q = jouerCarte(avec(['sou-kunai'], {}, { actif: EINAR, banc: [THOMAS] }), 'sou-kunai', { cible: 'B-per-045' }).p;
    expect(degats(q, 'B-per-045')).toBe(10);
  });

  it('Pierre d’énergie : 1 énergie en plus à un personnage du banc, puis défausse une carte ; une fois par tour', () => {
    const p = avec(['sou-pierre-energie', 'sou-pierre-energie', 'sou-kunai'], { banc: [THOMAS], elements: ['terre'] });
    const q = jouerCarte(p, 'sou-pierre-energie', { cible: 'A-per-045', defausse: 'A-sou-kunai' }).p;
    expect(perso(q, 'A-per-045').energies).toEqual(['terre']);
    expect(q.joueurs[0].defausse).toEqual(['A-sou-pierre-energie', 'A-sou-kunai']);
    expect(types(q)).not.toContain('jouer');
  });

  it('Entraînement intensif (pioche 2), Repérage (4 cartes, en garde 1), Briefing tactique', () => {
    const e = jouerCarte(avec(['sou-entrainement-intensif'], { deck: [EINAR, THOMAS, EINAR] }), 'sou-entrainement-intensif').p;
    expect(e.joueurs[0].main).toHaveLength(2);
    const r = jouerCarte(avec(['sou-reperage'], { deck: [EINAR, THOMAS, 'per-008', 'per-010', 'per-012'] }), 'sou-reperage', { garder: 2 }).p;
    expect(r.joueurs[0].main).toEqual(['A-per-008']);
    expect(r.joueurs[0].deck).toEqual(['A-per-012', 'A-per-066#2', 'A-per-045', 'A-per-010']);
    const b = jouerCarte(avec(['sou-briefing-tactique'], {}, { actif: EINAR, main: [EINAR, EINAR, EINAR, EINAR], deck: [THOMAS] }), 'sou-briefing-tactique').p;
    expect(b.joueurs[1].main).toHaveLength(3);
    expect(b.joueurs[1].deck).toHaveLength(2);
  });

  it('Appel au renfort : échange l’actif avec un personnage du banc et soigne 20 le nouvel actif', () => {
    const q = jouerCarte(avec(['sou-appel-renfort'], { banc: [THOMAS], degats: [0, 30] }), 'sou-appel-renfort', { cible: 'A-per-045' }).p;
    expect(q.joueurs[0].actif).toMatchObject({ uid: 'A-per-045', degats: 10 });
  });

  it('Terrains : Ténèbres +10 (Shibuya), Bases +10 (Arène), Repli +1 (Mur Maria), soin 10 Eau et Vent entre les tours (Mont Sagiri)', () => {
    const shibuya = partie({ actif: 'per-012', main: ['sou-shibuya-nuit'], energies: [['tenebres', 'feu', 'feu']] }, { actif: EINAR });
    expect(degats(attaque(jouerCarte(shibuya, 'sou-shibuya-nuit').p, 0).p, B)).toBe(70);
    const arene = partie({ actif: EINAR, main: ['sou-arene-boxe'], energies: [['feu', 'feu']] }, { actif: EINAR });
    expect(degats(attaque(jouerCarte(arene, 'sou-arene-boxe').p, 0).p, B)).toBe(50);
    const maria = partie({ actif: EINAR, banc: [THOMAS], main: ['sou-mur-maria'], energies: [['feu']] }, { actif: EINAR });
    expect(types(jouerCarte(maria, 'sou-mur-maria').p)).not.toContain('repli');
    const sagiri = partie({ actif: 'per-099', main: ['sou-mont-sagiri'], degats: [30] }, { actif: 'per-022', degats: [30] });
    const q = jouer(jouerCarte(sagiri, 'sou-mont-sagiri').p, { type: 'passer', joueur: 0 }).p;
    expect([degats(q, 'A-per-099'), degats(q, 'B-per-022')]).toEqual([20, 20]);
  });
});
