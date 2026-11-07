import { describe, expect, it } from 'vitest';
import extensionJson from '../src/data/extension-lancement.json';
import renfortsJson from '../src/data/extension-renforts.json';
import { fusionner } from '../src/core/catalogue';
import boosterJson from '../src/data/booster-lancement.json';
import populariteJson from '../src/data/popularite.json';
import populariteBaseJson from '../src/data/popularite-base.json';
import { lireFichierPopularite, versPopularite, type BasePopularite } from '../src/core/popularite';
import type { Booster, Carte, Extension, FinitionId, Popularite, Sauvegarde } from '../src/core/types';
import { COTE_PAR_SCEAU, TOTAL_POIDS } from '../src/core/regles';
import {
  coteExemplaire,
  formaterCote,
  formaterTendance,
  plusFortesHausses,
  sceauxPourCote,
  tendanceCote,
  valeurCollection,
} from '../src/core/cote';
import { doublonsRevendables, prixRevente, revendre } from '../src/core/boutique';
import { sauvegardeParDefaut } from '../src/core/sauvegarde';
import { validerPopularite } from '../src/core/validation';

const extension = extensionJson as unknown as Extension;
const renforts = renfortsJson as unknown as Extension;
/** Toutes les extensions du jeu (popularite.json en contient les personnages). */
const toutes = fusionner([extension, renforts]);
const booster = boosterJson as unknown as Booster;
const avec = (s: Partial<Sauvegarde>): Sauvegarde => ({ ...sauvegardeParDefaut(), ...s });
const carte = (id: string): Carte => extension.cartes.find((c) => c.id === id)!;
const carteDe = (finition: FinitionId): Carte => extension.cartes.find((c) => c.finition === finition)!;

/** Popularité uniforme (tous les personnages à `courante`, `precedente`), avec des exceptions par personnage. */
function pop(courante: number, precedente = courante, exceptions: Record<string, [number, number]> = {}): Popularite {
  const p: Popularite = { semaine: 'S2', semainePrecedente: 'S1', courante: {}, precedente: {} };
  for (const x of extension.personnages) {
    const [a, b] = exceptions[x.id] ?? [courante, precedente];
    p.courante[x.id] = a;
    p.precedente[x.id] = b;
  }
  return p;
}

describe('fichier popularite.json (par personnage)', () => {
  /** Popularité du jeu : popularite.json (ancien format migré en mémoire, ou nouveau) + popularite-base.json. */
  const base = populariteBaseJson as BasePopularite;
  const lu = lireFichierPopularite(populariteJson, base);
  if (!('fichier' in lu)) throw new Error(lu.erreurs.join(' '));
  const jeu = versPopularite(lu.fichier, base);

  it('se lit sans erreur ; la popularité du jeu a une valeur de 1 à 100 par personnage, Lancement et Renforts', () => {
    expect(validerPopularite(jeu, toutes)).toEqual([]);
    expect(Object.keys(jeu.courante).every((k) => k.startsWith('per-') || k.startsWith('ren-per-'))).toBe(true);
    expect(Object.values(jeu.courante).every((v) => v >= 1 && v <= 100)).toBe(true);
  });

  it('une extension pas encore sortie peut déjà figurer, sans être exigée', () => {
    expect(validerPopularite(jeu, extension, toutes)).toEqual([]);
    expect(validerPopularite(jeu, extension)[0]).toMatch(/personnage inconnu « ren-per-/);
    const sansRenforts = structuredClone(jeu);
    for (const id of renforts.personnages.map((x) => x.id)) delete sansRenforts.courante[id];
    expect(validerPopularite(sansRenforts, extension, toutes).filter((m) => m.includes('courante'))).toEqual([]);
    expect(validerPopularite(sansRenforts, toutes)).toContain(`Popularité courante : aucune valeur pour le personnage ${renforts.personnages[0]!.id}.`);
  });

  it('une valeur manquante, hors limites ou un personnage inconnu est signalé', () => {
    const p = pop(50);
    delete p.courante['per-001'];
    p.precedente['per-002'] = 101;
    p.courante['lan-001'] = 10;
    const e = validerPopularite(p, extension);
    expect(e).toContain('Popularité courante : aucune valeur pour le personnage per-001.');
    expect(e).toContain('Popularité precedente : le personnage per-002 doit avoir un entier de 0 à 100 (valeur : 101).');
    expect(e).toContain('Popularité courante : personnage inconnu « lan-001 ».');
  });
});

