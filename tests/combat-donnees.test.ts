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
