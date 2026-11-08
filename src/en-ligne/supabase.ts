// Serveur Supabase : connexion Discord, profils et sauvegardes (tables : supabase/migrations/).
// Seules l'adresse du projet et la clé PUBLIQUE (anon / publishable) sont utilisées : les règles
// Row Level Security de la base protègent les données. Une clé secrète est refusée.
// La bibliothèque n'est chargée (import dynamique) que si le jeu est configuré pour les comptes.
import type { SupabaseClient } from '@supabase/supabase-js';
import { ErreurReseau, type LigneSauvegarde, type Serveur, type Utilisateur } from './serveur';
import type { LigneClassement, RecompenseClassement, ServeurClassement } from './classement';

export interface ConfigSupabase { url: string; cle: string }

/** Refuse une clé secrète (service_role / sb_secret_) : elle ne doit jamais se trouver dans le jeu. */
export function cleSecrete(cle: string): boolean {
  if (cle.startsWith('sb_secret_')) return true;
  const morceaux = cle.split('.');
  if (morceaux.length !== 3) return false;
  try {
    const charge = JSON.parse(atob(morceaux[1]!.replace(/-/g, '+').replace(/_/g, '/'))) as { role?: string };
    return charge.role === 'service_role';
  } catch {
    return false;
  }
}

/** Configuration lue dans les variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY (.env, Cloudflare Pages), ou null. */
export function configSupabase(env: Record<string, unknown> = import.meta.env): ConfigSupabase | null {
  const url = typeof env.VITE_SUPABASE_URL === 'string' ? env.VITE_SUPABASE_URL.trim() : '';
  const cle = typeof env.VITE_SUPABASE_ANON_KEY === 'string' ? env.VITE_SUPABASE_ANON_KEY.trim() : '';
  if (!url || !cle) return null;
  if (!/^https:\/\/[^/]+$/.test(url.replace(/\/$/, '')) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(url)) return null;
  if (cleSecrete(cle)) {
    console.error('Kirafuda : VITE_SUPABASE_ANON_KEY contient une clé secrète. Comptes désactivés : utilise la clé publique (anon ou publishable).');
    return null;
  }
  return { url: url.replace(/\/$/, ''), cle };
}

/** Taille maximale d'une requête « keepalive » (envoi au départ de la page). */
const MAX_KEEPALIVE = 60_000;

function erreurDe(e: { message?: string; code?: string } | null, quoi: string): Error {
  const message = e?.message ?? 'erreur inconnue';
  // supabase-js signale une coupure réseau par « Failed to fetch » / « NetworkError » / « Load failed ».
  if (/fetch|network|load failed/i.test(message) || (typeof navigator !== 'undefined' && navigator.onLine === false)) return new ErreurReseau(`${quoi} : réseau indisponible`);
  return new Error(`${quoi} : ${message}`);
}

/** Paramètres de retour de Discord à retirer de l'adresse une fois la connexion finalisée. */
const PARAMETRES_RETOUR = ['code', 'error', 'error_code', 'error_description', 'state'];