describe('cote = popularité du personnage × multiplicateur de la rareté', () => {
  it('multiplicateurs par rareté', () => {
    expect(coteExemplaire(80, 'commune')).toBe(80);
    expect(coteExemplaire(41, 'peu-commune')).toBe(61.5);
    expect(coteExemplaire(80, 'holo')).toBe(240);
    expect(coteExemplaire(80, 'holo-integrale')).toBe(400);
    expect(coteExemplaire(80, 'pleine')).toBe(640);
    expect(coteExemplaire(80, 'alternative')).toBe(1200);
    expect(coteExemplaire(80, 'immersive')).toBe(3200);
    expect(coteExemplaire(80, 'couronne')).toBe(8000);
  });

  it('toutes les cartes d’un personnage suivent sa popularité, chacune avec sa rareté', () => {
    const p = pop(50, 50, { 'per-001': [60, 50] });
    expect(tendanceCote(p, carte('lan-001'))).toEqual({ actuelle: 300, precedente: 250, variation: 50, sens: 'hausse' }); // ♦♦♦♦ ×5
    expect(tendanceCote(p, carte('lan-125'))).toEqual({ actuelle: 900, precedente: 750, variation: 150, sens: 'hausse' }); // ★★ ×15
    expect(tendanceCote(p, carte('lan-002')).sens).toBe('stable');
  });

  it('valeur totale de la collection = somme des exemplaires × cote de chaque carte', () => {
    const p = pop(50, 40);
    const s = avec({ collection: { 'lan-001': 2, 'lan-125': 1 } });
    expect(valeurCollection(s, extension, p)).toEqual({ actuelle: 2 * 250 + 750, precedente: 2 * 200 + 600, variation: 250, sens: 'hausse' });
    expect(valeurCollection(avec({}), extension, p)).toEqual({ actuelle: 0, precedente: 0, variation: 0, sens: 'stable' });
  });

  it('plus fortes hausses : par personnage, « possédée » si une de ses cartes est possédée', () => {
    const p = pop(50, 50, { 'per-010': [70, 50], 'per-020': [90, 85], 'per-001': [60, 45], 'per-040': [10, 40] });
    const s = avec({ collection: { 'lan-125': 1 } }); // carte secrète de Luffy (per-001)
    expect(plusFortesHausses(s, extension, p).map((h) => [h.personnage.id, h.gain, h.possedee])).toEqual([
      ['per-010', 20, false], ['per-001', 15, true], ['per-020', 5, false],
    ]);
    expect(plusFortesHausses(s, extension, pop(50))).toEqual([]);
  });

  it('affichage : tendance toujours écrite (pas seulement par la couleur)', () => {
    expect(formaterTendance({ variation: 30, sens: 'hausse' })).toBe('▲ +30');
    expect(formaterTendance({ variation: -10.5, sens: 'baisse' })).toBe('▼ −10,5');
    expect(formaterTendance({ variation: 0, sens: 'stable' })).toBe('= 0');
    expect(formaterCote(12345.5)).toBe('12 345,5');
  });
});

