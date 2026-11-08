import { describe, expect, it } from 'vitest';
import extensionJson from '../src/data/extension-lancement.json';
import renfortsJson from '../src/data/extension-renforts.json';
import { fusionner } from '../src/core/catalogue';
import boosterJson from '../src/data/booster-lancement.json';
import themesJson from '../src/data/themes-draft.json';
import type { Booster, ElementId, Extension, Personnage, Sauvegarde } from '../src/core/types';
import {
  correspondAuTheme,
  equipeChoisie,
  genererDraft,
  jouerDraft,
  marquerDraftEnvoye,
  prochaineSemaine,
  regulariserDraft,
  puissance,
  scorer,
  semaineIso,
  validerThemes,
  type Theme,
} from '../src/core/draft';
import { sauvegardeParDefaut, validerSauvegarde } from '../src/core/sauvegarde';

const extension = extensionJson as unknown as Extension;
const booster = boosterJson as unknown as Booster;
const themes = themesJson.themes as Theme[];
/** Les thèmes portent sur toutes les extensions (des séries viennent de Renforts). */
const toutesExtensions = fusionner([extension, renfortsJson as unknown as Extension]);
/** Personnage d'une carte de l'extension. */
const persoDeCarte = (carteId: string): Personnage => {
  const c = extension.cartes.find((x) => x.id === carteId)!;
  return extension.personnages.find((p) => p.id === c.personnage)!;
};
/** Personnage fictif pour tester une règle précise (le score se calcule sur les personnages). */
const fictive = (id: string, element: ElementId, serie = `Série ${id}`, pv = 100, d1 = 20, d2 = 80): Personnage => ({
  id, nom: id, serie, rang: 'C', element, pv,
  attaques: [{ nom: 'a', cout: 1, degats: d1, effet: null }, { nom: 'b', cout: 2, degats: d2, effet: null }],
});
const themeElements = (...valeurs: ElementId[]): Theme => ({ id: 't', nom: 'T', description: '', critere: { type: 'elements', valeurs } });
const points = (eq: Personnage[], theme: Theme, adv: ElementId, categorie: string): number =>
  scorer(eq, theme, adv).lignes.filter((l) => l.categorie === categorie).reduce((a, l) => a + l.points, 0);

describe('semaine et graine', () => {
  it('semaine ISO en temps universel, du lundi au dimanche', () => {
    expect(semaineIso(new Date('2026-11-05T12:00:00Z'))).toBe('2026-S45');
    expect(semaineIso(new Date('2026-11-02T00:00:00Z'))).toBe('2026-S45'); // lundi
    expect(semaineIso(new Date('2026-11-08T23:59:59Z'))).toBe('2026-S45'); // dimanche
    expect(semaineIso(new Date('2026-11-09T00:00:00Z'))).toBe('2026-S46');
    expect(semaineIso(new Date('2027-01-01T12:00:00Z'))).toBe('2026-S53'); // vendredi : encore 2026
    expect(semaineIso(new Date('2025-12-29T12:00:00Z'))).toBe('2026-S01'); // lundi : déjà 2026
  });

  it('prochaine semaine : lundi suivant à 00:00 UTC', () => {
    expect(prochaineSemaine(new Date('2026-11-05T12:00:00Z')).toISOString()).toBe('2026-11-09T00:00:00.000Z');
    expect(prochaineSemaine(new Date('2026-11-09T00:00:00Z')).toISOString()).toBe('2026-11-16T00:00:00.000Z');
  });

  it('même semaine = même draft pour tout le monde (3 boosters, 15 cartes, thème, adversaire)', () => {
    const a = genererDraft('2026-S45', [{ extension, booster }], themes);
    const b = genererDraft('2026-S45', [{ extension: structuredClone(extension), booster: structuredClone(booster) }], structuredClone(themes));
    expect(a).toEqual(b);
    expect(a.graine).toBe('draft:lancement:2026-S45');
    expect(a.boosters).toHaveLength(3);
    expect(a.boosters.every((x) => x.length === 5)).toBe(true);
    expect(a.cartes).toHaveLength(15);
    expect(a.adversaire).not.toBe('neutre');
  });

  it('draft de la semaine 2026-S45 figé', () => {
    // Si ce test change, tous les joueurs verraient un autre draft que celui déjà joué : à vérifier avant d'accepter.
    const d = genererDraft('2026-S45', [{ extension, booster }], themes);
    expect({ theme: d.theme.id, adversaire: d.adversaire, cartes: d.cartes.map((c) => `${c.carteId}:${c.finition}`) }).toMatchSnapshot();
  });

  it('semaines différentes = drafts différents', () => {
    const a = genererDraft('2026-S45', [{ extension, booster }], themes);
    const b = genererDraft('2026-S46', [{ extension, booster }], themes);
    expect(a.cartes).not.toEqual(b.cartes);
  });
});

