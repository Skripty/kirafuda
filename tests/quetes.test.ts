import { describe, expect, it } from 'vitest';
import extensionJson from '../src/data/extension-lancement.json';
import boosterJson from '../src/data/booster-lancement.json';
import quetesJson from '../src/data/quetes.json';
import type { Booster, Extension, Sauvegarde } from '../src/core/types';
import { rngAGraine } from '../src/core/rng';
import { ouvrir } from '../src/core/ouverture';
import { tirerBooster } from '../src/core/tirage';
import { sauvegardeParDefaut, validerSauvegarde } from '../src/core/sauvegarde';
import {
  appliquerConnexion,
  appliquerEvenements,
  etatQuetesInitial,
  evenementsOuverture,
  lundiLocal,
  quetesDuJour,
  reclamer,
  validerConfigQuetes,
  vueQuetes,
  type ConfigQuetes,
  type ContexteQuetes,
  type Evenement,
} from '../src/core/quetes';

const extension = extensionJson as unknown as Extension;
const booster = boosterJson as unknown as Booster;
const config = quetesJson as unknown as ConfigQuetes;
/** Jeudi 5 novembre 2026, 20 h (heure locale). */
const JEUDI = new Date(2026, 10, 5, 20, 0);
const ctx = (maintenant: Date = JEUDI): ContexteQuetes => ({ config, extensions: [extension], maintenant });
const plusJours = (d: Date, n: number): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours());

/** Une config de test dont les 3 quêtes du jour sont imposées (réserve de 3, une seule « ouvrir »). */
const configFixe: ConfigQuetes = {
  ...config,
  quetesDuJour: {
    ...config.quetesDuJour,
    reserve: [
      { id: 'ouvrir-2', texte: 'Ouvre 2 boosters', evenement: 'booster-ouvert', objectif: 2 },
      { id: 'rarete-holo', texte: 'Obtiens une carte ♦♦♦ ou plus', evenement: 'carte-obtenue', filtre: { rareteMin: 'holo' }, objectif: 1 },
      { id: 'inspecter-3', texte: 'Inspecte 3 cartes', evenement: 'carte-inspectee', objectif: 3 },
    ],
  },
};
const ctxFixe = (maintenant: Date = JEUDI): ContexteQuetes => ({ config: configFixe, extensions: [extension], maintenant });
const carte = (finition: 'commune' | 'holo' | 'pleine', autres: Partial<Extract<Evenement, { type: 'carte-obtenue' }>> = {}): Evenement =>
  ({ type: 'carte-obtenue', finition, serie: 'One Piece', element: 'feu', nouvelle: false, ...autres });

describe('quetes.json', () => {
  it('le fichier du jeu est valide', () => {
    expect(validerConfigQuetes(config)).toEqual([]);
  });

  it('erreurs claires : événement inconnu, id en double, rareté inconnue', () => {
    const mauvais: ConfigQuetes = {
      ...config,
      quetesDuJour: { ...config.quetesDuJour, reserve: [
        ...config.quetesDuJour.reserve,
        { id: 'ouvrir-2', texte: 'x', evenement: 'danser' as never, objectif: 1, filtre: { rareteMin: 'brillante' as never } },
      ] },
    };
    const e = validerConfigQuetes(mauvais);
    expect(e.some((m) => /événement inconnu « danser »/.test(m))).toBe(true);
    expect(e.some((m) => /« ouvrir-2 » : identifiant en double/.test(m))).toBe(true);
    expect(e.some((m) => /rareté « brillante » inconnue/.test(m))).toBe(true);
  });

  it('table garantie : total de 100 000 exigé, ★ ou plus uniquement', () => {
    const avec = (finitions: Record<string, number>): string[] => validerConfigQuetes({ ...config, tableGarantie: { finitions } });
    expect(avec({ pleine: 100_000 })).toEqual([]);
    expect(avec({ pleine: 99_999 })[0]).toMatch(/Table garantie : les poids totalisent 99 999 au lieu de 100 000/);
    expect(avec({ pleine: 50_000, holo: 50_000 })[0]).toMatch(/« holo » est sous ★/);
    expect(validerConfigQuetes({ ...config, tableGarantie: undefined as never })).toContain('Table garantie : finitions manquantes.');
  });
});

