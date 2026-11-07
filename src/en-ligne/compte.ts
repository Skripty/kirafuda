// Compte et synchronisation : connexion Discord, pseudo, choix de la sauvegarde, envois regroupés.
// Ne dépend ni du DOM ni du réseau directement : le serveur (Supabase ou faux serveur de test),
// le stockage et l'horloge sont fournis. Les règles de décision sont dans src/core/synchro.ts.
import {
  DELAI_ENVOI, DELAI_REESSAI, Planificateur, decider, empreinte, pseudoPropose, resumer, validerPseudo,
  type Horloge, type MetaSynchro, type Resume, type SauvegardeEnLigne,
} from '../core/synchro';
import { VERSION_SAUVEGARDE, type ResultatValidation, type Stockage } from '../core/sauvegarde';
import type { Sauvegarde } from '../core/types';
import { ErreurReseau, type Serveur, type Utilisateur } from './serveur';

export const CLE_META_SYNCHRO = 'kirafuda:synchro';
export const CLE_MODIFIEE_LE = 'kirafuda:sauvegarde-modifiee-le';

export type StatutCompte =
  | 'desactive'   // jeu sans configuration Supabase : comptes masqués
  | 'chargement'
  | 'deconnecte'
  | 'pseudo'      // premier login : choisir un pseudo
  | 'choix'       // deux sauvegardes différentes : le joueur choisit
  | 'connecte';

export type EtatSynchro = 'a-jour' | 'envoi' | 'en-attente' | 'hors-ligne' | 'erreur' | 'bloquee';

export interface CoteChoix extends Resume { date: string | null }

export interface EtatCompte {
  statut: StatutCompte;
  pseudo: string | null;
  /** Pseudo proposé au premier login (nom Discord nettoyé). */
  pseudoPropose: string;
  synchro: EtatSynchro;
  /** Date de la dernière synchronisation réussie (ISO). */
  derniereSynchro: string | null;
  /** Message à afficher (erreur de connexion, sauvegarde reprise…). */
  message: string | null;
  choix: { locale: CoteChoix; enLigne: CoteChoix } | null;
}

export interface OptionsCompte {
  serveur: Serveur;
  stockage: Stockage;
  horloge: Horloge;
  /** Sauvegarde locale actuelle. */
  lireLocale: () => Sauvegarde;
  /** Remplace la sauvegarde locale (validée) ; false si l'écriture a échoué. */
  remplacerLocale: (s: Sauvegarde) => boolean;
  /** Valide (et migre) des données venues du serveur. */
  validerEnLigne: (donnees: unknown) => ResultatValidation;
  enLigne: () => boolean;
  maintenant?: () => Date;
}

export interface Compte {
  etat(): EtatCompte;
  /** Appelé à chaque changement d'état ; renvoie la fonction de désabonnement. */
  abonner(f: (e: EtatCompte) => void): () => void;
  demarrer(): Promise<void>;
  seConnecter(): Promise<void>;
  seDeconnecter(): Promise<void>;
  /** Renvoie un message d'erreur, ou null si le pseudo est enregistré. */
  choisirPseudo(saisie: string): Promise<string | null>;
  choisirSauvegarde(laquelle: 'locale' | 'en-ligne'): Promise<void>;
  /** La sauvegarde locale vient d'être écrite (après chaque opération). */
  signalerEcriture(): void;
  /** Départ de la page ou retour du réseau : envoie tout de suite ce qui reste. */
  vider(): Promise<void>;
  /** Retour du réseau. */
  reseauRetabli(): void;
}

const lireJson = <T>(stockage: Stockage, cle: string): T | null => {
  try { const t = stockage.getItem(cle); return t ? (JSON.parse(t) as T) : null; } catch { return null; }
};

