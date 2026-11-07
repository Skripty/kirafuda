// Synchronisation de la sauvegarde avec le compte (tâche 23), sans réseau :
// règles pures (src/core/synchro.ts) et compte complet (src/en-ligne/compte.ts) avec un faux serveur partagé
// par deux appareils (ordinateur et téléphone).
import { describe, expect, it } from 'vitest';
import type { Ouverture, Sauvegarde } from '../src/core/types';
import { CLE_SAUVEGARDE, enregistrerSauvegarde, sauvegardeParDefaut, validerSauvegarde, type Stockage } from '../src/core/sauvegarde';
import {
  DELAI_ENVOI, DELAI_REESSAI, Planificateur, decider, empreinte, estVierge, jsonCanonique, pseudoPropose, resumer, validerPseudo,
  type Horloge, type MetaSynchro,
} from '../src/core/synchro';
import { CLE_META_SYNCHRO, creerCompte, type Compte } from '../src/en-ligne/compte';
import { ErreurReseau, type LigneSauvegarde, type Serveur, type Utilisateur } from '../src/en-ligne/serveur';

// ---------- Outils ----------

const ouverture = (n: number, carteId: string): Ouverture => ({
  id: `o-${n}`, date: `2026-11-0${Math.min(9, n)}T20:00:00.000Z`, boosterId: 'booster-lancement', exceptionnelle: false,
  cartes: [{ carteId, finition: 'commune', emplacement: 1, nouveau: true, exemplaires: 1 }], pointsGagnes: 5, vue: true,
});

/** Joue `n` boosters (une carte chacun) sur une sauvegarde. */
function jouer(s: Sauvegarde, n: number, prefixe = 'lan-0'): Sauvegarde {
  const r = structuredClone(s);
  for (let i = 0; i < n; i++) {
    const carte = `${prefixe}${String(10 + ((r.historique.length + i) % 80)).padStart(2, '0')}`;
    r.collection[carte] = (r.collection[carte] ?? 0) + 1;
    r.historique.push(ouverture(r.historique.length + 1, carte));
  }
  r.historique = r.historique.map((o, i) => ({ ...o, id: `o-${i + 1}` }));
  return r;
}

const attendre = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

/** Horloge manuelle : les minuteries ne se déclenchent que quand on avance le temps. */
function horlogeManuelle(): Horloge & { avancer: (ms: number) => Promise<void> } {
  let t = 0;
  let n = 0;
  const minuteries = new Map<number, { a: number; f: () => void }>();
  return {
    maintenant: () => t,
    programmer: (f, ms) => { minuteries.set(++n, { a: t + ms, f }); return n; },
    annuler: (id) => { minuteries.delete(id as number); },
    async avancer(ms) {
      const fin = t + ms;
      for (;;) {
        const prochaine = [...minuteries].filter(([, m]) => m.a <= fin).sort((x, y) => x[1].a - y[1].a)[0];
        if (!prochaine) break;
        t = prochaine[1].a;
        minuteries.delete(prochaine[0]);
        prochaine[1].f();
        await attendre();
      }
      t = fin;
      await attendre();
    },
  };
}

class StockageMemoire implements Stockage {
  donnees = new Map<string, string>();
  getItem(cle: string): string | null { return this.donnees.get(cle) ?? null; }
  setItem(cle: string, valeur: string): void { this.donnees.set(cle, valeur); }
}

/** Le « nuage » : profils et sauvegardes partagés par tous les appareils. */
class Nuage {
  profils = new Map<string, string>();
  lignes = new Map<string, LigneSauvegarde>();
  envois = 0;
  private n = 0;
  date(): string { return `2026-11-07T10:${String(Math.floor(++this.n / 60)).padStart(2, '0')}:${String(this.n % 60).padStart(2, '0')}.123456+00:00`; }
}

