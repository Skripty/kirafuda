import { describe, expect, it } from 'vitest';
import extensionJson from '../src/data/extension-lancement.json';
import renfortsJson from '../src/data/extension-renforts.json';
import type { Extension, Sauvegarde } from '../src/core/types';
import {
  CLE_SAUVEGARDE,
  CLE_SAUVEGARDE_ILLISIBLE,
  chargerSauvegarde,
  enregistrerSauvegarde,
  exporterSauvegarde,
  importerSauvegarde,
  migrer,
  nomFichierExport,
  sauvegardeParDefaut,
  validerSauvegarde,
  type Stockage,
} from '../src/core/sauvegarde';
import { etatQuetesInitial } from '../src/core/quetes';
import { bib } from './outils-combat';
import { deckStandard } from '../src/core/combat/decks';
import { rngAGraine } from '../src/core/rng';
import { creerPartie } from '../src/core/combat/moteur';

/** Faux localStorage qui compte les écritures et peut simuler un stockage plein. */
class StockageMemoire implements Stockage {
  donnees = new Map<string, string>();
  ecritures = 0;
  plein = false;
  getItem(cle: string): string | null { return this.donnees.get(cle) ?? null; }
  setItem(cle: string, valeur: string): void {
    if (this.plein) throw new DOMException('Quota dépassé', 'QuotaExceededError');
    this.ecritures++;
    this.donnees.set(cle, valeur);
  }
}

const exemple = (): Sauvegarde => ({
  version: 10,
  combat: { defisGagnes: [], enCours: null },
  decks: [],
  deckSelectionne: null,
  quetes: {
    ...etatQuetesInitial(), jour: '2026-11-05', progresJour: { 'ouvrir-2': 1 }, cumuls: { 'booster-ouvert': 1, 'carte-obtenue': 5 },
    debutantReclamees: ['premier-booster'], semaine: '2026-11-02', progresSemaine: 1,
    calendrierJours: 1, calendrierDernierJour: '2026-11-05',
  },
  dernierDraft: { semaine: '2026-S45', choix: [0, 3, 7, 9, 14], score: 231, sceaux: 2 },
  sceaux: 7,
  derniereRecompenseQuotidienne: '2026-11-05',
  collection: { 'lan-001': 2, 'lan-041': 1 },
  points: { lancement: 15 },
  historique: [{
    id: 'o-1',
    date: '2026-11-05T20:00:00.000Z',
    boosterId: 'booster-lancement',
    exceptionnelle: false,
    cartes: [{ carteId: 'lan-041', finition: 'holo', emplacement: 5, nouveau: true, exemplaires: 1 }],
    pointsGagnes: 5,
    vue: true,
  }],
});

const extension = extensionJson as unknown as Extension;
const renforts = renfortsJson as unknown as Extension;

/** Erreurs de validation ; `strict` : refuser les cartes absentes de l'extension (comme à l'import). */
const erreursDe = (donnees: unknown, strict = false): string[] => {
  const r = validerSauvegarde(donnees, strict ? { extension, refuserCartesInconnues: true } : {});
  return r.ok ? [] : r.erreurs;
};

