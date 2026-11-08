// Classement du draft côté jeu : envoi de l'équipe aux fonctions serveur, récompenses de fin de semaine,
// lecture du classement. Sans DOM ni réseau directs : le serveur (Supabase ou faux serveur de test) est fourni.
// La sauvegarde locale reste la référence : l'équipe y est enregistrée d'abord, puis envoyée quand c'est possible.
import { rangTexte, semaineDraft } from '../core/classement';
import { marquerDraftEnvoye } from '../core/draft';
import type { Sauvegarde } from '../core/types';
import type { Compte } from './compte';
import { ErreurReseau } from './serveur';

export interface LigneClassement { rang: number; pseudo: string; score: number; cartes: string[] }

export interface Classement {
  semaine: string;
  /** Les premiers du classement, dans l'ordre. */
  lignes: LigneClassement[];
  participants: number;
  /** Ma ligne (joueur connecté), même si elle n'est pas parmi les premières. */
  moi: LigneClassement | null;
}

export type ReponseSoumission =
  | { ok: true; score: number; rang: number | null; participants: number | null }
  | { ok: false; code: string; message: string };

export interface RecompenseClassement { semaine: string; rang: number; sceaux: number }

export interface ServeurClassement {
  /** Lisible sans compte. `limite` : nombre de premières lignes. */
  lireClassement(semaine: string, limite: number): Promise<Classement>;
  /** Fonction serveur « soumettre-draft ». Lève ErreurReseau hors ligne. */
  soumettreDraft(semaine: string, choix: number[], dejaRecu: number): Promise<ReponseSoumission>;
  /** Fonction serveur « reclamer-draft » : récompenses des semaines fermées, chacune une seule fois. */
  reclamerRecompenses(): Promise<RecompenseClassement[]>;
}

export type EtatEnvoi =
  | { etat: 'rien' }                                   // pas de compte, pas d'équipe cette semaine, ou déjà envoyée
  | { etat: 'envoye'; score: number; rang: number | null; participants: number | null }
  | { etat: 'attente'; message: string }               // hors ligne, serveur injoignable : nouvel essai plus tard
  | { etat: 'refuse'; message: string };

export interface OptionsDraftEnLigne {
  serveur: ServeurClassement;
  compte: Compte;
  lire: () => Sauvegarde;
  /** Enregistre la sauvegarde (tout ou rien) ; null si l'écriture a échoué. */
  enregistrer: (s: Sauvegarde) => Sauvegarde | null;
  maintenant?: () => Date;
}

export interface DraftEnLigne {
  /** Envoie l'équipe de la semaine si elle n'a pas encore été acceptée (après validation, connexion, retour du réseau). */
  envoyer(): Promise<EtatEnvoi>;
  /** Réclame les récompenses des semaines fermées ; renvoie le message à annoncer, ou null s'il n'y a rien. */
  reclamer(): Promise<string | null>;
}

const sceauxTexte = (n: number): string => `${n} sceau${n > 1 ? 'x' : ''}`;

export function creerDraftEnLigne(o: OptionsDraftEnLigne): DraftEnLigne {
  const maintenant = o.maintenant ?? (() => new Date());
  let envoiEnCours: Promise<EtatEnvoi> | null = null;
  let reclamationEnCours: Promise<string | null> | null = null;
  const connecte = (): boolean => o.compte.etat().statut === 'connecte';

  async function envoyerUneFois(): Promise<EtatEnvoi> {
    const dj = o.lire().dernierDraft;
    if (!connecte() || !dj || dj.semaine !== semaineDraft(maintenant()) || dj.envoye === true) return { etat: 'rien' };
    const choix = [...dj.choix];
    let r: ReponseSoumission;
    try {
      r = await o.serveur.soumettreDraft(dj.semaine, choix, dj.sceaux);
    } catch (e) {
      return { etat: 'attente', message: e instanceof ErreurReseau
        ? 'Hors ligne : ton équipe est enregistrée sur cet appareil, elle rejoindra le classement au retour du réseau.'
        : 'Le classement ne répond pas : ton équipe est enregistrée sur cet appareil, nouvel essai plus tard.' };
    }
    if (!r.ok) return { etat: 'refuse', message: r.message };
    // L'équipe a pu changer pendant l'envoi : seule celle qui a été envoyée est marquée.
    const s = marquerDraftEnvoye(o.lire(), dj.semaine, choix, r.score);
    if (s !== o.lire()) o.enregistrer(s);
    return { etat: 'envoye', score: r.score, rang: r.rang, participants: r.participants };
  }

  return {
    async envoyer() {
      // Un seul envoi à la fois ; une modification faite pendant l'envoi part juste après.
      while (envoiEnCours) await envoiEnCours.catch(() => undefined);
      envoiEnCours = envoyerUneFois();
      try {
        const r = await envoiEnCours;
        const dj = o.lire().dernierDraft;
        if (r.etat === 'envoye' && dj && dj.envoye === false) { envoiEnCours = null; return await this.envoyer(); }
        return r;
      } finally {
        envoiEnCours = null;
      }
    },
    async reclamer() {
      if (!connecte()) return null;
      if (reclamationEnCours) return reclamationEnCours;
      reclamationEnCours = (async () => {
        let recompenses: RecompenseClassement[];
        try { recompenses = await o.serveur.reclamerRecompenses(); } catch { return null; } // nouvel essai à la prochaine connexion
        if (recompenses.length === 0) return null;
        const total = recompenses.reduce((n, r) => n + r.sceaux, 0);
        const s = o.lire();
        if (total > 0 && !o.enregistrer({ ...s, sceaux: s.sceaux + total })) {
          return 'Les récompenses du classement n’ont pas pu être enregistrées sur cet appareil.';
        }
        const detail = recompenses.map((r) => `semaine ${r.semaine}, ${rangTexte(r.rang)} : `
          + (r.sceaux > 0 ? `+${sceauxTexte(r.sceaux)}` : 'participation déjà reçue')).join(' ; ');
        return `Classement du draft — ${detail}.`;
      })();
      try { return await reclamationEnCours; } finally { reclamationEnCours = null; }
    },
  };
}