export async function creerServeurSupabase(config: ConfigSupabase, depart: { enCours: boolean }): Promise<Serveur & ServeurClassement> {
  const { createClient } = await import('@supabase/supabase-js');
  const client: SupabaseClient = createClient(config.url, config.cle, {
    auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true, storageKey: 'kirafuda:session' },
    global: {
      // Au départ de la page, l'envoi est marqué « keepalive » pour qu'il aboutisse même si l'onglet se ferme.
      fetch: (entree: RequestInfo | URL, init?: RequestInit) => {
        const corps = init?.body;
        const petit = typeof corps === 'string' && corps.length < MAX_KEEPALIVE;
        return fetch(entree, depart.enCours && petit ? { ...init, keepalive: true } : init);
      },
    },
  });

  const utilisateurDe = (u: { id: string; user_metadata?: Record<string, unknown> } | null | undefined): Utilisateur | null => {
    if (!u) return null;
    const m = u.user_metadata ?? {};
    const claims = (m.custom_claims ?? {}) as Record<string, unknown>;
    const nom = [claims.global_name, m.full_name, m.name, m.user_name].find((x) => typeof x === 'string' && x) as string | undefined;
    return { id: u.id, nomDiscord: nom ?? null };
  };

  return {
    async session() {
      const adresse = new URL(location.href);
      const erreurRetour = adresse.searchParams.get('error_description') ?? adresse.searchParams.get('error');
      // getSession attend la fin de l'initialisation : le code renvoyé par Discord (?code=…) est échangé contre une session.
      const { data, error } = await client.auth.getSession();
      if (PARAMETRES_RETOUR.some((p) => adresse.searchParams.has(p))) {
        for (const p of PARAMETRES_RETOUR) adresse.searchParams.delete(p);
        history.replaceState(history.state, '', adresse);
      }
      const erreur = erreurRetour ? `Connexion Discord refusée ou annulée (${erreurRetour}).` : error ? `Connexion impossible : ${error.message}` : null;
      return { utilisateur: utilisateurDe(data.session?.user), erreur };
    },
    surFinDeSession(f) {
      client.auth.onAuthStateChange((evenement, session) => { if (evenement === 'SIGNED_OUT' || (!session && evenement !== 'INITIAL_SESSION')) f(); });
    },
    async connexionDiscord() {
      // Retour sur la même page (local, preview ou site en ligne) : adresse autorisée dans Supabase → URL Configuration.
      const retour = `${location.origin}${location.pathname}`;
      const { error } = await client.auth.signInWithOAuth({ provider: 'discord', options: { redirectTo: retour } });
      if (error) throw erreurDe(error, 'Connexion Discord');
    },
    async deconnexion() {
      const { error } = await client.auth.signOut({ scope: 'local' });
      if (error) throw erreurDe(error, 'Déconnexion');
    },
    async lireProfil(id) {
      const { data, error } = await client.from('profils').select('pseudo').eq('id', id).maybeSingle();
      if (error) throw erreurDe(error, 'Lecture du profil');
      return (data as { pseudo: string } | null)?.pseudo ?? null;
    },
    async creerProfil(id, pseudo) {
      const { error } = await client.from('profils').insert({ id, pseudo });
      if (error?.code === '23505') return 'pris';
      if (error) throw erreurDe(error, 'Création du profil');
      return 'ok';
    },
    async lireSauvegarde(id): Promise<LigneSauvegarde | null> {
      const { data, error } = await client.from('sauvegardes').select('donnees, version, mis_a_jour_le').eq('utilisateur', id).maybeSingle();
      if (error) throw erreurDe(error, 'Lecture de la sauvegarde en ligne');
      const l = data as { donnees: unknown; version: number; mis_a_jour_le: string } | null;
      return l ? { donnees: l.donnees, version: l.version, misAJourLe: l.mis_a_jour_le } : null;
    },
    async creerSauvegarde(id, donnees, version) {
      const { data, error } = await client.from('sauvegardes').insert({ utilisateur: id, donnees, version }).select('mis_a_jour_le').single();
      if (error?.code === '23505') return 'existe';
      if (error) throw erreurDe(error, 'Envoi de la sauvegarde');
      return (data as { mis_a_jour_le: string }).mis_a_jour_le;
    },
    async remplacerSauvegarde(id, donnees, version, siDate) {
      const { data, error } = await client.from('sauvegardes').update({ donnees, version })
        .eq('utilisateur', id).eq('mis_a_jour_le', siDate).select('mis_a_jour_le');
      if (error) throw erreurDe(error, 'Envoi de la sauvegarde');
      const lignes = data as { mis_a_jour_le: string }[];
      return lignes.length === 0 ? 'conflit' : lignes[0]!.mis_a_jour_le;
    },

    // ---------- Classement du draft (tâche 24) ----------
    async lireClassement(semaine, limite) {
      const colonnes = 'rang, pseudo, score, cartes';
      const { data, error, count } = await client.from('classement_draft').select(colonnes, { count: 'exact' })
        .eq('semaine', semaine).order('rang').limit(Math.max(1, limite));
      if (error) throw erreurDe(error, 'Lecture du classement');
      const lignes = (data ?? []) as LigneClassement[];
      const id = (await client.auth.getSession()).data.session?.user.id;
      let moi: LigneClassement | null = null;
      if (id) {
        const r = await client.from('classement_draft').select(colonnes).eq('semaine', semaine).eq('utilisateur', id).maybeSingle();
        if (r.error) throw erreurDe(r.error, 'Lecture du classement');
        moi = (r.data as LigneClassement | null) ?? null;
      }
      return { semaine, lignes: limite > 0 ? lignes : [], participants: count ?? lignes.length, moi };
    },
    async soumettreDraft(semaine, choix, dejaRecu) {
      const r = await appelerFonction('soumettre-draft', { semaine, choix, dejaRecu });
      if (r.ok === true) {
        return { ok: true, score: r.score as number, rang: (r.rang as number | null) ?? null, participants: (r.participants as number | null) ?? null };
      }
      return { ok: false, code: String(r.code ?? 'erreur'), message: String(r.message ?? 'Équipe refusée par le serveur.') };
    },
    async reclamerRecompenses() {
      const r = await appelerFonction('reclamer-draft', {});
      if (r.ok !== true) throw new Error(String(r.message ?? 'Récompenses indisponibles.'));
      return r.recompenses as RecompenseClassement[];
    },
  };

  /**
   * Appelle une fonction serveur (supabase/functions) avec la session du joueur. Une réponse d'erreur (4xx) est
   * renvoyée telle quelle ({ ok: false, code, message }) ; une coupure réseau lève ErreurReseau.
   */
  async function appelerFonction(nom: string, corps: object): Promise<Record<string, unknown>> {
    const { data, error } = await client.functions.invoke(nom, { body: corps });
    if (!error) return data as Record<string, unknown>;
    const reponse = (error as { context?: unknown }).context;
    if (reponse instanceof Response) {
      try { return (await reponse.json()) as Record<string, unknown>; } catch { /* corps illisible */ }
      if (reponse.status === 404) throw new Error(`Fonction « ${nom} » introuvable : elle n’est pas encore déployée.`);
      throw new Error(`${nom} : erreur ${reponse.status}`);
    }
    throw new ErreurReseau(`${nom} : réseau indisponible`);
  }
}