describe('quêtes du jour', () => {
  it('les mêmes pour tous à une date donnée (graine de la date), différentes selon les jours', () => {
    const a = quetesDuJour('2026-11-05', config, [extension]);
    const b = quetesDuJour('2026-11-05', structuredClone(config), [structuredClone(extension)]);
    expect(b).toEqual(a);
    const ids = new Set<string>();
    for (let i = 0; i < 30; i++) ids.add(quetesDuJour(`2026-12-${String(i + 1).padStart(2, '0')}`, config, [extension]).quetes.map((q) => q.id).join());
    expect(ids.size).toBeGreaterThan(10);
  });

  it('3 quêtes différentes, au plus une « ouvrir des boosters », sur un an', () => {
    for (let i = 0; i < 365; i++) {
      const jour = plusJours(new Date(2026, 0, 1), i);
      const t = quetesDuJour(`${jour.getFullYear()}-${String(jour.getMonth() + 1).padStart(2, '0')}-${String(jour.getDate()).padStart(2, '0')}`, config, [extension]);
      expect(t.quetes).toHaveLength(3);
      expect(new Set(t.quetes.map((q) => q.id)).size).toBe(3);
      expect(t.quetes.filter((q) => q.evenement === 'booster-ouvert').length).toBeLessThanOrEqual(1);
      expect(extension.personnages.some((p) => p.element === t.element)).toBe(true);
      expect(extension.personnages.some((p) => p.serie === t.serie)).toBe(true);
    }
  });

  it('élément et série du jour écrits dans le texte de la quête', () => {
    const cfg: ConfigQuetes = { ...config, quetesDuJour: { ...config.quetesDuJour, nombreParJour: 2,
      reserve: config.quetesDuJour.reserve.filter((q) => q.id === 'element-du-jour' || q.id === 'serie-du-jour') } };
    const t = quetesDuJour('2026-11-05', cfg, [extension]);
    expect(t.quetes.find((q) => q.id === 'serie-du-jour')!.libelle).toContain(t.serie);
  });
});

