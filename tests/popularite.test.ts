import { describe, expect, it } from 'vitest';
import baseJson from '../src/data/popularite-base.json';
import populariteJson from '../src/data/popularite.json';
import { catalogue } from '../src/catalogue';
import { assembler, disponiblesAu } from '../src/core/catalogue';
import {
  apercu, calculerSemaine, estAncienFormat, lireFichierPopularite, migrerAncienFichier, publicationPossible, semaineAPublier,
  semainesEntre, validerBase, validerCoups, versPopularite, type BasePopularite, type CoupDePouce, type FichierPopularite,
} from '../src/core/popularite';
import { tendanceCote } from '../src/core/cote';

const base = baseJson as BasePopularite;
/** Une petite base : deux séries. */
const mini: BasePopularite = { personnages: {
  a: { nom: 'Alpha', serie: 'Série A', base: 50 },
  b: { nom: 'Bravo', serie: 'Série A', base: 96 },
  c: { nom: 'Charlie', serie: 'Série B', base: 3 },
} };
const depart = (aj: Record<string, number> = {}): FichierPopularite => {
  const entrees = Object.fromEntries(Object.entries(mini.personnages).map(([id, p]) => {
    const ajustement = aj[id] ?? 0;
    return [id, { popularite: Math.min(100, Math.max(1, p.base + ajustement)), ajustement }];
  }));
  return { semaine: '2026-S45', semainePrecedente: '2026-S44', courante: entrees, precedente: structuredClone(entrees), coupsDePouce: [] };
};
const serie = (s: string, valeur: CoupDePouce['valeur']): CoupDePouce => ({ cible: { type: 'serie', serie: s }, valeur });
const perso = (id: string, valeur: CoupDePouce['valeur']): CoupDePouce => ({ cible: { type: 'personnage', id }, valeur });

describe('calcul de la semaine suivante', () => {
  it('ajustement = arrondi(précédent × 0,7) + coups de pouce ; popularité = base + ajustement', () => {
    const s = calculerSemaine(mini, depart({ a: 10 }), [serie('Série A', 10)], '2026-S46');
    expect(s.courante.a).toEqual({ popularite: 50 + 7 + 10, ajustement: 17 });
    expect(s.semaine).toBe('2026-S46');
    expect(s.semainePrecedente).toBe('2026-S45');
    expect(s.precedente).toEqual(depart({ a: 10 }).courante);
    expect(s.coupsDePouce).toEqual([serie('Série A', 10)]);
  });

  it('sans coup de pouce, l’écart redescend d’environ 30 % chaque semaine', () => {
    let f = calculerSemaine(mini, depart(), [serie('Série A', 10)], '2026-S46');
    expect(f.courante.a!.popularite).toBe(60);
    f = calculerSemaine(mini, f, [], '2026-S47');
    expect(f.courante.a!.popularite).toBe(57);
    f = calculerSemaine(mini, f, [], '2026-S48');
    expect(f.courante.a!.popularite).toBe(54); // 7 × 0,7 = 4,9 → 4 (vers zéro)
  });

  it('coups de pouce sur une série et sur un personnage : ils s’additionnent ; −5 fait baisser', () => {
    const s = calculerSemaine(mini, depart(), [serie('Série A', 5), perso('a', 15), serie('Série B', -5)], '2026-S46');
    expect(s.courante.a!.popularite).toBe(70);
    expect(s.courante.b!.popularite).toBe(100); // 96 + 5, borné à 100
    expect(s.courante.c!.popularite).toBe(1);   // 3 − 5, borné à 1
  });

  it('borné de 1 à 100 ; l’ajustement gardé est celui qui s’applique vraiment', () => {
    const s = calculerSemaine(mini, depart(), [perso('b', 15)], '2026-S46');
    expect(s.courante.b).toEqual({ popularite: 100, ajustement: 4 });
    expect(calculerSemaine(mini, s, [], '2026-S47').courante.b).toEqual({ popularite: 98, ajustement: 2 }); // 4 × 0,7 = 2,8 → 2
  });

  it('arrondi vers zéro (Math.trunc), dans les deux sens : −5 → −3, +5 → +3', () => {
    expect(calculerSemaine(mini, depart({ a: -5 }), [], '2026-S46').courante.a!.ajustement).toBe(-3);
    expect(calculerSemaine(mini, depart({ a: 5 }), [], '2026-S46').courante.a!.ajustement).toBe(3);
  });

  it('sans coup de pouce, un ajustement revient toujours à 0 : +10 → 7, 4, 2, 1, 0, 0 ; −5 → −3, −2, −1, 0', () => {
    const suite = (depuis: number, semaines: number): number[] => {
      const r: number[] = [];
      let f = depart({ a: depuis });
      for (let k = 0; k < semaines; k++) {
        f = calculerSemaine(mini, f, [], `2026-S${46 + k}`);
        r.push(f.courante.a!.ajustement);
      }
      return r;
    };
    expect(suite(10, 6)).toEqual([7, 4, 2, 1, 0, 0]);
    expect(suite(-5, 4)).toEqual([-3, -2, -1, 0]);
    expect(Object.is(suite(-1, 1)[0], -0)).toBe(false); // 0, jamais −0 dans le fichier
  });

  it('un personnage sans ajustement précédent (nouvelle vague) part de 0', () => {
    const sansC = depart();
    delete sansC.courante.c;
    expect(calculerSemaine(mini, sansC, [], '2026-S46').courante.c).toEqual({ popularite: 3, ajustement: 0 });
  });

  it('semaines sautées : la baisse s’applique une fois par semaine écoulée', () => {
    expect(semainesEntre('2026-S45', '2026-S48')).toBe(3);
    expect(semainesEntre('2026-S52', '2027-S02')).toBe(3); // 2026 a 53 semaines ISO
    // 20 → 14 → 9 → 6
    expect(calculerSemaine(mini, depart({ a: 20 }), [], '2026-S48').courante.a!.ajustement).toBe(6);
  });
});

