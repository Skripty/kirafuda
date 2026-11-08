// Édition des cartes par la page d'admin (développement seulement).
// Logique pure, partagée par le plugin Vite (côté serveur) et la page /admin.html (côté navigateur) :
// vérification des paramètres d'image, application d'une édition, plan de migration des anciennes images.
import { CALQUES_PAR_FINITION, FINITIONS } from './regles';
import { CADRAGE_DEFAUT, cheminImage, extensionCalque } from './images';
import { indexer } from './extension';
import { validerExtension } from './validation';
import type { Cadrage, Calque, Carte, Extension, FinitionId, ImagesCarte, Personnage } from './types';

export { CADRAGE_DEFAUT, cheminImage };

/** Taille maximale d'une image reçue (20 Mo). */
export const TAILLE_MAX_IMAGE = 20 * 1024 * 1024;
export const CALQUES: Calque[] = ['illustration', 'animation'];
export const LIMITES_CADRAGE = { zoom: [50, 300], x: [0, 100], y: [0, 100] } as const;

/** Nom du fichier d'un calque : « illustration.webp » ou « animation.webp » (immersive, WebP animé). */
export const nomFichierImage = (calque: Calque): string => `${calque}.${extensionCalque(calque)}`;

export const calqueAutorise = (carte: Carte, calque: Calque): boolean => CALQUES_PAR_FINITION[carte.finition].includes(calque);

const dangereux = (v: string): boolean => v.includes('..') || v.includes('/') || v.includes('\\') || v.includes('\0');

export type ParametresImage =
  | { ok: true; carteId: string; calque: Calque; fichier: string }
  | { ok: false; erreur: string };

/** Vérifie carte et calque d'un envoi d'image. Refuse tout ce qui n'est pas dans les listes connues. */
export function validerParametresImage(p: { carte: string | null; calque: string | null }, extension: Extension): ParametresImage {
  const { carte, calque } = p;
  if (carte === null || calque === null) return { ok: false, erreur: 'Paramètres carte et calque obligatoires.' };
  if ([carte, calque].some(dangereux)) return { ok: false, erreur: 'Chemin refusé.' };
  const c = indexer(extension).carte(carte);
  if (!c) return { ok: false, erreur: `Carte inconnue « ${carte} ».` };
  if (!(CALQUES as string[]).includes(calque)) return { ok: false, erreur: `Calque inconnu « ${calque} ».` };
  if (!calqueAutorise(c, calque as Calque)) {
    return { ok: false, erreur: `Le calque « ${calque} » n’existe pas pour une carte ${FINITIONS[c.finition].nom}.` };
  }
  return { ok: true, carteId: carte, calque: calque as Calque, fichier: nomFichierImage(calque as Calque) };
}

/** Vrai si les octets commencent comme un fichier GIF (« GIF87a » ou « GIF89a »). */
export function estGif(octets: Uint8Array): boolean {
  const debut = String.fromCharCode(...octets.subarray(0, 6));
  return debut === 'GIF87a' || debut === 'GIF89a';
}

/** Vrai si les octets ont le format attendu : WebP pour tous les calques (animation = WebP animé). */
export const formatAttendu = (_calque: Calque, octets: Uint8Array): boolean => estWebp(octets);

/** Vrai si les octets commencent comme un fichier WebP (« RIFF » … « WEBP »). */
export function estWebp(octets: Uint8Array): boolean {
  const ascii = (debut: number, fin: number): string => String.fromCharCode(...octets.subarray(debut, fin));
  return octets.length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP';
}

// ---------- Édition d'une carte ----------

export interface DemandeEdition {
  /** Id de la carte éditée. */
  id: string;
  /** Cadrage par calque de cette carte. */
  cadrages: Partial<Record<Calque, Cadrage>>;
}

export type ResultatEdition =
  | { ok: true; extension: Extension; carte: Carte; personnage: Personnage }
  | { ok: false; erreurs: string[] };

const estObjet = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const entierEntre = (x: unknown, min: number, max: number): x is number => typeof x === 'number' && Number.isInteger(x) && x >= min && x <= max;

/**
 * Applique une édition à une copie de l'extension : cadrages de la carte. Les données du personnage (élément,
 * PV, talent, attaques…) ne se modifient plus ici : elles viennent de src/data/fiches-combat.json (npm run fiches).
 * Un cadrage par défaut (100, 50, 50) n'est pas écrit.
 */