describe('valeurs par défaut et lecture', () => {
  it('stockage vide : sauvegarde par défaut, sans avertissement', () => {
    const { sauvegarde, avertissement } = chargerSauvegarde(new StockageMemoire());
    expect(sauvegarde).toEqual(sauvegardeParDefaut());
    expect(sauvegarde).toEqual({ version: 10, sceaux: 0, derniereRecompenseQuotidienne: null, collection: {}, points: {}, historique: [], dernierDraft: null, quetes: etatQuetesInitial(), combat: { defisGagnes: [], enCours: null }, decks: [], deckSelectionne: null });
    expect(avertissement).toBeNull();
  });

  it('écrire puis relire redonne exactement le même état (rechargement de la page)', () => {
    const st = new StockageMemoire();
    expect(enregistrerSauvegarde(st, exemple())).toEqual({ ok: true });
    expect(chargerSauvegarde(st).sauvegarde).toEqual(exemple());
  });

  it('migre la version 8 sans effacer la sauvegarde et ajoute la progression combat', () => {
    const v8 = { ...exemple(), version: 8 } as Record<string, unknown>;
    delete v8.combat;
    const r = validerSauvegarde(v8);
    expect(r).toMatchObject({ ok: true, migreeDepuis: 8, sauvegarde: { version: 10, combat: { defisGagnes: [], enCours: null }, decks: [], deckSelectionne: null, sceaux: 7 } });
  });

  it('sauvegarde puis relit une partie de défi en cours et ses messages IA', () => {
    const deck = deckStandard('Jujutsu Kaisen', bib, rngAGraine('sauvegarde-combat'))!;
    const partie = creerPartie(bib, [deck, deckStandard('Demon Slayer', bib, rngAGraine('sauvegarde-ia'))!], 'combat-a-reprendre').partie;
    const etat = { ...exemple(), combat: { defisGagnes: ['one-piece'], enCours: { defiId: 'demon-slayer', partie, journalIA: ['L’IA pose une Base.'] } } };
    const r = validerSauvegarde(etat);
    expect(r).toMatchObject({ ok: true, sauvegarde: { combat: { defisGagnes: ['one-piece'], enCours: { defiId: 'demon-slayer', journalIA: ['L’IA pose une Base.'] } } } });
  });

  it('sauvegarde les decks du joueur et leur sélection', () => {
    const deck = { id: 'deck-1', nom: 'Mon deck', couverture: 'lan-001', cartes: ['per-001'], elements: ['feu'] as const };
    const sauvegarde = { ...exemple(), decks: [deck], deckSelectionne: deck.id };
    const resultat = validerSauvegarde(sauvegarde);
    expect(resultat).toMatchObject({ ok: true, sauvegarde: { decks: [deck], deckSelectionne: 'deck-1' } });
  });

  it('refuse plus de deux copies d’une carte dans un deck sauvegardé', () => {
    const deck = { id: 'deck-1', nom: 'Mon deck', couverture: '', cartes: ['per-001', 'per-001', 'per-001'], elements: ['feu'] };
    expect(erreursDe({ ...exemple(), decks: [deck], deckSelectionne: 'deck-1' }).join(' ')).toMatch(/deux exemplaires maximum/);
  });

  it('stockage inaccessible : valeurs par défaut et avertissement', () => {
    const st: Stockage = { getItem: () => { throw new Error('bloqué'); }, setItem: () => {} };
    const { sauvegarde, avertissement } = chargerSauvegarde(st);
    expect(sauvegarde).toEqual(sauvegardeParDefaut());
    expect(avertissement).toMatch(/indisponible/);
  });

  it('sauvegarde illisible : nouvelle partie, mais l’ancienne est mise de côté', () => {
    const st = new StockageMemoire();
    st.donnees.set(CLE_SAUVEGARDE, '{ pas du json');
    const { sauvegarde, avertissement } = chargerSauvegarde(st);
    expect(sauvegarde).toEqual(sauvegardeParDefaut());
    expect(avertissement).toMatch(/mise de côté/);
    expect(st.getItem(CLE_SAUVEGARDE_ILLISIBLE)).toBe('{ pas du json');
    expect(st.getItem(CLE_SAUVEGARDE)).toBe('{ pas du json'); // rien n'est écrasé à la lecture
  });
});

describe('écriture atomique', () => {
  it('écrit l’état complet en une seule écriture, sous une seule clé', () => {
    const st = new StockageMemoire();
    enregistrerSauvegarde(st, exemple());
    expect(st.ecritures).toBe(1);
    expect([...st.donnees.keys()]).toEqual([CLE_SAUVEGARDE]);
    expect(JSON.parse(st.getItem(CLE_SAUVEGARDE)!)).toEqual(exemple());
  });

  it('refuse d’écrire une sauvegarde invalide : l’état précédent reste intact', () => {
    const st = new StockageMemoire();
    enregistrerSauvegarde(st, exemple());
    const avant = st.getItem(CLE_SAUVEGARDE);
    const r = enregistrerSauvegarde(st, { ...exemple(), sceaux: -1 });
    expect(r.ok).toBe(false);
    expect(st.getItem(CLE_SAUVEGARDE)).toBe(avant);
  });

  it('stockage plein : erreur claire, l’état précédent reste intact', () => {
    const st = new StockageMemoire();
    enregistrerSauvegarde(st, exemple());
    const avant = st.getItem(CLE_SAUVEGARDE);
    st.plein = true;
    const r = enregistrerSauvegarde(st, { ...exemple(), sceaux: 9 });
    expect(r).toEqual({ ok: false, erreur: expect.stringMatching(/stockage plein/) });
    expect(st.getItem(CLE_SAUVEGARDE)).toBe(avant);
  });

  it('n’écrit que les champs connus', () => {
    const st = new StockageMemoire();
    enregistrerSauvegarde(st, { ...exemple(), intrus: 'x' } as Sauvegarde);
    expect(st.getItem(CLE_SAUVEGARDE)).not.toContain('intrus');
  });
});

