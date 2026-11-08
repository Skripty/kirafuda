// Classement du draft (tâche 24) : semaine à l'heure de Paris, validation des 5 cartes, recalcul du score,
// fermeture de la semaine, récompenses réclamées une seule fois. Tout sans réseau (base en mémoire).
import { describe, expect, it } from 'vitest';
import { catalogue } from '../src/catalogue';
import { disponiblesPourDraft, fusionner } from '../src/core/catalogue';
import {
  decalageParis, finSemaineDraft, recompenseDuRang, sceauxAReclamer, semaineDraft, semaineFermee, semainesPassees, verifierSoumission,
  type ContexteDraft, type RecompensesDraft,
} from '../src/core/classement';
import { equipeChoisie, genererDraft, jouerDraft, lundiSemaineIso, scorer, type Theme } from '../src/core/draft';
import { sauvegardeParDefaut } from '../src/core/sauvegarde';
import type { Sauvegarde } from '../src/core/types';
import themesJson from '../src/data/themes-draft.json';
import quetesJson from '../src/data/quetes.json';
import { traiterReclamation, traiterSoumission, type Base, type ContexteServeur, type LigneDraft, type RecompenseDraft } from '../supabase/fonctions/draft-serveur';
import { creerDraftEnLigne, type RecompenseClassement, type ReponseSoumission, type ServeurClassement } from '../src/en-ligne/classement';
import type { Compte } from '../src/en-ligne/compte';
import { ErreurReseau } from '../src/en-ligne/serveur';

const themes = themesJson.themes as Theme[];
/** Même contexte que le jeu (src/main.ts) et que les fonctions serveur (supabase/fonctions/contexte.ts). */
const contexte: ContexteDraft = { sources: (s) => disponiblesPourDraft(catalogue, lundiSemaineIso(s)), themes };
const recompenses: RecompensesDraft = quetesJson.hebdomadaire.recompensesDraft;
const date = (iso: string): Date => new Date(iso);

/** 5 indices de personnages distincts parmi les 15 cartes de la semaine (en partant du début ou de la fin). */
function choixValide(semaine: string, depuisLaFin = false): number[] {
  const d = genererDraft(semaine, contexte.sources, themes);
  const toutes = fusionner((typeof contexte.sources === 'function' ? contexte.sources(semaine) : contexte.sources).map((s) => s.extension));
  const ordre = d.cartes.map((_, i) => i);
  if (depuisLaFin) ordre.reverse();
  const perso = (k: number): string => toutes.cartes.find((c) => c.id === d.cartes[k]!.carteId)!.personnage;
  const choix: number[] = [];
  for (const i of ordre) if (choix.length < 5 && !choix.some((k) => perso(k) === perso(i))) choix.push(i);
  return choix;
}

describe('semaine du classement : heure de Paris', () => {
  it('décalage +1 h l’hiver, +2 h l’été (changements le dernier dimanche de mars et d’octobre à 01:00 UTC)', () => {
    expect(decalageParis(date('2026-11-08T12:00:00Z'))).toBe(3_600_000);
    expect(decalageParis(date('2026-07-01T12:00:00Z'))).toBe(7_200_000);
    expect(decalageParis(date('2026-03-29T00:59:59Z'))).toBe(3_600_000);
    expect(decalageParis(date('2026-03-29T01:00:00Z'))).toBe(7_200_000);
    expect(decalageParis(date('2026-10-25T00:59:59Z'))).toBe(7_200_000);
    expect(decalageParis(date('2026-10-25T01:00:00Z'))).toBe(3_600_000);
  });

  it('la semaine change le lundi à 00:00 heure de Paris (dimanche 23:00 UTC l’hiver, 22:00 UTC l’été)', () => {
    expect(semaineDraft(date('2026-11-15T22:59:59Z'))).toBe('2026-S46'); // dimanche 23:59:59 à Paris
    expect(semaineDraft(date('2026-11-15T23:00:00Z'))).toBe('2026-S47'); // lundi 00:00 à Paris
    expect(semaineDraft(date('2026-07-12T21:59:59Z'))).toBe('2026-S28');
    expect(semaineDraft(date('2026-07-12T22:00:00Z'))).toBe('2026-S29');
    expect(finSemaineDraft('2026-S46').toISOString()).toBe('2026-11-15T23:00:00.000Z');
    expect(finSemaineDraft('2026-S28').toISOString()).toBe('2026-07-12T22:00:00.000Z');
    // Semaine du passage à l'heure d'été (dimanche 29 mars 2026) : elle se ferme à 00:00 heure d'été.
    expect(finSemaineDraft('2026-S13').toISOString()).toBe('2026-03-29T22:00:00.000Z');
    expect(finSemaineDraft('2026-S53').toISOString()).toBe('2027-01-03T23:00:00.000Z');
  });

  it('fermeture : modifiable jusqu’au dimanche 23:59:59, fermée à 00:00', () => {
    expect(semaineFermee('2026-S46', date('2026-11-15T22:59:59Z'))).toBe(false);
    expect(semaineFermee('2026-S46', date('2026-11-15T23:00:00Z'))).toBe(true);
  });

  it('semaines passées : de la plus récente à la première du classement', () => {
    expect(semainesPassees(date('2026-11-08T12:00:00Z'))).toEqual([]);
    expect(semainesPassees(date('2026-11-25T12:00:00Z'))).toEqual(['2026-S47', '2026-S46', '2026-S45']);
  });
});

