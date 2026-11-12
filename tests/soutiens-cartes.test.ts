// Tâche 29 : les 20 cartes Soutien dans le jeu (boosters, collection, boutique, quêtes, sauvegarde).
import { describe, expect, it } from 'vitest';
import quetesJson from '../src/data/quetes.json';
import soutiensJson from '../src/data/soutiens.json';
import populariteJson from '../src/data/popularite.json';
import { catalogue, erreursCatalogue } from '../src/catalogue';
import { assembler, validerCatalogue } from '../src/core/catalogue';
import { indexer } from '../src/core/extension';
import { rngAGraine } from '../src/core/rng';
import { tirerBooster } from '../src/core/tirage';
import { ouvrir } from '../src/core/ouverture';
import { acheter, doublonsRevendables, prixAchat } from '../src/core/boutique';
import { entreesCollection, entreesSoutiens } from '../src/core/collection';
import { probabilites } from '../src/core/probabilites';
import { evenementCarte, evenementsOuverture, type ConfigQuetes } from '../src/core/quetes';
import { exporterSauvegarde, importerSauvegarde, sauvegardeParDefaut } from '../src/core/sauvegarde';
import type { Popularite } from '../src/core/types';

const lancement = catalogue[0]!;
const extension = assembler(lancement);
const booster = lancement.booster;
const index = indexer(extension);
const config = quetesJson as unknown as ConfigQuetes;

