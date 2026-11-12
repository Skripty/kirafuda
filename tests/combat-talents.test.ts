// Moteur de combat : au moins un test par talent des fiches actuelles (src/data/fiches-combat.json).
// Cibles neutres de référence : Einar (per-066, 80 PV) et Askeladd (per-063, 100 PV, talent sans effet en combat direct).
import { describe, expect, it } from 'vitest';
import type { Partie } from '../src/core/combat/etat';
import { attaque, avecPieces, bib, degats, inflige, jouer, legales, partie, perso, texte, types } from './outils-combat';

const EINAR = 'per-066';
const ASK = 'per-063';
const THOMAS = 'per-045';
const talent = (p: Partie, source: string, choix = {}) => jouer(p, { type: 'talent', joueur: p.joueurActif, source, choix });
const passer = (p: Partie): Partie => jouer(p, { type: 'passer', joueur: p.joueurActif }).p;
const testes = new Set<string>();
const t = (id: string, nom: string, f: () => void): void => { testes.add(id); it(`${nom} (${id})`, f); };

describe('talents', () => {
  // ---------- Jujutsu Kaisen ----------
  t('per-016', 'Heures supplémentaires : +20 si tu as moins de points', () => {
    const p = (pts: number) => partie({ actif: 'per-016', energies: [['feu', 'feu']] }, { actif: ASK, points: pts });
    expect(degats(attaque(p(0), 0).p, 'B-per-063')).toBe(40);
    expect(degats(attaque(p(1), 0).p, 'B-per-063')).toBe(60);
  });
  t('per-015', 'Arsenal maudit : défausse un Objet pour piocher 2 cartes', () => {
    const p = partie({ actif: 'per-015', main: ['sou-kunai', EINAR], deck: [THOMAS, THOMAS, EINAR] }, { actif: EINAR });
    expect(legales(p).filter((a) => a.type === 'talent').map((a) => (a as { choix: { defausse?: string } }).choix.defausse)).toEqual(['A-sou-kunai']);
    const q = talent(p, 'A-per-015', { defausse: 'A-sou-kunai' }).p;
    expect(q.joueurs[0].main).toHaveLength(3);
    expect(q.joueurs[0].defausse).toEqual(['A-sou-kunai']);
    expect(types(q)).not.toContain('talent');
  });
  t('per-014', 'Restriction céleste : jamais touché par les états', () => {
    const q = attaque(partie({ actif: 'per-074', energies: [['feu', 'feu']] }, { actif: 'per-014' }), 0).p;
    expect(perso(q, 'B-per-014').etats).toEqual([]);
  });
  t('per-012', 'Manipulation des fléaux : défausse une carte, 10 dégâts à un personnage adverse', () => {
    const q = talent(partie({ actif: 'per-012', main: ['sou-kunai'] }, { actif: EINAR, banc: [THOMAS] }), 'A-per-012', { defausse: 'A-sou-kunai', cible: 'B-per-045' }).p;
    expect(degats(q, 'B-per-045')).toBe(10);
  });
  t('per-013', 'Rika : la première fois qu’il devrait être K.-O., Yuta reste à 10 PV', () => {
    const p = partie({ actif: EINAR, energies: [['feu', 'feu']] }, { actif: 'per-013', banc: [EINAR], degats: [70] });
    const q = attaque(p, 0);
    expect(degats(q.p, 'B-per-013')).toBe(70);
    expect(texte(q.journal)).toMatch(/reste à 10 PV \(Rika\)/);
    const r = attaque(passer(q.p), 0).p;
    expect(r.joueurs[0].points).toBe(1);
  });
  t('per-009', 'Dix ombres : un Base de Jujutsu Kaisen du deck sur le banc', () => {
    const q = talent(partie({ actif: 'per-009', deck: [THOMAS, 'per-010'] }, { actif: EINAR }), 'A-per-009').p;
    expect(q.joueurs[0].banc.map((x) => x.id)).toEqual(['per-010']);
  });
  t('per-011', 'Roi des fléaux : Sukuna peut relever Itadori au tour même où il est entré', () => {
    const p = partie({ actif: 'per-008', banc: ['per-010'], main: ['per-011', 'per-009'] }, { actif: EINAR });
    p.joueurs[0].actif!.entreAuTour = p.tour;
    p.joueurs[0].banc[0]!.entreAuTour = p.tour;
    const releves = legales(p).filter((a) => a.type === 'releve').map((a) => `${(a as { carte: string }).carte}→${(a as { cible: string }).cible}`);
    expect(releves).toEqual(['A-per-011→A-per-008']);
  });
  t('per-007', 'Infini : avec 2 énergies ou plus, Gojo subit 30 de moins', () => {
    const p = (n: number) => partie({ actif: EINAR, energies: [['feu', 'feu']] }, { actif: 'per-007', energies: [Array(n).fill('lumiere')] });
    expect(degats(attaque(p(1), 0).p, 'B-per-007')).toBe(40);
    expect(degats(attaque(p(2), 0).p, 'B-per-007')).toBe(10);
  });
  // ---------- Naruto ----------
  t('per-004', 'Multiclonage : à l’entrée par Relève, cherche un Base de Naruto (aucun pour l’instant)', () => {
    const p = partie({ actif: 'per-005', main: ['per-004'], deck: [EINAR] }, { actif: EINAR });
    const r = jouer(p, { type: 'releve', joueur: 0, carte: 'A-per-004', cible: 'A-per-005' });
    expect(texte(r.journal)).toMatch(/ne trouve rien/);
    expect(r.p.joueurs[0].banc).toEqual([]);
  });
  t('per-005', 'Sharingan : la première attaque subie à chaque tour adverse échoue sur un pile', () => {
    const p = partie({ actif: EINAR, energies: [['feu', 'feu']] }, { actif: 'per-005' });
    expect(degats(attaque(avecPieces(p, ['pile']), 0).p, 'B-per-005')).toBe(0);
    expect(degats(attaque(avecPieces(p, ['face']), 0).p, 'B-per-005')).toBe(40);
  });
  t('per-006', 'Genjutsu des corbeaux : le personnage adverse qui entre par Relève est Étourdi', () => {
    const p = partie({ actif: 'per-006' }, { actif: 'per-010', main: ['per-008'] }, { joueurActif: 1 });
    const q = jouer(p, { type: 'releve', joueur: 1, carte: 'B-per-008', cible: 'B-per-010' }).p;
    expect(q.joueurs[1].actif!.etats).toEqual(['etourdi']);
  });
  // ---------- One Piece ----------
  t('per-003', 'Archéologue : regarde 2 cartes, en prend 1, l’autre va sous le deck', () => {
    const q = talent(partie({ actif: 'per-003', deck: [EINAR, THOMAS, ASK] }, { actif: EINAR }), 'A-per-003', { garder: 1 }).p;
    expect(q.joueurs[0].main).toEqual(['A-per-045']);
    expect(q.joueurs[0].deck).toEqual(['A-per-063', 'A-per-066']);
  });
  t('per-002', 'Bras droit : +20 si Luffy est en jeu', () => {
    const p = (banc: string[]) => partie({ actif: 'per-002', banc, energies: [['vent', 'vent']] }, { actif: ASK });
    expect(degats(attaque(p([]), 0).p, 'B-per-063')).toBe(50);
    expect(degats(attaque(p(['per-001']), 0).p, 'B-per-063')).toBe(70);
  });
  t('per-001', 'Haki des rois : à l’entrée par Relève, 10 à chaque personnage du banc adverse', () => {
    const p = partie({ actif: 'per-003', main: ['per-001'] }, { actif: EINAR, banc: [THOMAS, EINAR] });
    const q = jouer(p, { type: 'releve', joueur: 0, carte: 'A-per-001', cible: 'A-per-003' }).p;
    expect([degats(q, 'B-per-066'), degats(q, 'B-per-045'), degats(q, 'B-per-066#2')]).toEqual([0, 10, 10]);
  });
  // ---------- Chainsaw Man ----------
  t('per-017', 'Pochita : une fois par partie, face, Denji reste à 10 PV', () => {
    const p = partie({ actif: EINAR, energies: [['feu', 'feu']] }, { actif: 'per-017', banc: [EINAR], degats: [100] }); // Denji : 130 PV
    expect(degats(attaque(avecPieces(p, ['face']), 0).p, 'B-per-017')).toBe(120);
    expect(attaque(avecPieces(p, ['pile']), 0).p.joueurs[0].points).toBe(2);
  });
  t('per-018', 'Contrôle : quand Makima entre par Relève, retire 1 énergie de l’actif adverse', () => {
    const p = partie({ actif: 'per-022', main: ['per-018'] }, { actif: EINAR, energies: [['feu', 'eau']] });
    expect(types(p)).not.toContain('talent'); // plus de talent utilisable chaque tour
    const q = jouer(p, { type: 'releve', joueur: 0, carte: 'A-per-018', cible: 'A-per-022' }).p;
    expect(perso(q, 'B-per-066').energies).toEqual(['feu']);
  });
  t('per-020', 'Démon du Futur : regarde la carte du dessus, peut la mettre sous le deck', () => {
    const p = partie({ actif: 'per-020', deck: [EINAR, THOMAS] }, { actif: EINAR });
    expect(talent(p, 'A-per-020', { dessous: true }).p.joueurs[0].deck).toEqual(['A-per-045', 'A-per-066']);
    expect(talent(p, 'A-per-020', { dessous: false }).p.joueurs[0].deck).toEqual(['A-per-066', 'A-per-045']);
  });
  t('per-021', 'Démon Bombe : quand Reze est mise K.-O., l’actif adverse subit 30', () => {
    const q = attaque(partie({ actif: EINAR, energies: [['feu', 'feu']] }, { actif: 'per-021', banc: [EINAR], degats: [50] }), 0).p;
    expect(degats(q, 'A-per-066')).toBe(30);
  });
  t('per-024', 'Démon de la Guerre : défausse une carte, la prochaine attaque d’Asa ce tour fait +30', () => {
    const p = talent(partie({ actif: 'per-024', main: ['sou-kunai'], energies: [['feu', 'feu']] }, { actif: ASK }), 'A-per-024', { defausse: 'A-sou-kunai' }).p;
    expect(degats(attaque(p, 0).p, 'B-per-063')).toBe(60);
  });
  // ---------- L'Attaque des Titans ----------
  t('per-025', 'Durcissement : défausse 1 énergie, Eren subit 40 de moins jusqu’à ton prochain tour', () => {
    const p = talent(partie({ actif: 'per-025', energies: [['terre']] }, { actif: EINAR, energies: [['feu', 'feu']] }), 'A-per-025').p;
    expect(perso(p, 'A-per-025').energies).toEqual([]);
    expect(degats(attaque(passer(p), 0).p, 'A-per-025')).toBe(0);
  });
  t('per-026', 'Lien Ackerman : si Eren est en jeu, Mikasa subit 20 de moins', () => {
    const p = (banc: string[]) => partie({ actif: EINAR, energies: [['feu', 'feu']] }, { actif: 'per-026', banc });
    expect(degats(attaque(p([]), 0).p, 'B-per-026')).toBe(40);
    expect(degats(attaque(p(['per-025']), 0).p, 'B-per-026')).toBe(20);
  });
  t('per-027', 'Nettoyage : quand une attaque de Levi met K.-O., soigne 30 Levi', () => {
    const q = attaque(partie({ actif: 'per-027', energies: [['vent', 'vent']], degats: [50] }, { actif: EINAR, banc: [EINAR], degats: [30] }), 0).p;
    expect(degats(q, 'A-per-027')).toBe(20);
  });
  t('per-028', 'Stratège : regarde la main de l’adversaire', () => {
    expect(texte(talent(partie({ actif: 'per-028' }, { actif: EINAR, main: [EINAR] }), 'A-per-028').journal)).toMatch(/regarde la main de Bruno \(1 cartes\)/);
  });
  t('per-029', 'Consacrez vos cœurs : tes autres personnages de L’Attaque des Titans font +10', () => {
    const p = (banc: string[]) => partie({ actif: 'per-030', banc, energies: [['glace', 'glace']] }, { actif: ASK });
    expect(degats(attaque(p([]), 0).p, 'B-per-063')).toBe(50);
    expect(degats(attaque(p(['per-029']), 0).p, 'B-per-063')).toBe(60);
  });
  t('per-030', 'Titan Féminin : Annie subit 20 de moins de la part des Éveillés', () => {
    const gon = partie({ actif: 'ren-per-002', energies: [['terre', 'terre', 'terre']] }, { actif: 'per-030' });
    expect(degats(attaque(gon, 0).p, 'B-per-030')).toBe(60);
    expect(degats(attaque(partie({ actif: EINAR, energies: [['feu', 'feu']] }, { actif: 'per-030' }), 0).p, 'B-per-030')).toBe(40);
  });
  // ---------- Demon Slayer ----------
  t('per-033', 'Fil de l’ouverture : +20 contre un personnage déjà blessé', () => {
    expect(degats(attaque(partie({ actif: 'per-033', energies: [['eau', 'eau']] }, { actif: ASK, degats: [10] }), 0).p, 'B-per-063')).toBe(10 + 70);
  });
  t('per-034', 'Régénération : à la fin de chacun de tes tours, soigne 10 Nezuko', () => {
    expect(degats(passer(partie({ actif: 'per-034', degats: [30] }, { actif: EINAR })), 'A-per-034')).toBe(20);
  });
  t('per-040', 'Cœur ardent : quand Rengoku est mis K.-O., soigne 50 tes personnages de Demon Slayer', () => {
    const q = attaque(partie({ actif: EINAR, energies: [['feu', 'feu']] }, { actif: 'per-040', banc: ['per-035', EINAR], degats: [130, 60, 20] }), 0).p;
    expect([degats(q, 'B-per-035'), degats(q, 'B-per-066')]).toEqual([10, 20]);
  });
  t('per-035', 'Endormi : +40 s’il a déjà subi des dégâts', () => {
    const p = (d: number) => partie({ actif: 'per-035', energies: [['foudre', 'foudre']], degats: [d] }, { actif: ASK });
    expect(degats(attaque(p(0), 0).p, 'B-per-063')).toBe(40);
    expect(degats(attaque(p(10), 0).p, 'B-per-063')).toBe(80);
  });
  t('per-037', 'Calme plat : la première attaque subie à chaque tour adverse fait 30 de moins', () => {
    expect(degats(attaque(partie({ actif: EINAR, energies: [['feu', 'feu']] }, { actif: 'per-037' }), 0).p, 'B-per-037')).toBe(10);
  });
  t('per-039', 'Roi des démons : défausse une carte pour soigner 30 Muzan', () => {
    expect(degats(talent(partie({ actif: 'per-039', main: ['sou-kunai'], degats: [50] }, { actif: EINAR }), 'A-per-039', { defausse: 'A-sou-kunai' }).p, 'A-per-039')).toBe(20);
  });
  // ---------- Solo Leveling ----------
  t('per-041', 'Arise : remet sur le banc un Base de Solo Leveling de la défausse, avec 30 PV', () => {
    const q = talent(partie({ actif: 'per-041', defausse: ['per-043', EINAR] }, { actif: EINAR }), 'A-per-041', { carte: 'A-per-043' }).p;
    expect(q.joueurs[0].banc.map((x) => [x.id, 100 - x.degats])).toEqual([['per-043', 30]]);
  });
  t('per-043', 'Chevalier de l’ombre : sur le banc, ton actif de Solo Leveling subit 10 de moins', () => {
    expect(degats(attaque(partie({ actif: EINAR, energies: [['feu', 'feu']] }, { actif: 'per-042', banc: ['per-043'] }), 0).p, 'B-per-042')).toBe(30);
  });
  t('per-046', 'Président de l’Association : pioche 1 si tu as moins de cartes en main', () => {
    expect(types(partie({ actif: 'per-046', deck: [EINAR] }, { actif: EINAR }))).not.toContain('talent');
    const q = talent(partie({ actif: 'per-046', deck: [EINAR] }, { actif: EINAR, main: [EINAR] }), 'A-per-046').p;
    expect(q.joueurs[0].main).toHaveLength(1);
  });
  // ---------- Frieren ----------
  t('per-049', 'Mille ans de magie : récupère un Objet de la défausse', () => {
    expect(talent(partie({ actif: 'per-049', defausse: ['sou-kunai'] }, { actif: EINAR }), 'A-per-049', { carte: 'A-sou-kunai' }).p.joueurs[0].main).toEqual(['A-sou-kunai']);
  });
  t('per-052', 'Le héros : tes autres personnages de Frieren subissent 10 de moins', () => {
    const q = attaque(partie({ actif: EINAR, energies: [['feu', 'feu']] }, { actif: 'per-050', banc: ['per-052'] }), 0).p;
    expect(degats(q, 'B-per-050')).toBe(30);
    expect(degats(attaque(partie({ actif: EINAR, energies: [['feu', 'feu']] }, { actif: 'per-052' }), 0).p, 'B-per-052')).toBe(40);
  });
  t('per-051', 'Peureux mais solide : Stark subit 20 de moins', () => {
    expect(degats(attaque(partie({ actif: EINAR, energies: [['feu', 'feu']] }, { actif: 'per-051' }), 0).p, 'B-per-051')).toBe(20);
  });
  t('per-054', 'Grande mage : cherche un Objet dans le deck', () => {
    expect(talent(partie({ actif: 'per-054', deck: ['sou-mentor', 'sou-kunai'] }, { actif: EINAR }), 'A-per-054').p.joueurs[0].main).toEqual(['A-sou-kunai']);
  });
  // ---------- Mob Psycho 100 ----------
  t('per-056', '100 % : +60 si Mob a 40 PV ou moins', () => {
    const p = (d: number) => partie({ actif: 'per-056', energies: [['lumiere', 'feu']], degats: [d] }, { actif: 'ren-per-002' }); // Mob : 120 PV
    expect(inflige(attaque(p(70), 0).journal, 'B-ren-per-002')).toBe(40);
    expect(inflige(attaque(p(80), 0).journal, 'B-ren-per-002')).toBe(100);
  });
  t('per-057', 'Baratin : regarde les 3 premières cartes et choisit leur ordre', () => {
    const q = talent(partie({ actif: 'per-057', deck: [EINAR, THOMAS, ASK, 'per-010'] }, { actif: EINAR }), 'A-per-057', { ordre: [2, 0, 1] }).p;
    expect(q.joueurs[0].deck).toEqual(['A-per-063', 'A-per-066', 'A-per-045', 'A-per-010']);
  });
  t('per-058', 'Esprit flottant : Dimple n’est jamais Gelé ni Étourdi', () => {
    expect(perso(attaque(partie({ actif: 'ren-per-001', energies: [['foudre', 'foudre']] }, { actif: 'per-058' }), 0).p, 'B-per-058').etats).toEqual([]);
  });
  // ---------- Vinland Saga ----------
  t('per-062', 'Je n’ai pas d’ennemis : −30 s’il n’a pas attaqué à son tour précédent', () => {
    const p = partie({ actif: EINAR, energies: [['feu', 'feu']] }, { actif: 'per-062' });
    expect(degats(attaque(p, 0).p, 'B-per-062')).toBe(10);
    p.joueurs[1].actif!.dernierTourAttaque = p.tour - 1;
    expect(degats(attaque(p, 0).p, 'B-per-062')).toBe(40);
  });
  t('per-063', 'Chef mercenaire : quand tu poses un Base de Vinland Saga, pioche 1 carte', () => {
    const q = jouer(partie({ actif: ASK, main: ['per-066', THOMAS], deck: [EINAR] }, { actif: EINAR }), { type: 'poser', joueur: 0, carte: 'A-per-066' }).p;
    expect(q.joueurs[0].main).toEqual(['A-per-045', 'A-per-066#2']);
  });
  t('per-064', 'Roi : tes autres personnages de Vinland Saga font +10', () => {
    expect(degats(attaque(partie({ actif: 'per-065', banc: ['per-064'], energies: [['terre', 'feu', 'feu']] }, { actif: ASK }), 0).p, 'B-per-063')).toBe(70);
  });
  // ---------- Tower of God ----------
  t('per-068', 'Irrégulier : si tu as moins de points, ses attaques coûtent 1 ◇ de moins', () => {
    const p = (pts: number) => partie({ actif: 'per-068', energies: [['eau']] }, { actif: EINAR, points: pts }); // Shinsu noir : Eau ◇
    expect(types(p(0))).not.toContain('attaquer');
    expect(types(p(1))).toContain('attaquer');
  });
  t('per-069', 'Stratège de la Tour : pioche 1 carte, puis remet 1 carte de la main sous le deck', () => {
    const q = talent(partie({ actif: 'per-069', main: [EINAR], deck: ['sou-kunai', THOMAS] }, { actif: EINAR }), 'A-per-069').p;
    expect(q.joueurs[0].main).toEqual(['A-per-066']);
    expect(q.joueurs[0].deck).toEqual(['A-per-045', 'A-sou-kunai']);
  });
  t('per-071', 'Trahison : tant que Rachel est sur ton banc, l’actif adverse subit 10 de plus', () => {
    expect(degats(attaque(partie({ actif: EINAR, banc: ['per-071'], energies: [['feu', 'feu']] }, { actif: ASK }), 0).p, 'B-per-063')).toBe(50);
  });
  // ---------- Omniscient Reader's Viewpoint ----------
  t('per-075', 'Lecteur omniscient : regarde les 2 premières cartes du deck adverse', () => {
    expect(texte(talent(partie({ actif: 'per-075' }, { actif: EINAR, deck: [EINAR, EINAR, EINAR] }), 'A-per-075').journal)).toMatch(/regarde les 2 premières cartes du deck de Bruno/);
  });
  t('per-076', 'Régression : une fois par partie, mis K.-O., il retourne dans le deck', () => {
    const q = attaque(partie({ actif: EINAR, energies: [['feu', 'feu']] }, { actif: 'per-076', banc: [EINAR], degats: [50] }), 0).p;
    expect(q.joueurs[1].deck).toEqual(['B-per-076']);
    expect(q.joueurs[1].defausse).toEqual([]);
    expect(q.joueurs[0].points).toBe(1);
  });
  t('per-079', 'Bouclier d’acier : tes autres personnages d’Omniscient Reader’s Viewpoint subissent 10 de moins', () => {
    expect(degats(attaque(partie({ actif: EINAR, energies: [['feu', 'feu']] }, { actif: 'per-078', banc: ['per-079'] }), 0).p, 'B-per-078')).toBe(30);
  });
  // ---------- Sakamoto Days ----------
  t('per-082', 'Ancien tueur : une fois par tour, cherche un Objet dans le deck et l’ajoute à la main', () => {
    const q = talent(partie({ actif: 'per-082', deck: ['sou-mentor', 'sou-kunai', EINAR] }, { actif: EINAR }), 'A-per-082').p;
    expect(q.joueurs[0].main).toEqual(['A-sou-kunai']);
    expect(types(q)).not.toContain('talent');
    // Ses attaques mettent K.-O. normalement (plus de « Retraité »).
    expect(attaque(partie({ actif: 'per-082', energies: [['feu', 'feu']] }, { actif: EINAR, banc: [EINAR], degats: [50] }), 0).p.joueurs[0].points).toBe(1);
  });
  t('per-083', 'Télépathie : regarde la main de l’adversaire', () => {
    expect(texte(talent(partie({ actif: 'per-083' }, { actif: EINAR }), 'A-per-083').journal)).toMatch(/regarde la main de Bruno/);
  });
  // ---------- Dorohedoro ----------
  t('per-088', 'Mâchoire : quand une attaque de Caiman met K.-O., pioche 2 cartes', () => {
    const q = attaque(partie({ actif: 'per-088', energies: [['terre', 'feu', 'feu']], deck: [EINAR, EINAR, EINAR] }, { actif: EINAR, banc: [EINAR], degats: [30] }), 0).p;
    expect(q.joueurs[0].main).toHaveLength(2);
  });
  t('per-089', 'Magie du temps : une fois par partie, soigne les dégâts subis au dernier tour adverse', () => {
    const p = partie({ actif: 'per-089', degats: [50] }, { actif: EINAR });
    p.joueurs[0].actif!.blessures = [{ tour: p.tour - 1, valeur: 30 }, { tour: p.tour - 3, valeur: 20 }];
    const q = talent(p, 'A-per-089', { cible: 'A-per-089' }).p;
    expect(degats(q, 'A-per-089')).toBe(20);
    expect(types(passer(passer(q)))).not.toContain('talent');
  });
  t('per-092', 'Magie de soin : soigne 30 un de tes personnages de Dorohedoro', () => {
    const p = partie({ actif: 'per-092', banc: ['per-091', EINAR], degats: [0, 30, 30] }, { actif: EINAR });
    expect(legales(p).filter((a) => a.type === 'talent').map((a) => (a as { choix: { cible?: string } }).choix.cible)).toEqual(['A-per-092', 'A-per-091']);
    expect(degats(talent(p, 'A-per-092', { cible: 'A-per-091' }).p, 'A-per-091')).toBe(0);
  });
  // ---------- The Boxer ----------
  t('per-095', 'Entraîneur : tes autres personnages de The Boxer font +20', () => {
    expect(degats(attaque(partie({ actif: 'per-097', banc: ['per-095'], energies: [['feu', 'feu', 'feu']] }, { actif: ASK }), 0).p, 'B-per-063')).toBe(70 + 20);
  });
  // ---------- Hunter x Hunter ----------
  t('ren-per-001', 'Vitesse divine : Killua se replie sans payer, une fois par tour', () => {
    const p = partie({ actif: 'ren-per-001', banc: [EINAR] }, { actif: EINAR });
    const q = jouer(p, { type: 'repli', joueur: 0, cible: 'A-per-066' }).p;
    expect(q.joueurs[0].actif!.uid).toBe('A-per-066');
    expect(types(q)).not.toContain('repli');
  });
  t('ren-per-006', 'Bungee Gum : quand Hisoka attaque, l’actif adverse ne peut pas se replier au prochain tour', () => {
    expect(types(attaque(partie({ actif: 'ren-per-006', energies: [['tenebres', 'feu']] }, { actif: ASK, banc: [EINAR], energies: [['feu', 'feu']] }), 0).p)).not.toContain('repli');
  });
  t('ren-per-007', 'Chaîne du Jugement : +40 contre un Éveillé', () => {
    expect(degats(attaque(partie({ actif: 'ren-per-007', energies: [['feu', 'feu']] }, { actif: 'per-007' }), 0).p, 'B-per-007')).toBe(80);
  });
  // ---------- Dandadan ----------
  t('ren-per-003', 'Psychokinésie : échange l’actif adverse avec un personnage de son banc', () => {
    const q = talent(partie({ actif: 'ren-per-003' }, { actif: EINAR, banc: [THOMAS] }), 'A-ren-per-003', { cible: 'B-per-045' }).p;
    expect(q.joueurs[1].actif!.uid).toBe('B-per-045');
  });
  t('ren-per-008', 'Mode Turbo : la première attaque subie à chaque tour adverse échoue sur un pile', () => {
    const p = partie({ actif: EINAR, energies: [['feu', 'feu']] }, { actif: 'ren-per-008' });
    expect(degats(attaque(avecPieces(p, ['pile']), 0).p, 'B-ren-per-008')).toBe(0);
    expect(degats(attaque(avecPieces(p, ['face']), 0).p, 'B-ren-per-008')).toBe(40);
  });
  t('ren-per-015', 'Médium : retire un état d’un de tes personnages', () => {
    const p = partie({ actif: 'ren-per-015' }, { actif: EINAR });
    p.joueurs[0].actif!.etats = ['brulure', 'malediction'];
    expect(perso(talent(p, 'A-ren-per-015', { cible: 'A-ren-per-015' }).p, 'A-ren-per-015').etats).toEqual(['malediction']);
  });
  // ---------- Spy x Family ----------
  t('ren-per-005', 'Télépathie (Anya) : une carte de la main adverse va sous son deck', () => {
    const q = talent(partie({ actif: 'ren-per-005' }, { actif: EINAR, main: ['sou-kunai', THOMAS], deck: [EINAR] }), 'A-ren-per-005', { carte: 'B-sou-kunai' }).p;
    expect(q.joueurs[1].main).toEqual(['B-per-045']);
    expect(q.joueurs[1].deck).toEqual(['B-per-066#2', 'B-sou-kunai']);
  });
  t('ren-per-009', 'Opération Strix : cherche un Soutien dans le deck', () => {
    expect(talent(partie({ actif: 'ren-per-009', deck: ['sou-kunai', 'sou-mentor'] }, { actif: EINAR }), 'A-ren-per-009').p.joueurs[0].main).toEqual(['A-sou-mentor']);
  });
  t('ren-per-021', 'Prémonition : regarde la carte du dessus, peut la mettre sous le deck', () => {
    expect(talent(partie({ actif: 'ren-per-021', deck: [EINAR, THOMAS] }, { actif: EINAR }), 'A-ren-per-021', { dessous: true }).p.joueurs[0].deck).toEqual(['A-per-045', 'A-per-066']);
  });
  t('ren-per-022', 'Informateur : avec un autre personnage de Spy x Family, pioche 1 puis défausse 1', () => {
    expect(types(partie({ actif: 'ren-per-022', deck: [EINAR] }, { actif: EINAR }))).not.toContain('talent');
    const q = talent(partie({ actif: 'ren-per-022', banc: ['ren-per-021'], main: ['sou-kunai'], deck: [EINAR] }, { actif: EINAR }), 'A-ren-per-022').p;
    expect(q.joueurs[0].main).toEqual(['A-per-066']);
    expect(q.joueurs[0].defausse).toEqual(['A-sou-kunai']);
  });
  // ---------- Blue Lock ----------
  t('ren-per-011', 'Méta-vision : regarde les 2 premières cartes et choisit leur ordre', () => {
    expect(talent(partie({ actif: 'ren-per-011', deck: [EINAR, THOMAS, ASK] }, { actif: EINAR }), 'A-ren-per-011', { ordre: [1, 0] }).p.joueurs[0].deck)
      .toEqual(['A-per-045', 'A-per-066', 'A-per-063']);
  });
  // ---------- Vague 3 : Naruto ----------
  t('ren-per-025', 'Invocation : Pakkun : regarde 3 cartes, ne peut prendre qu’un Base de Naruto ; les autres vont sous le deck', () => {
    const p = partie({ actif: 'ren-per-025', deck: [EINAR, 'ren-per-028', 'per-004', THOMAS] }, { actif: EINAR });
    // Rock Lee (Base de Naruto) est le seul choix : ni Einar (autre série), ni Naruto (Éveillé).
    expect(legales(p).filter((a) => a.type === 'talent').map((a) => (a as { choix: { garder?: number } }).choix.garder)).toEqual([1]);
    const q = talent(p, 'A-ren-per-025', { garder: 1 }).p;
    expect(q.joueurs[0].main).toEqual(['A-ren-per-028']);
    expect(q.joueurs[0].deck).toEqual(['A-per-045', 'A-per-066', 'A-per-004']);
    expect(types(q)).not.toContain('talent');
    // Aucun Base de Naruto parmi les 3 : rien n'est pris.
    const sans = talent(partie({ actif: 'ren-per-025', deck: [EINAR, THOMAS, ASK] }, { actif: EINAR }), 'A-ren-per-025').p;
    expect(sans.joueurs[0].main).toEqual([]);
    expect(sans.joueurs[0].deck).toHaveLength(3);
  });
  t('ren-per-026', 'Ninjutsu médical : soigne 20 un personnage de Naruto, une fois par tour', () => {
    const p = partie({ actif: 'ren-per-026', banc: ['ren-per-028', EINAR], degats: [30, 30, 30] }, { actif: EINAR });
    expect(legales(p).filter((a) => a.type === 'talent').map((a) => (a as { choix: { cible?: string } }).choix.cible)).toEqual(['A-ren-per-026', 'A-ren-per-028']);
    const q = talent(p, 'A-ren-per-026', { cible: 'A-ren-per-028' }).p;
    expect(degats(q, 'A-ren-per-028')).toBe(10);
    expect(types(q)).not.toContain('talent');
  });
  t('ren-per-027', 'Armure de sable : Gaara subit 20 dégâts de moins', () => {
    const q = attaque(partie({ actif: EINAR, energies: [['feu', 'feu']] }, { actif: 'ren-per-027' }), 0);
    expect(inflige(q.journal, 'B-ren-per-027')).toBe(inflige(attaque(partie({ actif: EINAR, energies: [['feu', 'feu']] }, { actif: ASK }), 0).journal, 'B-per-063') - 20);
  });
  // ---------- Vague 3 : One Piece ----------
  t('ren-per-029', 'Cuisinier de bord : les Objets de soin soignent 20 de plus (pas les cartes Soutien)', () => {
    const cote = (banc: string[], main: string[]) => partie({ actif: EINAR, banc, degats: [60], main }, { actif: EINAR });
    const onigiri = (banc: string[]) => jouer(cote(banc, ['sou-onigiri']), { type: 'jouer', joueur: 0, carte: 'A-sou-onigiri', choix: { cible: 'A-per-066' } }).p;
    expect(degats(onigiri([THOMAS]), 'A-per-066')).toBe(40);
    expect(degats(onigiri(['ren-per-029']), 'A-per-066')).toBe(20);
    const infirmerie = jouer(cote(['ren-per-029'], ['sou-infirmerie']), { type: 'jouer', joueur: 0, carte: 'A-sou-infirmerie', choix: { cible: 'A-per-066' } }).p;
    expect(degats(infirmerie, 'A-per-066')).toBe(20); // 60 − 40 : l'Infirmerie est un Soutien, pas un Objet
  });
  t('ren-per-030', 'Navigatrice : échange l’actif avec un personnage du banc sans payer le Repli, une fois par tour', () => {
    const p = partie({ actif: EINAR, banc: ['ren-per-030', THOMAS] }, { actif: EINAR });
    const q = talent(p, 'A-ren-per-030', { cible: 'A-per-045' }).p;
    expect(q.joueurs[0].actif!.uid).toBe('A-per-045');
    expect(q.joueurs[0].banc.map((x) => x.uid).sort()).toEqual(['A-per-066', 'A-ren-per-030']);
    expect(types(q)).not.toContain('talent');
  });
});

describe('couverture', () => {
  it('chaque talent des fiches actuelles a au moins un test', () => {
    const avecTalent = [...bib.personnages.values()].filter((p) => p.talent).map((p) => p.id).sort();
    expect(avecTalent).toHaveLength(72);
    expect([...testes].sort()).toEqual(avecTalent);
  });
});
