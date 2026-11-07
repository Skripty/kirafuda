import { describe, expect, it } from 'vitest';
import extensionJson from '../src/data/extension-lancement.json';
import type { Carte, Extension } from '../src/core/types';
import { ORDRE_FINITIONS } from '../src/core/regles';
import { calquesDeLaFinition, candidatsAffichage, candidatsImage } from '../src/core/images';
import { indexer } from '../src/core/extension';

const extension = extensionJson as unknown as Extension;
const index = indexer(extension);
const sources = (c: Carte, calque: 'illustration' = 'illustration'): string[] =>
  candidatsImage(c, calque, index.base(c.personnage)).map((x) => `${x.src} (${x.origine})`);

describe('images des cartes : une image par carte, repli sur la carte de base', () => {
  const base = index.carte('lan-001')!;        // Luffy, carte de base ♦♦♦♦
  const alternative = index.carte('lan-125')!; // Luffy ★★ (secrète)

  it('carte de base : son illustration seulement', () => {
    expect(sources(base, 'illustration')).toEqual(['cartes/lan-001/illustration.webp (carte)']);
  });

  it('carte secrète ★ : son illustration, puis celle de la carte de base du même personnage', () => {
    const pleine = extension.cartes.find((c) => c.secrete && c.finition === 'pleine')!;
    const b = index.base(pleine.personnage)!;
    expect(sources(pleine, 'illustration')).toEqual([`cartes/${pleine.id}/illustration.webp (carte)`, `cartes/${b.id}/illustration.webp (base)`]);
  });

  it('alternative et immersive : une seule illustration aussi, avec repli sur la carte de base', () => {
    expect(alternative.secrete).toBe(true);
    expect(sources(alternative)).toEqual(['cartes/lan-125/illustration.webp (carte)', 'cartes/lan-001/illustration.webp (base)']);
  });

  it('une illustration fixe pour toutes les raretés ; l’immersive peut avoir en plus une animation (WebP animé)', () => {
    for (const f of ORDRE_FINITIONS) expect(calquesDeLaFinition(f)).toEqual(f === 'immersive' ? ['illustration', 'animation'] : ['illustration']);
    expect(candidatsImage(base, 'animation')).toEqual([]);
  });

  it('immersive : l’animation d’abord, puis l’image fixe, puis la carte de base', () => {
    const imm = index.carte('lan-135')!; // Luffy ★★★
    const liste = (reduit: boolean) => candidatsAffichage(imm, index.base(imm.personnage), reduit).map((x) => x.src);
    expect(liste(false)).toEqual(['cartes/lan-135/animation.webp', 'cartes/lan-135/illustration.webp', 'cartes/lan-001/illustration.webp']);
    // Animations réduites : une image animée ne peut pas être mise en pause, on montre l’image fixe.
    expect(liste(true)).toEqual(['cartes/lan-135/illustration.webp', 'cartes/lan-001/illustration.webp']);
    // Les autres raretés n’ont jamais d’animation.
    expect(candidatsAffichage(alternative, base, false).map((x) => x.src)).toEqual(['cartes/lan-125/illustration.webp', 'cartes/lan-001/illustration.webp']);
  });

  it('le cadrage enregistré de chaque carte est utilisé, y compris pour le repli', () => {
    const b = { ...base, images: { illustration: { zoom: 140, x: 30, y: 20 } } };
    const alt = { ...alternative, images: { illustration: { zoom: 90, x: 50, y: 60 } } };
    expect(candidatsImage(alt, 'illustration', b).map((x) => x.cadrage)).toEqual([{ zoom: 90, x: 50, y: 60 }, { zoom: 140, x: 30, y: 20 }]);
  });

  it('chaque carte a toujours au moins un candidat pour son calque principal (puis un visuel de remplacement)', () => {
    for (const c of extension.cartes) expect(sources(c).length).toBeGreaterThan(0);
  });
});