/** Faux serveur d'un appareil (session de cet appareil, données du nuage). */
class ServeurFactice implements Serveur {
  horsLigne = false;
  constructor(private nuage: Nuage, public connecte: Utilisateur | null) {}
  private reseau(): void { if (this.horsLigne) throw new ErreurReseau('hors ligne'); }
  async session() { return { utilisateur: this.connecte, erreur: null }; }
  surFinDeSession(): void {}
  async connexionDiscord() { this.reseau(); }
  async deconnexion() { this.connecte = null; }
  async lireProfil(id: string) { this.reseau(); return this.nuage.profils.get(id) ?? null; }
  async creerProfil(id: string, pseudo: string) {
    this.reseau();
    if ([...this.nuage.profils.values()].some((p) => p.toLowerCase() === pseudo.toLowerCase())) return 'pris' as const;
    this.nuage.profils.set(id, pseudo);
    return 'ok' as const;
  }
  async lireSauvegarde(id: string) { this.reseau(); const l = this.nuage.lignes.get(id); return l ? structuredClone(l) : null; }
  async creerSauvegarde(id: string, donnees: unknown, version: number) {
    this.reseau();
    if (this.nuage.lignes.has(id)) return 'existe' as const;
    return this.ecrire(id, donnees, version);
  }
  async remplacerSauvegarde(id: string, donnees: unknown, version: number, siDate: string) {
    this.reseau();
    if (this.nuage.lignes.get(id)?.misAJourLe !== siDate) return 'conflit' as const;
    return this.ecrire(id, donnees, version);
  }
  private ecrire(id: string, donnees: unknown, version: number): string {
    const misAJourLe = this.nuage.date();
    // Comme jsonb : copie, clés réordonnées.
    this.nuage.lignes.set(id, { donnees: JSON.parse(jsonCanonique(donnees)), version, misAJourLe });
    this.nuage.envois++;
    return misAJourLe;
  }
}

/** Un appareil : stockage local, sauvegarde en mémoire, compte (comme src/main.ts). */
class Appareil {
  stockage = new StockageMemoire();
  sauvegarde: Sauvegarde;
  serveur: ServeurFactice;
  horloge = horlogeManuelle();
  enLigne = true;
  compte: Compte;
  constructor(nuage: Nuage, utilisateur: Utilisateur | null, depart: Sauvegarde = sauvegardeParDefaut()) {
    this.serveur = new ServeurFactice(nuage, utilisateur);
    this.sauvegarde = depart;
    this.stockage.setItem(CLE_SAUVEGARDE, JSON.stringify(depart));
    this.compte = creerCompte({
      serveur: this.serveur,
      stockage: this.stockage,
      horloge: this.horloge,
      lireLocale: () => this.sauvegarde,
      remplacerLocale: (s) => { this.ecrire(s); return true; },
      validerEnLigne: (d) => validerSauvegarde(d),
      enLigne: () => this.enLigne,
    });
  }
  /** Une opération du jeu : écriture locale complète, puis signal au compte. */
  ecrire(s: Sauvegarde): void {
    expect(enregistrerSauvegarde(this.stockage, s).ok).toBe(true);
    this.sauvegarde = s;
    this.compte.signalerEcriture();
  }
  jouer(n: number): void { this.ecrire(jouer(this.sauvegarde, n)); }
  coupure(oui: boolean): void { this.enLigne = !oui; this.serveur.horsLigne = oui; }
}

const joueur: Utilisateur = { id: 'u-1', nomDiscord: 'Kira San!' };

// ---------- Règles pures ----------

describe('empreinte', () => {
  it('ne dépend pas de l’ordre des clés (jsonb les réordonne)', () => {
    expect(jsonCanonique({ b: 1, a: [{ d: 2, c: 3 }] })).toBe('{"a":[{"c":3,"d":2}],"b":1}');
    expect(empreinte({ b: 1, a: 2 })).toBe(empreinte({ a: 2, b: 1 }));
    expect(empreinte({ a: 1 })).not.toBe(empreinte({ a: 2 }));
  });
});

