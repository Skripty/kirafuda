import type { EffetAttaque, EffetTalent } from './combat/effets';
import type { Deck, Partie } from './combat/etat';

// Modèle de données de Kirafuda (version 1).
// Les noms suivent le vocabulaire du GDD, en français.

export type ElementId =
  | 'feu' | 'eau' | 'glace' | 'foudre' | 'vent'
  | 'terre' | 'lumiere' | 'tenebres' | 'neutre';

/** Rang du personnage : fixé à la création de l'extension, décide de la probabilité de le tirer. */
export type Rang = 'C' | 'B' | 'A' | 'S';

/** Finition d'un exemplaire : tirée à l'ouverture, décide du visuel et du multiplicateur de cote. */
export type FinitionId =
  | 'commune' | 'peu-commune' | 'holo' | 'holo-integrale' | 'pleine'
  | 'alternative' | 'immersive' | 'couronne';

/**
 * Énergie d'un coût (docs/COMBAT.md) : f Feu, e Eau, g Glace, z Foudre, v Vent, t Terre, l Lumière, n Ténèbres,
 * q énergie quelconque (◇). Il n'y a pas d'énergie « neutre » : les personnages Neutres paient en ◇.
 */
export type CodeEnergie = 'f' | 'e' | 'g' | 'z' | 'v' | 't' | 'l' | 'n' | 'q';

/**
 * Base (rangs C et B, posé depuis la main, 1 point s'il est mis K.-O.), Éveillé (rangs A et S, entre en jeu par
 * Relève, 2 points) ou Héros (rangs C et B, posé depuis la main comme un Base, 2 points).
 */
export type TypePersonnage = 'base' | 'eveille' | 'heros';

export interface Talent {
  nom: string;
  texte: string;
  /** Effets structurés lus par le moteur de combat (src/core/combat/effets.ts). */
  effets?: EffetTalent[];
}

/** Attaque d'une fiche de combat (src/data/fiches-combat.json). */
export interface Attaque {
  nom: string;
  /** 1 à 4 énergies : celles de l'élément du personnage et des ◇ (q). */
  cout: CodeEnergie[];
  /** Nombre, '' (pas de dégâts), « 30× » (30 par face) ou « 50 / 0 » (pile ou face). */
  degats: number | string;
  /** Texte de l'effet ('' s'il n'y en a pas). */
  effet: string;
  /** Effets structurés lus par le moteur de combat (src/core/combat/effets.ts). */
  effets?: EffetAttaque[];
}

/** Cadrage d'une image, en pourcentages (comme dans l'Atelier des cartes). */
export interface Cadrage {
  zoom: number; // 100 = taille normale
  x: number;    // 0 à 100
  y: number;    // 0 à 100
}

/**
 * Calques d'image d'une carte : une illustration fixe pour toutes les raretés
 * (public/cartes/<id-carte>/illustration.webp) et, pour l'immersive seulement, une animation en WebP animé
 * (public/cartes/<id-carte>/animation.webp).
 */
export type Calque = 'illustration' | 'animation';

/** Cadrage enregistré par calque (absent = cadrage par défaut 100 / 50 / 50). */
export type ImagesCarte = Partial<Record<Calque, Cadrage>>;

/** Personnage : PV et attaques, identiques sur toutes ses cartes. Le rang décide de la rareté de sa carte de base. */
export interface Personnage {
  id: string;        // ex. « per-041 »
  nom: string;
  serie: string;
  rang: Rang;
  element: ElementId;
  /** Données de combat, reprises de la fiche du personnage (src/data/fiches-combat.json, npm run fiches). */
  type: TypePersonnage;
  pv: number;
  /** Énergies à défausser pour se replier (0 à 4). */
  repli: number;
  talent: Talent | null;
  /** 1 ou 2 attaques. */
  attaques: Attaque[];
}

/** Carte de l'extension : un personnage dans une rareté fixe (système TCG Pocket). */
export interface Carte {
  id: string;           // ex. « lan-041 »
  numero: number;       // 1 à totalAvecSecretes
  personnage: string;   // id du personnage
  finition: FinitionId; // rareté fixe de la carte
  /** Carte secrète (numéro au-delà de « total », affichée « 127/100 »). */
  secrete: boolean;
  images: ImagesCarte;
  /** Vague de l'extension (id), posée à l'assemblage des vagues (src/core/catalogue.ts). */
  vague?: string;
}

export interface Extension {
  id: string;
  nom: string;
  edition: number;
  /** Cartes de base (affiché « /100 »). */
  total: number;
  /** Toutes les cartes, secrètes comprises. */
  totalAvecSecretes: number;
  personnages: Personnage[];
  cartes: Carte[];
}

/** Poids entiers sur 100 000 (1 = 0,001 %). Chaque table totalise exactement 100 000. */
export type TablePoids<K extends string> = Partial<Record<K, number>>;

/** Table d'un emplacement : on tire une rareté, puis une carte de cette rareté à poids égaux. */
export interface TableEmplacement {
  emplacements: number[]; // positions 1 à 5 concernées
  finitions: TablePoids<FinitionId>;
}

