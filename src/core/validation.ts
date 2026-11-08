// Vérification des données du jeu au démarrage (extension, booster, popularité, thèmes du draft).
// Si une seule erreur est trouvée, le jeu refuse de démarrer et affiche la liste.
import { CALQUES_PAR_FINITION, ELEMENTS, FINITIONS, ORDRE_RANGS, POPULARITE_MAX, TOTAL_POIDS } from './regles';
import type { Booster, Extension, Popularite } from './types';
import { validerThemes, type Theme } from './draft';
import { validerCombat } from './combat/fiches';

const estRang = (cle: string): boolean => (ORDRE_RANGS as string[]).includes(cle);
const estFinition = (cle: string): boolean => Object.hasOwn(FINITIONS, cle);
const estElement = (cle: string): boolean => Object.hasOwn(ELEMENTS, cle);

/** 100000 → « 100 000 ». Formatage fixe, indépendant de la langue du navigateur. */
const formater = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

/** Vérifie une table de poids : poids entiers positifs ou nuls, raretés connues, total exact de 100 000. */
export function validerTablePoids(nom: string, table: Record<string, number | undefined>): string[] {
  const erreurs: string[] = [];
  let total = 0;
  for (const [cle, poids] of Object.entries(table)) {
    if (!estFinition(cle)) erreurs.push(`${nom} : finition « ${cle} » inconnue (absente de src/core/regles.ts).`);
    if (typeof poids !== 'number' || !Number.isInteger(poids) || poids < 0) {
      erreurs.push(`${nom} : le poids de « ${cle} » doit être un entier positif ou nul (valeur : ${String(poids)}).`);
      continue;
    }
    total += poids;
  }
  if (total !== TOTAL_POIDS) erreurs.push(`${nom} : les poids totalisent ${formater(total)} au lieu de ${formater(TOTAL_POIDS)}.`);
  return erreurs;
}

/**
 * Vérifie personnages et cartes : éléments et rangs connus, chaque carte référence un personnage existant,
 * rareté connue, numéros uniques de 1 à totalAvecSecretes, secrètes exactement au-delà de total,
 * une seule carte de base par personnage, calques d'image permis pour la rareté.
 */
export function validerExtension(extension: Extension): string[] {
  const erreurs: string[] = [];
  const { personnages, cartes, total, totalAvecSecretes } = extension;
  const ref = `Extension « ${extension.id} »`;

  const idsPerso = new Set<string>();
  for (const p of personnages) {
    if (idsPerso.has(p.id)) erreurs.push(`Personnage ${p.id} : identifiant en double.`);
    idsPerso.add(p.id);
    if (!estElement(p.element)) erreurs.push(`Personnage ${p.id} : élément « ${p.element} » inconnu (absent de src/core/regles.ts).`);
    if (!estRang(p.rang)) erreurs.push(`Personnage ${p.id} : rang « ${p.rang} » inconnu (attendu : ${ORDRE_RANGS.join(', ')}).`);
    // Données de combat (fiche du personnage) : type, PV, Repli, talent, attaques et coûts.
    erreurs.push(...validerCombat(p, `Personnage ${p.id} (${p.nom})`));
  }

  if (cartes.length !== totalAvecSecretes) erreurs.push(`${ref} : ${cartes.length} cartes pour un total annoncé de ${totalAvecSecretes}.`);

  const idsCartes = new Set<string>();
  const numerosVus = new Map<number, string>();
  const basesParPerso = new Map<string, number>();
  for (const carte of cartes) {
    const rc = `Carte ${carte.id}`;
    if (idsCartes.has(carte.id)) erreurs.push(`${rc} : identifiant en double.`);
    idsCartes.add(carte.id);
    if (!idsPerso.has(carte.personnage)) erreurs.push(`${rc} : personnage « ${carte.personnage} » inconnu.`);
    if (!estFinition(carte.finition)) {
      erreurs.push(`${rc} : finition « ${carte.finition} » inconnue (absente de src/core/regles.ts).`);
    } else {
      for (const calque of Object.keys(carte.images ?? {})) {
        if (!(CALQUES_PAR_FINITION[carte.finition] as string[]).includes(calque)) {
          erreurs.push(`${rc} : calque d’image « ${calque} » impossible pour la finition « ${carte.finition} ».`);
        }
      }
    }
    if (!Number.isInteger(carte.numero) || carte.numero < 1 || carte.numero > totalAvecSecretes) {
      erreurs.push(`${rc} : numéro ${carte.numero} hors de l'intervalle 1 à ${totalAvecSecretes}.`);
    } else if (carte.secrete !== carte.numero > total) {
      erreurs.push(`${rc} : ${carte.secrete ? 'une carte secrète' : 'une carte de base'} doit avoir un numéro ${carte.secrete ? `au-delà de ${total}` : `de 1 à ${total}`}.`);
    }
    const autre = numerosVus.get(carte.numero);
    if (autre !== undefined) erreurs.push(`${rc} : numéro ${carte.numero} déjà utilisé par ${autre}.`);
    else numerosVus.set(carte.numero, carte.id);
    if (!carte.secrete) basesParPerso.set(carte.personnage, (basesParPerso.get(carte.personnage) ?? 0) + 1);
  }

  for (let n = 1; n <= totalAvecSecretes; n++) {
    if (!numerosVus.has(n)) erreurs.push(`${ref} : aucune carte ne porte le numéro ${n}.`);
  }
  for (const id of idsPerso) {
    const n = basesParPerso.get(id) ?? 0;
    if (n !== 1) erreurs.push(`Personnage ${id} : ${n} carte${n > 1 ? 's' : ''} de base au lieu d’une.`);
  }
  return erreurs;
}