describe('résumé et sauvegarde vierge', () => {
  it('compte cartes, cartes différentes, boosters et sceaux', () => {
    const s = { ...jouer(sauvegardeParDefaut(), 3), sceaux: 6 };
    s.collection['lan-010'] = 2;
    expect(resumer(s)).toEqual({ cartes: 4, cartesDifferentes: 3, boosters: 3, sceaux: 6 });
  });
  it('vierge : aucune carte, aucun booster, aucun draft (des sceaux seuls ne comptent pas)', () => {
    expect(estVierge({ ...sauvegardeParDefaut(), sceaux: 4 })).toBe(true);
    expect(estVierge(jouer(sauvegardeParDefaut(), 1))).toBe(false);
  });
});

describe('décision à la connexion', () => {
  const vierge = sauvegardeParDefaut();
  const a = jouer(vierge, 3);
  const b = jouer(vierge, 5, 'lan-1');
  const enLigne = (s: Sauvegarde, misAJourLe = 'T1') => ({ sauvegarde: s, misAJourLe });
  const meta = (s: Sauvegarde, enLigneLe = 'T1', utilisateur = 'u-1'): MetaSynchro => ({ utilisateur, empreinte: empreinte(s), enLigneLe });
  const d = (locale: Sauvegarde, en: ReturnType<typeof enLigne> | null, m: MetaSynchro | null = null) =>
    decider({ utilisateur: 'u-1', locale, enLigne: en, meta: m }).action;

  it('une seule des deux existe : on la garde', () => {
    expect(d(a, null)).toBe('envoyer');
    expect(d(a, enLigne(vierge))).toBe('envoyer');
    expect(d(vierge, enLigne(a))).toBe('prendre');
  });
  it('aucune des deux : rien à décider', () => {
    expect(d(vierge, enLigne(vierge))).toBe('rien');
  });
  it('identiques : rien à faire', () => {
    expect(d(a, enLigne(structuredClone(a)))).toBe('rien');
  });
  it('les deux existent et diffèrent, sans historique de synchronisation : le joueur choisit', () => {
    expect(d(a, enLigne(b))).toBe('choisir');
    expect(d(a, enLigne(b), meta(b, 'T1', 'autre-joueur'))).toBe('choisir');
  });
  it('seule la locale a changé depuis la dernière synchronisation : elle est envoyée', () => {
    expect(d(jouer(a, 1), enLigne(a, 'T1'), meta(a, 'T1'))).toBe('envoyer');
  });
  it('seule la version en ligne a changé (un autre appareil a joué) : elle est reprise', () => {
    expect(d(a, enLigne(jouer(a, 2), 'T2'), meta(a, 'T1'))).toBe('prendre');
  });
  it('les deux ont changé : le joueur choisit', () => {
    expect(d(jouer(a, 1), enLigne(jouer(a, 2), 'T2'), meta(a, 'T1'))).toBe('choisir');
  });
});

describe('pseudo', () => {
  it('3 à 20 caractères, lettres (accents compris), chiffres, espace, _ - .', () => {
    expect(validerPseudo('  Élodie_92  ')).toEqual({ ok: true, pseudo: 'Élodie_92' });
    expect(validerPseudo('a  b')).toEqual({ ok: true, pseudo: 'a b' });
    expect(validerPseudo('ab').ok).toBe(false);
    expect(validerPseudo('x'.repeat(21)).ok).toBe(false);
    expect(validerPseudo('kira<script>').ok).toBe(false);
    expect(validerPseudo('🔥🔥🔥').ok).toBe(false);
  });
  it('proposé depuis le nom Discord, nettoyé ; vide si inutilisable', () => {
    expect(pseudoPropose('Kira San!')).toBe('Kira San');
    expect(pseudoPropose('✨')).toBe('');
    expect(pseudoPropose(null)).toBe('');
    expect(pseudoPropose('un nom vraiment beaucoup trop long')).toBe('un nom vraiment beau');
  });
});

