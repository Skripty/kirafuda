// Données du combat : chaque attaque et chaque talent des fiches actuelles, et chaque carte Soutien, sont traduits
// dans le vocabulaire d'effets (src/core/combat/effets.ts) ; decks de série générés.
import { describe, expect, it } from 'vitest';
import fichesJson from '../src/data/fiches-combat.json';
import soutiensJson from '../src/data/soutiens.json';
import { validerEffetsSoutien } from '../src/core/combat/effets';
import { validerCombat, validerFiches } from '../src/core/combat/fiches';
import { deckDeSerie, seriesDe } from '../src/core/combat/decks';
import { validerDeck } from '../src/core/combat/moteur';
import { bib } from './outils-combat';

describe('effets structurés', () => {
  const actuelles = fichesJson.fiches.filter((f) => !f.nouveau);

  it('124 fiches : chaque talent et chaque attaque à texte d’effet a des effets valides', () => {
    expect(actuelles).toHaveLength(124);
    expect(validerFiches(fichesJson)).toEqual([]);
    for (const f of actuelles) {
      if (f.talent) expect((f.talent as { effets?: unknown[] }).effets?.length, `${f.nom} : talent`).toBeGreaterThan(0);
      for (const a of f.attaques as { nom: string; effet: string; effets?: unknown[] }[]) {
        expect(Array.isArray(a.effets), `${f.nom} : ${a.nom}`).toBe(true);
        if (a.effet.trim()) expect(a.effets!.length, `${f.nom} : ${a.nom}`).toBeGreaterThan(0);
      }
    }
  });

  it('une attaque à texte d’effet sans effets structurés bloque le démarrage', () => {
    const luffy = structuredClone(bib.personnages.get('per-001')!);
    delete luffy.attaques[1]!.effets;
    expect(validerCombat(luffy, 'x').join(' ')).toMatch(/sans effets structurés/);
    const nobara = structuredClone(bib.personnages.get('per-010')!);
    nobara.attaques[1]!.effets = [{ type: 'magie' } as never];
    expect(validerCombat(nobara, 'x').join(' ')).toMatch(/effet inconnu/);
  });

  it('20 cartes Soutien : 10 Objets, 6 Soutiens, 4 Terrains, chacune avec des effets valides', () => {
    const s = soutiensJson.soutiens;
    expect(s).toHaveLength(20);
    expect(['objet', 'soutien', 'terrain'].map((t) => s.filter((x) => x.type === t).length)).toEqual([10, 6, 4]);
    for (const x of s) {
      expect(x.effets.length, x.id).toBeGreaterThan(0);
      expect(validerEffetsSoutien(x.effets, x.id)).toEqual([]);
    }
  });
});

describe('decks de série (simulation)', () => {
  it('un deck valide par série qui a au moins un Base', () => {
    const sans: string[] = [];
    for (const s of seriesDe(bib)) {
      const d = deckDeSerie(s, bib);
      if (!d) { sans.push(s); continue; }
      expect(validerDeck(d, bib), s).toEqual([]);
    }
    expect(sans).toEqual(['Naruto']); // Naruto, Sasuke et Itachi sont tous Éveillés (Bases de Naruto : vague 3)
  });
});

describe('decks standardisés (simulation d’équilibrage)', () => {
  it('7 personnages × 2 et les 6 mêmes cartes Soutien ; compléments fixes ; decks valides', async () => {
    const { deckStandard, complementDe, SOUTIENS_STANDARD } = await import('../src/core/combat/decks');
    const { rngAGraine } = await import('../src/core/rng');
    for (const s of seriesDe(bib)) {
      for (const g of ['a', 'b', 'c']) {
        const d = deckStandard(s, bib, rngAGraine(g));
        if (s === 'Naruto') { expect(d).toBeNull(); continue; }
        expect(validerDeck(d!, bib), s).toEqual([]);
        expect(d!.cartes.slice(14), s).toEqual(SOUTIENS_STANDARD);
        expect(new Set(d!.cartes.slice(0, 14)).size, s).toBe(7);
        // Une série qui a au moins 3 Bases en garde au moins 3 dans son deck.
        const bases = d!.cartes.slice(0, 14).filter((id) => bib.personnages.get(id)!.serie === s && bib.personnages.get(id)!.type === 'base');
        expect(new Set(bases).size, s).toBeGreaterThanOrEqual(Math.min(3, [...bib.personnages.values()].filter((p) => p.serie === s && p.type === 'base').length));
      }
      // Compléments : Bases d'autres séries partageant un élément, toujours les mêmes.
      const c = complementDe(s, bib);
      expect(complementDe(s, bib)).toEqual(c);
      const elements = new Set([...bib.personnages.values()].filter((p) => p.serie === s).map((p) => p.element));
      for (const p of c) { expect(p.serie).not.toBe(s); expect(p.type).toBe('base'); expect(elements.has(p.element)).toBe(true); }
    }
  });
});