describe('progression à partir des événements', () => {
  it('booster ouvert, carte obtenue avec sa rareté, carte inspectée', () => {
    let s = appliquerEvenements(sauvegardeParDefaut(), [{ type: 'booster-ouvert' }, carte('commune'), carte('holo')], ctxFixe());
    expect(s.quetes.progresJour).toEqual({ 'ouvrir-2': 1, 'rarete-holo': 1 });
    s = appliquerEvenements(s, [{ type: 'carte-inspectee' }, { type: 'carte-inspectee' }], ctxFixe());
    expect(s.quetes.progresJour['inspecter-3']).toBe(2);
    expect(s.quetes.cumuls).toEqual({ 'booster-ouvert': 1, 'carte-obtenue': 2, 'carte-inspectee': 2 });
    expect(s.quetes.progresSemaine).toBe(1);
  });

  it('filtres : rareté minimale, carte nouvelle, élément et série du jour', () => {
    const t = quetesDuJour('2026-11-05', config, [extension]);
    const cfg = (id: string): ContexteQuetes => ({
      config: { ...config, quetesDuJour: { ...config.quetesDuJour, nombreParJour: 1, reserve: config.quetesDuJour.reserve.filter((q) => q.id === id) } },
      extensions: [extension], maintenant: JEUDI,
    });
    const progres = (id: string, e: Evenement): number => appliquerEvenements(sauvegardeParDefaut(), [e], cfg(id)).quetes.progresJour[id] ?? 0;
    expect(progres('rarete-pc', carte('commune'))).toBe(0);
    expect(progres('rarete-pc', carte('pleine'))).toBe(1);
    expect(progres('nouvelle', carte('commune'))).toBe(0);
    expect(progres('nouvelle', carte('commune', { nouvelle: true }))).toBe(1);
    // Élément et série du jour viennent du tirage du jour (même graine), indépendamment de la config.
    const tirage = quetesDuJour('2026-11-05', cfg('element-du-jour').config, [extension]);
    expect(tirage.element).toBe(t.element);
    const autreElement = extension.personnages.find((p) => p.element !== t.element)!.element;
    expect(progres('element-du-jour', carte('commune', { element: t.element }))).toBe(1);
    expect(progres('element-du-jour', carte('commune', { element: autreElement }))).toBe(0);
    expect(progres('serie-du-jour', carte('commune', { serie: t.serie }))).toBe(1);
    expect(progres('serie-du-jour', carte('commune', { serie: 'Série inconnue' }))).toBe(0);
  });

  it('les événements d’une ouverture : 1 booster et 5 cartes avec leur rareté et leur série', () => {
    const r = ouvrir({ ...sauvegardeParDefaut(), sceaux: 5 }, booster, extension, rngAGraine(4), JEUDI, config.tableGarantie.finitions);
    if (!r.ok) throw new Error();
    const e = evenementsOuverture(r.ouverture, extension);
    expect(e[0]).toEqual({ type: 'booster-ouvert' });
    expect(e.slice(1)).toHaveLength(5);
    expect(e.slice(1).every((x) => x.type === 'carte-obtenue' && x.serie.length > 0)).toBe(true);
  });

  it('nouveau jour : la progression du jour repart de zéro, pas les compteurs de débutant ; nouvelle semaine : la quête de la semaine aussi', () => {
    let s = appliquerEvenements(sauvegardeParDefaut(), [{ type: 'booster-ouvert' }], ctxFixe());
    s = appliquerEvenements(s, [{ type: 'carte-inspectee' }], ctxFixe(plusJours(JEUDI, 1)));
    expect(s.quetes.progresJour).toEqual({ 'inspecter-3': 1 });
    expect(s.quetes.cumuls['booster-ouvert']).toBe(1);
    expect(s.quetes.progresSemaine).toBe(1);
    expect(lundiLocal(plusJours(JEUDI, 4))).toBe('2026-11-09');
    s = appliquerEvenements(s, [], ctxFixe(plusJours(JEUDI, 4)));
    expect(s.quetes.progresSemaine).toBe(0);
  });

  it('ne modifie jamais la sauvegarde reçue', () => {
    const s = sauvegardeParDefaut();
    const copie = structuredClone(s);
    appliquerEvenements(s, [{ type: 'booster-ouvert' }], ctxFixe());
    expect(s).toEqual(copie);
  });
});