describe('envois regroupés (au plus un toutes les 5 secondes)', () => {
  const preparer = (resultats: boolean[] = []) => {
    const h = horlogeManuelle();
    const envois: number[] = [];
    const p = new Planificateur(async () => { envois.push(h.maintenant()); return resultats.shift() ?? true; }, h);
    return { h, envois, p };
  };

  it('première opération : envoi immédiat ; les suivantes dans les 5 s : un seul envoi groupé', async () => {
    const { h, envois, p } = preparer();
    p.signaler();
    await h.avancer(0);
    expect(envois).toEqual([0]);
    for (const t of [1000, 1500, 3000]) { await h.avancer(t - h.maintenant()); p.signaler(); }
    await h.avancer(10_000);
    expect(envois).toEqual([0, DELAI_ENVOI]);
    expect(p.enAttente).toBe(false);
  });

  it('échec (hors ligne) : retenté après 30 s, ou tout de suite avec vider() (retour du réseau, départ)', async () => {
    const { h, envois, p } = preparer([false, false, true]);
    p.signaler();
    await h.avancer(0);
    expect(p.enAttente).toBe(true);
    await h.avancer(DELAI_REESSAI);
    expect(envois).toEqual([0, DELAI_REESSAI]);
    await p.vider();
    expect(envois).toEqual([0, DELAI_REESSAI, DELAI_REESSAI]);
    expect(p.enAttente).toBe(false);
  });

  it('arrêté (avant la décision de connexion) : rien n’est envoyé, mais rien n’est oublié', async () => {
    const { h, envois, p } = preparer();
    p.arreter();
    p.signaler();
    await h.avancer(60_000);
    await p.vider();
    expect(envois).toEqual([]);
    p.reprendre();
    await h.avancer(0);
    expect(envois).toEqual([60_000]);
  });
});

// ---------- Compte complet, faux serveur ----------