describe('semaine à publier', () => {
  const f = (semaine: string): FichierPopularite => ({ ...depart(), semaine });
  it('la semaine qui suit la dernière publiée ; la semaine en cours si des semaines ont été sautées', () => {
    expect(semaineAPublier(f('2026-S45'), new Date('2026-11-07T12:00:00Z'))).toBe('2026-S46');
    expect(semaineAPublier(f('2026-S40'), new Date('2026-11-07T12:00:00Z'))).toBe('2026-S45');
  });

  it('au plus une semaine d’avance : après avoir publié la semaine prochaine, il faut attendre lundi', () => {
    expect(publicationPossible(f('2026-S45'), new Date('2026-11-07T12:00:00Z'))).toEqual({ ok: true, semaine: '2026-S46' });
    const r = publicationPossible(f('2026-S46'), new Date('2026-11-07T12:00:00Z'));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.raison).toBe('La semaine 2026-S46 est déjà publiée. La suivante (2026-S47) pourra l’être à partir du lundi 9 novembre.');
    expect(publicationPossible(f('2026-S46'), new Date('2026-11-09T08:00:00Z')).ok).toBe(true);
  });
});

describe('fichier popularite.json', () => {
  it('ancien format migré : la semaine courante devient la base + 0', () => {
    const ancien = { semaine: '2026-S45', semainePrecedente: '2026-S44', courante: { a: 12 }, precedente: { a: 30 } };
    expect(estAncienFormat(ancien)).toBe(true);
    const m = migrerAncienFichier(ancien, mini);
    expect(m.courante).toEqual({ a: { popularite: 50, ajustement: 0 }, b: { popularite: 96, ajustement: 0 }, c: { popularite: 3, ajustement: 0 } });
    expect(m.precedente).toEqual(m.courante);
    expect([m.semaine, m.semainePrecedente, m.coupsDePouce]).toEqual(['2026-S45', '2026-S44', []]);
    expect(lireFichierPopularite(ancien, mini)).toEqual({ fichier: m, migre: true });
  });

  it('le fichier du jeu se lit (ancien format migré, ou nouveau) avec la base du jeu', () => {
    const r = lireFichierPopularite(populariteJson, base);
    expect('fichier' in r).toBe(true);
  });

  it('nouveau format vérifié : bornes, popularité = base + ajustement, personnage connu', () => {
    const f = depart({ a: 10 });
    expect(lireFichierPopularite(f, mini)).toEqual({ fichier: f, migre: false });
    const casse = structuredClone(f);
    casse.courante.a = { popularite: 70, ajustement: 10 };
    casse.courante.b = { popularite: 101, ajustement: 5 };
    casse.precedente.z = { popularite: 10, ajustement: 0 };
    const r = lireFichierPopularite(casse, mini);
    expect('erreurs' in r && r.erreurs).toEqual([
      'Popularité courante : a, popularité 70 ≠ base 50 + ajustement 10.',
      'Popularité courante : b doit avoir une popularité entière de 1 à 100 (valeur : 101).',
      'Popularité precedente : personnage inconnu « z » (absent de popularite-base.json).',
    ]);
  });

  it('popularité du jeu : un personnage absent du fichier prend sa base', () => {
    const f = depart({ a: 10 });
    delete f.courante.c;
    const p = versPopularite(f, mini);
    expect(p.courante).toEqual({ a: 60, b: 96, c: 3 });
    expect(p.semaine).toBe('2026-S45');
  });

  it('la cote suit : après +10 sur une série, la cote des cartes de la série monte, flèche vers le haut', () => {
    const lancement = assembler(catalogue[0]!);
    const avant = migrerAncienFichier({ semaine: '2026-S45' }, base);
    const apres = calculerSemaine(base, avant, [serie('One Piece', 10)], '2026-S46');
    const luffy = lancement.cartes.find((c) => c.id === 'lan-001')!;
    const naruto = lancement.cartes.find((c) => base.personnages[c.personnage]?.serie === 'Naruto')!;
    const t = tendanceCote(versPopularite(apres, base), luffy);
    expect(t.sens).toBe('hausse');
    expect(t.actuelle).toBeGreaterThan(t.precedente);
    expect(tendanceCote(versPopularite(apres, base), naruto).sens).toBe('stable');
    // La semaine suivante sans actualité : elle redescend (95 + 10 → borné à 100, ajustement 5 → 3 ⇒ 98).
    const ensuite = calculerSemaine(base, apres, [], '2026-S47');
    expect(tendanceCote(versPopularite(ensuite, base), luffy).sens).toBe('baisse');
  });
});

