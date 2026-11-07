import { describe, expect, it } from 'vitest';
import type { FinitionId, Ouverture, Sauvegarde } from '../src/core/types';
import { ORDRE_FINITIONS } from '../src/core/regles';
import {
  effetsRevelation,
  etatInitial,
  indiceBooster,
  marquerVue,
  ouvertureNonVue,
  transition,
  type EtatOuverture,
  type Evenement,
} from '../src/core/revelation';
import { sauvegardeParDefaut } from '../src/core/sauvegarde';

const suite = (evenements: Evenement[], depart: EtatOuverture = etatInitial(5)): EtatOuverture =>
  evenements.reduce(transition, depart);

const ouverture = (finitions: FinitionId[], id = 'o-1', vue = false): Ouverture => ({
  id,
  date: '2026-11-05T20:00:00.000Z',
  boosterId: 'booster-lancement',
  exceptionnelle: false,
  cartes: finitions.map((finition, i) => ({ carteId: `lan-00${i + 1}`, finition, emplacement: i + 1, nouveau: true, exemplaires: 1 })),
  pointsGagnes: 5,
  vue,
});

describe('machine à états de l’ouverture', () => {
  it('parcours complet : présentation, déchirure, 5 cartes, résultats', () => {
    let e = suite(['presente', 'debut-dechirure', 'dechire', 'pile-prete']);
    expect(e).toEqual({ etape: 'PILE', index: 0, total: 5 });
    for (let i = 0; i < 5; i++) {
      expect(e.etape).toBe('PILE');
      expect(e.index).toBe(i);
      e = suite(['toucher', 'retournee'], e);
      expect(e.etape).toBe('REVELEE');
      e = transition(e, 'suivante');
    }
    expect(e.etape).toBe('RESULTATS');
  });

  it('déchirure relâchée avant 75 % : retour au booster prêt', () => {
    expect(suite(['presente', 'debut-dechirure', 'dechirure-annulee']).etape).toBe('BOOSTER_PRET');
  });

  it('bouton « Ouvrir le booster » : équivalent du glissé', () => {
    expect(suite(['presente', 'dechire']).etape).toBe('OUVERT');
  });

  it('« Tout révéler » mène aux résultats depuis n’importe quelle étape', () => {
    const chemins: Evenement[][] = [[], ['presente'], ['presente', 'debut-dechirure'], ['presente', 'dechire'],
      ['presente', 'dechire', 'pile-prete'], ['presente', 'dechire', 'pile-prete', 'toucher'],
      ['presente', 'dechire', 'pile-prete', 'toucher', 'retournee']];
    for (const c of chemins) expect(suite([...c, 'tout-reveler']).etape).toBe('RESULTATS');
  });

  it('un événement hors de propos ne change rien', () => {
    const e = etatInitial(5);
    expect(transition(e, 'toucher')).toBe(e);
    const pile = suite(['presente', 'dechire', 'pile-prete']);
    expect(transition(pile, 'suivante')).toBe(pile); // on ne passe pas une carte non retournée
    const fin = transition(e, 'tout-reveler');
    expect(transition(fin, 'tout-reveler')).toBe(fin);
  });
});

describe('effets de révélation par finition', () => {
  it('commune et peu commune : révélation simple', () => {
    for (const f of ['commune', 'peu-commune'] as const) {
      expect(effetsRevelation(f)).toEqual({ lueur: false, tremblement: false, cinematique: false, ecranDore: false });
    }
  });

  it('lueur dès holo, tremblement dès pleine', () => {
    expect(effetsRevelation('holo')).toEqual({ lueur: true, tremblement: false, cinematique: false, ecranDore: false });
    expect(effetsRevelation('holo-integrale')).toEqual({ lueur: true, tremblement: false, cinematique: false, ecranDore: false });
    expect(effetsRevelation('pleine')).toEqual({ lueur: true, tremblement: true, cinematique: false, ecranDore: false });
    expect(effetsRevelation('alternative')).toEqual({ lueur: true, tremblement: true, cinematique: false, ecranDore: false });
  });

  it('agrandissement cinématique pour immersive, écran doré pour couronne', () => {
    expect(effetsRevelation('immersive')).toEqual({ lueur: true, tremblement: true, cinematique: true, ecranDore: false });
    expect(effetsRevelation('couronne')).toEqual({ lueur: true, tremblement: true, cinematique: false, ecranDore: true });
  });
});

describe('indices honnêtes', () => {
  it('reflet sur le booster si et seulement si une carte ★ ou plus est présente', () => {
    expect(indiceBooster(ouverture(['commune', 'commune', 'commune', 'peu-commune', 'holo']))).toBe(false);
    for (const f of ['pleine', 'alternative', 'immersive', 'couronne'] as const) {
      expect(indiceBooster(ouverture(['commune', 'commune', 'commune', 'peu-commune', f]))).toBe(true);
    }
  });

  it('la lueur n’annonce jamais plus que la carte réelle', () => {
    for (const f of ORDRE_FINITIONS) {
      const e = effetsRevelation(f);
      if (e.lueur) expect(['holo', 'holo-integrale', 'pleine', 'alternative', 'immersive', 'couronne']).toContain(f);
      if (e.tremblement) expect(['pleine', 'alternative', 'immersive', 'couronne']).toContain(f);
    }
  });
});

describe('ouvertures vues', () => {
  const avec = (...historique: Ouverture[]): Sauvegarde => ({ ...sauvegardeParDefaut(), historique });

  it('marquerVue ne change que l’ouverture visée, sans toucher l’original', () => {
    const s = avec(ouverture(['commune'], 'a'), ouverture(['commune'], 'b'));
    const n = marquerVue(s, 'b');
    expect(n.historique.map((o) => o.vue)).toEqual([false, true]);
    expect(s.historique[1]!.vue).toBe(false);
  });

  it('marquerVue sur une ouverture déjà vue ou inconnue : rien ne change', () => {
    const s = avec(ouverture(['commune'], 'a', true));
    expect(marquerVue(s, 'a')).toBe(s);
    expect(marquerVue(s, 'zzz')).toBe(s);
  });

  it('ouvertureNonVue : la plus récente non vue, sinon null', () => {
    expect(ouvertureNonVue(avec())).toBeNull();
    expect(ouvertureNonVue(avec(ouverture(['commune'], 'a', true)))).toBeNull();
    expect(ouvertureNonVue(avec(ouverture(['commune'], 'a'), ouverture(['commune'], 'b'), ouverture(['commune'], 'c', true)))?.id).toBe('b');
  });
});