describe('compte : connexion, pseudo, synchronisation', () => {
  it('scénario : je joue sur ordinateur, je me connecte sur téléphone, je retrouve ma collection', async () => {
    const nuage = new Nuage();
    // Ordinateur : partie locale, puis connexion Discord et choix du pseudo.
    const ordi = new Appareil(nuage, joueur, jouer(sauvegardeParDefaut(), 12));
    await ordi.compte.demarrer();
    expect(ordi.compte.etat().statut).toBe('pseudo');
    expect(ordi.compte.etat().pseudoPropose).toBe('Kira San');
    expect(await ordi.compte.choisirPseudo('Kira San')).toBeNull();
    expect(ordi.compte.etat()).toMatchObject({ statut: 'connecte', pseudo: 'Kira San', synchro: 'a-jour' });
    expect(nuage.lignes.get('u-1')!.donnees).toEqual(ordi.sauvegarde); // seule la locale existait : envoyée

    // On continue à jouer sur l'ordinateur : envoyé après chaque opération.
    ordi.jouer(3);
    await ordi.horloge.avancer(DELAI_ENVOI);
    expect(validerSauvegarde(nuage.lignes.get('u-1')!.donnees)).toMatchObject({ ok: true, sauvegarde: ordi.sauvegarde });

    // Téléphone : nouvelle installation (récompense du jour seulement), même compte.
    const tel = new Appareil(nuage, joueur, { ...sauvegardeParDefaut(), sceaux: 4 });
    await tel.compte.demarrer();
    expect(tel.compte.etat()).toMatchObject({ statut: 'connecte', pseudo: 'Kira San' }); // pas de nouveau pseudo
    expect(tel.sauvegarde.collection).toEqual(ordi.sauvegarde.collection);
    expect(tel.sauvegarde.historique).toHaveLength(15);
    expect(tel.compte.etat().message).toMatch(/15 boosters ouverts/);
  });

  it('les deux appareils ont joué de leur côté : le joueur choisit (date, cartes, boosters de chacune)', async () => {
    const nuage = new Nuage();
    const ordi = new Appareil(nuage, joueur, jouer(sauvegardeParDefaut(), 4));
    nuage.profils.set('u-1', 'Kira');
    await ordi.compte.demarrer();
    const tel = new Appareil(nuage, joueur, jouer(sauvegardeParDefaut(), 9, 'lan-1'));
    tel.stockage.setItem('kirafuda:sauvegarde-modifiee-le', '2026-11-06T18:00:00.000Z');
    await tel.compte.demarrer();
    const e = tel.compte.etat();
    expect(e.statut).toBe('choix');
    expect(e.choix!.locale).toMatchObject({ boosters: 9, cartes: 9, date: '2026-11-06T18:00:00.000Z' });
    expect(e.choix!.enLigne).toMatchObject({ boosters: 4, cartes: 4, date: nuage.lignes.get('u-1')!.misAJourLe });
    // En attendant le choix, le téléphone joue sans rien envoyer.
    const envois = nuage.envois;
    tel.jouer(1);
    await tel.horloge.avancer(60_000);
    expect(nuage.envois).toBe(envois);

    await tel.compte.choisirSauvegarde('locale');
    expect(tel.compte.etat().statut).toBe('connecte');
    expect(nuage.lignes.get('u-1')!.donnees).toEqual(tel.sauvegarde);
  });

  it('choisir celle en ligne : elle remplace la sauvegarde de l’appareil', async () => {
    const nuage = new Nuage();
    nuage.profils.set('u-1', 'Kira');
    const ordi = new Appareil(nuage, joueur, jouer(sauvegardeParDefaut(), 4));
    await ordi.compte.demarrer();
    const tel = new Appareil(nuage, joueur, jouer(sauvegardeParDefaut(), 2, 'lan-1'));
    await tel.compte.demarrer();
    await tel.compte.choisirSauvegarde('en-ligne');
    expect(tel.sauvegarde).toEqual(ordi.sauvegarde);
    expect(JSON.parse(tel.stockage.getItem(CLE_SAUVEGARDE)!)).toEqual(ordi.sauvegarde);
  });

  it('retour sur un appareil déjà synchronisé : on reprend sans question ce qui a été joué ailleurs', async () => {
    const nuage = new Nuage();
    nuage.profils.set('u-1', 'Kira');
    const ordi = new Appareil(nuage, joueur, jouer(sauvegardeParDefaut(), 4));
    await ordi.compte.demarrer();
    const tel = new Appareil(nuage, joueur);
    await tel.compte.demarrer();
    tel.jouer(6);
    await tel.horloge.avancer(DELAI_ENVOI);
    // L'ordinateur revient (nouvelle session, même stockage) : il n'a pas joué depuis, il reprend.
    const retour = new Appareil(nuage, joueur, ordi.sauvegarde);
    retour.stockage.setItem(CLE_META_SYNCHRO, ordi.stockage.getItem(CLE_META_SYNCHRO)!);
    await retour.compte.demarrer();
    expect(retour.compte.etat().statut).toBe('connecte');
    expect(retour.sauvegarde.historique).toHaveLength(10);
  });

  it('un autre appareil a écrit pendant la partie : rien n’est écrasé, le joueur choisit', async () => {
    const nuage = new Nuage();
    nuage.profils.set('u-1', 'Kira');
    const ordi = new Appareil(nuage, joueur, jouer(sauvegardeParDefaut(), 4));
    await ordi.compte.demarrer();
    const tel = new Appareil(nuage, joueur);
    await tel.compte.demarrer();
    tel.jouer(2);
    await tel.horloge.avancer(DELAI_ENVOI);
    const enLigneAvant = nuage.lignes.get('u-1')!;
    ordi.jouer(1);
    await ordi.horloge.avancer(DELAI_ENVOI);
    expect(nuage.lignes.get('u-1')).toEqual(enLigneAvant); // la partie du téléphone n'est pas écrasée
    expect(ordi.compte.etat().statut).toBe('choix');
  });

  it('hors ligne : le jeu continue, la sauvegarde part au retour du réseau', async () => {
    const nuage = new Nuage();
    nuage.profils.set('u-1', 'Kira');
    const ordi = new Appareil(nuage, joueur, jouer(sauvegardeParDefaut(), 2));
    await ordi.compte.demarrer();
    ordi.coupure(true);
    ordi.jouer(3);
    await ordi.horloge.avancer(DELAI_ENVOI);
    expect(ordi.compte.etat().synchro).toBe('hors-ligne');
    expect((nuage.lignes.get('u-1')!.donnees as Sauvegarde).historique).toHaveLength(2);
    ordi.coupure(false);
    ordi.compte.reseauRetabli();
    await ordi.horloge.avancer(0);
    expect(ordi.compte.etat().synchro).toBe('a-jour');
    expect((nuage.lignes.get('u-1')!.donnees as Sauvegarde).historique).toHaveLength(5);
  });

  it('hors ligne dès le démarrage : partie locale, connexion finalisée au retour du réseau', async () => {
    const nuage = new Nuage();
    nuage.profils.set('u-1', 'Kira');
    const tel = new Appareil(nuage, joueur, jouer(sauvegardeParDefaut(), 2));
    tel.coupure(true);
    await tel.compte.demarrer();
    expect(tel.compte.etat()).toMatchObject({ statut: 'connecte', synchro: 'hors-ligne' });
    tel.jouer(1);
    tel.coupure(false);
    tel.compte.reseauRetabli();
    await tel.horloge.avancer(0);
    expect(tel.compte.etat()).toMatchObject({ statut: 'connecte', pseudo: 'Kira', synchro: 'a-jour' });
    expect(nuage.lignes.get('u-1')!.donnees).toEqual(tel.sauvegarde);
  });

  it('au départ de la page, ce qui reste est envoyé sans attendre', async () => {
    const nuage = new Nuage();
    nuage.profils.set('u-1', 'Kira');
    const ordi = new Appareil(nuage, joueur, jouer(sauvegardeParDefaut(), 1));
    await ordi.compte.demarrer();
    ordi.jouer(1);
    await ordi.horloge.avancer(0);
    ordi.jouer(1); // dans les 5 s : en attente
    expect(ordi.compte.etat().synchro).not.toBe('a-jour');
    await ordi.compte.vider();
    expect(nuage.lignes.get('u-1')!.donnees).toEqual(ordi.sauvegarde);
  });

  it('pseudo déjà pris (sans tenir compte des majuscules) : message, rien n’est créé', async () => {
    const nuage = new Nuage();
    nuage.profils.set('u-2', 'Kira');
    const ordi = new Appareil(nuage, joueur);
    await ordi.compte.demarrer();
    expect(await ordi.compte.choisirPseudo('kira')).toMatch(/déjà pris/);
    expect(await ordi.compte.choisirPseudo('k')).toMatch(/au moins 3/);
    expect(ordi.compte.etat().statut).toBe('pseudo');
  });

  it('sauvegarde en ligne d’une version plus récente du jeu : jamais écrasée', async () => {
    const nuage = new Nuage();
    nuage.profils.set('u-1', 'Kira');
    nuage.lignes.set('u-1', { donnees: { ...jouer(sauvegardeParDefaut(), 3), version: 99 }, version: 99, misAJourLe: 'T0' });
    const ordi = new Appareil(nuage, joueur, jouer(sauvegardeParDefaut(), 1));
    await ordi.compte.demarrer();
    ordi.jouer(2);
    await ordi.horloge.avancer(60_000);
    expect(ordi.compte.etat().synchro).toBe('bloquee');
    expect(nuage.lignes.get('u-1')!.version).toBe(99);
  });

  it('sans compte : rien n’est envoyé ; déconnexion : la partie locale continue', async () => {
    const nuage = new Nuage();
    const invite = new Appareil(nuage, null, jouer(sauvegardeParDefaut(), 2));
    await invite.compte.demarrer();
    expect(invite.compte.etat().statut).toBe('deconnecte');
    invite.jouer(1);
    await invite.horloge.avancer(60_000);
    expect(nuage.envois).toBe(0);

    nuage.profils.set('u-1', 'Kira');
    const ordi = new Appareil(nuage, joueur, jouer(sauvegardeParDefaut(), 2));
    await ordi.compte.demarrer();
    await ordi.compte.seDeconnecter();
    expect(ordi.compte.etat().statut).toBe('deconnecte');
    const envois = nuage.envois;
    ordi.jouer(4);
    await ordi.horloge.avancer(60_000);
    expect(nuage.envois).toBe(envois);
    expect(ordi.sauvegarde.historique).toHaveLength(6);
  });
});
