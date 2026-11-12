import { describe, expect, it } from 'vitest';
import populariteJson from '../src/data/popularite.json';
import themesJson from '../src/data/themes-draft.json';
import quetesJson from '../src/data/quetes.json';
import listeJson from '../src/data/extensions.json';
import { catalogue, erreursCatalogue } from '../src/catalogue';
import type { Booster, Sauvegarde } from '../src/core/types';
import populariteBaseJson from '../src/data/popularite-base.json';
import type { BasePopularite } from '../src/core/popularite';
import {
  assembler, construireCatalogue, disponibles, disponiblesAu, disponiblesPourDraft, extensionDeBooster,
  joursDepuisSortie, toutesLesExtensions, trouverCarte, vaguesAvecCalendrier, validerCatalogue, validerJeu,
  type EntreeExtension,
} from '../src/core/catalogue';
import { genererDraft, lundiSemaineIso, type Theme } from '../src/core/draft';
import { ouvrir } from '../src/core/ouverture';
import { tirerBooster } from '../src/core/tirage';
import { rngAGraine } from '../src/core/rng';
import { acheter, soldePoints } from '../src/core/boutique';
import { completion, entreesCollection } from '../src/core/collection';
import { probabilites } from '../src/core/probabilites';
import { sauvegardeParDefaut, validerSauvegarde } from '../src/core/sauvegarde';
import { appliquerLancements, validerConfigQuetes, vueLancements, type ConfigQuetes } from '../src/core/quetes';
import { indexer } from '../src/core/extension';

const pop = { base: populariteBaseJson as BasePopularite, fichier: populariteJson as unknown };
const themes = themesJson.themes as Theme[];
const config = quetesJson as unknown as ConfigQuetes;
const lancement = catalogue[0]!;
const SORTIE_RENFORTS = lancement.vagues[1]!.disponibleLe;
const AVANT = '2026-11-05';
/** Jour local à 20 h. */
const jour = (iso: string, heure = 20): Date => {
  const [a, m, d] = iso.split('-').map(Number) as [number, number, number];
  return new Date(a, m - 1, d, heure);
};
const plusJours = (iso: string, n: number): Date => { const d = jour(iso); d.setDate(d.getDate() + n); return d; };
const avant = disponiblesAu(catalogue, AVANT)[0]!;
const apres = disponiblesAu(catalogue, SORTIE_RENFORTS)[0]!;

