// Données de combat (tâche 25) : fiches de src/data/fiches-combat.json recopiées dans les extensions,
// validation (type selon le rang, coûts, dégâts), valeur des dégâts pour la puissance du draft.
import { describe, expect, it } from 'vitest';
import fichesJson from '../src/data/fiches-combat.json';
import lancementJson from '../src/data/extension-lancement.json';
import renfortsJson from '../src/data/extension-renforts.json';
import vague3Json from '../src/data/extension-vague3.json';
import { catalogue } from '../src/catalogue';
import { appliquerFiches, validerCombat, validerFiches, valeurDegats, type FichierFiches } from '../src/core/combat/fiches';
import { serialiserExtension } from '../src/core/edition';
import { disponibles, toutesLesExtensions } from '../src/core/catalogue';
import { puissance } from '../src/core/draft';
import { validerExtension } from '../src/core/validation';
import type { Extension, Personnage } from '../src/core/types';

const fiches = fichesJson as unknown as FichierFiches;
const extensions: [string, Extension][] = [
  ['extension-lancement.json', lancementJson as unknown as Extension],
  ['extension-renforts.json', renfortsJson as unknown as Extension],
  ['extension-vague3.json', vague3Json as unknown as Extension],
];

describe('fiches de combat', () => {
  it('le fichier des fiches est valide (132 fiches, vague 3 comprise)', () => {
    expect(validerFiches(fiches)).toEqual([]);
    expect(fiches.fiches).toHaveLength(132);
    expect(fiches.fiches.filter((f) => f.nouveau)).toHaveLength(0);
  });

  it('les extensions sont à jour avec les fiches (sinon : npm run fiches)', () => {
    for (const [nom, ext] of extensions) {
      const { extension, erreurs } = appliquerFiches(ext, fiches);
      expect(erreurs, nom).toEqual([]);
      expect(serialiserExtension(extension), `${nom} n'est pas à jour : lance npm run fiches`).toBe(serialiserExtension(ext));
    }
  });

  it('chaque personnage sorti a ses données de combat, valides ; Éveillés uniquement en rang A et S', () => {
    const persos = toutesLesExtensions(catalogue).flatMap((e) => e.personnages);
    expect(persos.length).toBeGreaterThanOrEqual(124);
    for (const p of persos) {
      expect(validerCombat(p, p.id), p.id).toEqual([]);
      expect(p.type === 'eveille', `${p.id} (${p.rang})`).toBe(p.rang === 'A' || p.rang === 'S');
    }
    // Ce qui est sorti aujourd'hui passe aussi la validation complète de l'extension.
    for (const e of disponibles(catalogue, new Date())) expect(validerExtension(e.extension)).toEqual([]);
  });

  it('les anciennes attaques génériques ont disparu', () => {
    for (const [, ext] of extensions) {
      for (const p of ext.personnages) for (const a of p.attaques) {
        expect(Array.isArray(a.cout), p.id).toBe(true);
        expect(typeof a.effet, p.id).toBe('string');
      }
    }
  });

  it('une fiche absente ou différente de l’extension est signalée', () => {
    const [, ext] = extensions[0]!;
    const sansLuffy: FichierFiches = { fiches: fiches.fiches.filter((f) => f.personnage !== 'per-001') };
    expect(appliquerFiches(ext, sansLuffy).erreurs).toEqual(['Personnage per-001 (Monkey D. Luffy) : aucune fiche dans fiches-combat.json.']);
    const autreRang: FichierFiches = { fiches: fiches.fiches.map((f) => (f.personnage === 'per-001' ? { ...f, rang: 'B' as const } : f)) };
    expect(appliquerFiches(ext, autreRang).erreurs).toEqual(['Personnage per-001 : rang « S » dans l\'extension, « B » dans sa fiche.']);
  });
});

