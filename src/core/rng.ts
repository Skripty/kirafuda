// Seule source d'aléatoire du jeu : la logique n'utilise jamais le générateur non sécurisé de JavaScript.
// Deux modes :
//  - sécurisé : crypto.getRandomValues, pour les ouvertures de boosters ;
//  - à graine : déterministe (même graine = même suite), pour les tests et le draft hebdomadaire.
import { TOTAL_POIDS } from './regles';
import type { TablePoids } from './types';

export interface Rng {
  /** Entier uniforme dans [0, n[. `n` entier, de 1 à 2³². */
  entier(n: number): number;
  /** Tire une clé d'une table de poids entiers totalisant exactement 100 000. */
  ponderer<K extends string>(table: TablePoids<K>): K;
}

const DEUX_32 = 0x1_0000_0000;

/** Construit un Rng à partir d'une source d'entiers 32 bits non signés uniformes. */
function creerRng(suivant: () => number): Rng {
  function entier(n: number): number {
    if (!Number.isInteger(n) || n < 1 || n > DEUX_32) {
      throw new RangeError(`entier(n) : n doit être un entier de 1 à 2^32 (reçu : ${n}).`);
    }
    // Rejet des valeurs de la dernière tranche incomplète : pas de biais du modulo.
    const limite = DEUX_32 - (DEUX_32 % n);
    let x = suivant();
    while (x >= limite) x = suivant();
    return x % n;
  }

  function ponderer<K extends string>(table: TablePoids<K>): K {
    const entrees = Object.entries(table) as [K, number | undefined][];
    let total = 0;
    for (const [cle, poids] of entrees) {
      if (typeof poids !== 'number' || !Number.isInteger(poids) || poids < 0) {
        throw new RangeError(`ponderer : poids invalide pour « ${cle} » (${String(poids)}).`);
      }
      total += poids;
    }
    if (total !== TOTAL_POIDS) {
      throw new RangeError(`ponderer : la table totalise ${total} au lieu de ${TOTAL_POIDS}.`);
    }

    let tirage = entier(TOTAL_POIDS);
    for (const [cle, poids] of entrees) {
      tirage -= poids!;
      if (tirage < 0) return cle;
    }
    // Inatteignable : le total vaut exactement TOTAL_POIDS.
    throw new Error('ponderer : tirage hors table.');
  }

  return { entier, ponderer };
}

/** Mode sécurisé : crypto.getRandomValues, lu par paquets. */
export function rngSecurise(): Rng {
  const tampon = new Uint32Array(256);
  let index = tampon.length;
  return creerRng(() => {
    if (index === tampon.length) {
      crypto.getRandomValues(tampon);
      index = 0;
    }
    return tampon[index++]!;
  });
}

/** Hachage d'une graine texte en 32 bits (FNV-1a), pour accepter des graines comme « 2026-S45 ». */
function hacher(graine: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < graine.length; i++) {
    h ^= graine.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Mode à graine : générateur sfc32 initialisé par splitmix32.
 * Même graine = même suite de tirages, sur tous les navigateurs.
 */
export function rngAGraine(graine: number | string): Rng {
  let etat = typeof graine === 'string' ? hacher(graine) : graine >>> 0;
  const splitmix32 = (): number => {
    etat = (etat + 0x9e3779b9) >>> 0;
    let z = etat;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
    return (z ^ (z >>> 16)) >>> 0;
  };
  let a = splitmix32();
  let b = splitmix32();
  let c = splitmix32();
  let d = splitmix32();

  const sfc32 = (): number => {
    const t = (((a + b) >>> 0) + d) >>> 0;
    d = (d + 1) >>> 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) >>> 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) >>> 0;
    return t;
  };
  // Quelques tours à vide pour bien mélanger l'état initial.
  for (let i = 0; i < 12; i++) sfc32();
  return creerRng(sfc32);
}
