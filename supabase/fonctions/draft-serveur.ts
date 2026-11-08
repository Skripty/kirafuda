// Fonctions serveur du classement du draft (tâche 24), sans dépendance à Deno ni au réseau :
// la base est fournie (REST Supabase dans base-rest.ts, base en mémoire dans les tests).
// Elles recalculent tout avec src/core : le joueur n'envoie que la semaine et ses 5 choix.
import { semaineDraft, semaineFermee, sceauxAReclamer, verifierSoumission, type ContexteDraft, type RecompensesDraft } from '../../src/core/classement';
import type { LigneScore } from '../../src/core/draft';

export interface LigneDraft {
  utilisateur: string;
  semaine: string;
  cartes: string[];
  choix: number[];
  score: number;
  detail: LigneScore[];
  dejaRecu: number;
}

export interface RecompenseDraft { semaine: string; rang: number; sceaux: number }

export interface Base {
  /** Id du joueur connecté à partir de son jeton de session (null si le jeton n'est pas valable). */
  utilisateur(jeton: string): Promise<string | null>;
  aUnProfil(id: string): Promise<boolean>;
  lireDraft(id: string, semaine: string): Promise<LigneDraft | null>;
  /**
   * Crée ou remplace l'équipe de la semaine. `nouvelleDate` : la date d'envoi change (équipe différente) ;
   * sinon elle est gardée (à score égal, le premier arrivé passe devant).
   */
  enregistrerDraft(ligne: LigneDraft, nouvelleDate: boolean): Promise<void>;
  /** Rang (1 = premier) et nombre de participants de la semaine, ou null si le joueur n'y est pas. */
  rang(id: string, semaine: string): Promise<{ rang: number; participants: number } | null>;
  draftsDe(id: string): Promise<{ semaine: string; dejaRecu: number }[]>;
  recompensesDe(id: string): Promise<string[]>;
  /** Enregistre la récompense ; false si elle existe déjà (réclamée une seule fois, même en cas d'envois simultanés). */
  ajouterRecompense(id: string, r: RecompenseDraft): Promise<boolean>;
}

export interface ContexteServeur extends ContexteDraft {
  base: Base;
  recompenses: RecompensesDraft;
  maintenant: () => Date;
}

export const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (statut: number, corps: unknown): Response =>
  new Response(JSON.stringify(corps), { status: statut, headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' } });
const refus = (statut: number, code: string, message: string): Response => json(statut, { ok: false, code, message });

/** Préambule commun : CORS, méthode POST, joueur connecté. */
async function joueur(requete: Request, c: ContexteServeur): Promise<Response | string> {
  if (requete.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (requete.method !== 'POST') return refus(405, 'methode', 'Méthode POST attendue.');
  const jeton = /^Bearer (.+)$/.exec(requete.headers.get('Authorization') ?? '')?.[1];
  const id = jeton ? await c.base.utilisateur(jeton) : null;
  return id ?? refus(401, 'non-connecte', 'Connecte-toi pour rejoindre le classement.');
}

/** POST { semaine, choix: [5 indices], dejaRecu } → { ok, semaine, score, detail, rang, participants }. */
export async function traiterSoumission(requete: Request, c: ContexteServeur): Promise<Response> {
  try {
    const id = await joueur(requete, c);
    if (typeof id !== 'string') return id;
    let entree: unknown;
    try { entree = await requete.json(); } catch { return refus(400, 'requete-invalide', 'Corps JSON attendu.'); }
    const v = verifierSoumission(entree, c.maintenant(), c, c.recompenses.participation);
    if (!v.ok) return refus(v.code === 'semaine-fermee' ? 409 : 400, v.code, v.message);
    if (!(await c.base.aUnProfil(id))) return refus(403, 'sans-pseudo', 'Choisis d’abord ton pseudo.');
    const avant = await c.base.lireDraft(id, v.semaine);
    // La participation déjà reçue sans compte ne peut que baisser la récompense : on garde la plus grande valeur déclarée.
    const dejaRecu = Math.max(v.dejaRecu, avant?.dejaRecu ?? 0);
    const nouvelleDate = !avant || avant.choix.join() !== v.choix.join();
    await c.base.enregistrerDraft({ utilisateur: id, semaine: v.semaine, cartes: v.cartes, choix: v.choix, score: v.score, detail: v.detail, dejaRecu }, nouvelleDate);
    const r = await c.base.rang(id, v.semaine);
    return json(200, { ok: true, semaine: v.semaine, choix: v.choix, score: v.score, detail: v.detail, rang: r?.rang ?? null, participants: r?.participants ?? null });
  } catch (e) {
    console.error('soumettre-draft', e);
    return refus(500, 'erreur', 'Erreur du serveur : réessaie plus tard.');
  }
}

/**
 * POST {} → { ok, recompenses: [{ semaine, rang, sceaux }] } : récompenses des semaines fermées pas encore réclamées,
 * d'après le classement figé (plus aucune équipe ne peut changer). Chacune n'est donnée qu'une fois.
 */
export async function traiterReclamation(requete: Request, c: ContexteServeur): Promise<Response> {
  try {
    const id = await joueur(requete, c);
    if (typeof id !== 'string') return id;
    const maintenant = c.maintenant();
    const courante = semaineDraft(maintenant);
    const dejaReclamees = new Set(await c.base.recompensesDe(id));
    const recompenses: RecompenseDraft[] = [];
    for (const d of (await c.base.draftsDe(id)).sort((a, b) => a.semaine.localeCompare(b.semaine))) {
      if (d.semaine >= courante || !semaineFermee(d.semaine, maintenant) || dejaReclamees.has(d.semaine)) continue;
      const r = await c.base.rang(id, d.semaine);
      if (!r) continue;
      const recompense = { semaine: d.semaine, rang: r.rang, sceaux: sceauxAReclamer(r.rang, d.dejaRecu, c.recompenses) };
      if (await c.base.ajouterRecompense(id, recompense)) recompenses.push(recompense);
    }
    return json(200, { ok: true, recompenses });
  } catch (e) {
    console.error('reclamer-draft', e);
    return refus(500, 'erreur', 'Erreur du serveur : réessaie plus tard.');
  }
}