describe('revente selon la cote (par id de carte)', () => {
  it(`1 sceau par tranche entière de ${COTE_PAR_SCEAU} de cote`, () => {
    expect(sceauxPourCote(599.5)).toBe(0);
    expect(sceauxPourCote(600)).toBe(1);
    expect(sceauxPourCote(8000)).toBe(13);
    const p = pop(80);
    expect((['commune', 'peu-commune', 'holo', 'holo-integrale', 'pleine', 'alternative', 'immersive', 'couronne'] as FinitionId[])
      .map((f) => prixRevente(p, carteDe(f)))).toEqual([0, 0, 0, 0, 1, 2, 5, 13]);
  });

  it('revend un exemplaire en trop d’une carte au prix de sa cote', () => {
    const imm = carteDe('immersive');
    const s = avec({ sceaux: 3, collection: { [imm.id]: 3 } });
    const r = revendre(s, pop(80), extension, imm.id);
    expect(r).toMatchObject({ ok: true, sceauxGagnes: 5, restants: 2 });
    if (!r.ok) return;
    expect(r.sauvegarde.sceaux).toBe(8);
    expect(r.sauvegarde.collection[imm.id]).toBe(2);
    expect(s.collection[imm.id]).toBe(3);
  });

  it('jamais le dernier exemplaire', () => {
    const c = carteDe('couronne');
    const p = pop(80);
    expect(revendre(avec({ collection: { [c.id]: 1 } }), p, extension, c.id)).toEqual({ ok: false, raison: 'pas-de-doublon' });
    expect(revendre(avec({ collection: { [c.id]: 3 } }), p, extension, c.id, 3)).toEqual({ ok: false, raison: 'quantite-invalide' });
    const r = revendre(avec({ collection: { [c.id]: 3 } }), p, extension, c.id, 2);
    expect(r.ok && r.restants).toBe(1);
  });

  it('cote trop basse, carte inconnue ou quantité invalide : refusé', () => {
    const holo = carteDe('holo');
    expect(revendre(avec({ collection: { [holo.id]: 9 } }), pop(100), extension, holo.id)).toEqual({ ok: false, raison: 'non-revendable' });
    expect(revendre(avec({}), pop(100), extension, 'lan-999')).toEqual({ ok: false, raison: 'carte-inconnue' });
    const c = carteDe('couronne');
    for (const q of [0, -1, 1.5]) expect(revendre(avec({ collection: { [c.id]: 5 } }), pop(80), extension, c.id, q)).toEqual({ ok: false, raison: 'quantite-invalide' });
  });

  it('liste des doublons revendables, avec cote et prix, dans l’ordre des numéros', () => {
    const pleine = carteDe('pleine');
    const couronne = carteDe('couronne');
    const s = avec({ collection: { [couronne.id]: 2, [pleine.id]: 4, [carteDe('commune').id]: 9, [carteDe('alternative').id]: 1 } });
    expect(doublonsRevendables(s, extension, pop(80)).map((d) => [d.carte.id, d.enTrop, d.cote, d.prixUnitaire])).toEqual([
      [pleine.id, 3, 640, 1],
      [couronne.id, 1, 8000, 13],
    ]);
    // À popularité 70, la pleine ne vaut plus 1 sceau : elle disparaît de la liste.
    expect(doublonsRevendables(s, extension, pop(70)).map((d) => d.carte.id)).toEqual([couronne.id]);
  });

  it('économie bornée : même à popularité 100 partout, revendre un booster entier rapporte moins d’un demi-sceau en moyenne', () => {
    const p = pop(100);
    const esperance = (finitions: Partial<Record<FinitionId, number>>, nb: number): number =>
      (Object.entries(finitions) as [FinitionId, number][]).reduce((a, [f, poids]) => a + nb * (poids / TOTAL_POIDS) * prixRevente(p, carteDe(f)), 0);
    const normal = booster.emplacements.reduce((a, t) => a + esperance(t.finitions, t.emplacements.length), 0);
    const exceptionnel = esperance(booster.tableExceptionnelle.finitions, booster.cartesParBooster);
    const taux = booster.tauxExceptionnel / TOTAL_POIDS;
    expect((1 - taux) * normal + taux * exceptionnel).toBeLessThan(booster.cout.quantite * 0.5);
  });
});