describe('récompenses : réclamées une seule fois', () => {
  const tout: Evenement[] = [{ type: 'booster-ouvert' }, { type: 'booster-ouvert' }, carte('holo'),
    { type: 'carte-inspectee' }, { type: 'carte-inspectee' }, { type: 'carte-inspectee' }];

  it('bonus des 3 quêtes du jour : +1, une seule fois, seulement quand les 3 sont faites', () => {
    const s0 = appliquerEvenements(sauvegardeParDefaut(), tout.slice(0, 3), ctxFixe());
    expect(reclamer(s0, { type: 'bonus-jour' }, ctxFixe())).toEqual({ ok: false, raison: 'pas-finie' });
    const s = appliquerEvenements(s0, tout.slice(3), ctxFixe());
    const r = reclamer(s, { type: 'bonus-jour' }, ctxFixe());
    if (!r.ok) throw new Error(r.raison);
    expect(r.sceaux).toBe(1);
    expect(r.sauvegarde.sceaux).toBe(1);
    expect(reclamer(r.sauvegarde, { type: 'bonus-jour' }, ctxFixe())).toEqual({ ok: false, raison: 'deja-reclamee' });
    // Le lendemain, le bonus redevient disponible (une fois les nouvelles quêtes faites).
    expect(vueQuetes(r.sauvegarde, ctxFixe(plusJours(JEUDI, 1))).bonus).toEqual({ sceaux: 1, pret: false, reclame: false });
  });

  it('quête de débutant : une seule fois, jamais deux, même après rechargement de la sauvegarde', () => {
    const s = appliquerEvenements(sauvegardeParDefaut(), [{ type: 'booster-ouvert' }], ctx());
    const r = reclamer(s, { type: 'debutant', id: 'premier-booster' }, ctx());
    if (!r.ok) throw new Error(r.raison);
    expect(r.sceaux).toBe(2);
    const relue = validerSauvegarde(JSON.parse(JSON.stringify(r.sauvegarde)));
    if (!relue.ok) throw new Error(relue.erreurs.join(' '));
    expect(reclamer(relue.sauvegarde, { type: 'debutant', id: 'premier-booster' }, ctx())).toEqual({ ok: false, raison: 'deja-reclamee' });
    expect(reclamer(relue.sauvegarde, { type: 'debutant', id: 'trente-boosters' }, ctx())).toEqual({ ok: false, raison: 'pas-finie' });
    expect(reclamer(relue.sauvegarde, { type: 'debutant', id: 'inconnue' }, ctx())).toEqual({ ok: false, raison: 'inconnue' });
  });

  it('quêtes de débutant calculées : cartes différentes possédées et série complète', () => {
    const cartes = extension.cartes.filter((c) => !c.secrete).slice(0, 25);
    const s: Sauvegarde = { ...sauvegardeParDefaut(), collection: Object.fromEntries(cartes.map((c) => [c.id, 1])) };
    const v = vueQuetes(s, ctx());
    expect(v.debutant.find((l) => l.id === 'cartes-25')).toMatchObject({ progres: 25, faite: true });
    expect(v.debutant.find((l) => l.id === 'cartes-75')).toMatchObject({ progres: 25, faite: false });
    const tout: Sauvegarde = { ...sauvegardeParDefaut(), collection: Object.fromEntries(extension.cartes.filter((c) => !c.secrete).map((c) => [c.id, 1])) };
    expect(vueQuetes(tout, ctx()).debutant.find((l) => l.id === 'serie')!.faite).toBe(true);
  });

  it('les récompenses de quêtes ne sont pas plafonnées (le plafond ne vaut que pour la connexion)', () => {
    const s = appliquerEvenements({ ...sauvegardeParDefaut(), sceaux: 30 }, [{ type: 'booster-ouvert' }], ctx());
    const r = reclamer(s, { type: 'debutant', id: 'premier-booster' }, ctx());
    expect(r.ok && r.sauvegarde.sceaux).toBe(32);
  });

  it('quête de la semaine : 15 boosters, +1, une seule fois par semaine', () => {
    const quinze = Array.from({ length: 15 }, (): Evenement => ({ type: 'booster-ouvert' }));
    const s = appliquerEvenements(sauvegardeParDefaut(), quinze, ctx());
    const r = reclamer(s, { type: 'semaine' }, ctx());
    if (!r.ok) throw new Error(r.raison);
    expect(r.sceaux).toBe(1);
    expect(reclamer(r.sauvegarde, { type: 'semaine' }, ctx(plusJours(JEUDI, 2)))).toEqual({ ok: false, raison: 'deja-reclamee' });
    expect(reclamer(r.sauvegarde, { type: 'semaine' }, ctx(plusJours(JEUDI, 4)))).toEqual({ ok: false, raison: 'pas-finie' });
  });
});