describe('src/data/extensions.json : Lancement, en vagues, un seul booster', () => {
  it('une extension, un booster, trois vagues (Lancement, Renforts, Vague 3) ; tout est valide', () => {
    expect(erreursCatalogue).toEqual([]);
    expect(catalogue.map((e) => [e.id, e.booster.id, e.vagues.map((v) => v.id)])).toEqual([['lancement', 'booster-lancement', ['lancement', 'renforts', 'vague-3']]]);
    expect(validerCatalogue(catalogue)).toEqual([]);
    expect(validerJeu(catalogue, pop, themes, jour(AVANT))).toEqual([]);
    expect(validerJeu(catalogue, pop, themes, jour(SORTIE_RENFORTS))).toEqual([]);
    expect(validerConfigQuetes(config)).toEqual([]);
  });

  it('avant la sortie de Renforts : 140 cartes, 100 de base, aucune ren-xxx', () => {
    expect([avant.extension.total, avant.extension.totalAvecSecretes]).toEqual([100, 140]);
    expect(avant.extension.cartes.some((c) => c.id.startsWith('ren-'))).toBe(false);
    expect(disponibles(catalogue, plusJours(SORTIE_RENFORTS, -1))[0]!.extension).toBe(avant.extension);
  });

  it('à sa date, Renforts rejoint le même booster : 172 cartes, 124 de base, même booster', () => {
    expect([apres.extension.id, apres.extension.total, apres.extension.totalAvecSecretes]).toEqual(['lancement', 124, 172]);
    expect(apres.booster).toBe(avant.booster);
    expect(disponibles(catalogue, jour(SORTIE_RENFORTS, 0))[0]!.extension).toBe(apres.extension);
  });

  it('numérotation : bases de Lancement, puis de Renforts, puis secrètes par rareté (toutes vagues)', () => {
    const n = (id: string): number => indexer(apres.extension).carte(id)!.numero;
    expect([n('lan-001'), n('lan-100'), n('ren-001'), n('ren-024')]).toEqual([1, 100, 101, 124]);
    // ★ : 24 de Lancement (125 à 148), puis 4 de Renforts (149 à 152) ; ★★ : 10 + 2 ; ★★★ : 3 + 1 ; ♛ : 3 + 1.
    expect([n('lan-101'), n('ren-025'), n('ren-028'), n('ren-029'), n('ren-031'), n('ren-032')]).toEqual([125, 149, 152, 163, 168, 172]);
    const ordre = apres.extension.cartes.slice().sort((a, b) => a.numero - b.numero);
    expect(ordre.slice(0, 124).every((c) => !c.secrete)).toBe(true);
    expect(ordre.slice(124).map((c) => c.finition)).toEqual([...ordre.slice(124).map((c) => c.finition)].sort((a, b) =>
      ['pleine', 'alternative', 'immersive', 'couronne'].indexOf(a) - ['pleine', 'alternative', 'immersive', 'couronne'].indexOf(b)));
    // Avant Renforts, les numéros de Lancement sont ceux du fichier.
    expect(indexer(avant.extension).carte('lan-101')!.numero).toBe(101);
  });

  it('chaque carte garde son id et indique sa vague', () => {
    expect(apres.extension.cartes.filter((c) => c.vague === 'renforts').map((c) => c.id).every((id) => id.startsWith('ren-'))).toBe(true);
    expect(apres.extension.cartes.filter((c) => c.vague === 'lancement')).toHaveLength(140);
  });

  it('ids de cartes et de personnages uniques entre vagues', () => {
    const v2 = lancement.vagues[1]!;
    const doublon = { ...v2, donnees: { ...v2.donnees, cartes: v2.donnees.cartes.map((c, i) => (i === 0 ? { ...c, id: 'lan-001' } : c)) } };
    const e = validerCatalogue([{ ...lancement, vagues: [lancement.vagues[0]!, doublon] }]);
    expect(e).toContain('Extensions : carte « lan-001 » présent dans « lancement » et « renforts » (les ids doivent être uniques).');
  });

  it('liste mal formée : fichier absent, date invalide ou dans le désordre, booster d’une autre extension', () => {
    const fichiers = { 'a.json': lancement.vagues[0]!.donnees, 'b.json': { ...lancement.booster, extension: 'autre' }, 'c.json': lancement.vagues[1]!.donnees };
    const entrees: EntreeExtension[] = [{ id: 'lancement', nom: 'Lancement', edition: 1, booster: 'b.json', vagues: [
      { id: 'lancement', nom: 'Lancement', fichier: 'a.json', disponibleLe: '2026-11-10' },
      { id: 'renforts', nom: 'Renforts', fichier: 'c.json', disponibleLe: '2026-11-01' },
      { id: 'x', nom: 'X', fichier: 'absent.json', disponibleLe: '2026-13-01' },
    ] }];
    const { erreurs } = construireCatalogue(entrees, fichiers);
    expect(erreurs.some((m) => /rangées par date/.test(m))).toBe(true);
    expect(erreurs.some((m) => /appartient à l'extension « autre »/.test(m))).toBe(true);
    expect(erreurs.some((m) => /disponibleLe » invalide/.test(m))).toBe(true);
    expect(erreurs.some((m) => /« absent.json » introuvable/.test(m))).toBe(true);
    expect(construireCatalogue(listeJson.extensions as EntreeExtension[], {}).erreurs.length).toBeGreaterThan(0);
  });
});

describe('tirage : une rareté, puis une carte parmi toutes les cartes sorties de cette rareté', () => {
  it('avant Renforts : aucune carte ren-xxx ; après : les deux vagues, à poids égaux', () => {
    const rng = rngAGraine('vagues');
    let ren = 0, communes = 0, renCommunes = 0;
    for (let i = 0; i < 4000; i++) {
      expect(tirerBooster(avant.booster, avant.extension, rng).cartes.every((c) => c.carteId.startsWith('lan-'))).toBe(true);
      for (const c of tirerBooster(apres.booster, apres.extension, rng).cartes) {
        if (c.carteId.startsWith('ren-')) ren++;
        if (c.finition === 'commune') { communes++; if (c.carteId.startsWith('ren-')) renCommunes++; }
      }
    }
    expect(ren).toBeGreaterThan(0);
    // 12 communes Renforts sur 62 : environ 19,4 % des communes.
    expect(renCommunes / communes).toBeGreaterThan(0.17);
    expect(renCommunes / communes).toBeLessThan(0.22);
  });

  it('probabilités : nombre de cartes par rareté de toutes les vagues sorties', () => {
    const avantP = probabilites(avant.booster, avant.extension).emplacements[0]!.finitions.find((l) => l.finition === 'commune')!;
    const apresP = probabilites(apres.booster, apres.extension).emplacements[0]!.finitions.find((l) => l.finition === 'commune')!;
    // 10 Objets (♦) s'ajoutent aux personnages de même rareté.
    expect([avantP.cartes, apresP.cartes]).toEqual([50 + 10, 62 + 10]);
  });

  it('validation : une rareté à poids non nul doit avoir au moins une carte parmi les cartes sorties', () => {
    const sansCouronne = { ...lancement, vagues: lancement.vagues.map((v) => ({ ...v, donnees: { ...v.donnees, cartes: v.donnees.cartes.filter((c) => c.finition !== 'couronne'), totalAvecSecretes: v.donnees.totalAvecSecretes - v.donnees.cartes.filter((c) => c.finition === 'couronne').length } })) };
    const e = validerJeu([sansCouronne], pop, themes, jour(SORTIE_RENFORTS));
    expect(e.some((m) => /« couronne » a un poids/.test(m))).toBe(true);
  });
});

describe('un seul ensemble Lancement', () => {
  const s0: Sauvegarde = { ...sauvegardeParDefaut(), sceaux: 300, points: { lancement: 40 } };

  it('ouvrir donne des points Lancement, quelle que soit la vague des cartes', () => {
    let s = s0;
    const rng = rngAGraine('ouvrir');
    for (let i = 0; i < 100; i++) {
      const r = ouvrir(s, apres.booster, apres.extension, rng, jour(SORTIE_RENFORTS));
      if (!r.ok) throw new Error();
      s = r.sauvegarde;
    }
    expect(Object.keys(s.points)).toEqual(['lancement']);
    expect(s.points.lancement).toBe(40 + 100 * apres.booster.pointsParOuverture);
    expect(Object.keys(s.collection).some((id) => id.startsWith('ren-'))).toBe(true);
  });

  it('collection : 172 cartes après Renforts (140 avant), une carte Renforts compte', () => {
    const s: Sauvegarde = { ...s0, collection: { 'lan-001': 1, 'ren-001': 1 } };
    expect(completion(entreesCollection(s, avant.extension))).toMatchObject({ possedees: 1, total: 140 });
    expect(completion(entreesCollection(s, apres.extension))).toMatchObject({ possedees: 2, total: 172 });
  });

  it('boutique : une carte Renforts s’achète avec les points Lancement', () => {
    const commune = apres.extension.cartes.find((c) => c.id.startsWith('ren-') && c.finition === 'commune')!;
    const r = acheter({ ...s0, points: { lancement: 35 } }, apres.extension, commune.id);
    if (!r.ok) throw new Error(r.raison);
    expect(soldePoints(r.sauvegarde, apres.extension)).toBe(0);
    // Avant sa sortie, elle n'est pas en vente.
    expect(acheter({ ...s0, points: { lancement: 5000 } }, avant.extension, commune.id).ok).toBe(false);
  });

  it('retrouver une carte ou le booster parmi les cartes sorties', () => {
    expect(trouverCarte([apres], 'ren-032')?.carte.numero).toBe(172);
    expect(trouverCarte([avant], 'ren-032')).toBeUndefined();
    expect(extensionDeBooster([apres], 'booster-lancement')?.extension).toBe(apres.extension);
  });

  it('cartes connues (import) : toutes les vagues, même pas encore sorties', () => {
    const s = { ...sauvegardeParDefaut(), collection: { 'ren-001': 1 } };
    expect(validerSauvegarde(s, { extensions: toutesLesExtensions(catalogue), refuserCartesInconnues: true }).ok).toBe(true);
    expect(validerSauvegarde(s, { extensions: [lancement.vagues[0]!.donnees], refuserCartesInconnues: true }).ok).toBe(false);
  });

  it('assemblage mis en cache : même objet pour les mêmes vagues', () => {
    expect(assembler(lancement, 2)).toBe(apres.extension);
    expect(assembler(lancement)).toBe(assembler(lancement, 3));
  });
});

describe('draft et calendrier de sortie d’une vague', () => {
  it('draft : cartes des vagues sorties au lundi de la semaine', () => {
    const lundiApres = plusJours(SORTIE_RENFORTS, ((8 - jour(SORTIE_RENFORTS).getDay()) % 7) || 7);
    expect(disponiblesPourDraft(catalogue, lundiApres)[0]!.extension.totalAvecSecretes).toBe(172);
    const src = (sem: string) => disponiblesPourDraft(catalogue, lundiSemaineIso(sem));
    const d = genererDraft('2027-S10', src, themes);
    expect(d.graine).toBe('draft:lancement:2027-S10');
    const tout = Array.from({ length: 20 }, (_, i) => genererDraft(`2027-S${String(10 + i).padStart(2, '0')}`, src, themes)).flatMap((x) => x.cartes);
    expect(tout.some((c) => c.carteId.startsWith('ren-'))).toBe(true);
    expect(genererDraft('2026-S45', src, themes).cartes.every((c) => c.carteId.startsWith('lan-'))).toBe(true); // semaine commencée avant Renforts
  });

  it('calendrier de sortie : chaque vague après la première (2, 2, 1, 1, 1, 1, 2), une case par jour calendaire', () => {
    const vagues = vaguesAvecCalendrier(catalogue);
    expect(vagues).toEqual([{ id: 'renforts', nom: 'Renforts', disponibleLe: SORTIE_RENFORTS }, { id: 'vague-3', nom: 'Vague 3', disponibleLe: '2026-11-13' }]);
    // La vague 3 sort 7 jours après Renforts : son calendrier est vérifié à part.
    const tous = vagues;
    {
    let s = sauvegardeParDefaut();
    const recus: number[] = [];
    for (const n of [-1, 0, 0, 1, 4, 6, 7]) {
      const r = appliquerLancements(s, vagues.slice(0, 1), config, plusJours(SORTIE_RENFORTS, n));
      recus.push(...r.gains.map((g) => g.jour));
      s = r.sauvegarde;
    }
    expect(recus).toEqual([1, 2, 5, 7]);
    expect(s.sceaux).toBe(2 + 2 + 1 + 2);
    expect(vueLancements(s, vagues.slice(0, 1), config, plusJours(SORTIE_RENFORTS, 7))).toEqual([]);
    expect(vueLancements(s, vagues.slice(0, 1), config, plusJours(SORTIE_RENFORTS, 2))[0]!.nom).toBe('Renforts');
    }
    // Vague 3 : même calendrier, à partir de sa date de sortie ; les deux calendriers se suivent sans se gêner.
    const sortie3 = tous[1]!.disponibleLe;
    const r3 = appliquerLancements(sauvegardeParDefaut(), tous, config, jour(sortie3));
    expect(r3.gains.map((g) => g.jour)).toEqual([1]); // jour 1 de la vague 3 ; le calendrier de Renforts est fini la veille
    expect(vueLancements(r3.sauvegarde, tous, config, plusJours(sortie3, 1)).map((v) => v.nom)).toEqual(['Vague 3']);
  });

  it('vague 3 (2026-11-13) : 8 cartes de base de Naruto et One Piece, ids à la suite de Renforts, numérotées après elles', () => {
    const veille = disponibles(catalogue, plusJours('2026-11-13', -1))[0]!.extension;
    const sortie = disponibles(catalogue, jour('2026-11-13'))[0]!.extension;
    expect(validerJeu(catalogue, pop, themes, jour('2026-11-13'))).toEqual([]);
    expect([veille.total, veille.totalAvecSecretes]).toEqual([124, 172]);
    expect([sortie.total, sortie.totalAvecSecretes]).toEqual([132, 180]);
    const nouvelles = sortie.cartes.filter((c) => !veille.cartes.some((x) => x.id === c.id));
    expect(nouvelles.map((c) => c.id)).toEqual(['ren-033', 'ren-034', 'ren-035', 'ren-036', 'ren-037', 'ren-038', 'ren-039', 'ren-040']);
    expect(nouvelles.map((c) => c.numero)).toEqual([125, 126, 127, 128, 129, 130, 131, 132]);
    expect(nouvelles.every((c) => !c.secrete)).toBe(true);
    const index = indexer(sortie);
    expect(nouvelles.map((c) => index.personnageDe(c).serie)).toEqual(['Naruto', 'Naruto', 'Naruto', 'Naruto', 'One Piece', 'One Piece', 'One Piece', 'One Piece']);
    // Les numéros des cartes déjà sorties ne bougent pas pour les cartes de base ; les ids ne changent jamais.
    expect(sortie.cartes.find((c) => c.id === 'ren-001')!.numero).toBe(101);
  });

  it('jours depuis la sortie, en jours locaux', () => {
    expect(joursDepuisSortie('2026-11-06', new Date(2026, 10, 6, 0, 1))).toBe(0);
    expect(joursDepuisSortie('2026-11-06', new Date(2026, 10, 5, 23, 59))).toBe(-1);
  });
});

// Le booster de Renforts n'existe plus.
it('booster-renforts.json supprimé : un seul booster', () => {
  const boosters = Object.keys(import.meta.glob('../src/data/booster-*.json'));
  expect(boosters).toEqual(['../src/data/booster-lancement.json']);
  expect((lancement.booster as Booster).extension).toBe('lancement');
});
