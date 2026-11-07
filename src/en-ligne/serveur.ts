// Ce que la synchronisation attend du serveur. Implémenté par Supabase (supabase.ts) dans le jeu,
// et par un faux serveur en mémoire dans les tests (aucun réseau).

export interface Utilisateur {
  id: string;
  /** Nom affiché sur Discord (pour proposer un pseudo), ou null. */
  nomDiscord: string | null;
}

export interface LigneSauvegarde {
  donnees: unknown;
  version: number;
  /** Date de mise à jour côté serveur (ISO), utilisée pour détecter qu'un autre appareil a écrit entre-temps. */
  misAJourLe: string;
}

/** Erreur réseau (hors ligne, serveur injoignable) : le jeu continue, l'envoi sera retenté. */
export class ErreurReseau extends Error {}

export interface Serveur {
  /** Session en cours (après un retour de Discord, la connexion est finalisée ici). */
  session(): Promise<{ utilisateur: Utilisateur | null; erreur: string | null }>;
  /** Appelé si la session se termine ailleurs (déconnexion dans un autre onglet, session expirée). */
  surFinDeSession(f: () => void): void;
  /** Redirige vers Discord ; le joueur revient sur le jeu, connecté. */
  connexionDiscord(): Promise<void>;
  deconnexion(): Promise<void>;
  /** Pseudo du profil, ou null s'il n'a pas encore été choisi. */
  lireProfil(id: string): Promise<string | null>;
  /** « pris » si un autre joueur a déjà ce pseudo (sans tenir compte des majuscules). */
  creerProfil(id: string, pseudo: string): Promise<'ok' | 'pris'>;
  lireSauvegarde(id: string): Promise<LigneSauvegarde | null>;
  /** Première sauvegarde en ligne ; « existe » si un autre appareil l'a créée entre-temps. Renvoie la date serveur. */
  creerSauvegarde(id: string, donnees: unknown, version: number): Promise<string | 'existe'>;
  /** Remplace la sauvegarde seulement si elle n'a pas changé depuis `siDate` ; sinon « conflit ». Renvoie la date serveur. */
  remplacerSauvegarde(id: string, donnees: unknown, version: number, siDate: string): Promise<string | 'conflit'>;
}