describe('vérification d’une équipe par le serveur', () => {
  const maintenant = date('2026-11-12T10:00:00Z'); // jeudi de la semaine 2026-S46
  const choix = choixValide('2026-S46');
  const verifier = (entree: unknown, m = maintenant) => verifierSoumission(entree, m, contexte, recompenses.participation);

  it('une équipe valide : cartes et score recalculés depuis la graine (le score envoyé est ignoré)', () => {
    const v = verifier({ semaine: '2026-S46', choix, dejaRecu: 0, score: 99_999 });
    if (!v.ok) throw new Error(v.message);
    const d = genererDraft('2026-S46', contexte.sources, themes);
    const toutes = fusionner(disponiblesPourDraft(catalogue, lundiSemaineIso('2026-S46')).map((s) => s.extension));
    const equipe = equipeChoisie(d, choix, toutes);
    if (typeof equipe === 'string') throw new Error(equipe);
    const attendu = scorer(equipe, d.theme, d.adversaire);
    expect(v.score).toBe(attendu.total);
    expect(v.detail).toEqual(attendu.lignes);
    expect(v.cartes).toEqual(choix.map((i) => d.cartes[i]!.carteId));
    // Même score que dans le jeu (jouerDraft, sauvegarde locale).
    const local = jouerDraft(sauvegardeParDefaut(), d, choix, toutes, { participation: 2, compte: true });
    expect(local.ok && local.score.total).toBe(v.score);
  });

  it('les 5 cartes doivent faire partie des 15 de la semaine et être différentes', () => {
    expect(verifier({ semaine: '2026-S46', choix: choix.slice(0, 4) })).toMatchObject({ ok: false, code: 'choix-invalide' });
    expect(verifier({ semaine: '2026-S46', choix: [choix[0], ...choix.slice(0, 4)] })).toMatchObject({ ok: false, code: 'choix-invalide', message: expect.stringMatching(/deux fois/) });
    expect(verifier({ semaine: '2026-S46', choix: [...choix.slice(0, 4), 15] })).toMatchObject({ ok: false, code: 'choix-invalide', message: expect.stringMatching(/hors du draft/) });
    expect(verifier({ semaine: '2026-S46', choix: [...choix.slice(0, 4), -1] })).toMatchObject({ ok: false, code: 'choix-invalide' });
    expect(verifier({ semaine: '2026-S46', choix: [...choix.slice(0, 4), 1.5] })).toMatchObject({ ok: false, code: 'requete-invalide' });
    expect(verifier({ semaine: '2026-S46', choix: 'lan-001' })).toMatchObject({ ok: false, code: 'requete-invalide' });
    expect(verifier(null)).toMatchObject({ ok: false, code: 'requete-invalide' });
  });

  it('deux cartes du même personnage sont refusées', () => {
    const d = genererDraft('2026-S46', contexte.sources, themes);
    const toutes = fusionner(disponiblesPourDraft(catalogue, lundiSemaineIso('2026-S46')).map((s) => s.extension));
    const persoDe = (i: number) => toutes.cartes.find((c) => c.id === d.cartes[i]!.carteId)!.personnage;
    const doublon = d.cartes.findIndex((_, i) => d.cartes.some((__, j) => j < i && persoDe(j) === persoDe(i)));
    if (doublon < 0) return; // pas de doublon cette semaine : rien à tester
    const premier = d.cartes.findIndex((_, j) => persoDe(j) === persoDe(doublon));
    const autres = choix.filter((i) => persoDe(i) !== persoDe(doublon)).slice(0, 3);
    expect(verifier({ semaine: '2026-S46', choix: [premier, doublon, ...autres] })).toMatchObject({ ok: false, code: 'choix-invalide', message: expect.stringMatching(/personnages différents/) });
  });

  it('fermeture : une semaine passée est refusée, une semaine future aussi', () => {
    const lundi = date('2026-11-15T23:00:00Z');
    expect(verifier({ semaine: '2026-S46', choix }, date('2026-11-15T22:59:59Z')).ok).toBe(true);
    expect(verifier({ semaine: '2026-S46', choix }, lundi)).toMatchObject({ ok: false, code: 'semaine-fermee' });
    expect(verifier({ semaine: '2026-S47', choix }, maintenant)).toMatchObject({ ok: false, code: 'semaine-future' });
    expect(verifier({ semaine: 'S46', choix })).toMatchObject({ ok: false, code: 'requete-invalide' });
  });

  it('participation déjà reçue : entier positif, plafonné à la participation', () => {
    expect(verifier({ semaine: '2026-S46', choix, dejaRecu: 50 })).toMatchObject({ ok: true, dejaRecu: 2 });
    expect(verifier({ semaine: '2026-S46', choix, dejaRecu: -1 })).toMatchObject({ ok: false, code: 'requete-invalide' });
  });
});

