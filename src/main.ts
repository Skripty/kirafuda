import './styles/tokens.css';
import populariteJson from './data/popularite.json';
import populariteBaseJson from './data/popularite-base.json';
import themesDraft from './data/themes-draft.json';
import quetesJson from './data/quetes.json';
import soutiensJson from './data/soutiens.json';
import { catalogue, erreursCatalogue } from './catalogue';
import type { Ouverture, Popularite, Sauvegarde } from './core/types';
import {
  disponibles, disponiblesPourDraft, extensionDeBooster, toutesLesExtensions, vaguesAvecCalendrier, validerJeu, type ExtensionSortie,
} from './core/catalogue';
import { CLE_SAUVEGARDE, chargerSauvegarde, enregistrerSauvegarde, validerSauvegarde, type ContexteValidation, type Stockage } from './core/sauvegarde';
import { CLE_MODIFIEE_LE, creerCompte, type Compte } from './en-ligne/compte';
import { classementDiffere, configSupabase, creerServeurSupabase, serveurDiffere } from './en-ligne/supabase';
import { creerDraftEnLigne, type DraftEnLigne, type ServeurClassement } from './en-ligne/classement';
import { creerClassement } from './ui/classement';
import { semaineDraft } from './core/classement';
import { indexer } from './core/extension';
import { fusionner } from './core/catalogue';
import { bibliotheque, type CarteSoutien } from './core/combat/etat';
import { installerDialoguesCompte } from './ui/compte';
import {
  appliquerConnexion, appliquerEvenements, appliquerLancements, evenementsOuverture, reclamer, validerConfigQuetes, vueLancements, vueQuetes,
  type CibleReclamation, type ConfigQuetes, type ContexteQuetes, type Evenement,
} from './core/quetes';
import { ouvrir } from './core/ouverture';
import { rngSecurise } from './core/rng';
import { afficherErreursDonnees } from './ui/erreurs';
import { creerPanneauSauvegarde } from './ui/sauvegarde';
import { creerHub } from './ui/hub';
import { creerProbabilites } from './ui/probabilites';
import { creerHistorique } from './ui/historique';
import { creerCollection } from './ui/collection';
import { creerBoutique } from './ui/boutique';
import { creerDraft } from './ui/draft';
import { creerEcranQuetes } from './ui/quetes';
import { lundiSemaineIso, regulariserDraft, type Theme } from './core/draft';
import { lireFichierPopularite, versPopularite, type BasePopularite } from './core/popularite';
import { lancerOuverture } from './ui/ouverture/scene';
import { marquerVue, ouvertureNonVue } from './core/revelation';
import { creerEcranCombat } from './ui/combat';

const basePopularite = populariteBaseJson as BasePopularite;
/** Popularité de la semaine (base + ajustement) ; un ancien fichier est migré en mémoire (base + 0). Les erreurs sont signalées au démarrage. */
const lecturePopularite = lireFichierPopularite(populariteJson, basePopularite);
const pop: Popularite = 'fichier' in lecturePopularite
  ? versPopularite(lecturePopularite.fichier, basePopularite)
  : { semaine: '', semainePrecedente: '', courante: {}, precedente: {} };
const themes = themesDraft.themes as Theme[];
const configQuetes = quetesJson as unknown as ConfigQuetes;
const app = document.querySelector<HTMLDivElement>('#app')!;
/** Cartes du draft d'une semaine : vagues sorties à son lundi (le draft ne change pas en cours de semaine). */
const sourcesDraft = (semaine: string): ExtensionSortie[] => disponiblesPourDraft(catalogue, lundiSemaineIso(semaine));

