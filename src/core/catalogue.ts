// Extensions et vagues (GDD ; src/data/extensions.json). Logique pure : le chargement des fichiers JSON
// se fait côté application (src/catalogue.ts) et dans le plugin d'admin ; ici, on assemble, valide et interroge.
//
// Une extension a un seul booster et se compose de vagues (Lancement : vague 1 = « Lancement », 140 cartes ;
// vague 2 = « Renforts », 32 cartes). Une vague rejoint le booster à sa date « disponibleLe ».
// Les ids de cartes ne changent jamais (lan-xxx, ren-xxx) ; la numérotation affichée est recalculée à partir
// des vagues sorties : cartes de base d'abord (vague après vague), puis cartes secrètes par rareté.
import { jourLocal } from './economie';
import { indexer } from './extension';
import { ORDRE_FINITIONS } from './regles';
import { validerBooster, validerExtension } from './validation';
import { lireFichierPopularite, validerBase, type BasePopularite } from './popularite';
import { debutSemaine, validerThemes, type Theme } from './draft';
import type { Booster, Carte, Extension } from './types';

/** Une vague dans src/data/extensions.json. */
export interface EntreeVague {
  id: string;
  nom: string;
  fichier: string;
  /** Date de sortie, AAAA-MM-JJ (heure locale). */
  disponibleLe: string;
}

/** Une extension dans src/data/extensions.json. */
export interface EntreeExtension {
  id: string;
  nom: string;
  edition: number;
  booster: string;
  vagues: EntreeVague[];
}

/** Une vague chargée : ses personnages et ses cartes (numéros propres à la vague, de 1 à son total). */
export interface Vague {
  id: string;
  nom: string;
  /** 1 pour la première vague. */
  numero: number;
  disponibleLe: string;
  donnees: Extension;
}

/** Une extension chargée : son booster et toutes ses vagues (sorties ou non). */
export interface ExtensionCatalogue {
  id: string;
  nom: string;
  edition: number;
  booster: Booster;
  vagues: Vague[];
}

export type Catalogue = ExtensionCatalogue[];