describe('récompenses de fin de semaine (quetes.json)', () => {
  it('1er +5, 2e +4, 3e +3, puis +2 ; la participation déjà reçue sans compte est déduite', () => {
    expect(recompenses).toEqual({ _note: expect.any(String), podium: [5, 4, 3], participation: 2 });
    expect([1, 2, 3, 4, 50].map((r) => recompenseDuRang(r, recompenses))).toEqual([5, 4, 3, 2, 2]);
    expect(sceauxAReclamer(1, 2, recompenses)).toBe(3);
    expect(sceauxAReclamer(8, 2, recompenses)).toBe(0);
  });
});

// ---------- Fonctions serveur, avec une base en mémoire ----------

class BaseFactice implements Base {
  jetons = new Map<string, string>();
  profils = new Set<string>();
  drafts = new Map<string, LigneDraft & { soumisLe: number }>();
  recompensesDonnees = new Map<string, RecompenseDraft>();
  horloge = 0;
  async utilisateur(jeton: string) { return this.jetons.get(jeton) ?? null; }
  async aUnProfil(id: string) { return this.profils.has(id); }
  async lireDraft(id: string, semaine: string) { return this.drafts.get(`${id}|${semaine}`) ?? null; }
  async enregistrerDraft(l: LigneDraft, nouvelleDate: boolean) {
    const avant = this.drafts.get(`${l.utilisateur}|${l.semaine}`);
    this.drafts.set(`${l.utilisateur}|${l.semaine}`, { ...l, soumisLe: nouvelleDate || !avant ? ++this.horloge : avant.soumisLe });
  }
  async rang(id: string, semaine: string) {
    const lignes = [...this.drafts.values()].filter((d) => d.semaine === semaine)
      .sort((a, b) => b.score - a.score || a.soumisLe - b.soumisLe || a.utilisateur.localeCompare(b.utilisateur));
    const i = lignes.findIndex((d) => d.utilisateur === id);
    return i < 0 ? null : { rang: i + 1, participants: lignes.length };
  }
  async draftsDe(id: string) { return [...this.drafts.values()].filter((d) => d.utilisateur === id).map((d) => ({ semaine: d.semaine, dejaRecu: d.dejaRecu })); }
  async recompensesDe(id: string) { return [...this.recompensesDonnees.keys()].filter((k) => k.startsWith(`${id}|`)).map((k) => k.split('|')[1]!); }
  async ajouterRecompense(id: string, r: RecompenseDraft) {
    if (this.recompensesDonnees.has(`${id}|${r.semaine}`)) return false;
    this.recompensesDonnees.set(`${id}|${r.semaine}`, r);
    return true;
  }
}