describe('thèmes', () => {
  it('themes-draft.json est valide', () => {
    expect(validerThemes(themes, toutesExtensions)).toEqual([]);
  });

  it('erreurs claires pour un thème mal écrit', () => {
    const faux = [{ id: 'x', nom: 'X', description: 'd', critere: { type: 'elements', valeurs: ['plasma'] } }] as unknown as Theme[];
    expect(validerThemes(faux, extension)).toEqual(['Thème du draft 1 (« x ») : élément inconnu « plasma ».']);
    const serie = [{ id: 'y', nom: 'Y', description: 'd', critere: { type: 'series', valeurs: ['Inconnue'] } }] as Theme[];
    expect(validerThemes(serie, extension)[0]).toMatch(/série inconnue/);
  });

  it('chaque type de critère', () => {
    const c = fictive('c', 'feu', 'One Piece', 130, 20, 110);
    expect(correspondAuTheme(c, themeElements('feu', 'foudre'))).toBe(true);
    expect(correspondAuTheme(c, themeElements('eau'))).toBe(false);
    expect(correspondAuTheme(c, { id: 's', nom: '', description: '', critere: { type: 'series', valeurs: ['One Piece'] } })).toBe(true);
    expect(correspondAuTheme(c, { id: 'p', nom: '', description: '', critere: { type: 'pv-min', valeur: 120 } })).toBe(true);
    expect(correspondAuTheme(c, { id: 'd', nom: '', description: '', critere: { type: 'degats-forte-min', valeur: 111 } })).toBe(false);
    const soin = extension.personnages.find((x) => x.attaques.some((a) => a.effet?.type === 'soin'))!;
    expect(correspondAuTheme(soin, { id: 'e', nom: '', description: '', critere: { type: 'effets', valeurs: ['soin'] } })).toBe(true);
  });
});