export function appliquerEdition(extension: Extension, demande: unknown): ResultatEdition {
  const erreurs: string[] = [];
  if (!estObjet(demande)) return { ok: false, erreurs: ['Demande invalide.'] };
  const iCarte = extension.cartes.findIndex((c) => c.id === demande.id);
  if (typeof demande.id !== 'string' || iCarte < 0) return { ok: false, erreurs: [`Carte inconnue « ${String(demande.id)} ».`] };
  const ancienneCarte = extension.cartes[iCarte]!;
  const personnage = extension.personnages.find((p) => p.id === ancienneCarte.personnage);
  if (!personnage) return { ok: false, erreurs: [`Personnage inconnu « ${ancienneCarte.personnage} ».`] };
  if ('element' in demande || 'attaques' in demande) {
    erreurs.push('Élément et attaques ne se modifient plus dans l’admin : édite src/data/fiches-combat.json puis lance npm run fiches.');
  }

  const images: ImagesCarte = {};
  if (!estObjet(demande.cadrages)) {
    erreurs.push('Cadrages : objet attendu.');
  } else {
    for (const [c, cadrage] of Object.entries(demande.cadrages)) {
      if (!(CALQUES as string[]).includes(c) || !calqueAutorise(ancienneCarte, c as Calque)) { erreurs.push(`Cadrage : calque « ${c} » invalide pour cette carte.`); continue; }
      if (!estObjet(cadrage) || !entierEntre(cadrage.zoom, ...LIMITES_CADRAGE.zoom)
        || !entierEntre(cadrage.x, ...LIMITES_CADRAGE.x) || !entierEntre(cadrage.y, ...LIMITES_CADRAGE.y)) {
        erreurs.push(`Cadrage ${c} : zoom de 50 à 300, x et y de 0 à 100 (entiers) attendus.`);
        continue;
      }
      const { zoom, x, y } = cadrage as unknown as Cadrage;
      if (zoom === CADRAGE_DEFAUT.zoom && x === CADRAGE_DEFAUT.x && y === CADRAGE_DEFAUT.y) continue;
      images[c as Calque] = { zoom, x, y };
    }
  }

  if (erreurs.length > 0) return { ok: false, erreurs };
  const carte: Carte = { ...ancienneCarte, images };
  const cartes = [...extension.cartes];
  cartes[iCarte] = carte;
  const nouvelle: Extension = { ...extension, cartes };
  const verif = validerExtension(nouvelle);
  if (verif.length > 0) return { ok: false, erreurs: verif };
  return { ok: true, extension: nouvelle, carte, personnage };
}

/** Texte du fichier JSON, au même format que l'original (indentation 2, sans saut de ligne final). */
export const serialiserExtension = (extension: Extension): string => JSON.stringify(extension, null, 2);

// ---------- Migration des anciennes images (rangées par finition) ----------

export interface CopieImage {
  /** Chemin public de l'ancienne image, ex. « cartes/lan-001/holo-integrale.webp ». */
  de: string;
  /** Chemin public de destination, ex. « cartes/lan-001/illustration.webp ». */
  vers: string;
  carteId: string;
}

export interface PlanMigration {
  copies: CopieImage[];
  /** Anciennes images déjà en place (destination existante) : non copiées. */
  dejaPresentes: string[];
  /** Anciennes images sans carte correspondante (ce personnage n'a pas de carte de cette rareté). */
  sansCarte: string[];
  /** Anciens calques séparés (personnage détouré, fond) : les cartes n'ont plus qu'une image, ils ne sont pas copiés. */
  calquesAbandonnes: string[];
}

/** Ancien nom de fichier « <finition>[-perso|-fond].webp » → finition et calque, ou null. */
export function lireAncienNom(nom: string): { finition: FinitionId; calque: 'illustration' | 'perso' | 'fond' } | null {
  const m = /^([a-z-]+?)(-perso|-fond)?\.webp$/.exec(nom);
  if (!m || !Object.hasOwn(FINITIONS, m[1]!)) return null;
  const calque = m[2] === '-perso' ? 'perso' : m[2] === '-fond' ? 'fond' : 'illustration';
  return { finition: m[1] as FinitionId, calque };
}

/**
 * Plan de migration : les anciennes images étaient rangées par personnage (dossier de sa carte de base,
 * ex. « lan-001 » pour Luffy) et par finition. Chacune est copiée vers la carte du même personnage
 * dans la même finition, quand elle existe. Rien n'est écrasé ; les anciens fichiers restent en place.
 * `fichiers` : noms de fichiers présents par dossier de carte.
 */
export function planMigrationImages(extension: Extension, fichiers: Record<string, string[]>): PlanMigration {
  const index = indexer(extension);
  const plan: PlanMigration = { copies: [], dejaPresentes: [], sansCarte: [], calquesAbandonnes: [] };
  for (const [dossier, noms] of Object.entries(fichiers)) {
    const base = index.carte(dossier);
    if (!base || base.secrete) continue; // les anciens dossiers sont ceux des cartes de base
    for (const nom of [...noms].sort()) {
      const ancien = lireAncienNom(nom);
      if (!ancien) continue; // nouveau format (illustration.webp) ou autre fichier
      const de = `cartes/${dossier}/${nom}`;
      if (ancien.calque !== 'illustration') { plan.calquesAbandonnes.push(de); continue; }
      const cible = index.cartesDe(base.personnage).find((c) => c.finition === ancien.finition);
      if (!cible || !calqueAutorise(cible, ancien.calque)) { plan.sansCarte.push(de); continue; }
      const vers = cheminImage(cible.id, ancien.calque);
      if ((fichiers[cible.id] ?? []).includes(nomFichierImage(ancien.calque))) { plan.dejaPresentes.push(de); continue; }
      plan.copies.push({ de, vers, carteId: cible.id });
    }
  }
  return plan;
}