describe('connexion et calendrier de bienvenue', () => {
  it('premier lancement : connexion +2 et jour 1 +4, booster garanti', () => {
    const r = appliquerConnexion(sauvegardeParDefaut(), ctx());
    expect(r).toMatchObject({ nouvelleJournee: true, sceauxConnexion: 2, jourCalendrier: 1, sceauxCalendrier: 4, boosterGaranti: true });
    expect(r.sauvegarde.sceaux).toBe(6);
    expect(r.sauvegarde.quetes.boostersGarantis).toBe(1);
    expect(appliquerConnexion(r.sauvegarde, ctx(new Date(2026, 10, 5, 23, 0))).nouvelleJournee).toBe(false);
  });

  it('plafond de 10 sur la connexion seulement : le calendrier s’ajoute au-delà', () => {
    const r = appliquerConnexion({ ...sauvegardeParDefaut(), sceaux: 9 }, ctx());
    expect(r.sceauxConnexion).toBe(1);
    expect(r.sauvegarde.sceaux).toBe(9 + 1 + 4);
    const plein = appliquerConnexion({ ...sauvegardeParDefaut(), sceaux: 14 }, ctx());
    expect(plein.sceauxConnexion).toBe(0);
    expect(plein.sauvegarde.sceaux).toBe(14 + 4);
  });

  it('une case par jour joué, pas par jour calendaire ; booster garanti au jour 7', () => {
    let s = sauvegardeParDefaut();
    const jours: number[] = [];
    for (let i = 0; i < 20; i += 3) { // un jour sur trois
      const r = appliquerConnexion(s, ctx(plusJours(JEUDI, i)));
      if (r.jourCalendrier) jours.push(r.jourCalendrier);
      if (r.jourCalendrier === 7) expect(r.boosterGaranti).toBe(true);
      s = r.sauvegarde;
    }
    expect(jours).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(s.quetes.boostersGarantis).toBe(2);
    expect(vueQuetes(s, ctx(plusJours(JEUDI, 30))).calendrierFini).toBe(true);
    expect(appliquerConnexion(s, ctx(plusJours(JEUDI, 30))).jourCalendrier).toBeNull();
  });

  it('jour 1 sans booster garanti si un booster a déjà été ouvert (ancienne sauvegarde)', () => {
    const r0 = ouvrir({ ...sauvegardeParDefaut(), sceaux: 5 }, booster, extension, rngAGraine(1), JEUDI, config.tableGarantie.finitions);
    if (!r0.ok) throw new Error();
    const r = appliquerConnexion(r0.sauvegarde, ctx());
    expect(r.jourCalendrier).toBe(1);
    expect(r.boosterGaranti).toBe(false);
  });

  it('la vue du calendrier : 7 cases, obtenues et case du jour', () => {
    const s = appliquerConnexion(sauvegardeParDefaut(), ctx()).sauvegarde;
    const v = vueQuetes(s, ctx());
    expect(v.calendrier).toHaveLength(7);
    expect(v.calendrier.map((c) => c.obtenu)).toEqual([true, false, false, false, false, false, false]);
    expect(v.calendrier[0]!.aujourdhui).toBe(true);
    expect(v.calendrier.filter((c) => c.garanti).map((c) => c.jour)).toEqual([1, 7]);
  });
});