describe('cartes Soutien : données', () => {
  it('le catalogue charge les 20 cartes de soutiens.json, numérotées de 1 à 20, sans erreur', () => {
    expect(erreursCatalogue).toEqual([]);
    expect(validerCatalogue(catalogue)).toEqual([]);
    expect(index.soutiens).toHaveLength(20);
    expect(index.soutiens.map((s) => s.numero)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    expect(index.soutiens.map((s) => s.id)).toEqual(soutiensJson.soutiens.map((s) => s.id));
  });

  it('raretés : 10 Objets ♦, 6 Soutiens ♦♦, 4 Terrains ♦♦♦', () => {
    expect(index.soutiensParFinition('commune').every((s) => s.type === 'objet')).toBe(true);
    expect([index.soutiensParFinition('commune').length, index.soutiensParFinition('peu-commune').length, index.soutiensParFinition('holo').length]).toEqual([10, 6, 4]);
  });

  it('elles ne font pas partie des cartes de personnages (numéros /total, cote, draft inchangés)', () => {
    expect(extension.cartes.some((c) => c.id.startsWith('sou-'))).toBe(false);
    expect(entreesCollection(sauvegardeParDefaut(), extension)).toHaveLength(extension.cartes.length);
  });

  it('un id de carte Soutien en double ou une rareté inconnue est refusé', () => {
    const s = lancement.soutiens!;
    const casse = [{ ...lancement, soutiens: [...s, s[0]!, { ...s[1]!, id: 'sou-x', finition: 'dorée' as never }] }];
    const e = validerCatalogue(casse);
    expect(e.some((m) => m.includes(s[0]!.id) && /uniques/.test(m))).toBe(true);
    expect(e.some((m) => /rareté inconnue/.test(m))).toBe(true);
  });
});

describe('cartes Soutien : tirage', () => {
  it('sans option (draft), aucune carte Soutien et le tirage reste celui d’avant', () => {
    const sans = { ...extension, soutiens: [] };
    for (let i = 0; i < 200; i++) {
      const t = tirerBooster(booster, extension, rngAGraine(`draft-${i}`));
      expect(t.cartes.every((c) => index.carte(c.carteId))).toBe(true);
      expect(t).toEqual(tirerBooster(booster, sans, rngAGraine(`draft-${i}`)));
    }
  });

  it('avec option, elles sortent avec les personnages de même rareté, à chances égales', () => {
    const rng = rngAGraine('soutiens');
    const compte = new Map<string, number>();
    let communes = 0;
    for (let i = 0; i < 4000; i++) {
      for (const c of tirerBooster(booster, extension, rng, { avecSoutiens: true }).cartes) {
        const s = index.soutien(c.carteId);
        const finition = s?.finition ?? index.carte(c.carteId)!.finition;
        expect(finition).toBe(c.finition);
        if (c.finition === 'commune') communes++;
        if (s) compte.set(s.id, (compte.get(s.id) ?? 0) + 1);
      }
    }
    expect(compte.size).toBe(20); // toutes sortent
    // Une carte commune précise : 1 chance sur le nombre de cartes communes (personnages + Objets).
    const attendu = communes / index.tirables('commune').length;
    for (const s of index.soutiensParFinition('commune')) {
      expect(compte.get(s.id)!).toBeGreaterThan(attendu * 0.7);
      expect(compte.get(s.id)!).toBeLessThan(attendu * 1.3);
    }
  });

  it('probabilités affichées : le nombre de cartes par rareté compte les cartes Soutien', () => {
    const lignes = probabilites(booster, extension).emplacements[0]!.finitions;
    for (const l of lignes) expect(l.cartes).toBe(index.parFinition(l.finition).length + index.soutiensParFinition(l.finition).length);
  });
});

describe('cartes Soutien : collection, boutique, quêtes, sauvegarde', () => {
  it('une ouverture ajoute la carte Soutien à la collection et produit un événement sans série ni élément', () => {
    let s = { ...sauvegardeParDefaut(), sceaux: 10_000 };
    let vue: string | null = null;
    for (let i = 0; i < 60 && !vue; i++) {
      const r = ouvrir(s, booster, extension, rngAGraine(`ouv-${i}`), new Date('2026-11-12T10:00:00Z'), config.tableGarantie.finitions);
      if (!r.ok) throw new Error('ouverture refusée');
      s = r.sauvegarde;
      const tiree = r.ouverture.cartes.find((c) => index.soutien(c.carteId));
      if (tiree) {
        vue = tiree.carteId;
        expect(s.collection[vue]).toBeGreaterThan(0);
        const evts = evenementsOuverture(r.ouverture, extension);
        expect(evts).toHaveLength(1 + r.ouverture.cartes.length);
        expect(evts.some((e) => e.type === 'carte-obtenue' && e.serie === null && e.element === null)).toBe(true);
      }
    }
    expect(vue).not.toBeNull();
    expect(entreesSoutiens(s, extension).find((e) => e.soutien.id === vue)!.exemplaires).toBeGreaterThan(0);
  });

  it('boutique : une carte Soutien s’achète au prix de sa rareté et ne se revend pas', () => {
    const terrain = index.soutiensParFinition('holo')[0]!;
    const prix = prixAchat('holo');
    const s = { ...sauvegardeParDefaut(), points: { [extension.id]: prix * 2 } };
    const r = acheter(s, extension, terrain.id);
    if (!r.ok) throw new Error('achat refusé');
    expect(r.soldeApres).toBe(prix);
    expect(r.sauvegarde.collection[terrain.id]).toBe(1);
    expect(evenementCarte(extension, terrain.id, true)).toEqual({ type: 'carte-obtenue', finition: 'holo', serie: null, element: null, nouvelle: true });
    const deux = acheter(r.sauvegarde, extension, terrain.id);
    if (!deux.ok) throw new Error('achat refusé');
    expect(doublonsRevendables(deux.sauvegarde, extension, populariteJson as unknown as Popularite)).toEqual([]);
  });

  it('export puis import : les cartes Soutien sont des cartes connues ; un id inconnu reste refusé', () => {
    const s = { ...sauvegardeParDefaut(), collection: { 'sou-onigiri': 3 } };
    const contexte = { extension, extensions: [extension], refuserCartesInconnues: true };
    const r = importerSauvegarde(exporterSauvegarde(s), contexte);
    expect(r.ok && r.sauvegarde.collection['sou-onigiri']).toBe(3);
    const inconnue = importerSauvegarde(exporterSauvegarde({ ...s, collection: { 'sou-inexistante': 1 } }), contexte);
    expect(inconnue.ok).toBe(false);
  });
});