/** Vérifie les tables du booster (finitions seulement) et que chaque rareté tirable a au moins une carte. */
export function validerBooster(booster: Booster, extension: Extension): string[] {
  const erreurs: string[] = [];
  const tables = [
    ...booster.emplacements.map((t) => ({ nom: `Booster, emplacement${t.emplacements.length > 1 ? 's' : ''} ${t.emplacements.join(', ')}`, finitions: t.finitions })),
    { nom: 'Booster, table exceptionnelle', finitions: booster.tableExceptionnelle.finitions },
  ];
  const presentes = new Set<string>(extension.cartes.map((c) => c.finition));
  for (const table of tables) {
    erreurs.push(...validerTablePoids(`${table.nom}, finitions`, table.finitions));
    for (const [f, poids] of Object.entries(table.finitions)) {
      if (typeof poids === 'number' && poids > 0 && estFinition(f) && !presentes.has(f)) {
        erreurs.push(`${table.nom} : la finition « ${f} » a un poids de ${formater(poids)} mais aucune carte de cette rareté dans l'extension.`);
      }
    }
  }
  return erreurs;
}

/**
 * Vérifie popularite.json : une valeur entière de 0 à 100 par personnage de `extension` (les extensions sorties),
 * pour les deux semaines. Les personnages de `connues` (toutes les extensions, sorties ou non) peuvent déjà y
 * figurer ; tout autre id est refusé.
 */
export function validerPopularite(p: Popularite, extension: Extension, connues: Extension = extension): string[] {
  const erreurs: string[] = [];
  const ids = new Set(extension.personnages.map((x) => x.id));
  const permis = new Set([...ids, ...connues.personnages.map((x) => x.id)]);
  for (const [nom, semaine] of [['semaine', p.semaine], ['semainePrecedente', p.semainePrecedente]] as const) {
    if (typeof semaine !== 'string' || semaine.trim() === '') erreurs.push(`Popularité : « ${nom} » doit être renseignée.`);
  }
  for (const [nom, table] of [['courante', p.courante], ['precedente', p.precedente]] as const) {
    if (typeof table !== 'object' || table === null) {
      erreurs.push(`Popularité : la table « ${nom} » est absente.`);
      continue;
    }
    for (const id of ids) {
      const v = table[id];
      if (v === undefined) erreurs.push(`Popularité ${nom} : aucune valeur pour le personnage ${id}.`);
      else if (!Number.isInteger(v) || v < 0 || v > POPULARITE_MAX) {
        erreurs.push(`Popularité ${nom} : le personnage ${id} doit avoir un entier de 0 à ${POPULARITE_MAX} (valeur : ${String(v)}).`);
      }
    }
    for (const id of Object.keys(table)) {
      if (!permis.has(id)) erreurs.push(`Popularité ${nom} : personnage inconnu « ${id} ».`);
    }
  }
  return erreurs;
}

/** Point d'entrée : toutes les erreurs de données. Liste vide = le jeu peut démarrer. */
export function validerDonnees(extension: Extension, booster: Booster, popularite?: Popularite, themes?: Theme[]): string[] {
  return [
    ...validerExtension(extension),
    ...validerBooster(booster, extension),
    ...(popularite ? validerPopularite(popularite, extension) : []),
    ...(themes ? validerThemes(themes, extension) : []),
  ];
}