export interface Booster {
  id: string;
  extension: string;
  nom: string;
  cartesParBooster: number;
  cout: { ressource: 'sceaux'; quantite: number };
  pointsParOuverture: number;
  /** Sur 100 000. 50 = 0,05 %. */
  tauxExceptionnel: number;
  emplacements: TableEmplacement[];
  tableExceptionnelle: { finitions: TablePoids<FinitionId> };
}

/** Popularité hebdomadaire (0 à 100 par personnage), mise à jour à la main dans src/data/popularite.json. */
export interface Popularite {
  semaine: string;
  semainePrecedente: string;
  courante: Record<string, number>;
  precedente: Record<string, number>;
}

/** Une carte tirée (la finition est celle de la carte, gardée pour l’historique). */
export interface CarteTiree {
  carteId: string;
  finition: FinitionId;
  emplacement: number;
}

export interface Ouverture {
  id: string;
  date: string; // ISO
  boosterId: string;
  exceptionnelle: boolean;
  cartes: (CarteTiree & { nouveau: boolean; exemplaires: number })[];
  pointsGagnes: number;
  vue: boolean;
}

/** Draft joué : une seule fois par semaine. */
export interface DraftJoue {
  semaine: string;       // ex. « 2026-S45 »
  choix: number[];       // indices (0 à 14) des 5 cartes gardées
  score: number;
  sceaux: number;        // participation reçue sur l'appareil (sans compte), 0 sinon
  /** Avec un compte : l'équipe actuelle a été acceptée par le serveur (absent si jouée sans compte). */
  envoye?: boolean;
  /** Avec un compte : une équipe de la semaine est au classement en ligne (même si une modification attend). */
  dansClassement?: boolean;
}

/**
 * Progression des quêtes, du calendrier de bienvenue et des boosters garantis (GDD, « Économie »).
 * Les quêtes du jour ne sont pas stockées : elles se recalculent à partir de la date (graine du jour).
 */
export interface EtatQuetes {
  /** Jour local (AAAA-MM-JJ) des quêtes du jour suivies ; null avant le premier jour. */
  jour: string | null;
  /** Progression des quêtes du jour, par id de quête. */
  progresJour: Record<string, number>;
  /** Bonus « les 3 faites » déjà réclamé aujourd'hui. */
  bonusJourReclame: boolean;
  /** Compteurs cumulés depuis le début, par type d'événement (quêtes de débutant). */
  cumuls: Record<string, number>;
  /** Quêtes de débutant déjà réclamées (une seule fois). */
  debutantReclamees: string[];
  /** Lundi local (AAAA-MM-JJ) de la semaine suivie. */
  semaine: string | null;
  /** Progression de la quête de la semaine. */
  progresSemaine: number;
  semaineReclamee: boolean;
  /** Cases du calendrier de bienvenue obtenues (0 à 7), une par jour joué. */
  calendrierJours: number;
  /** Dernier jour joué ayant fait avancer le calendrier. */
  calendrierDernierJour: string | null;
  /** Boosters à ouvrir avec une carte ★ ou plus garantie en 5e position. */
  boostersGarantis: number;
  /** Calendrier de lancement des extensions : cases déjà reçues (0 = jour de sortie), par id d'extension. */
  lancementsRecus: Record<string, number[]>;
}

/**
 * État du joueur, sauvegardé localement. Version 2 : draft ; 3 : collection par carte ; 4 : quêtes ;
 * 5 et 6 : quêtes de débutant renommées ; 7 : calendriers de sortie des vagues ; 8 : Renforts devient une vague de Lancement.
 */
export interface SessionCombat {
  defiId: string;
  partie: Partie;
  journalIA: string[];
  /** Deck choisi au lancement (les anciennes parties n'ont pas ce champ). */
  deckJoueur?: Deck;
}

export interface ProgressionCombat {
  defisGagnes: string[];
  enCours: SessionCombat | null;
}

/** Deck construit par le joueur ; les cartes sont des ids de personnages ou de cartes Soutien. */
export interface DeckEnregistre {
  id: string;
  nom: string;
  /** Id de la carte illustrée en couverture. */
  couverture: string;
  cartes: string[];
  elements: ElementId[];
}

export interface Sauvegarde {
  version: 10;
  sceaux: number;
  derniereRecompenseQuotidienne: string | null; // date ISO (jour)
  /** Clé : id de carte (« lan-041 ») → nombre d'exemplaires. */
  collection: Record<string, number>;
  points: Record<string, number>; // par extension
  historique: Ouverture[];
  /** Dernier draft joué (null si aucun). */
  dernierDraft: DraftJoue | null;
  quetes: EtatQuetes;
  /** Progression des défis contre l'IA et partie à reprendre, le cas échéant. */
  combat: ProgressionCombat;
  /** Decks construits par le joueur (10 maximum) et dernier deck choisi. */
  decks: DeckEnregistre[];
  deckSelectionne: string | null;
}