/** Toutes les cartes du jeu (classement : équipes des autres joueurs, semaines passées). */
const extensionsCombat = toutesLesExtensions(catalogue);
const personnagesCombat = fusionner(toutesLesExtensions(catalogue)).personnages;
const bibliothequeCombat = bibliotheque(personnagesCombat, soutiensJson.soutiens as unknown as CarteSoutien[]);
const indexToutes = toutesLesExtensions(catalogue).map((extension) => ({ extension, index: indexer(extension) }));
const carteDe = (id: string) => {
  for (const { extension, index } of indexToutes) { const carte = index.carte(id); if (carte) return { carte, extension }; }
  return null;
};
const recompensesDraft = configQuetes.hebdomadaire.recompensesDraft;

/** Lancement à l'heure actuelle : les cartes de ses vagues sorties (une vague rejoint le booster à sa date « disponibleLe »). */
const sorties = (): ExtensionSortie[] => disponibles(catalogue, new Date());
/** Contexte des quêtes, à l'heure actuelle (le jour, la semaine et les vagues sorties changent pendant qu'on joue). */
const contexteQuetes = (): ContexteQuetes => ({ config: configQuetes, extensions: sorties().map((e) => e.extension), maintenant: new Date() });
/** Migration vers la version 3 : la première vague de Lancement ; cartes connues à l'import : toutes les vagues. */
const contexteSauvegarde = (refuserCartesInconnues: boolean): ContexteValidation =>
  ({ extension: catalogue[0]!.vagues[0]!.donnees, extensions: toutesLesExtensions(catalogue), refuserCartesInconnues });

/** localStorage, ou un stockage qui échoue toujours si le navigateur en bloque l'accès. */
function stockageNavigateur(): Stockage {
  try {
    return window.localStorage;
  } catch {
    const indisponible = (): never => { throw new Error('localStorage indisponible'); };
    return { getItem: indisponible, setItem: indisponible };
  }
}