describe('score', () => {
  const neutreTheme = themeElements('neutre');

  it('puissance = (PV + dégâts des deux attaques) ÷ 10, arrondi', () => {
    expect(puissance(fictive('a', 'feu', 's', 100, 20, 80))).toBe(20);
    expect(puissance(fictive('a', 'feu', 's', 105, 20, 80))).toBe(21); // 20,5 → 21
  });

  it('thème : +15 par carte, +20 si toute l’équipe', () => {
    const eq = [fictive('a', 'feu'), fictive('b', 'feu'), fictive('c', 'eau')];
    expect(points(eq, themeElements('feu'), 'neutre', 'Thème')).toBe(30);
    expect(points(eq, themeElements('feu', 'eau'), 'neutre', 'Thème')).toBe(45 + 20);
  });

  it('même série : +10 par carte en plus', () => {
    const eq = [fictive('a', 'neutre', 'X'), fictive('b', 'neutre', 'X'), fictive('c', 'neutre', 'X'), fictive('d', 'neutre', 'Y'), fictive('e', 'neutre', 'Y')];
    const lignes = scorer(eq, neutreTheme, 'feu').lignes.filter((l) => l.libelle.startsWith('Même série'));
    expect(lignes.map((l) => [l.libelle, l.points])).toEqual([['Même série : X ×3', 20], ['Même série : Y ×2', 10]]);
  });

  it('éléments complémentaires : une carte est couverte si une autre bat l’élément qui la bat', () => {
    // Feu est faible à Eau ; Eau est faible à Foudre : un Foudre couvre le Feu.
    const lignes = (eq: Personnage[]) => scorer(eq, neutreTheme, 'feu').lignes.filter((l) => l.libelle.startsWith('Éléments complémentaires'));
    expect(lignes([fictive('a', 'feu'), fictive('b', 'foudre')]).map((l) => l.points)).toEqual([8]);
    expect(lignes([fictive('a', 'feu'), fictive('b', 'terre')])).toEqual([]);
    // Lumière et Ténèbres : une autre carte Lumière couvre une Lumière (Ténèbres est faible à Lumière).
    expect(lignes([fictive('a', 'lumiere'), fictive('b', 'lumiere')]).map((l) => l.points)).toEqual([16]);
    expect(lignes([fictive('a', 'neutre'), fictive('b', 'neutre')])).toEqual([]);
  });

  it('aucune faiblesse partagée : +15', () => {
    const avecBonus = (eq: Personnage[]) => scorer(eq, neutreTheme, 'feu').lignes.some((l) => l.libelle === 'Aucune faiblesse partagée');
    expect(avecBonus([fictive('a', 'feu'), fictive('b', 'eau'), fictive('c', 'neutre'), fictive('d', 'neutre')])).toBe(true);
    expect(avecBonus([fictive('a', 'feu'), fictive('b', 'feu')])).toBe(false);
  });

  it('défi : +10 par carte forte contre l’adversaire, −10 par carte faible contre lui', () => {
    // Adversaire Eau : Foudre le bat (Eau est faible à Foudre) ; Feu est faible à Eau.
    const eq = [fictive('a', 'foudre'), fictive('b', 'foudre'), fictive('c', 'feu'), fictive('d', 'neutre')];
    expect(points(eq, neutreTheme, 'eau', 'Défi')).toBe(20 - 10);
  });

  it('total = somme du détail, et le score ne dépend pas de la finition ni du rang', () => {
    const d = genererDraft('2026-S45', [{ extension, booster }], themes);
    const eq = equipeChoisie(d, [0, 3, 6, 9, 12], extension);
    if (typeof eq === 'string') throw new Error(eq);
    const s = scorer(eq, d.theme, d.adversaire);
    expect(s.total).toBe(s.lignes.reduce((a, l) => a + l.points, 0));
    const autreRang = eq.map((c) => ({ ...c, rang: 'S' as const }));
    expect(scorer(autreRang, d.theme, d.adversaire)).toEqual(s);
  });
});