describe('migration par numéro de version', () => {
  it('version actuelle : aucune migration', () => {
    expect(migrer({ version: 10 })).toEqual({ donnees: { version: 10 }, depuis: null });
  });

  /** Ancienne sauvegarde (modèle « personnage + finition ») : Luffy (lan-001) a une carte de base ♦♦♦♦,
   *  une ★★ (lan-125) et une ★★★ (lan-135), mais ni commune ni couronne. */
  const ancienne = (version: 1 | 2): Record<string, unknown> => ({
    version,
    sceaux: 4,
    derniereRecompenseQuotidienne: '2026-11-05',
    collection: { 'lan-001:commune': 2, 'lan-001:holo-integrale': 1, 'lan-001:alternative': 1, 'lan-001:couronne': 1 },
    points: { lancement: 10 },
    historique: [{
      id: 'o-1', date: '2026-11-05T20:00:00.000Z', boosterId: 'booster-lancement', exceptionnelle: false, pointsGagnes: 5, vue: true,
      cartes: [
        { carteId: 'lan-001', finition: 'alternative', emplacement: 5, nouveau: true, exemplaires: 1 },
        { carteId: 'lan-001', finition: 'commune', emplacement: 1, nouveau: true, exemplaires: 1 },
      ],
    }],
    ...(version === 2 ? { dernierDraft: null } : {}),
  });

  it('version 2 → 3 : chaque exemplaire devient la carte du même personnage dans la même finition, sinon des points au prix de la boutique', () => {
    const r = validerSauvegarde(ancienne(2), { extension });
    if (!r.ok) throw new Error(r.erreurs.join(' '));
    expect(r.migreeDepuis).toBe(2);
    expect(r.sauvegarde.version).toBe(10);
    expect(r.sauvegarde.collection).toEqual({ 'lan-001': 1, 'lan-125': 1 });
    // 2 communes (35) + 1 couronne (2500) sans carte équivalente → 2570 points, en plus des 10 gardés.
    expect(r.sauvegarde.points).toEqual({ lancement: 10 + 2 * 35 + 2500 });
    expect(r.sauvegarde.sceaux).toBe(4);
    expect(r.sauvegarde.derniereRecompenseQuotidienne).toBe('2026-11-05');
  });

  it('version 2 → 3 : l’historique est gardé, ses cartes converties de la même façon', () => {
    const r = validerSauvegarde(ancienne(2), { extension });
    if (!r.ok) throw new Error(r.erreurs.join(' '));
    expect(r.sauvegarde.historique[0]!.cartes.map((c) => [c.carteId, c.finition])).toEqual([['lan-125', 'alternative'], ['lan-001', 'commune']]);
  });

  it('version 1 → 10 : les migrations s’enchaînent (draft, collection, quêtes, combat et decks ajoutés)', () => {
    const r = validerSauvegarde(ancienne(1), { extension });
    if (!r.ok) throw new Error(r.erreurs.join(' '));
    expect(r).toMatchObject({ migreeDepuis: 1, sauvegarde: { version: 10, dernierDraft: null, collection: { 'lan-001': 1, 'lan-125': 1 }, combat: { defisGagnes: [], enCours: null }, decks: [], deckSelectionne: null } });
  });

  it('sans les données de l’extension, la migration vers la version 3 est refusée avec un message', () => {
    expect(erreursDe(ancienne(2))[0]).toMatch(/impossible sans les données de l’extension/);
  });

  it('une ancienne sauvegarde est réécrite en version 10 dès le chargement', () => {
    const st = new StockageMemoire();
    st.donnees.set(CLE_SAUVEGARDE, JSON.stringify(ancienne(2)));
    const c = chargerSauvegarde(st, { extension });
    expect(c.migreeDepuis).toBe(2);
    expect(c.sauvegarde.version).toBe(10);
    expect(JSON.parse(st.getItem(CLE_SAUVEGARDE)!).collection).toEqual({ 'lan-001': 1, 'lan-125': 1 });
  });

  it('version 3 → 10 : rien n’est perdu, les compteurs de débutant reprennent ce qui a déjà été fait', () => {
    const v3 = { ...exemple(), version: 3 } as Record<string, unknown>;
    delete v3.quetes;
    const r = validerSauvegarde(v3, { extension });
    if (!r.ok) throw new Error(r.erreurs.join(' '));
    expect(r.migreeDepuis).toBe(3);
    const { quetes, ...reste } = r.sauvegarde;
    const { quetes: _q, ...attendu } = exemple();
    expect(reste).toEqual({ ...attendu, version: 10, combat: { defisGagnes: [], enCours: null }, decks: [], deckSelectionne: null });
    expect(quetes).toEqual({ ...etatQuetesInitial(), cumuls: { 'booster-ouvert': 1, 'carte-obtenue': 1, 'draft-joue': 1 } });
  });

  it('version 3 sans ouverture : aucun compteur, calendrier au début (le booster garanti du jour 1 reste possible)', () => {
    const r = validerSauvegarde({ version: 3, sceaux: 2, derniereRecompenseQuotidienne: null, collection: {}, points: {}, historique: [], dernierDraft: null });
    if (!r.ok) throw new Error(r.erreurs.join(' '));
    expect(r.sauvegarde.quetes).toEqual(etatQuetesInitial());
  });

  it('version 4 → 5 : une récompense réclamée sous l’ancien id reste réclamée (10 → 30 boosters, 50 → 75 cartes)', () => {
    const v4 = { ...exemple(), version: 4, quetes: { ...exemple().quetes, debutantReclamees: ['premier-booster', 'dix-boosters', 'cartes-50'] } };
    const r = validerSauvegarde(v4, { extension });
    if (!r.ok) throw new Error(r.erreurs.join(' '));
    expect(r.migreeDepuis).toBe(4);
    expect(r.sauvegarde.quetes.debutantReclamees).toEqual(['premier-booster', 'trente-boosters', 'cartes-75']);
    const { quetes, ...reste } = r.sauvegarde;
    const { quetes: q, ...attendu } = exemple();
    expect(reste).toEqual(attendu);
    expect({ ...quetes, debutantReclamees: q.debutantReclamees }).toEqual(q); // le reste de l’état des quêtes est intact
  });

  it('version 5 → 6 : « premier draft » réclamée → « 3 drafts » considérée comme réclamée', () => {
    const v5 = { ...exemple(), version: 5, quetes: { ...exemple().quetes, debutantReclamees: ['premier-booster', 'premier-draft'] } };
    const r = validerSauvegarde(v5, { extension });
    if (!r.ok) throw new Error(r.erreurs.join(' '));
    expect(r.migreeDepuis).toBe(5);
    expect(r.sauvegarde.quetes.debutantReclamees).toEqual(['premier-booster', 'trois-drafts']);
  });

  it('version 4 → 6 : les deux renommages s’enchaînent', () => {
    const v4 = { ...exemple(), version: 4, quetes: { ...exemple().quetes, debutantReclamees: ['dix-boosters', 'premier-draft'] } };
    const r = validerSauvegarde(v4, { extension });
    if (!r.ok) throw new Error(r.erreurs.join(' '));
    expect(r.sauvegarde.quetes.debutantReclamees).toEqual(['trente-boosters', 'trois-drafts']);
  });

  it('version 4 → 5 : rien à renommer, rien ne change', () => {
    const r = validerSauvegarde({ ...exemple(), version: 4 }, { extension });
    if (!r.ok) throw new Error(r.erreurs.join(' '));
    expect(r.sauvegarde).toEqual(exemple());
  });

  it('version 6 → 7 : calendriers de lancement ajoutés (aucune case reçue), rien d’autre ne change', () => {
    const { lancementsRecus: _l, ...quetesV6 } = exemple().quetes;
    const r = validerSauvegarde({ ...exemple(), version: 6, quetes: quetesV6 }, { extension });
    if (!r.ok) throw new Error(r.erreurs.join(' '));
    expect(r.migreeDepuis).toBe(6);
    expect(r.sauvegarde).toEqual(exemple());
  });

  it('version 7 → 8 : Renforts devient une vague de Lancement — points ajoutés à Lancement, collection et historique conservés', () => {
    const v7 = {
      ...exemple(), version: 7,
      points: { lancement: 15, renforts: 25 },
      collection: { 'lan-001': 2, 'lan-041': 1, 'ren-001': 3 },
      historique: [...exemple().historique, {
        id: 'o-2', date: '2026-11-06T20:00:00.000Z', boosterId: 'booster-renforts', exceptionnelle: false, pointsGagnes: 5, vue: true,
        cartes: [{ carteId: 'ren-001', finition: 'holo-integrale', emplacement: 5, nouveau: true, exemplaires: 1 }],
      }],
    };
    const r = validerSauvegarde(v7, { extension, extensions: [extension, renforts] });
    if (!r.ok) throw new Error(r.erreurs.join(' '));
    expect(r.migreeDepuis).toBe(7);
    expect(r.sauvegarde.points).toEqual({ lancement: 40 });
    expect(r.sauvegarde.collection).toEqual({ 'lan-001': 2, 'lan-041': 1, 'ren-001': 3 });
    expect(r.sauvegarde.historique).toHaveLength(2);
    expect(r.sauvegarde.historique.map((o) => o.boosterId)).toEqual(['booster-lancement', 'booster-lancement']);
    expect(r.sauvegarde.historique[1]!.cartes).toEqual(v7.historique[1]!.cartes);
    expect(r.sauvegarde.quetes).toEqual(exemple().quetes);
  });

  it('version 7 → 8 : sans points Renforts, rien ne change', () => {
    const r = validerSauvegarde({ ...exemple(), version: 7 }, { extension });
    if (!r.ok) throw new Error(r.erreurs.join(' '));
    expect(r.sauvegarde).toEqual(exemple());
  });

  it('import : une carte de Renforts est connue quand toutes les extensions sont fournies', () => {
    const avecRenforts = { ...exemple(), collection: { 'lan-001': 1, 'ren-001': 2 } };
    expect(validerSauvegarde(avecRenforts, { extension, refuserCartesInconnues: true }).ok).toBe(false);
    expect(validerSauvegarde(avecRenforts, { extension, extensions: [extension, renforts], refuserCartesInconnues: true }).ok).toBe(true);
  });

  it('état des quêtes invalide refusé', () => {
    expect(erreursDe({ ...exemple(), quetes: { ...exemple().quetes, progresSemaine: -1 } })[0]).toMatch(/Quêtes/);
    expect(erreursDe({ ...exemple(), quetes: undefined })[0]).toMatch(/Quêtes/);
  });

  it('dernier draft invalide refusé', () => {
    expect(erreursDe({ ...exemple(), dernierDraft: { semaine: '2026-S45', choix: [0, 0, 1, 2, 3], score: 1, sceaux: 1 } })[0]).toMatch(/Dernier draft/);
    expect(erreursDe({ ...exemple(), dernierDraft: undefined })[0]).toMatch(/Dernier draft/);
  });

  it('applique les migrations une par une jusqu’à la version cible', () => {
    const migrations = {
      1: (d: Record<string, unknown>) => ({ ...d, gemmes: 0 }),
      2: (d: Record<string, unknown>) => ({ ...d, gemmes: (d.gemmes as number) + 3 }),
    };
    expect(migrer({ version: 1, sceaux: 4 }, migrations, 3)).toEqual({
      donnees: { version: 3, sceaux: 4, gemmes: 3 },
      depuis: 1,
    });
  });

  it('migration manquante : erreur claire', () => {
    expect(migrer({ version: 1 }, {}, 2)).toEqual({ erreur: expect.stringMatching(/version 1 vers la version 2/) });
  });

  it('refuse une sauvegarde d’une version plus récente ou sans version', () => {
    expect(erreursDe({ ...exemple(), version: 11 })[0]).toMatch(/plus récente/);
    expect(erreursDe({ ...exemple(), version: undefined })[0]).toMatch(/version absent/);
    expect(erreursDe({ ...exemple(), version: '1' })[0]).toMatch(/version absent/);
  });
});