export function creerCompte(o: OptionsCompte): Compte {
  const maintenant = o.maintenant ?? (() => new Date());
  let etat: EtatCompte = { statut: 'chargement', pseudo: null, pseudoPropose: '', synchro: 'a-jour', derniereSynchro: null, message: null, choix: null };
  const abonnes = new Set<(e: EtatCompte) => void>();
  let utilisateur: Utilisateur | null = null;
  /** Date serveur de la version en ligne que l'on remplace (null : aucune ligne en ligne). */
  let connuEnLigneLe: string | null = null;
  /** Sauvegarde en ligne proposée pendant un choix. */
  let enAttenteDeChoix: SauvegardeEnLigne | null = null;
  /** Profil et sauvegarde pas encore lus (hors ligne au démarrage) : à refaire au retour du réseau. */
  let aReprendre = false;

  const maj = (partiel: Partial<EtatCompte>): void => {
    etat = { ...etat, ...partiel };
    for (const f of [...abonnes]) f(etat);
  };

  const meta = (): MetaSynchro | null => lireJson<MetaSynchro>(o.stockage, CLE_META_SYNCHRO);
  const ecrireMeta = (m: MetaSynchro): void => { try { o.stockage.setItem(CLE_META_SYNCHRO, JSON.stringify(m)); } catch { /* stockage plein : sans conséquence */ } };
  const synchronise = (donnees: Sauvegarde, enLigneLe: string): void => {
    connuEnLigneLe = enLigneLe;
    ecrireMeta({ utilisateur: utilisateur!.id, empreinte: empreinte(donnees), enLigneLe });
    maj({ synchro: planificateur.enAttente ? 'en-attente' : 'a-jour', derniereSynchro: maintenant().toISOString() });
  };
  const etatErreur = (e: unknown): EtatSynchro => (e instanceof ErreurReseau || !o.enLigne() ? 'hors-ligne' : 'erreur');

  /** Envoi de la sauvegarde locale (appelé par le planificateur) ; false = à retenter. */
  async function envoyer(): Promise<boolean> {
    if (!utilisateur || etat.statut !== 'connecte') return false;
    if (!o.enLigne()) { maj({ synchro: 'hors-ligne' }); return false; }
    const locale = o.lireLocale();
    const m = meta();
    if (m && m.utilisateur === utilisateur.id && m.empreinte === empreinte(locale) && m.enLigneLe === connuEnLigneLe) {
      maj({ synchro: 'a-jour' }); // déjà en ligne (ex. la sauvegarde vient d'être reprise du serveur)
      return true;
    }
    maj({ synchro: 'envoi' });
    try {
      const r = connuEnLigneLe === null
        ? await o.serveur.creerSauvegarde(utilisateur.id, locale, locale.version)
        : await o.serveur.remplacerSauvegarde(utilisateur.id, locale, locale.version, connuEnLigneLe);
      if (r === 'existe' || r === 'conflit') {
        // Un autre appareil a écrit entre-temps : on relit et on décide à nouveau (sans rien écraser).
        await synchroniserConnexion();
        return true;
      }
      synchronise(locale, r);
      return true;
    } catch (e) {
      maj({ synchro: etatErreur(e), message: e instanceof ErreurReseau ? null : (e as Error).message });
      return false;
    }
  }

  const planificateur = new Planificateur(envoyer, o.horloge, DELAI_ENVOI, DELAI_REESSAI);
  planificateur.arreter(); // rien n'est envoyé avant la décision de connexion

  const dateLocale = (s: Sauvegarde): string | null => {
    try { const d = o.stockage.getItem(CLE_MODIFIEE_LE); if (d) return d; } catch { /* ignoré */ }
    return s.historique.at(-1)?.date ?? null;
  };

  async function prendre(enLigne: SauvegardeEnLigne): Promise<void> {
    if (!o.remplacerLocale(enLigne.sauvegarde)) {
      maj({ statut: 'connecte', synchro: 'erreur', message: 'La sauvegarde en ligne n’a pas pu être écrite sur cet appareil.' });
      return;
    }
    synchronise(enLigne.sauvegarde, enLigne.misAJourLe);
    const r = resumer(enLigne.sauvegarde);
    maj({ message: `Sauvegarde en ligne reprise : ${r.cartes} carte${r.cartes > 1 ? 's' : ''}, ${r.boosters} booster${r.boosters > 1 ? 's' : ''} ouvert${r.boosters > 1 ? 's' : ''}.` });
  }

  /** Lit la sauvegarde en ligne et applique la décision (garder, reprendre ou faire choisir). */
  async function synchroniserConnexion(): Promise<void> {
    if (!utilisateur) return;
    planificateur.arreter();
    let ligne;
    try {
      ligne = await o.serveur.lireSauvegarde(utilisateur.id);
    } catch (e) {
      aReprendre = true;
      maj({ statut: 'connecte', synchro: etatErreur(e) });
      return;
    }
    aReprendre = false;
    let enLigne: SauvegardeEnLigne | null = null;
    connuEnLigneLe = ligne?.misAJourLe ?? null;
    if (ligne) {
      const v = o.validerEnLigne(ligne.donnees);
      if (v.ok) enLigne = { sauvegarde: v.sauvegarde, misAJourLe: ligne.misAJourLe };
      else if (ligne.version > VERSION_SAUVEGARDE) {
        // Sauvegarde écrite par une version plus récente du jeu : ne jamais l'écraser avec une ancienne version.
        maj({ statut: 'connecte', synchro: 'bloquee', message: 'Ta sauvegarde en ligne vient d’une version plus récente du jeu : recharge la page pour mettre le jeu à jour.' });
        return;
      } else {
        maj({ message: 'La sauvegarde en ligne était illisible : elle est remplacée par celle de cet appareil.' });
      }
    }
    const locale = o.lireLocale();
    const d = decider({ utilisateur: utilisateur.id, locale, enLigne, meta: meta() });
    if (d.action === 'choisir') {
      enAttenteDeChoix = enLigne;
      maj({
        statut: 'choix',
        choix: {
          locale: { ...resumer(locale), date: dateLocale(locale) },
          enLigne: { ...resumer(enLigne!.sauvegarde), date: enLigne!.misAJourLe },
        },
      });
      return;
    }
    maj({ statut: 'connecte', choix: null });
    if (d.action === 'prendre') await prendre(enLigne!);
    else if (d.action === 'rien' && enLigne) synchronise(enLigne.sauvegarde, enLigne.misAJourLe);
    planificateur.reprendre();
    if (d.action === 'envoyer') { planificateur.signaler(); await planificateur.vider(); }
  }

  async function apresConnexion(): Promise<void> {
    if (!utilisateur) return;
    let pseudo: string | null;
    try {
      pseudo = await o.serveur.lireProfil(utilisateur.id);
    } catch (e) {
      // Hors ligne au démarrage : on joue en local, tout reprend au retour du réseau.
      aReprendre = true;
      maj({ statut: 'connecte', synchro: etatErreur(e) });
      return;
    }
    if (pseudo === null) {
      maj({ statut: 'pseudo', pseudoPropose: pseudoPropose(utilisateur.nomDiscord) });
      return;
    }
    maj({ pseudo });
    await synchroniserConnexion();
  }

  function deconnecteLocalement(message: string | null): void {
    planificateur.arreter();
    utilisateur = null;
    connuEnLigneLe = null;
    enAttenteDeChoix = null;
    maj({ statut: 'deconnecte', pseudo: null, choix: null, synchro: 'a-jour', message });
  }

  return {
    etat: () => etat,
    abonner(f) { abonnes.add(f); return () => { abonnes.delete(f); }; },

    async demarrer() {
      try {
        const s = await o.serveur.session();
        o.serveur.surFinDeSession(() => { if (utilisateur) deconnecteLocalement('Tu as été déconnecté.'); });
        utilisateur = s.utilisateur;
        if (!utilisateur) { maj({ statut: 'deconnecte', message: s.erreur }); return; }
        if (s.erreur) maj({ message: s.erreur });
        await apresConnexion();
      } catch (e) {
        maj({ statut: 'deconnecte', message: `Comptes indisponibles pour le moment (${(e as Error).message}).` });
      }
    },

    async seConnecter() {
      try {
        await o.serveur.connexionDiscord();
      } catch (e) {
        maj({ message: e instanceof ErreurReseau ? 'Pas de réseau : connexion impossible pour le moment.' : (e as Error).message });
      }
    },

    async seDeconnecter() {
      if (etat.statut === 'connecte') await planificateur.vider();
      try { await o.serveur.deconnexion(); } catch { /* la session locale est effacée quand même */ }
      deconnecteLocalement('Déconnecté. Ta partie continue sur cet appareil (sauvegarde locale).');
    },

    async choisirPseudo(saisie) {
      if (!utilisateur) return 'Connecte-toi d’abord.';
      const v = validerPseudo(saisie);
      if (!v.ok) return v.erreur;
      try {
        const r = await o.serveur.creerProfil(utilisateur.id, v.pseudo);
        if (r === 'pris') return `« ${v.pseudo} » est déjà pris : choisis-en un autre.`;
      } catch (e) {
        return e instanceof ErreurReseau ? 'Pas de réseau : réessaie dans un instant.' : (e as Error).message;
      }
      maj({ pseudo: v.pseudo });
      await synchroniserConnexion();
      return null;
    },

    async choisirSauvegarde(laquelle) {
      if (etat.statut !== 'choix' || !utilisateur) return;
      const enLigne = enAttenteDeChoix;
      enAttenteDeChoix = null;
      maj({ statut: 'connecte', choix: null });
      if (laquelle === 'en-ligne' && enLigne) await prendre(enLigne);
      planificateur.reprendre();
      // Garder celle de cet appareil : elle remplace la version en ligne (connuEnLigneLe = celle que l'on a vue).
      if (laquelle === 'locale') { planificateur.signaler(); await planificateur.vider(); }
    },

    signalerEcriture() {
      planificateur.signaler();
      if (etat.statut === 'connecte' && etat.synchro === 'a-jour') maj({ synchro: 'en-attente' });
    },

    vider: () => (etat.statut === 'connecte' ? planificateur.vider() : Promise.resolve()),

    reseauRetabli() {
      if (!utilisateur) return;
      if (aReprendre) { void (etat.pseudo === null ? apresConnexion() : synchroniserConnexion()); return; }
      if (etat.statut === 'connecte') void planificateur.vider();
    },
  };
}