describe('fonctions serveur soumettre-draft et reclamer-draft', () => {
  const base = new BaseFactice();
  let maintenant = date('2026-11-12T10:00:00Z');
  const c: ContexteServeur = { ...contexte, base, recompenses, maintenant: () => maintenant };
  for (const j of ['a', 'b', 'c', 'd', 'e']) { base.jetons.set(`jeton-${j}`, j); base.profils.add(j); }
  base.jetons.set('jeton-sans-pseudo', 'z');
  const poster = (corps: unknown, jeton?: string): Request => new Request('https://x/functions/v1/soumettre-draft', {
    method: 'POST', body: JSON.stringify(corps), headers: jeton ? { Authorization: `Bearer ${jeton}` } : {},
  });
  const soumettre = async (corps: unknown, jeton?: string) => {
    const r = await traiterSoumission(poster(corps, jeton), c);
    return { statut: r.status, corps: await r.json() as Record<string, unknown> };
  };
  const reclamer = async (jeton: string) => (await (await traiterReclamation(poster({}, jeton), c)).json() as { recompenses: RecompenseDraft[] }).recompenses;
  const choixA = choixValide('2026-S46');
  const choixB = choixValide('2026-S46', true);

  it('CORS et connexion obligatoire', async () => {
    const options = await traiterSoumission(new Request('https://x', { method: 'OPTIONS' }), c);
    expect(options.status).toBe(200);
    expect(options.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect((await soumettre({ semaine: '2026-S46', choix: choixA })).statut).toBe(401);
    expect((await soumettre({ semaine: '2026-S46', choix: choixA }, 'faux')).statut).toBe(401);
    expect((await soumettre({ semaine: '2026-S46', choix: choixA }, 'jeton-sans-pseudo')).statut).toBe(403);
    expect((await soumettre({ semaine: '2026-S46', choix: [1, 1, 1, 1, 1] }, 'jeton-a')).statut).toBe(400);
    expect(base.drafts.size).toBe(0);
  });

  it('enregistre l’équipe avec le score recalculé ; une modification la remplace', async () => {
    const r = await soumettre({ semaine: '2026-S46', choix: choixA, score: 1_000_000 }, 'jeton-a');
    expect(r.statut).toBe(200);
    const attendu = verifierSoumission({ semaine: '2026-S46', choix: choixA }, maintenant, contexte, 2);
    expect(attendu.ok && r.corps).toMatchObject({ ok: true, score: attendu.ok ? attendu.score : 0, rang: 1, participants: 1 });
    expect(base.drafts.get('a|2026-S46')!.score).not.toBe(1_000_000);
    const date1 = base.drafts.get('a|2026-S46')!.soumisLe;
    // Même équipe renvoyée : la date ne change pas (à égalité, la première arrivée garde sa place).
    await soumettre({ semaine: '2026-S46', choix: choixA }, 'jeton-a');
    expect(base.drafts.get('a|2026-S46')!.soumisLe).toBe(date1);
    // Autre équipe : remplacée, nouvelle date.
    await soumettre({ semaine: '2026-S46', choix: choixB }, 'jeton-a');
    expect(base.drafts.get('a|2026-S46')!.choix).toEqual(choixB);
    expect(base.drafts.get('a|2026-S46')!.soumisLe).toBeGreaterThan(date1);
    await soumettre({ semaine: '2026-S46', choix: choixA }, 'jeton-a');
  });

  it('semaine fermée le dimanche à 23:59 (heure de Paris) : plus aucune modification', async () => {
    maintenant = date('2026-11-15T22:59:59Z');
    expect((await soumettre({ semaine: '2026-S46', choix: choixA }, 'jeton-b')).statut).toBe(200);
    maintenant = date('2026-11-15T23:00:00Z');
    const r = await soumettre({ semaine: '2026-S46', choix: choixB }, 'jeton-b');
    expect(r).toMatchObject({ statut: 409, corps: { ok: false, code: 'semaine-fermee' } });
    expect(base.drafts.get('b|2026-S46')!.choix).toEqual(choixA);
  });

  it('récompenses d’après le classement figé, chacune réclamée une seule fois', async () => {
    // Classement de 2026-S46 : 5 joueurs, ordre fixé par le score puis la date.
    maintenant = date('2026-11-12T10:00:00Z');
    await soumettre({ semaine: '2026-S46', choix: choixB, dejaRecu: 2 }, 'jeton-c');
    await soumettre({ semaine: '2026-S46', choix: choixB }, 'jeton-d');
    await soumettre({ semaine: '2026-S46', choix: choixB, dejaRecu: 2 }, 'jeton-e');
    const rangs = await Promise.all(['a', 'b', 'c', 'd', 'e'].map(async (j) => [j, (await base.rang(j, '2026-S46'))!.rang] as const));
    // Semaine encore ouverte : rien à réclamer.
    expect(await reclamer('jeton-a')).toEqual([]);
    maintenant = date('2026-11-16T08:00:00Z');
    for (const [j, rang] of rangs) {
      const deja = j === 'c' || j === 'e' ? 2 : 0;
      const sceaux = Math.max(0, ([5, 4, 3][rang - 1] ?? 2) - deja);
      expect(await reclamer(`jeton-${j}`)).toEqual([{ semaine: '2026-S46', rang, sceaux }]);
      expect(await reclamer(`jeton-${j}`)).toEqual([]); // une seule fois
    }
    expect(new Set(rangs.map(([, r]) => r))).toEqual(new Set([1, 2, 3, 4, 5]));
  });
});

// ---------- Côté jeu : envoi de l'équipe et récompenses ----------

describe('envoi au classement depuis le jeu (sans réseau)', () => {
  const compte = (statut: string): Compte => ({ etat: () => ({ statut }) }) as unknown as Compte;
  const semaine = semaineDraft(new Date());
  const d = genererDraft(semaine, contexte.sources, themes);
  const toutes = fusionner(disponiblesPourDraft(catalogue, lundiSemaineIso(semaine)).map((s) => s.extension));
  const choix = choixValide(semaine);

  function monter(statut: string, serveur: Partial<ServeurClassement>, depart: Sauvegarde) {
    let s = depart;
    const ecritures: Sauvegarde[] = [];
    const enLigne = creerDraftEnLigne({
      serveur: { lireClassement: async () => { throw new Error(); }, soumettreDraft: async () => { throw new Error(); }, reclamerRecompenses: async () => [], ...serveur },
      compte: compte(statut), lire: () => s, enregistrer: (n) => { s = n; ecritures.push(n); return n; },
    });
    return { enLigne, lire: () => s, ecritures };
  }

  it('connecté : l’équipe enregistrée localement part au classement, puis est marquée envoyée', async () => {
    const r = jouerDraft(sauvegardeParDefaut(), d, choix, toutes, { participation: 2, compte: true });
    if (!r.ok) throw new Error(r.message);
    const envois: unknown[][] = [];
    const m = monter('connecte', { soumettreDraft: async (...a): Promise<ReponseSoumission> => { envois.push(a); return { ok: true, score: 77, rang: 3, participants: 9 }; } }, r.sauvegarde);
    expect(await m.enLigne.envoyer()).toEqual({ etat: 'envoye', score: 77, rang: 3, participants: 9 });
    expect(envois).toEqual([[semaine, choix, 0]]);
    expect(m.lire().dernierDraft).toMatchObject({ envoye: true, dansClassement: true, score: 77 });
    expect(await m.enLigne.envoyer()).toEqual({ etat: 'rien' }); // déjà envoyée
    expect(envois.length).toBe(1);
  });

  it('joué sans compte puis connecté : la participation déjà reçue est déclarée', async () => {
    const r = jouerDraft(sauvegardeParDefaut(), d, choix, toutes, { participation: 2, compte: false });
    if (!r.ok) throw new Error(r.message);
    const envois: unknown[][] = [];
    const m = monter('connecte', { soumettreDraft: async (...a) => { envois.push(a); return { ok: true, score: 1, rang: 1, participants: 1 }; } }, r.sauvegarde);
    await m.enLigne.envoyer();
    expect(envois).toEqual([[semaine, choix, 2]]);
  });

  it('hors ligne : rien n’est perdu, nouvel essai plus tard ; sans compte : rien n’est envoyé', async () => {
    const r = jouerDraft(sauvegardeParDefaut(), d, choix, toutes, { participation: 2, compte: true });
    if (!r.ok) throw new Error(r.message);
    const m = monter('connecte', { soumettreDraft: async () => { throw new ErreurReseau('hors ligne'); } }, r.sauvegarde);
    expect(await m.enLigne.envoyer()).toMatchObject({ etat: 'attente', message: expect.stringMatching(/Hors ligne/) });
    expect(m.lire().dernierDraft!.envoye).toBe(false);
    const sansCompte = monter('deconnecte', { soumettreDraft: async () => { throw new Error('ne doit pas être appelé'); } }, r.sauvegarde);
    expect(await sansCompte.enLigne.envoyer()).toEqual({ etat: 'rien' });
  });

  it('récompenses réclamées : créditées sur l’appareil en une écriture', async () => {
    const recues: RecompenseClassement[] = [{ semaine: '2026-S45', rang: 1, sceaux: 5 }, { semaine: '2026-S46', rang: 7, sceaux: 0 }];
    let appels = 0;
    const m = monter('connecte', { reclamerRecompenses: async () => (appels++ === 0 ? recues : []) }, { ...sauvegardeParDefaut(), sceaux: 3 });
    expect(await m.enLigne.reclamer()).toBe('Classement du draft — semaine 2026-S45, 1er : +5 sceaux ; semaine 2026-S46, 7e : participation déjà reçue.');
    expect(m.lire().sceaux).toBe(8);
    expect(m.ecritures.length).toBe(1);
    expect(await m.enLigne.reclamer()).toBeNull();
    expect(m.lire().sceaux).toBe(8);
  });
});
