import { describe, expect, it } from 'vitest';
import extensionJson from '../src/data/extension-lancement.json';
import boosterJson from '../src/data/booster-lancement.json';
import type { Booster, Extension, Sauvegarde } from '../src/core/types';
import { rngAGraine } from '../src/core/rng';
import { ouvrir } from '../src/core/ouverture';
import { tirerBooster } from '../src/core/tirage';
import { sauvegardeParDefaut, validerSauvegarde } from '../src/core/sauvegarde';

const extension = extensionJson as unknown as Extension;
const booster = boosterJson as unknown as Booster;
const MAINTENANT = new Date('2026-11-05T20:00:00.000Z');

const avecSceaux = (sceaux: number, autres: Partial<Sauvegarde> = {}): Sauvegarde => ({ ...sauvegardeParDefaut(), sceaux, ...autres });

/** Booster qui tire 5 fois la même carte : une seule commune (et une version secrète ★ du même personnage, jamais tirée ici). */
const commune = extension.cartes.find((c) => c.finition === 'commune')!;
const extensionUneCarte: Extension = {
  ...extension,
  total: 1,
  totalAvecSecretes: 2,
  personnages: extension.personnages.filter((p) => p.id === commune.personnage),
  cartes: [{ ...commune, numero: 1 }, { id: 'lan-secrete', numero: 2, personnage: commune.personnage, finition: 'pleine', secrete: true, images: {} }],
};
const boosterIdentique: Booster = {
  ...booster,
  tauxExceptionnel: 0,
  emplacements: [{ emplacements: [1, 2, 3, 4, 5], finitions: { commune: 100_000 } }],
};
const idUnique = extensionUneCarte.cartes[0]!.id;

describe('ouvrir : solde', () => {
  it('solde insuffisant : rien ne change, et le manque est indiqué', () => {
    const s = avecSceaux(0, { collection: { 'lan-001': 1 }, points: { lancement: 5 } });
    const copie = structuredClone(s);
    const r = ouvrir(s, booster, extension, rngAGraine(1), MAINTENANT);
    expect(r).toEqual({ ok: false, raison: 'solde-insuffisant', manque: 1, sauvegarde: s });
    expect(r.sauvegarde).toBe(s); // même objet : rien à enregistrer
    expect(s).toEqual(copie);
  });

  it('manque calculé selon le coût du booster', () => {
    const cher: Booster = { ...booster, cout: { ressource: 'sceaux', quantite: 3 } };
    const r = ouvrir(avecSceaux(1), cher, extension, rngAGraine(1), MAINTENANT);
    expect(r.ok === false && r.manque).toBe(2);
  });

  it('solde exact : l’ouverture passe et le solde tombe à 0', () => {
    const r = ouvrir(avecSceaux(1), booster, extension, rngAGraine(1), MAINTENANT);
    expect(r.ok).toBe(true);
    expect(r.sauvegarde.sceaux).toBe(0);
  });
});