describe('validation des données de combat', () => {
  const luffy = (lancementJson as unknown as Extension).personnages.find((p) => p.id === 'per-001')!;
  const avec = (m: Partial<Personnage>): Personnage => ({ ...structuredClone(luffy), ...m });

  it('type selon le rang : Éveillé en A et S, Base en C et B', () => {
    expect(validerCombat(avec({ rang: 'B' }), 'x').join(' ')).toMatch(/Éveillé doit être de rang A ou S/);
    expect(validerCombat(avec({ type: 'base' }), 'x').join(' ')).toMatch(/Base doit être de rang C ou B/);
  });

  it('coûts : énergies de l’élément et ◇ seulement, de 1 à 4', () => {
    const attaque = luffy.attaques[0]!;
    expect(validerCombat(avec({ attaques: [{ ...attaque, cout: ['f'] }] }), 'x').join(' ')).toMatch(/énergie « f »/);
    expect(validerCombat(avec({ attaques: [{ ...attaque, cout: ['x' as never] }] }), 'x').join(' ')).toMatch(/inconnue/);
    expect(validerCombat(avec({ attaques: [{ ...attaque, cout: [] }] }), 'x').join(' ')).toMatch(/1 à 4/);
    expect(validerCombat(avec({ attaques: [{ ...attaque, cout: ['l', 'l', 'q', 'q', 'q'] }] }), 'x').join(' ')).toMatch(/1 à 4/);
    // Un Neutre paie en ◇.
    expect(validerCombat(avec({ element: 'neutre', attaques: [{ ...attaque, cout: ['l'] }] }), 'x').join(' ')).toMatch(/énergie « l »/);
    expect(validerCombat(avec({ element: 'neutre', attaques: [{ ...attaque, cout: ['q', 'q'] }] }), 'x')).toEqual([]);
  });

  it('rang C : toutes les attaques ne coûtent que des ◇', () => {
    const rangC = (lancementJson as unknown as Extension).personnages.concat((renfortsJson as unknown as Extension).personnages).filter((p) => p.rang === 'C');
    expect(rangC.length).toBeGreaterThan(50);
    for (const p of rangC) for (const a of p.attaques) expect(a.cout.every((c) => c === 'q'), `${p.nom} : ${a.nom}`).toBe(true);
    const thors = rangC.find((p) => p.id === 'per-067')!; // Eau, rang C
    expect(validerCombat({ ...thors, attaques: [{ ...thors.attaques[0]!, cout: ['e', 'q'] }] }, 'x').join(' ')).toMatch(/rang C ne paie qu'en ◇/);
  });

  it('1 ou 2 attaques, PV, Repli, talent et dégâts lisibles', () => {
    expect(validerCombat(avec({ attaques: [] }), 'x').join(' ')).toMatch(/1 ou 2 attaques/);
    expect(validerCombat(avec({ pv: 75 }), 'x').join(' ')).toMatch(/PV/);
    expect(validerCombat(avec({ repli: 5 }), 'x').join(' ')).toMatch(/Repli/);
    expect(validerCombat(avec({ talent: { nom: '', texte: 'x' } }), 'x').join(' ')).toMatch(/talent/);
    expect(validerCombat(avec({ attaques: [{ ...luffy.attaques[0]!, degats: 'beaucoup' }] }), 'x').join(' ')).toMatch(/illisibles/);
  });

  it('un personnage sans fiche (anciennes données) bloque le démarrage avec un message clair', () => {
    const ancien = { id: 'per-x', nom: 'X', serie: 'S', rang: 'C', element: 'feu', pv: 80, attaques: [] } as unknown as Personnage;
    expect(validerCombat(ancien, 'Personnage per-x').join(' ')).toMatch(/fiche de combat manquante \? lance npm run fiches/);
  });
});

describe('dégâts pour la puissance du draft', () => {
  it('« 30× » compte 45, « 50 / 0 » compte 25, une attaque sans dégâts compte 0', () => {
    expect(valeurDegats(40)).toBe(40);
    expect(valeurDegats('30×')).toBe(45);
    expect(valeurDegats('50 / 0')).toBe(25);
    expect(valeurDegats('')).toBe(0);
    expect(valeurDegats('n’importe quoi')).toBeNaN();
  });

  it('puissance = (PV + dégâts de toutes les attaques) ÷ 10, arrondi', () => {
    const p = (degats: (number | string)[], pv = 100): Personnage => ({
      id: 'p', nom: 'P', serie: 'S', rang: 'C', element: 'feu', type: 'base', pv, repli: 1, talent: null,
      attaques: degats.map((d) => ({ nom: 'a', cout: ['f'], degats: d, effet: '' })),
    });
    expect(puissance(p([40]))).toBe(14);
    expect(puissance(p([20, '30×']))).toBe(17); // (100 + 20 + 45) / 10 = 16,5 → 17
    expect(puissance(p(['50 / 0']))).toBe(13); // 12,5 → 13
    expect(puissance(p(['']))).toBe(10);
    // Avec les vraies fiches : Luffy (170 PV, 40 + 180).
    const luffy = (lancementJson as unknown as Extension).personnages.find((x) => x.id === 'per-001')!;
    expect(puissance(luffy)).toBe(Math.round((luffy.pv + luffy.attaques.reduce((n, a) => n + valeurDegats(a.degats), 0)) / 10));
  });
});