/** Serveur utilisable tout de suite, dont la bibliothèque Supabase se charge en arrière-plan. */
export function serveurDiffere(p: Promise<Serveur>): Serveur {
  return {
    session: async () => (await p).session(),
    surFinDeSession: (f) => { void p.then((s) => s.surFinDeSession(f), () => undefined); },
    connexionDiscord: async () => (await p).connexionDiscord(),
    deconnexion: async () => (await p).deconnexion(),
    lireProfil: async (id) => (await p).lireProfil(id),
    creerProfil: async (id, pseudo) => (await p).creerProfil(id, pseudo),
    lireSauvegarde: async (id) => (await p).lireSauvegarde(id),
    creerSauvegarde: async (id, d, v) => (await p).creerSauvegarde(id, d, v),
    remplacerSauvegarde: async (id, d, v, si) => (await p).remplacerSauvegarde(id, d, v, si),
  };
}

/** Classement utilisable tout de suite, dont la bibliothèque Supabase se charge en arrière-plan. */
export function classementDiffere(p: Promise<ServeurClassement>): ServeurClassement {
  return {
    lireClassement: async (semaine, limite) => (await p).lireClassement(semaine, limite),
    soumettreDraft: async (semaine, choix, dejaRecu) => (await p).soumettreDraft(semaine, choix, dejaRecu),
    reclamerRecompenses: async () => (await p).reclamerRecompenses(),
  };
}