describe('ouvrir : mise à jour complète en une fois', () => {
  it('sceaux, collection, points et historique sont tous mis à jour', () => {
    const s = avecSceaux(4, { points: { lancement: 10, autre: 3 } });
    const r = ouvrir(s, booster, extension, rngAGraine('complet'), MAINTENANT);
    if (!r.ok) throw new Error('ouverture refusée');
    const n = r.sauvegarde;

    expect(n.sceaux).toBe(3);
    expect(n.points).toEqual({ lancement: 15, autre: 3 });
    expect(n.historique).toHaveLength(1);
    expect(n.historique[0]).toBe(r.ouverture);
    expect(r.ouverture).toMatchObject({
      date: '2026-11-05T20:00:00.000Z',
      boosterId: 'booster-lancement',
      pointsGagnes: 5,
      vue: false,
    });
    expect(r.ouverture.cartes).toHaveLength(5);
    const total = Object.values(n.collection).reduce((a, b) => a + b, 0);
    expect(total).toBe(5);
  });

  it('le résultat correspond exactement au tirage (même graine)', () => {
    const r = ouvrir(avecSceaux(1), booster, extension, rngAGraine('meme-tirage'), MAINTENANT);
    const t = tirerBooster(booster, extension, rngAGraine('meme-tirage'));
    expect(r.ok && r.ouverture.exceptionnelle).toBe(t.exceptionnel);
    expect(r.ok && r.ouverture.cartes.map(({ carteId, finition, emplacement }) => ({ carteId, finition, emplacement }))).toEqual(t.cartes);
  });

  it('ne modifie jamais la sauvegarde d’origine', () => {
    const s = avecSceaux(2, { collection: { 'lan-001': 1 } });
    const copie = structuredClone(s);
    ouvrir(s, booster, extension, rngAGraine(5), MAINTENANT);
    expect(s).toEqual(copie);
  });

  it('les ouvertures s’ajoutent à la fin de l’historique, avec des identifiants distincts', () => {
    const rng = rngAGraine('historique');
    let s = avecSceaux(3);
    for (let i = 0; i < 3; i++) {
      const r = ouvrir(s, booster, extension, rng, MAINTENANT);
      if (!r.ok) throw new Error('ouverture refusée');
      s = r.sauvegarde;
    }
    expect(s.sceaux).toBe(0);
    expect(s.points.lancement).toBe(15);
    expect(new Set(s.historique.map((o) => o.id)).size).toBe(3);
    expect(ouvrir(s, booster, extension, rng, MAINTENANT).ok).toBe(false);
  });

  it('la nouvelle sauvegarde est valide (prête à être enregistrée)', () => {
    const r = ouvrir(avecSceaux(1), booster, extension, rngAGraine(9), MAINTENANT);
    const v = validerSauvegarde(r.sauvegarde, { extension, refuserCartesInconnues: true });
    expect(v.ok).toBe(true);
  });
});

describe('ouvrir : nouveautés et doublons', () => {
  it('doublons dans le même booster : seul le premier exemplaire est nouveau', () => {
    const r = ouvrir(avecSceaux(1), boosterIdentique, extensionUneCarte, rngAGraine(2), MAINTENANT);
    if (!r.ok) throw new Error('ouverture refusée');
    expect(r.ouverture.cartes.map((c) => [c.nouveau, c.exemplaires])).toEqual([
      [true, 1], [false, 2], [false, 3], [false, 4], [false, 5],
    ]);
    expect(r.sauvegarde.collection).toEqual({ [idUnique]: 5 });
  });

  it('carte déjà possédée dans cette finition : doublon, compté à la suite', () => {
    const s = avecSceaux(1, { collection: { [idUnique]: 2 } });
    const r = ouvrir(s, boosterIdentique, extensionUneCarte, rngAGraine(3), MAINTENANT);
    if (!r.ok) throw new Error('ouverture refusée');
    expect(r.ouverture.cartes.every((c) => !c.nouveau)).toBe(true);
    expect(r.ouverture.cartes.map((c) => c.exemplaires)).toEqual([3, 4, 5, 6, 7]);
    expect(r.sauvegarde.collection[idUnique]).toBe(7);
  });

  it('autre carte du même personnage déjà possédée : celle-ci reste nouvelle (compte par id de carte)', () => {
    const s = avecSceaux(1, { collection: { ['lan-secrete']: 1 } });
    const r = ouvrir(s, boosterIdentique, extensionUneCarte, rngAGraine(4), MAINTENANT);
    if (!r.ok) throw new Error('ouverture refusée');
    expect(r.ouverture.cartes[0]).toMatchObject({ nouveau: true, exemplaires: 1 });
    expect(r.sauvegarde.collection).toEqual({ ['lan-secrete']: 1, [idUnique]: 5 });
  });

  it('cohérence sur 200 ouvertures : collection = somme des cartes de l’historique', () => {
    const rng = rngAGraine('coherence');
    let s = avecSceaux(200);
    for (let i = 0; i < 200; i++) {
      const r = ouvrir(s, booster, extension, rng, MAINTENANT);
      if (!r.ok) throw new Error('ouverture refusée');
      s = r.sauvegarde;
    }
    const attendu: Record<string, number> = {};
    for (const o of s.historique) {
      for (const c of o.cartes) {
        const cle = c.carteId;
        attendu[cle] = (attendu[cle] ?? 0) + 1;
        expect(c.exemplaires).toBe(attendu[cle]);
        expect(c.nouveau).toBe(attendu[cle] === 1);
      }
    }
    expect(s.collection).toEqual(attendu);
    expect(s.sceaux).toBe(0);
    expect(s.points.lancement).toBe(1000);
  });
});
