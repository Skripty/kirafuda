import { describe, expect, it } from 'vitest';
import extensionJson from '../src/data/extension-lancement.json';
import type { Extension, Sauvegarde } from '../src/core/types';
import { PRIX_BOUTIQUE } from '../src/core/regles';
import { acheter } from '../src/core/boutique';
import { sauvegardeParDefaut, validerSauvegarde } from '../src/core/sauvegarde';

const extension = extensionJson as unknown as Extension;
const avec = (s: Partial<Sauvegarde>): Sauvegarde => ({ ...sauvegardeParDefaut(), ...s });
const carteDe = (finition: string) => extension.cartes.find((c) => c.finition === finition)!;

describe('boutique de points : chaque carte au prix de sa rareté', () => {
  it('prix du GDD par rareté', () => {
    expect(PRIX_BOUTIQUE).toEqual({ commune: 35, 'peu-commune': 70, holo: 150, 'holo-integrale': 500, pleine: 400, alternative: 1250, immersive: 1500, couronne: 2500 });
  });

  it('le prix vient de la rareté de la carte', () => {
    for (const [f, prix] of Object.entries(PRIX_BOUTIQUE)) {
      const c = carteDe(f);
      expect(acheter(avec({ points: { lancement: 3000 } }), extension, c.id)).toMatchObject({ ok: true, prix, soldeApres: 3000 - prix });
    }
  });

  it('échange : points débités et exemplaire ajouté à la carte, en une seule nouvelle sauvegarde', () => {
    const s = avec({ points: { lancement: 600, autre: 9 }, collection: { 'lan-001': 1 } });
    const r = acheter(s, extension, 'lan-001'); // Luffy, carte de base ♦♦♦♦ : 500 points
    expect(r).toMatchObject({ ok: true, prix: 500, soldeApres: 100 });
    if (!r.ok) return;
    expect(r.sauvegarde.points).toEqual({ lancement: 100, autre: 9 });
    expect(r.sauvegarde.collection['lan-001']).toBe(2);
    expect(s.points.lancement).toBe(600); // original intact
  });

  it('solde exact : passe et tombe à 0', () => {
    const r = acheter(avec({ points: { lancement: 35 } }), extension, carteDe('commune').id);
    expect(r.ok && r.soldeApres).toBe(0);
  });

  it('points insuffisants : rien ne change, le manque est indiqué', () => {
    expect(acheter(avec({ points: { lancement: 100 } }), extension, carteDe('holo').id)).toEqual({ ok: false, raison: 'points-insuffisants', manque: 50 });
    expect(acheter(avec({}), extension, carteDe('commune').id)).toEqual({ ok: false, raison: 'points-insuffisants', manque: 35 });
  });

  it('carte inconnue refusée', () => {
    expect(acheter(avec({ points: { lancement: 9999 } }), extension, 'lan-999')).toEqual({ ok: false, raison: 'carte-inconnue' });
  });

  it('la nouvelle sauvegarde reste valide', () => {
    const r = acheter(avec({ points: { lancement: 3000 } }), extension, carteDe('couronne').id);
    expect(r.ok && validerSauvegarde(r.sauvegarde, { extension, refuserCartesInconnues: true }).ok).toBe(true);
  });
});