function demarrer(): void {
  const navigateur = stockageNavigateur();
  /** Compte en ligne (null sans configuration Supabase : le jeu reste 100 % local). */
  let compte: Compte | null = null;
  /** Classement du draft (null sans configuration Supabase) et envoi de l'équipe. */
  let serveurClassement: ServeurClassement | null = null;
  let draftEnLigne: DraftEnLigne | null = null;
  /**
   * Stockage du jeu : chaque écriture de la sauvegarde qui la change est datée et signalée au compte,
   * qui l'envoie en ligne (envois regroupés). La sauvegarde locale reste la référence.
   */
  const stockage: Stockage = {
    getItem: (cle) => navigateur.getItem(cle),
    setItem: (cle, valeur) => {
      let change = false;
      if (cle === CLE_SAUVEGARDE) { try { change = navigateur.getItem(cle) !== valeur; } catch { change = true; } }
      navigateur.setItem(cle, valeur);
      if (!change) return;
      try { navigateur.setItem(CLE_MODIFIEE_LE, new Date().toISOString()); } catch { /* sans conséquence */ }
      compte?.signalerEcriture();
    },
  };
  const chargement = chargerSauvegarde(stockage, contexteSauvegarde(false));
  let sauvegarde: Sauvegarde = chargement.sauvegarde;
  let avertissement = chargement.avertissement;
  let annonce: string | null = chargement.migreeDepuis !== null && chargement.migreeDepuis < 3
    ? 'Ta collection est passée au nouveau système : chaque carte a désormais une rareté fixe. Les exemplaires sans carte équivalente ont été convertis en points de booster.'
    : null;
  /** Ouverture en cours de mise en scène (déjà enregistrée). */
  let enScene: Ouverture | null = null;
  /** Lancement (un seul booster), avec ses vagues sorties. */
  const sortie = (): ExtensionSortie => sorties()[0]!;

  /**
   * Tout ou rien : l'opération et la progression des quêtes qu'elle entraîne sont écrites ensemble.
   * L'état en mémoire ne change que si l'écriture complète a réussi. Renvoie la sauvegarde écrite, ou null.
   */
  function enregistrer(nouvelle: Sauvegarde, evenements: Evenement[] = []): Sauvegarde | null {
    const complete = evenements.length > 0 ? appliquerEvenements(nouvelle, evenements, contexteQuetes()) : nouvelle;
    const r = enregistrerSauvegarde(stockage, complete);
    if (!r.ok) {
      annonce = r.erreur;
      return null;
    }
    sauvegarde = complete;
    return complete;
  }

  const sceauxTexte = (n: number): string => `${n} sceau${n > 1 ? 'x' : ''}`;

  /**
   * Premier lancement de la journée : connexion (plafonnée) et case du calendrier de bienvenue ;
   * puis, chaque jour de la semaine de sortie d'une extension, la case de son calendrier de lancement.
   * Le tout en une seule écriture. True si quelque chose a été gagné.
   */
  function verifierConnexion(): boolean {
    const maintenant = new Date();
    const c = appliquerConnexion(sauvegarde, contexteQuetes());
    const l = appliquerLancements(c.sauvegarde, vaguesAvecCalendrier(catalogue), configQuetes, maintenant);
    const morceaux: string[] = [];
    if (c.nouvelleJournee) {
      morceaux.push(c.sceauxConnexion > 0
        ? `Récompense du jour : +${sceauxTexte(c.sceauxConnexion)}.`
        : `Récompense du jour : tu as déjà ${configQuetes.connexion.plafondStock} sceaux ou plus, le plafond est atteint.`);
      if (c.jourCalendrier !== null) morceaux.push(`Calendrier de bienvenue, jour ${c.jourCalendrier} : +${sceauxTexte(c.sceauxCalendrier)}.`);
      if (c.boosterGaranti) morceaux.push('Ton prochain booster contient une carte ★ ou plus.');
    }
    for (const g of l.gains) morceaux.push(`Sortie de la vague ${g.nom}, jour ${g.jour} : +${sceauxTexte(g.sceaux)}.`);
    // Semaine du draft fermée sans que l'équipe ait pu rejoindre le classement : participation sur l'appareil.
    const d = regulariserDraft(l.sauvegarde, semaineDraft(maintenant), recompensesDraft.participation);
    if (d.sceaux > 0) morceaux.push(`Draft de la semaine ${l.sauvegarde.dernierDraft!.semaine} : ton équipe n’a pas pu rejoindre le classement, +${sceauxTexte(d.sceaux)} de participation.`);
    if (!c.nouvelleJournee && l.gains.length === 0 && d.sceaux === 0 && c.sauvegarde.quetes === sauvegarde.quetes) return false;
    // Nouvelle période (jour ou semaine) sans gain : l'état est gardé à jour, sans annonce.
    if (!enregistrer(d.sauvegarde)) return false;
    if (morceaux.length === 0) return false;
    annonce = morceaux.join(' ');
    return true;
  }

  function ouvrirBooster(): void {
    // Règle 1 : le résultat est tiré puis enregistré AVANT l'animation, qui ne fait que le mettre en scène.
    // Règle 6 : ouverture et progression des quêtes sont écrites en une seule fois.
    const { booster, extension } = sortie();
    const r = ouvrir(sauvegarde, booster, extension, rngSecurise(), new Date(), configQuetes.tableGarantie.finitions);
    if (!r.ok) {
      annonce = `Il te manque ${sceauxTexte(r.manque)}.`;
      afficher();
      return;
    }
    if (!enregistrer(r.sauvegarde, evenementsOuverture(r.ouverture, extension))) {
      afficher();
      return;
    }
    mettreEnScene(r.ouverture);
  }

  /** Réclame une récompense de quête (une seule fois), puis réaffiche l'écran courant. */
  function reclamerQuete(cible: CibleReclamation): void {
    const r = reclamer(sauvegarde, cible, contexteQuetes());
    if (!r.ok) annonce = r.raison === 'deja-reclamee' ? 'Récompense déjà réclamée.' : 'Cette quête n’est pas encore finie.';
    else if (enregistrer(r.sauvegarde)) annonce = `Récompense réclamée : +${sceauxTexte(r.sceaux)}.`;
    afficher();
  }

  function mettreEnScene(ouverture: Ouverture): void {
    enScene = ouverture;
    if (location.hash === '#/ouverture') afficher();
    else location.hash = '#/ouverture';
  }

  function afficher(): void {
    const route = location.hash.replace(/^#\/?/, '');
    // Les anciennes adresses « #/collection/renforts » mènent à l'écran (un seul ensemble Lancement).
    const ecran = route.split('/')[0] ?? '';
    const courante = sortie();

    if (ecran === 'probabilites') {
      enregistrer(sauvegarde, [{ type: 'probabilites-consultees' }]);
      app.replaceChildren(creerProbabilites(courante.booster, courante.extension));
    } else if (ecran === 'quetes') {
      app.replaceChildren(creerEcranQuetes({ vue: vueQuetes(sauvegarde, contexteQuetes()), onReclamer: reclamerQuete, annonce }));
      annonce = null;
    } else if (ecran === 'draft') {
      app.replaceChildren(creerDraft({ sauvegarde, sources: sourcesDraft, themes, maintenant: new Date(), enregistrer,
        recompenses: recompensesDraft, compte, enLigne: draftEnLigne }));
    } else if (ecran === 'classement') {
      app.replaceChildren(creerClassement({ serveur: serveurClassement, compte, semaine: route.split('/')[1] ?? null, maintenant: new Date(),
        carteDe, recompenses: recompensesDraft }));
    } else if (ecran === 'combat') {
      app.replaceChildren(creerEcranCombat({ sauvegarde, bib: bibliothequeCombat, extensions: extensionsCombat, enregistrer }));
    } else if (ecran === 'boutique') {
      app.replaceChildren(creerBoutique({ sauvegarde, extension: courante.extension, popularite: pop, enregistrer }));
    } else if (ecran === 'collection') {
      app.replaceChildren(creerCollection(sauvegarde, courante.extension, pop,
        () => { enregistrer(sauvegarde, [{ type: 'carte-inspectee' }, { type: 'cote-consultee' }]); }));
    } else if (ecran === 'historique') {
      app.replaceChildren(creerHistorique({ sauvegarde, extension: courante.extension, booster: courante.booster, onReveler: mettreEnScene }));
    } else if (ecran === 'ouverture' && enScene && extensionDeBooster(sorties(), enScene.boosterId)) {
      const ouverture = enScene;
      // L'ouverture est mise en scène avec l'extension de son booster (cartes des vagues sorties).
      const { extension, booster } = extensionDeBooster(sorties(), ouverture.boosterId)!;
      lancerOuverture(app, {
        ouverture,
        extension,
        booster,
        onVue: () => { enregistrer(marquerVue(sauvegarde, ouverture.id)); },
        onTerminer: () => { enScene = null; location.hash = '#/'; },
      });
    } else {
      // Route inconnue ou ouverture absente (page rechargée en pleine animation) : retour au hub.
      if (route !== '') history.replaceState(null, '', '#/');
      const nonVue = ouvertureNonVue(sauvegarde);
      const panneau = creerPanneauSauvegarde({
        stockage,
        // À l'import, une carte absente de toutes les vagues est refusée.
        contexte: contexteSauvegarde(true),
        lire: () => sauvegarde,
        remplacer: (s) => {
          sauvegarde = s;
          annonce = 'Sauvegarde importée.';
          afficher();
        },
        avertissement,
      });
      // L'avertissement de stockage est aussi montré sur l'accueil (le panneau de sauvegarde est dans Paramètres).
      const messages = [annonce, avertissement].filter((m): m is string => !!m).join(' ');
      const maintenant = new Date();
      app.replaceChildren(creerHub({
        sauvegarde, booster: courante.booster, extension: courante.extension,
        sourcesDraft,
        lancements: vueLancements(sauvegarde, vaguesAvecCalendrier(catalogue), configQuetes, maintenant),
        popularite: pop, themes, maintenant,
        annonce: messages || null, onOuvrir: ouvrirBooster,
        onRevelerNonVue: nonVue ? () => mettreEnScene(nonVue) : null,
        panneauSauvegarde: panneau,
        quetes: vueQuetes(sauvegarde, contexteQuetes()), onReclamer: reclamerQuete,
        compte,
      }));
      annonce = null;
      avertissement = null;
    }
    window.scrollTo(0, 0);
  }

  verifierConnexion();

  // ---------- Compte et sauvegarde en ligne (facultatif) ----------
  const config = configSupabase();
  if (config) {
    /** Vrai pendant l'envoi fait au départ de la page (requête « keepalive »). */
    const depart = { enCours: false };
    const supabase = creerServeurSupabase(config, depart);
    const c = creerCompte({
      serveur: serveurDiffere(supabase),
      stockage: navigateur,
      horloge: { maintenant: () => Date.now(), programmer: (f, ms) => setTimeout(f, ms), annuler: (id) => clearTimeout(id as number) },
      lireLocale: () => sauvegarde,
      // Sauvegarde du compte reprise sur cet appareil : écrite d'un bloc, puis récompense du jour si elle n'y est pas encore.
      remplacerLocale: (s) => {
        const r = enregistrerSauvegarde(stockage, s);
        if (!r.ok) return false;
        sauvegarde = s;
        const gain = verifierConnexion() ? annonce : null;
        annonce = ['Sauvegarde de ton compte chargée sur cet appareil.', gain].filter(Boolean).join(' ');
        if (location.hash !== '#/ouverture') afficher();
        return true;
      },
      validerEnLigne: (donnees) => validerSauvegarde(donnees, contexteSauvegarde(true)),
      enLigne: () => navigator.onLine,
    });
    compte = c;
    serveurClassement = classementDiffere(supabase);
    const enLigne = creerDraftEnLigne({ serveur: serveurClassement, compte: c, lire: () => sauvegarde, enregistrer: (s) => enregistrer(s) });
    draftEnLigne = enLigne;
    // À chaque connexion : l'équipe de la semaine part au classement, et les récompenses des semaines fermées arrivent.
    let statut: string | null = null;
    c.abonner((e) => {
      if (e.statut === statut) return;
      statut = e.statut;
      if (e.statut !== 'connecte') return;
      void enLigne.envoyer();
      void enLigne.reclamer().then((m) => {
        if (!m) return;
        annonce = m;
        const ecran = location.hash.replace(/^#\/?/, '').split('/')[0];
        if (ecran === '' || ecran === 'quetes') afficher();
      });
    });
    const partir = (): void => {
      depart.enCours = true;
      void c.vider().finally(() => { depart.enCours = false; });
    };
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') partir(); });
    window.addEventListener('pagehide', partir);
    window.addEventListener('online', () => { c.reseauRetabli(); void enLigne.envoyer(); });
    installerDialoguesCompte(c);
    void c.demarrer();
  }

  window.addEventListener('hashchange', afficher);
  // Page restée ouverte après minuit : la récompense du nouveau jour (et une vague qui sort) arrive au retour sur l'onglet.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !verifierConnexion()) return;
    const ecran = location.hash.replace(/^#\/?/, '').split('/')[0];
    if (ecran === '' || ecran === 'quetes') afficher();
  });
  afficher();
}

// Les données sont vérifiées avant tout : une seule erreur empêche le jeu de démarrer.
const erreurs = erreursCatalogue.length > 0
  ? erreursCatalogue
  : [...validerJeu(catalogue, { base: basePopularite, fichier: populariteJson }, themes, new Date()), ...validerConfigQuetes(configQuetes)];
if (erreurs.length > 0) afficherErreursDonnees(app, erreurs);
else demarrer();