describe('validation', () => {
  it('base du jeu : chaque personnage des vagues sorties a une base de 1 à 100', () => {
    const toutes = assembler(catalogue[0]!).personnages;
    expect(validerBase(base, disponiblesAu(catalogue, '2026-11-07')[0]!.extension.personnages, toutes)).toEqual([]);
  });

  it('base manquante, hors limites ou personnage inconnu : erreurs claires', () => {
    const p = (id: string) => ({ id, nom: id, serie: 'S', rang: 'C' as const, element: 'feu' as const, type: 'base' as const, pv: 1, repli: 0, talent: null, attaques: [] });
    const b: BasePopularite = { personnages: { a: { nom: 'a', serie: 'S', base: 0 }, z: { nom: 'z', serie: 'S', base: 50 } } };
    expect(validerBase(b, [p('a'), p('x')])).toEqual([
      'Popularité de base : aucune base pour x (x).',
      'Popularité de base : a doit avoir une base entière de 1 à 100 (valeur : 0).',
      'Popularité de base : personnage inconnu « z ».',
    ]);
  });

  it('coups de pouce : valeurs autorisées (−5, +5, +10, +15), cibles connues, une fois chacune', () => {
    expect(validerCoups([serie('Série A', 10), perso('c', -5)], mini)).toEqual([serie('Série A', 10), perso('c', -5)]);
    expect(validerCoups([{ cible: { type: 'serie', serie: 'Série A' }, valeur: 20 }], mini)).toEqual(['Coup de pouce : valeur 20 non autorisée (-5, 5, 10, 15).']);
    expect(validerCoups([serie('Inconnue', 5)], mini)).toEqual(['Coup de pouce : série inconnue « Inconnue ».']);
    expect(validerCoups([perso('a', 5), perso('a', 10)], mini)).toEqual(['Coup de pouce : cible en double (a).']);
  });
});

describe('aperçu', () => {
  it('nouvelle popularité, flèche, plus fortes hausses et baisses', () => {
    const avant = depart({ a: 10 });
    const v = apercu(avant, calculerSemaine(mini, avant, [perso('c', 15)], '2026-S46'), mini);
    expect(v.lignes.find((l) => l.id === 'c')).toMatchObject({ avant: 3, apres: 18, variation: 15, sens: 'hausse' });
    expect(v.lignes.find((l) => l.id === 'a')).toMatchObject({ avant: 60, apres: 57, variation: -3, sens: 'baisse' });
    expect(v.lignes.find((l) => l.id === 'b')!.sens).toBe('stable');
    expect(v.hausses.map((l) => l.id)).toEqual(['c']);
    expect(v.baisses.map((l) => l.id)).toEqual(['a']);
  });
});