describe('choix, récompense et sauvegarde', () => {
  const draft = genererDraft('2026-S45', [{ extension, booster }], themes);
  /** 5 indices de cartes de personnages distincts. */
  const choixDe = (cartes: { carteId: string }[]): number[] => {
    const vus = new Set<string>();
    const choix: number[] = [];
    cartes.forEach((c, i) => { const p = persoDeCarte(c.carteId).id; if (choix.length < 5 && !vus.has(p)) { vus.add(p); choix.push(i); } });
    return choix;
  };
  const choixValide = (): number[] => choixDe(draft.cartes);

  it('choix invalides refusés', () => {
    expect(equipeChoisie(draft, [0, 1, 2], extension)).toMatch(/exactement 5/);
    expect(equipeChoisie(draft, [0, 0, 1, 2, 3], extension)).toMatch(/deux fois/);
    expect(equipeChoisie(draft, [0, 1, 2, 3, 15], extension)).toMatch(/hors du draft/);
  });

  it('un même personnage ne peut pas être choisi deux fois, même avec deux cartes différentes', () => {
    const d = { ...draft, cartes: [...draft.cartes] };
    d.cartes[0] = { carteId: 'lan-001', finition: 'holo-integrale', emplacement: 1 };
    d.cartes[1] = { carteId: 'lan-125', finition: 'alternative', emplacement: 2 }; // autre carte de Luffy
    expect(equipeChoisie(d, [0, 1, 2, 3, 4], extension)).toMatch(/Monkey D. Luffy est déjà dans l’équipe/);
  });

  const sansCompte = { participation: 2, compte: false };
  const avecCompte = { participation: 2, compte: true };

  it('jouer sans compte : score, participation et draft enregistrés en une seule nouvelle sauvegarde', () => {
    const s: Sauvegarde = { ...sauvegardeParDefaut(), sceaux: 4, collection: { 'lan-001': 1 } };
    const r = jouerDraft(s, draft, choixValide(), extension, sansCompte);
    if (!r.ok) throw new Error(r.message);
    expect(r.sceaux).toBe(2); // participation (quetes.json), tout de suite, hors classement
    expect(r.modification).toBe(false);
    expect(r.sauvegarde.sceaux).toBe(4 + r.sceaux);
    expect(r.sauvegarde.dernierDraft).toEqual({ semaine: '2026-S45', choix: choixValide(), score: r.score.total, sceaux: r.sceaux });
    expect(r.sauvegarde.collection).toEqual(s.collection); // les cartes du draft n'entrent pas dans la collection
    expect(s.dernierDraft).toBeNull();
    expect(validerSauvegarde(r.sauvegarde).ok).toBe(true);
  });

  it('l’équipe peut changer pendant la semaine, sans nouvelle récompense ; la semaine suivante repart de zéro', () => {
    const r = jouerDraft(sauvegardeParDefaut(), draft, choixValide(), extension, sansCompte);
    if (!r.ok) throw new Error(r.message);
    // Autre équipe valide : les 5 premiers personnages distincts en partant de la fin.
    const autre = choixDe([...draft.cartes].reverse()).map((i) => draft.cartes.length - 1 - i);
    expect(autre).not.toEqual(choixValide());
    const m = jouerDraft(r.sauvegarde, draft, autre, extension, sansCompte);
    if (!m.ok) throw new Error(m.message);
    expect(m.modification).toBe(true);
    expect(m.sceaux).toBe(0);
    expect(m.sauvegarde.sceaux).toBe(r.sauvegarde.sceaux);
    expect(m.sauvegarde.dernierDraft!.sceaux).toBe(2); // la participation déjà reçue reste notée (déduite au classement)
    const suivant = genererDraft('2026-S46', [{ extension, booster }], themes);
    const n = jouerDraft(m.sauvegarde, suivant, choixDe(suivant.cartes), extension, sansCompte);
    expect(n.ok && n.sceaux).toBe(2);
  });

  it('avec un compte : rien tout de suite, l’équipe attend l’accord du serveur', () => {
    const r = jouerDraft(sauvegardeParDefaut(), draft, choixValide(), extension, avecCompte);
    if (!r.ok) throw new Error(r.message);
    expect(r.sceaux).toBe(0);
    expect(r.sauvegarde.dernierDraft).toMatchObject({ sceaux: 0, envoye: false });
    const envoye = marquerDraftEnvoye(r.sauvegarde, '2026-S45', choixValide(), 123);
    expect(envoye.dernierDraft).toMatchObject({ envoye: true, dansClassement: true, score: 123 });
    expect(validerSauvegarde(envoye).ok).toBe(true);
    // Une autre équipe que celle envoyée n'est pas marquée.
    expect(marquerDraftEnvoye(r.sauvegarde, '2026-S45', [9, 10, 11, 12, 13], 1)).toBe(r.sauvegarde);
    expect(marquerDraftEnvoye(r.sauvegarde, '2026-S46', choixValide(), 1)).toBe(r.sauvegarde);
    // Modifiée après l'envoi : elle reste au classement, la modification attend.
    const m = jouerDraft(envoye, draft, choixValide(), extension, avecCompte);
    expect(m.ok && m.sauvegarde.dernierDraft).toMatchObject({ envoye: false, dansClassement: true });
  });

  it('semaine fermée sans que l’équipe ait pu rejoindre le classement : participation sur l’appareil, une fois', () => {
    const r = jouerDraft(sauvegardeParDefaut(), draft, choixValide(), extension, avecCompte);
    if (!r.ok) throw new Error(r.message);
    expect(regulariserDraft(r.sauvegarde, '2026-S45', 2).sceaux).toBe(0); // semaine encore ouverte
    const g = regulariserDraft(r.sauvegarde, '2026-S46', 2);
    expect(g.sceaux).toBe(2);
    expect(g.sauvegarde.sceaux).toBe(r.sauvegarde.sceaux + 2);
    expect(regulariserDraft(g.sauvegarde, '2026-S46', 2).sceaux).toBe(0);
    // Au classement (récompense par le serveur) ou joué sans compte : rien à régulariser.
    expect(regulariserDraft(marquerDraftEnvoye(r.sauvegarde, '2026-S45', choixValide(), 1), '2026-S46', 2).sceaux).toBe(0);
    const sc = jouerDraft(sauvegardeParDefaut(), draft, choixValide(), extension, sansCompte);
    expect(sc.ok && regulariserDraft(sc.sauvegarde, '2026-S46', 2).sceaux).toBe(0);
  });
});