describe('validation', () => {
  it('accepte une sauvegarde complète et correcte', () => {
    expect(erreursDe(exemple(), true)).toEqual([]);
  });

  it('refuse ce qui n’est pas un objet', () => {
    for (const x of [null, 3, 'texte', [1, 2]]) expect(erreursDe(x)).toEqual(['Ce n’est pas une sauvegarde Kirafuda.']);
  });

  it('sceaux : entier positif ou nul', () => {
    expect(erreursDe({ ...exemple(), sceaux: -1 })).toHaveLength(1);
    expect(erreursDe({ ...exemple(), sceaux: 1.5 })).toHaveLength(1);
    expect(erreursDe({ ...exemple(), sceaux: '3' })).toHaveLength(1);
  });

  it('date de récompense : AAAA-MM-JJ réelle, ou null', () => {
    expect(erreursDe({ ...exemple(), derniereRecompenseQuotidienne: null })).toEqual([]);
    expect(erreursDe({ ...exemple(), derniereRecompenseQuotidienne: '2026-02-30' })).toHaveLength(1);
    expect(erreursDe({ ...exemple(), derniereRecompenseQuotidienne: '05/11/2026' })).toHaveLength(1);
  });

  it('collection : clés = ids de carte, au moins 1 exemplaire', () => {
    expect(erreursDe({ ...exemple(), collection: { 'lan-001:commune': 1 } })[0]).toMatch(/clé « lan-001:commune » invalide/);
    expect(erreursDe({ ...exemple(), collection: { 'lan-001': 1 } })).toEqual([]);
    expect(erreursDe({ ...exemple(), collection: { 'lan-001': 0 } })[0]).toMatch(/au moins 1/);
    expect(erreursDe({ ...exemple(), collection: [] })[0]).toMatch(/objet est attendu/);
  });

  it('carte inconnue de l’extension refusée quand la liste des cartes est fournie', () => {
    const e = erreursDe({ ...exemple(), collection: { 'lan-999': 1 } }, true);
    expect(e).toEqual(['Collection : carte inconnue « lan-999 ».']);
  });

  it('points : entiers positifs ou nuls par extension', () => {
    expect(erreursDe({ ...exemple(), points: { lancement: -5 } })).toHaveLength(1);
  });

  it('historique : chaque ouverture et chaque carte sont vérifiées', () => {
    const s = exemple();
    s.historique[0]!.cartes[0]!.finition = 'brillante' as never;
    s.historique[0]!.date = 'hier';
    const e = erreursDe(s);
    expect(e).toContain('Historique, ouverture 1 : date invalide.');
    expect(e).toContain('Historique, ouverture 1, carte 1 : finition inconnue « brillante ».');
    expect(erreursDe({ ...exemple(), historique: {} })[0]).toMatch(/liste est attendue/);
  });
});

describe('export et import', () => {
  it('export puis import redonne la même sauvegarde', () => {
    const r = importerSauvegarde(exporterSauvegarde(exemple()));
    expect(r).toEqual({ ok: true, sauvegarde: exemple(), migreeDepuis: null });
  });

  it('import d’un fichier qui n’est pas du JSON : refusé avec un message', () => {
    expect(importerSauvegarde('<html>')).toEqual({ ok: false, erreurs: ['Le fichier n’est pas un fichier JSON valide.'] });
  });

  it('import d’un JSON qui n’est pas une sauvegarde : refusé avec les erreurs', () => {
    const r = importerSauvegarde(JSON.stringify({ version: 10, nom: 'autre chose' }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erreurs.length).toBeGreaterThan(1);
  });

  it('l’import ne touche pas au stockage (l’appelant enregistre après confirmation)', () => {
    const st = new StockageMemoire();
    importerSauvegarde(exporterSauvegarde(exemple()));
    expect(st.ecritures).toBe(0);
  });

  it('nom du fichier exporté daté du jour', () => {
    expect(nomFichierExport(new Date(2026, 10, 5, 23, 59))).toBe('kirafuda-sauvegarde-2026-11-05.json');
  });
});