/** Une extension telle qu'elle est à une date : les cartes de ses vagues sorties, numérotées. */
export interface ExtensionSortie {
  extension: Extension;
  booster: Booster;
  /** Vagues sorties, dans l'ordre. */
  vagues: Vague[];
  /** Date de sortie de l'extension (sa première vague). */
  disponibleLe: string;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const dateReelle = (j: string): boolean => {
  if (!DATE.test(j)) return false;
  const [a, m, d] = j.split('-').map(Number) as [number, number, number];
  const x = new Date(a, m - 1, d);
  return x.getFullYear() === a && x.getMonth() === m - 1 && x.getDate() === d;
};

/**
 * Charge le catalogue à partir de extensions.json et des fichiers déjà lus (nom de fichier → contenu).
 * Renvoie les erreurs s'il manque un fichier ou si la liste est mal formée.
 */
export function construireCatalogue(entrees: EntreeExtension[], fichiers: Record<string, unknown>): { catalogue: Catalogue; erreurs: string[] } {
  const erreurs: string[] = [];
  const catalogue: Catalogue = [];
  if (!Array.isArray(entrees) || entrees.length === 0) return { catalogue, erreurs: ['Extensions : la liste de src/data/extensions.json est vide.'] };
  const idsVagues = new Set<string>();
  for (const [i, e] of entrees.entries()) {
    const ref = `Extensions, ligne ${i + 1} (« ${e?.id ?? '?'} »)`;
    if (!e || typeof e.id !== 'string' || !e.id || !e.nom) { erreurs.push(`${ref} : id et nom obligatoires.`); continue; }
    const booster = fichiers[e.booster] as Booster | undefined;
    if (!booster) { erreurs.push(`${ref} : fichier « ${e.booster} » introuvable dans src/data.`); continue; }
    if (booster.extension !== e.id) erreurs.push(`${ref} : le booster « ${booster.id} » appartient à l'extension « ${booster.extension} ».`);
    if (!Array.isArray(e.vagues) || e.vagues.length === 0) { erreurs.push(`${ref} : au moins une vague est attendue.`); continue; }
    const vagues: Vague[] = [];
    let precedente = '';
    for (const [j, v] of e.vagues.entries()) {
      const rv = `${e.nom}, vague ${j + 1} (« ${v?.id ?? '?'} »)`;
      if (!v || !v.id || !v.nom) { erreurs.push(`${rv} : id et nom obligatoires.`); continue; }
      if (idsVagues.has(v.id)) erreurs.push(`${rv} : id de vague en double.`);
      idsVagues.add(v.id);
      if (typeof v.disponibleLe !== 'string' || !dateReelle(v.disponibleLe)) erreurs.push(`${rv} : date « disponibleLe » invalide (AAAA-MM-JJ attendu).`);
      else if (v.disponibleLe < precedente) erreurs.push(`${rv} : les vagues doivent être rangées par date de sortie.`);
      else precedente = v.disponibleLe;
      const donnees = fichiers[v.fichier] as Extension | undefined;
      if (!donnees) { erreurs.push(`${rv} : fichier « ${v.fichier} » introuvable dans src/data.`); continue; }
      if (donnees.id !== v.id) erreurs.push(`${rv} : le fichier « ${v.fichier} » contient « ${donnees.id} ».`);
      vagues.push({ id: v.id, nom: v.nom, numero: j + 1, disponibleLe: v.disponibleLe, donnees });
    }
    catalogue.push({ id: e.id, nom: e.nom, edition: e.edition, booster, vagues });
  }
  return { catalogue, erreurs };
}

// ---------- Assemblage et numérotation ----------

const assemblages = new WeakMap<ExtensionCatalogue, Map<number, Extension>>();

/**
 * L'extension avec ses `n` premières vagues, numérotée : cartes de base d'abord (vague après vague, dans l'ordre
 * de chaque vague), puis cartes secrètes par rareté (★, ★★, ★★★, ♛), vague après vague. Total affiché = cartes de base.
 * Le résultat est mis en cache (même objet pour les mêmes vagues : l'index des cartes est calculé une fois).
 */
export function assembler(ext: ExtensionCatalogue, n: number = ext.vagues.length): Extension {
  const cache = assemblages.get(ext) ?? new Map<number, Extension>();
  assemblages.set(ext, cache);
  const deja = cache.get(n);
  if (deja) return deja;
  const vagues = ext.vagues.slice(0, n);
  const parNumero = (a: Carte, b: Carte): number => a.numero - b.numero;
  const bases = vagues.flatMap((v) => v.donnees.cartes.filter((c) => !c.secrete).sort(parNumero).map((c) => ({ c, v })));
  const secretes = ORDRE_FINITIONS.flatMap((f) =>
    vagues.flatMap((v) => v.donnees.cartes.filter((c) => c.secrete && c.finition === f).sort(parNumero).map((c) => ({ c, v }))));
  const cartes: Carte[] = [...bases, ...secretes].map(({ c, v }, i) => ({ ...c, numero: i + 1, vague: v.id }));
  const extension: Extension = {
    id: ext.id,
    nom: ext.nom,
    edition: ext.edition,
    total: bases.length,
    totalAvecSecretes: cartes.length,
    personnages: vagues.flatMap((v) => v.donnees.personnages),
    cartes,
  };
  cache.set(n, extension);
  return extension;
}

/** Nombre de vagues sorties à un jour donné (AAAA-MM-JJ). */
const vaguesSorties = (ext: ExtensionCatalogue, jour: string): number => ext.vagues.filter((v) => v.disponibleLe <= jour).length;

/** Extensions sorties à un jour (AAAA-MM-JJ, local) : celles dont la première vague est sortie, avec leurs vagues sorties. */
export function disponiblesAu(catalogue: Catalogue, jour: string): ExtensionSortie[] {
  return catalogue
    .map((ext) => ({ ext, n: vaguesSorties(ext, jour) }))
    .filter(({ n }) => n > 0)
    .map(({ ext, n }) => ({ extension: assembler(ext, n), booster: ext.booster, vagues: ext.vagues.slice(0, n), disponibleLe: ext.vagues[0]!.disponibleLe }));
}

/** Extensions sorties à cette date (heure locale). */
export const disponibles = (catalogue: Catalogue, maintenant: Date): ExtensionSortie[] => disponiblesAu(catalogue, jourLocal(maintenant));

/** Extensions du draft d'une semaine : vagues sorties au début de la semaine (lundi, temps universel). */
export const disponiblesPourDraft = (catalogue: Catalogue, maintenant: Date): ExtensionSortie[] => disponiblesAu(catalogue, debutSemaine(maintenant));

/** Vagues qui ont un calendrier de sortie : toutes sauf la première de chaque extension. */
export function vaguesAvecCalendrier(catalogue: Catalogue): { id: string; nom: string; disponibleLe: string }[] {
  return catalogue.flatMap((e) => e.vagues.slice(1).map((v) => ({ id: v.id, nom: v.nom, disponibleLe: v.disponibleLe })));
}

/** Chaque extension avec toutes ses vagues (cartes connues : import, migration, admin). */
export const toutesLesExtensions = (catalogue: Catalogue): Extension[] => catalogue.map((e) => assembler(e));

// ---------- Validation ----------

/**
 * Valide chaque vague (comme une extension à part entière : personnages, cartes, numéros dans la vague),
 * l'extension complète, et l'unicité des ids de cartes, de personnages et de boosters entre vagues et extensions.
 */
export function validerCatalogue(catalogue: Catalogue): string[] {
  const erreurs: string[] = [];
  const vus = { carte: new Map<string, string>(), personnage: new Map<string, string>(), booster: new Map<string, string>() };
  const unique = (genre: keyof typeof vus, id: string, ou: string): void => {
    const deja = vus[genre].get(id);
    if (deja !== undefined) erreurs.push(`Extensions : ${genre} « ${id} » présent dans « ${deja} » et « ${ou} » (les ids doivent être uniques).`);
    else vus[genre].set(id, ou);
  };
  for (const ext of catalogue) {
    for (const v of ext.vagues) {
      const prefixe = (m: string): string => (ext.vagues.length > 1 ? `${ext.nom}, vague ${v.nom} — ${m}` : m);
      erreurs.push(...validerExtension(v.donnees).map(prefixe));
      for (const p of v.donnees.personnages ?? []) unique('personnage', p.id, v.id);
      for (const c of v.donnees.cartes ?? []) unique('carte', c.id, v.id);
    }
    unique('booster', ext.booster.id, ext.id);
  }
  if (erreurs.length === 0) for (const ext of catalogue) erreurs.push(...validerExtension(assembler(ext)));
  return erreurs;
}

/**
 * Point d'entrée de la validation au démarrage : catalogue, booster (chaque rareté à poids non nul doit avoir
 * au moins une carte parmi les cartes sorties), popularité (une base de 1 à 100 pour chaque personnage des vagues
 * sorties ; popularite.json lisible, valeurs de 1 à 100), thèmes du draft.
 */
export function validerJeu(catalogue: Catalogue, popularite: { base: BasePopularite; fichier: unknown }, themes: Theme[], maintenant: Date): string[] {
  const erreurs = validerCatalogue(catalogue);
  if (erreurs.length > 0 || catalogue.length === 0) return erreurs;
  const sorties = disponibles(catalogue, maintenant);
  if (sorties.length === 0) return ['Extensions : aucune extension n’est encore sortie (voir « disponibleLe » dans src/data/extensions.json).'];
  const toutes = fusionner(toutesLesExtensions(catalogue));
  return [
    ...sorties.flatMap((s) => validerBooster(s.booster, s.extension)),
    ...validerBase(popularite.base, sorties.flatMap((s) => s.extension.personnages), toutes.personnages),
    ...(() => { const r = lireFichierPopularite(popularite.fichier, popularite.base); return 'erreurs' in r ? r.erreurs : []; })(),
    ...validerThemes(themes, toutes),
  ];
}

// ---------- Recherche ----------

/** Extension (sortie) d'un booster, ou undefined. */
export function extensionDeBooster(sorties: ExtensionSortie[], boosterId: string): ExtensionSortie | undefined {
  return sorties.find((e) => e.booster.id === boosterId);
}

/** Carte (numérotée selon les vagues sorties) et son extension, ou undefined. */
export function trouverCarte(sorties: ExtensionSortie[], carteId: string): { carte: Carte; sortie: ExtensionSortie } | undefined {
  for (const sortie of sorties) {
    const carte = indexer(sortie.extension).carte(carteId);
    if (carte) return { carte, sortie };
  }
  return undefined;
}

const fusions = new Map<string, Extension>();
/** Vue réunie de plusieurs extensions (cote, draft, quêtes). Avec une seule extension : elle-même. */
export function fusionner(extensions: Extension[]): Extension {
  if (extensions.length === 1) return extensions[0]!;
  const cle = extensions.map((e) => `${e.id}:${e.cartes.length}`).join('+');
  const deja = fusions.get(cle);
  if (deja && extensions.every((e) => deja.cartes.includes(e.cartes[0]!))) return deja;
  const fusion: Extension = {
    id: extensions.map((e) => e.id).join('+'),
    nom: extensions.map((e) => e.nom).join(' + '),
    edition: 0,
    total: extensions.reduce((n, e) => n + e.total, 0),
    totalAvecSecretes: extensions.reduce((n, e) => n + e.totalAvecSecretes, 0),
    personnages: extensions.flatMap((e) => e.personnages),
    cartes: extensions.flatMap((e) => e.cartes),
  };
  fusions.set(cle, fusion);
  return fusion;
}

/** Jours écoulés depuis la sortie (0 le jour même), en jours locaux ; négatif avant la sortie. */
export function joursDepuisSortie(disponibleLe: string, maintenant: Date): number {
  const [a, m, d] = disponibleLe.split('-').map(Number) as [number, number, number];
  const sortie = new Date(a, m - 1, d);
  const jour = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate());
  return Math.round((jour.getTime() - sortie.getTime()) / 86_400_000);
}
