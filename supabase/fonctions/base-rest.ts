// Accès à la base depuis une fonction Supabase (Edge Function), par l'API REST, sans bibliothèque.
// La clé « service_role » est fournie par Supabase dans l'environnement de la fonction (variable
// SUPABASE_SERVICE_ROLE_KEY) : elle n'est jamais dans le jeu ni dans ce dépôt. Seules ces fonctions écrivent
// dans les tables « drafts » et « recompenses_draft » (aucune règle d'écriture pour les joueurs).
import type { Base, LigneDraft, RecompenseDraft } from './draft-serveur';

export function creerBaseRest(url: string, cleService: string): Base {
  const entetes = { apikey: cleService, Authorization: `Bearer ${cleService}`, 'Content-Type': 'application/json' };
  const requete = async (chemin: string, init: RequestInit = {}): Promise<Response> => {
    const r = await fetch(`${url}/rest/v1/${chemin}`, { ...init, headers: { ...entetes, ...(init.headers as Record<string, string> | undefined) } });
    if (!r.ok && r.status !== 409) throw new Error(`REST ${chemin.split('?')[0]} : ${r.status} ${await r.text()}`);
    return r;
  };
  const lire = async <T>(chemin: string): Promise<T[]> => (await (await requete(chemin)).json()) as T[];
  const q = encodeURIComponent;

  return {
    async utilisateur(jeton) {
      const r = await fetch(`${url}/auth/v1/user`, { headers: { apikey: cleService, Authorization: `Bearer ${jeton}` } });
      if (!r.ok) return null;
      const u = (await r.json()) as { id?: unknown };
      return typeof u.id === 'string' ? u.id : null;
    },
    async aUnProfil(id) {
      return (await lire<{ id: string }>(`profils?select=id&id=eq.${q(id)}`)).length === 1;
    },
    async lireDraft(id, semaine) {
      const l = (await lire<{ cartes: string[]; choix: number[]; score: number; detail: LigneDraft['detail']; deja_recu: number }>(
        `drafts?select=cartes,choix,score,detail,deja_recu&utilisateur=eq.${q(id)}&semaine=eq.${q(semaine)}`))[0];
      return l ? { utilisateur: id, semaine, cartes: l.cartes, choix: l.choix, score: l.score, detail: l.detail, dejaRecu: l.deja_recu } : null;
    },
    async enregistrerDraft(l, nouvelleDate) {
      const ligne: Record<string, unknown> = {
        utilisateur: l.utilisateur, semaine: l.semaine, cartes: l.cartes, choix: l.choix, score: l.score, detail: l.detail, deja_recu: l.dejaRecu,
      };
      if (nouvelleDate) ligne.soumis_le = new Date().toISOString();
      await requete('drafts?on_conflict=utilisateur,semaine', {
        method: 'POST', body: JSON.stringify(ligne), headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      });
    },
    async rang(id, semaine) {
      const moi = (await lire<{ rang: number }>(`classement_draft?select=rang&semaine=eq.${q(semaine)}&utilisateur=eq.${q(id)}`))[0];
      if (!moi) return null;
      const r = await requete(`drafts?select=utilisateur&semaine=eq.${q(semaine)}`, { method: 'HEAD', headers: { Prefer: 'count=exact' } });
      const total = Number(/\/(\d+)$/.exec(r.headers.get('Content-Range') ?? '')?.[1] ?? moi.rang);
      return { rang: moi.rang, participants: total };
    },
    async draftsDe(id) {
      return (await lire<{ semaine: string; deja_recu: number }>(`drafts?select=semaine,deja_recu&utilisateur=eq.${q(id)}`))
        .map((d) => ({ semaine: d.semaine, dejaRecu: d.deja_recu }));
    },
    async recompensesDe(id) {
      return (await lire<{ semaine: string }>(`recompenses_draft?select=semaine&utilisateur=eq.${q(id)}`)).map((r) => r.semaine);
    },
    async ajouterRecompense(id, r: RecompenseDraft) {
      // « ignore-duplicates » : une récompense déjà enregistrée n'est pas renvoyée, donc pas donnée deux fois.
      const rep = await requete('recompenses_draft?on_conflict=utilisateur,semaine', {
        method: 'POST',
        body: JSON.stringify({ utilisateur: id, semaine: r.semaine, rang: r.rang, sceaux: r.sceaux }),
        headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
      });
      if (rep.status === 409) return false;
      return ((await rep.json()) as unknown[]).length === 1;
    },
  };
}