describe('booster garanti', () => {
  it('la table garantie de quetes.json : exactement une ★', () => {
    expect(config.tableGarantie.finitions).toEqual({ pleine: 100_000 });
  });

  it('tirerBooster avec la table garantie : la 5e carte est une ★ (pleine), toujours', () => {
    const rng = rngAGraine(9);
    for (let i = 0; i < 2000; i++) {
      const t = tirerBooster(booster, extension, rng, { tableGarantie: config.tableGarantie.finitions });
      expect(t.cartes.find((c) => c.emplacement === 5)!.finition).toBe('pleine');
      expect(t.cartes).toHaveLength(5);
    }
  });

  it('ouvrir avec un booster garanti en attente mais sans table : erreur claire, pas de tirage silencieux', () => {
    const s: Sauvegarde = { ...sauvegardeParDefaut(), sceaux: 1, quetes: { ...etatQuetesInitial(), boostersGarantis: 1 } };
    expect(() => ouvrir(s, booster, extension, rngAGraine(1), JEUDI)).toThrow(/table garantie/);
  });

  it('les 4 premières cartes restent un tirage normal (même graine, mêmes cartes)', () => {
    const normal = tirerBooster(booster, extension, rngAGraine(42));
    const garanti = tirerBooster(booster, extension, rngAGraine(42), { tableGarantie: config.tableGarantie.finitions });
    if (!normal.exceptionnel) expect(garanti.cartes.slice(0, 4)).toEqual(normal.cartes.slice(0, 4));
  });

  it('ouvrir consomme un booster garanti, dans la même sauvegarde', () => {
    const s: Sauvegarde = { ...sauvegardeParDefaut(), sceaux: 10, quetes: { ...etatQuetesInitial(), boostersGarantis: 1 } };
    const r = ouvrir(s, booster, extension, rngAGraine(3), JEUDI, config.tableGarantie.finitions);
    if (!r.ok) throw new Error();
    expect(r.sauvegarde.quetes.boostersGarantis).toBe(0);
    const cinquieme = r.ouverture.cartes.find((c) => c.emplacement === 5)!;
    expect(cinquieme.finition).toBe('pleine');
    const r2 = ouvrir(r.sauvegarde, booster, extension, rngAGraine(3), JEUDI, config.tableGarantie.finitions);
    expect(r2.ok && r2.sauvegarde.quetes.boostersGarantis).toBe(0);
  });
});

describe('un nouveau joueur, premier jour', () => {
  /** Joue toute la journée : ouvre tant qu'il a des sceaux, fait (ou non) les petites quêtes, réclame tout. */
  function premierJour(petitesQuetes: boolean): number {
    let s = appliquerConnexion(sauvegardeParDefaut(), ctx()).sauvegarde;
    const rng = rngAGraine('premier-jour');
    let ouverts = 0;
    let progres = true;
    while (progres) {
      progres = false;
      while (s.sceaux >= booster.cout.quantite) {
        const r = ouvrir(s, booster, extension, rng, JEUDI, config.tableGarantie.finitions);
        if (!r.ok) break;
        s = appliquerEvenements(r.sauvegarde, evenementsOuverture(r.ouverture, extension), ctx());
        ouverts++;
      }
      if (petitesQuetes) {
        s = appliquerEvenements(s, [{ type: 'carte-inspectee' }, { type: 'carte-inspectee' }, { type: 'carte-inspectee' },
          { type: 'cote-consultee' }, { type: 'probabilites-consultees' }], ctx());
      }
      const v = vueQuetes(s, ctx());
      const cibles = [
        ...(v.bonus.pret && !v.bonus.reclame ? [{ type: 'bonus-jour' as const }] : []),
        ...v.debutant.filter((l) => l.faite && !l.reclamee).map((l) => ({ type: 'debutant' as const, id: l.id })),
      ];
      for (const c of cibles) {
        const r = reclamer(s, c, ctx());
        if (r.ok) { s = r.sauvegarde; progres = true; }
      }
    }
    return ouverts;
  }

  it('ouvre une dizaine de boosters, en n’ouvrant que des boosters', () => {
    // 2 (connexion) + 4 (jour 1) + 2 (premier booster), puis selon le tirage : 25 cartes différentes (+1),
    // et le bonus du jour si les 3 quêtes du jour ne portent que sur les boosters.
    const n = premierJour(false);
    expect(n).toBeGreaterThanOrEqual(9);
    expect(n).toBeLessThanOrEqual(12);
  });

  it('et un peu plus en faisant aussi les petites quêtes (inspecter, cote, probabilités)', () => {
    const n = premierJour(true);
    expect(n).toBeGreaterThan(premierJour(false));
    expect(n).toBeLessThanOrEqual(22);
  });
});
