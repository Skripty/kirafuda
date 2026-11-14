// Écran Combat : choix du deck et du défi, puis le tapis de jeu.
// Tapis : l'adversaire en haut, le joueur en bas, sa main en éventail ; sur ordinateur, le journal à gauche et la
// carte choisie (en grand, avec ses actions) à droite. Les cartes se jouent en les touchant (le panneau propose les
// actions) ou en les faisant glisser sur leur cible ; chaque glissé a son équivalent par bouton.
// L'écran ne décide de rien : il n'offre que les actions légales données par le moteur (src/core/combat/moteur.ts),
// et les animations (src/ui/combat-animations.ts) ne font que montrer le passage d'un état à l'autre.
import './combat.css';
import type { Bibliotheque, Deck, Partie, PersoEnJeu } from '../core/combat/etat';
import { DECKS_DEPART, DEFIS_COMBAT } from '../core/combat/defis';
import { deckStandard } from '../core/combat/decks';
import { exemplairesParPersonnage, validerDeckPossede } from '../core/combat/decks-joueur';
import { iaNormale } from '../core/combat/ia';
import { actionsLegales, appliquer, creerPartie, type Action, type Evenement } from '../core/combat/moteur';
import { rngAGraine, rngSecurise } from '../core/rng';
import { ELEMENTS } from '../core/regles';
import type { CodeEnergie, DeckEnregistre, ElementId, Extension, ProgressionCombat, Sauvegarde } from '../core/types';
import { creerVisuelsCombat } from './cartes-combat';
import { animerTransition, capturer, type Capture } from './combat-animations';
import { iconeElement } from './element';

const ELEMENT_DU_CODE: Record<CodeEnergie, ElementId> = { f: 'feu', e: 'eau', g: 'glace', z: 'foudre', v: 'vent', t: 'terre', l: 'lumiere', n: 'tenebres', q: 'neutre' };
const TYPES: Record<string, string> = { base: 'Base', eveille: 'Éveillé', heros: 'Héros', objet: 'Objet', soutien: 'Soutien', terrain: 'Terrain' };
const ETATS: Record<string, string> = { brulure: 'Brûlé', gel: 'Gelé', etourdi: 'Étourdi', malediction: 'Maudit' };
const PLACES_BANC = 3;
/** Pause minimale entre deux actions de l'IA (ms), en plus de la durée des animations. */
const PAUSE_IA = 450;
type ActionDe<T extends Action['type']> = Extract<Action, { type: T }>;
type ActionDeMain = ActionDe<'poser'> | ActionDe<'releve'> | ActionDe<'jouer'>;

export interface OptionsCombat {
  sauvegarde: Sauvegarde;
  bib: Bibliotheque;
  extensions: Extension[];
  enregistrer: (sauvegarde: Sauvegarde) => Sauvegarde | null;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, classe?: string, texte?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (classe) node.className = classe;
  if (texte !== undefined) node.textContent = texte;
  return node;
}

function bouton(texte: string, classe: string, action: () => void): HTMLButtonElement {
  const b = el('button', classe, texte);
  b.type = 'button';
  b.addEventListener('click', action);
  return b;
}

function nouvelleGraine(): string {
  const rng = rngSecurise();
  return Array.from({ length: 4 }, () => rng.entier(0x1_0000_0000).toString(16).padStart(8, '0')).join('-');
}

/** Coût d'une attaque en icônes d'énergie (◇ = énergie quelconque). */
function coutEnIcones(cout: CodeEnergie[]): HTMLElement {
  const groupe = el('span', 'combat-cout');
  groupe.setAttribute('aria-label', `Coût : ${cout.map((c) => (c === 'q' ? 'énergie quelconque' : ELEMENTS[ELEMENT_DU_CODE[c]].nom)).join(', ') || 'gratuit'}`);
  for (const c of cout) groupe.append(iconeElement(ELEMENT_DU_CODE[c], 'combat-cout-icone', null));
  return groupe;
}

/** Énergies qui manquent pour payer un coût. */
function coutManquant(energies: ElementId[], cout: CodeEnergie[]): string[] {
  const reste = [...energies];
  const manque: string[] = [];
  for (const code of cout) {
    if (code === 'q') continue;
    const i = reste.indexOf(ELEMENT_DU_CODE[code]);
    if (i < 0) manque.push(ELEMENTS[ELEMENT_DU_CODE[code]].nom);
    else reste.splice(i, 1);
  }
  const quelconques = cout.filter((c) => c === 'q').length - reste.length;
  for (let i = 0; i < quelconques; i++) manque.push('une énergie');
  return manque;
}

/** Précision d'une action à choix : la cible, la carte, l'échange… */
function texteChoix(action: Action, bib: Bibliotheque, partie: Partie): string {
  if (!('choix' in action)) return '';
  const choix = action.choix;
  const nomCarte = (uid: string): string => bib.personnages.get(partie.cartes[uid]!)?.nom ?? bib.soutiens.get(partie.cartes[uid]!)?.nom ?? 'une carte';
  const enJeu = partie.joueurs.flatMap((j) => [...(j.actif ? [j.actif] : []), ...j.banc]);
  const morceaux: string[] = [];
  if (choix.cible) {
    const perso = enJeu.find((p) => p.uid === choix.cible);
    if (perso) morceaux.push(`sur ${bib.personnages.get(perso.id)?.nom ?? 'un personnage'}`);
  }
  if (choix.carte) morceaux.push(nomCarte(choix.carte));
  if (choix.defausse) morceaux.push(`défausser ${nomCarte(choix.defausse)}`);
  if (choix.echange) {
    const perso = enJeu.find((p) => p.uid === choix.echange);
    morceaux.push(`puis échanger avec ${perso ? bib.personnages.get(perso.id)?.nom : 'le banc'}`);
  } else if (action.type === 'attaquer' && bib.personnages.get(partie.joueurs[action.joueur].actif?.id ?? '')?.attaques[action.attaque]?.effets?.some((e) => e.type === 'echange-soi')) {
    morceaux.push('sans échanger');
  }
  if (choix.copie !== undefined) {
    const adverse = partie.joueurs[action.joueur === 0 ? 1 : 0].actif;
    morceaux.push(`copier ${adverse ? bib.personnages.get(adverse.id)?.attaques[choix.copie]?.nom ?? 'une attaque' : 'une attaque'}`);
  }
  if (choix.garder !== undefined) {
    const uid = partie.joueurs[action.joueur].deck[choix.garder];
    morceaux.push(`garder ${uid ? nomCarte(uid) : `la carte ${choix.garder + 1}`}`);
  }
  if (choix.dessous !== undefined) morceaux.push(choix.dessous ? 'la mettre sous le deck' : 'la laisser dessus');
  if (choix.ordre) morceaux.push(`ordre ${choix.ordre.map((i) => { const uid = partie.joueurs[action.joueur].deck[i]; return uid ? nomCarte(uid) : String(i + 1); }).join(' › ')}`);
  return morceaux.join(' · ');
}

/** Fin de partie : le dernier état reste affiché derrière l'écran de victoire ou de défaite. */
interface FinDePartie { partie: Partie; defiId: string; journalIA: string[]; victoire: boolean; texte: string }

export function creerEcranCombat(options: OptionsCombat): HTMLElement {
  const { bib } = options;
  let sauvegarde = options.sauvegarde;
  let message: string | null = null;
  let dernierJournal: Evenement[] = [];
  /** Carte choisie par le joueur (uid, en jeu ou en main) : ses détails et ses actions sont affichés. */
  let selection: string | null = null;
  let choixActif: string | null = null;
  let choixBanc: string[] = [];
  let miseEnPlacePrete = false;
  let afficherMenu = false;
  let iaEnCours = false;
  let fin: FinDePartie | null = null;
  /** Transition à animer au prochain affichage (positions d'avant, état d'avant). */
  let transition: { avant: Capture; partieAvant: Partie | null; journal: Evenement[] } | null = null;
  let dureeAnimation = 0;
  const root = el('main', 'combat-page');
  const fx = el('div', 'combat-fx');
  fx.setAttribute('aria-hidden', 'true');
  const choisirIA = iaNormale();
  const visuels = creerVisuelsCombat(bib, options.extensions);
  const possedeesParPersonnage = exemplairesParPersonnage(sauvegarde, options.extensions);
  const possedees = new Set<string>([
    ...[...bib.personnages.keys()].filter((id) => (possedeesParPersonnage.get(id) ?? 0) > 0),
    ...[...bib.soutiens.keys()].filter((id) => (sauvegarde.collection[id] ?? 0) > 0),
  ]);
  const decksUtilisables = (): DeckEnregistre[] => sauvegarde.decks.filter((d) => validerDeckPossede(d, bib, possedees).length === 0);
  let deckChoisi = sauvegarde.deckSelectionne && decksUtilisables().some((d) => d.id === sauvegarde.deckSelectionne)
    ? `deck:${sauvegarde.deckSelectionne}` : `depart:${DECKS_DEPART[0]!.id}`;
  const survolPossible = typeof matchMedia === 'function' && matchMedia('(hover: hover) and (min-width: 1100px)').matches;

  const idDe = (partie: Partie, uid: string): string => partie.cartes[uid]!;
  const ficheDe = (perso: PersoEnJeu) => bib.personnages.get(perso.id)!;
  const enJeuDe = (partie: Partie, j: 0 | 1): PersoEnJeu[] => { const J = partie.joueurs[j]; return [...(J.actif ? [J.actif] : []), ...J.banc]; };

  // ---------- Sauvegarde et déroulement ----------
  function enregistrerCombat(combat: ProgressionCombat, sceaux = sauvegarde.sceaux): boolean {
    const resultat = options.enregistrer({ ...sauvegarde, sceaux, combat });
    if (!resultat) { message = 'La sauvegarde du combat a échoué. Réessaie après avoir vérifié ton stockage.'; return false; }
    sauvegarde = resultat;
    return true;
  }

  const session = (): NonNullable<ProgressionCombat['enCours']> | null => sauvegarde.combat.enCours;
  const tourIA = (partie: Partie): boolean => partie.phase !== 'fin' && actionsLegales(partie, bib)[0]?.joueur === 1;

  function mettreAJourPartie(partie: Partie, journalIA: string[], journal: Evenement[]): void {
    dernierJournal = journal;
    const enCours = session();
    if (!enCours) return;
    if (partie.phase === 'fin') {
      const victoire = partie.gagnant === 0;
      const dejaGagne = sauvegarde.combat.defisGagnes.includes(enCours.defiId);
      const defisGagnes = victoire && !dejaGagne ? [...sauvegarde.combat.defisGagnes, enCours.defiId] : sauvegarde.combat.defisGagnes;
      const gain = victoire && !dejaGagne ? 2 : 0;
      const texte = victoire
        ? gain > 0 ? 'Défi gagné : +2 sceaux.' : 'La récompense de ce défi a déjà été reçue.'
        : 'L’IA remporte la partie. Tu peux retenter ce défi.';
      selection = null;
      fin = { partie, defiId: enCours.defiId, journalIA, victoire, texte };
      enregistrerCombat({ defisGagnes, enCours: null }, sauvegarde.sceaux + gain);
      afficher();
      return;
    }
    enregistrerCombat({ ...sauvegarde.combat, enCours: { ...enCours, partie, journalIA } });
    afficher();
  }

  function faireAction(partie: Partie, action: Action): void {
    const enCours = session();
    if (!enCours) return;
    try {
      const avant = capturer(root);
      const resultat = appliquer(partie, action, bib);
      const journalIA = [...enCours.journalIA, ...resultat.journal.map((e) => e.texte)].slice(-40);
      message = null;
      // La carte choisie reste affichée si elle est encore en jeu ; une carte jouée depuis la main ne l'est plus.
      if (selection && !enJeuDe(resultat.partie, 0).some((p) => p.uid === selection) && !enJeuDe(resultat.partie, 1).some((p) => p.uid === selection)) selection = null;
      transition = { avant, partieAvant: partie, journal: resultat.journal };
      mettreAJourPartie(resultat.partie, journalIA, resultat.journal);
    } catch (erreur) {
      message = erreur instanceof Error ? erreur.message : 'Cette action n’a pas pu être jouée.';
      afficher();
    }
  }

  function programmerIA(): void {
    if (iaEnCours || afficherMenu || !root.isConnected) return;
    const actuel = session();
    if (!actuel || !tourIA(actuel.partie)) return;
    iaEnCours = true;
    const jouer = (): void => {
      const enCours = session();
      if (!root.isConnected || afficherMenu || !enCours || !tourIA(enCours.partie)) { iaEnCours = false; return; }
      faireAction(enCours.partie, choisirIA(enCours.partie, bib));
      const suivante = session();
      if (suivante && tourIA(suivante.partie) && root.isConnected) window.setTimeout(jouer, dureeAnimation + PAUSE_IA);
      else iaEnCours = false;
    };
    window.setTimeout(jouer, dureeAnimation + PAUSE_IA + 150);
  }

  function afficher(): void {
    root.replaceChildren();
    const enCours = session();
    const enJeu = !afficherMenu && (!!enCours || !!fin);
    root.classList.toggle('en-partie', enJeu);
    if (enCours && !afficherMenu) afficherPartie(enCours.partie, enCours.defiId, enCours.journalIA);
    else if (fin && !afficherMenu) afficherPartie(fin.partie, fin.defiId, fin.journalIA);
    else afficherDefis();
    root.append(fx);
    ajusterMain();
    dureeAnimation = 0;
    const partieAffichee = enCours?.partie ?? fin?.partie ?? null;
    if (transition && enJeu && partieAffichee) {
      const { avant, partieAvant, journal } = transition;
      dureeAnimation = animerTransition({
        racine: root, fx, avant, partieAvant, partieApres: partieAffichee, journal,
        visuel: (id) => visuels.visuel(id),
        ratioAvant: (uid) => {
          const p = partieAvant && [...enJeuDe(partieAvant, 0), ...enJeuDe(partieAvant, 1)].find((x) => x.uid === uid);
          return p ? Math.max(0, ficheDe(p).pv - p.degats) / ficheDe(p).pv : null;
        },
      });
    }
    transition = null;
    // L'écran de fin attend la fin des animations du dernier coup.
    const ecranFin = root.querySelector<HTMLElement>('.combat-fin');
    if (ecranFin) ecranFin.style.animationDelay = `${dureeAnimation}ms`;
    programmerIA();
  }

  /** Les cartes de la main se chevauchent pour toujours tenir sur la largeur, sans défilement. */
  function ajusterMain(): void {
    const conteneur = root.querySelector<HTMLElement>('.combat-main-cartes');
    if (!conteneur) return;
    const cartes = [...conteneur.children] as HTMLElement[];
    if (cartes.length < 2) return;
    const largeur = conteneur.clientWidth;
    const carte = cartes[0]!.offsetWidth;
    const espace = Math.min(10, (largeur - cartes.length * carte) / (cartes.length - 1));
    conteneur.style.setProperty('--ecart-main', `${espace.toFixed(1)}px`);
  }

  // ---------- Défis ----------
  function deckSelectionne(): Deck | null {
    if (deckChoisi.startsWith('deck:')) {
      const enregistre = decksUtilisables().find((d) => d.id === deckChoisi.slice(5));
      return enregistre ? { nom: enregistre.nom, cartes: [...enregistre.cartes], elements: [...enregistre.elements] } : null;
    }
    const depart = DECKS_DEPART.find((d) => `depart:${d.id}` === deckChoisi) ?? DECKS_DEPART[0]!;
    return { nom: depart.nom, cartes: [...depart.cartes], elements: [...depart.elements] };
  }

  /** Trois cartes d'un deck, en éventail. */
  function eventail(cartes: string[]): HTMLElement {
    const groupe = el('span', 'combat-eventail');
    const distinctes = [...new Set(cartes.filter((id) => bib.personnages.has(id)))].slice(0, 3);
    distinctes.forEach((id, i) => {
      const c = el('span', `combat-eventail-carte pos-${i}`);
      c.append(visuels.visuel(id));
      groupe.append(c);
    });
    return groupe;
  }

  function afficherDefis(): void {
    const enTete = el('header', 'combat-entete');
    const retour = el('a', 'combat-retour', '‹ Accueil');
    retour.href = '#/';
    enTete.append(retour, el('h1', undefined, 'Combat'), el('p', 'combat-intro', 'Choisis ton deck, puis un défi. Le premier à 3 points gagne.'));
    root.append(enTete);
    if (message) {
      const alerte = el('p', 'combat-annonce', message);
      alerte.setAttribute('role', 'status');
      root.append(alerte);
    }

    const partieEnCours = session();
    if (partieEnCours) {
      const defiEnCours = DEFIS_COMBAT.find((d) => d.id === partieEnCours.defiId);
      const reprendre = el('aside', 'combat-reprise');
      reprendre.append(el('strong', undefined, `Partie en cours${defiEnCours ? ` · ${defiEnCours.nom}` : ''}`),
        bouton('Reprendre', 'combat-bouton principal', () => { afficherMenu = false; message = null; afficher(); }),
        bouton('Abandonner', 'combat-bouton', () => {
          if (!window.confirm('Abandonner la partie en cours ?')) return;
          enregistrerCombat({ ...sauvegarde.combat, enCours: null });
          afficherMenu = false;
          message = null;
          afficher();
        }));
      root.append(reprendre);
    }

    // Deck : une tuile par deck jouable (decks de départ, puis decks du joueur prêts).
    const zoneDecks = el('section', 'combat-section');
    const teteDecks = el('div', 'combat-section-tete');
    const gerer = el('a', 'combat-bouton', 'Mes decks');
    gerer.href = '#/decks';
    teteDecks.append(el('h2', undefined, 'Ton deck'), gerer);
    const decks = el('div', 'combat-decks');
    decks.setAttribute('role', 'radiogroup');
    decks.setAttribute('aria-label', 'Deck utilisé');
    const propositions: { valeur: string; nom: string; detail: string; cartes: string[]; elements: ElementId[] }[] = [
      ...DECKS_DEPART.map((d) => ({ valeur: `depart:${d.id}`, nom: d.nom.replace(/^Deck de départ · /, ''), detail: 'Deck de départ', cartes: d.cartes, elements: d.elements })),
      ...decksUtilisables().map((d) => ({ valeur: `deck:${d.id}`, nom: d.nom, detail: 'Ton deck', cartes: d.cartes, elements: d.elements })),
    ];
    if (!propositions.some((p) => p.valeur === deckChoisi)) deckChoisi = propositions[0]!.valeur;
    for (const p of propositions) {
      const tuile = bouton('', 'combat-deck', () => {
        deckChoisi = p.valeur;
        const resultat = options.enregistrer({ ...sauvegarde, deckSelectionne: p.valeur.startsWith('deck:') ? p.valeur.slice(5) : null });
        if (resultat) sauvegarde = resultat;
        afficher();
      });
      tuile.setAttribute('role', 'radio');
      tuile.setAttribute('aria-checked', String(deckChoisi === p.valeur));
      const energies = el('span', 'combat-deck-energies');
      for (const e of p.elements) energies.append(iconeElement(e, 'combat-deck-energie'));
      const infos = el('span', 'combat-deck-infos');
      infos.append(el('strong', undefined, p.nom), el('span', undefined, p.detail), energies);
      tuile.append(eventail(p.cartes), infos);
      decks.append(tuile);
    }
    zoneDecks.append(teteDecks, decks);

    const zoneDefis = el('section', 'combat-section');
    zoneDefis.append(el('h2', undefined, 'Défis'));
    const liste = el('div', 'combat-defis');
    for (const defi of DEFIS_COMBAT) {
      const gagne = sauvegarde.combat.defisGagnes.includes(defi.id);
      const ici = partieEnCours?.defiId === defi.id;
      const carte = el('article', `combat-defi${gagne ? ' gagne' : ''}`);
      // Le visage du défi : le personnage le plus solide de la série.
      const tete = [...bib.personnages.values()].filter((p) => p.serie === defi.serie).sort((a, b) => b.pv - a.pv)[0];
      const art = el('div', 'combat-defi-art');
      if (tete) art.append(visuels.visuel(tete.id));
      const texte = el('div', 'combat-defi-texte');
      const lancer = bouton(ici ? 'Reprendre' : gagne ? 'Rejouer' : 'Affronter', 'combat-bouton principal', () => {
        if (ici) { afficherMenu = false; message = null; afficher(); } else if (!partieEnCours) lancerDefi(defi.id);
      });
      lancer.disabled = !!partieEnCours && !ici;
      texte.append(el('h3', undefined, defi.nom), el('p', undefined, `Deck ${defi.serie}`),
        el('span', gagne ? 'combat-recompense gagnee' : 'combat-recompense', gagne ? 'Gagné' : '+2 sceaux à la première victoire'), lancer);
      carte.append(art, texte);
      liste.append(carte);
    }
    zoneDefis.append(liste);
    root.append(zoneDecks, zoneDefis);
  }

  function lancerDefi(defiId: string): void {
    const defi = DEFIS_COMBAT.find((d) => d.id === defiId);
    if (!defi) return;
    const deckJoueur = deckSelectionne();
    const deckIA = deckStandard(defi.serie, bib, rngAGraine(`deck-defi:${defi.id}`));
    if (!deckJoueur || !deckIA) { message = `Le deck choisi ou le deck du défi « ${defi.nom} » ne peut pas être créé.`; afficher(); return; }
    // Le nom du joueur sert dans le journal : « Toi pioche 1 carte », « IA pioche 1 carte ».
    const partie = creerPartie(bib, [{ ...deckJoueur, nom: 'Toi' }, { ...deckIA, nom: 'IA' }], nouvelleGraine());
    choixActif = null;
    choixBanc = [];
    miseEnPlacePrete = false;
    selection = null;
    afficherMenu = false;
    fin = null;
    dernierJournal = partie.journal;
    message = null;
    transition = { avant: capturer(root), partieAvant: null, journal: partie.journal };
    if (enregistrerCombat({ ...sauvegarde.combat, enCours: { defiId, partie: partie.partie, journalIA: partie.journal.map((e) => e.texte), deckJoueur: { ...deckJoueur } } })) afficher();
  }

  // ---------- Partie ----------
  function afficherPartie(partie: Partie, defiId: string, journalIA: string[]): void {
    const defi = DEFIS_COMBAT.find((d) => d.id === defiId);
    if (!defi) {
      root.append(el('h1', undefined, 'Défi indisponible'), bouton('Retour aux défis', 'combat-bouton principal', () => {
        enregistrerCombat({ ...sauvegarde.combat, enCours: null });
        afficher();
      }));
      return;
    }
    const actions = partie.phase === 'fin' ? [] : actionsLegales(partie, bib);
    const aMoi = actions[0]?.joueur === 0;

    const barre = el('header', 'combat-barre');
    const titre = el('div', 'combat-barre-titre');
    titre.append(el('strong', undefined, `Défi · ${defi.nom}`), el('span', undefined,
      partie.phase === 'jeu' ? `Tour ${partie.tour} · ${partie.joueurActif === 0 ? 'à toi' : 'à l’IA'}`
        : partie.phase === 'mise-en-place' ? 'Mise en place' : partie.phase === 'fin' ? 'Partie terminée' : 'Pile ou face'));
    barre.append(bouton('‹ Défis', 'combat-bouton', () => { afficherMenu = true; fin = null; message = null; afficher(); }), titre);

    const miseEnPlace = partie.phase === 'mise-en-place' && aMoi
      ? actions.filter((a): a is ActionDe<'mise-en-place'> => a.type === 'mise-en-place') : null;
    if (miseEnPlace) preparerMiseEnPlace(partie);

    const jeu = el('div', 'combat-jeu');
    const gauche = el('aside', 'combat-gauche');
    const tapis = el('section', 'combat-tapis');
    tapis.setAttribute('aria-label', 'Tapis de jeu');
    tapis.dataset.drop = 'tapis';
    const droite = el('aside', 'combat-droite');
    const cachee = partie.phase !== 'jeu' && partie.phase !== 'fin';
    tapis.append(camp(partie, 1, actions, cachee), centre(partie, aMoi), miseEnPlace ? campMiseEnPlace(partie) : camp(partie, 0, actions, false));
    tapis.append(miseEnPlace ? mainMiseEnPlace(partie) : main(partie, actions, aMoi));
    gauche.append(panneauJournal(journalIA));
    if (miseEnPlace) {
      const action = miseEnPlace.find((a) => a.actif === choixActif && a.banc.length === choixBanc.length && a.banc.every((uid) => choixBanc.includes(uid)));
      const commande = el('footer', 'combat-commande');
      const valider = bouton('Commencer le combat', 'combat-bouton principal grand', () => { if (action) faireAction(partie, action); });
      valider.disabled = !action;
      commande.append(el('p', 'combat-consigne', choixActif
        ? 'Touche une carte de ta main pour la mettre sur le banc ; touche une carte posée pour la reprendre.'
        : 'Choisis ton personnage actif : touche une carte de ta main.'), valider);
      droite.append(panneauAide(), commande);
    } else {
      droite.append(panneauSelection(partie, actions, aMoi), commande(partie, actions, aMoi));
    }
    jeu.append(gauche, tapis, droite);
    root.append(barre, jeu);
    if (!miseEnPlace && partie.phase !== 'fin') activerGlisser(partie, actions, aMoi);
    if (fin) root.append(ecranFin(fin));
  }

  // ----- Camps -----
  function points(n: number, j: 0 | 1): HTMLElement {
    const groupe = el('span', 'combat-points');
    groupe.dataset.anim = `points:${j}`;
    groupe.setAttribute('role', 'img');
    groupe.setAttribute('aria-label', `${j === 0 ? 'Toi' : 'IA'} : ${n} point${n > 1 ? 's' : ''} sur 3`);
    for (let i = 0; i < 3; i++) groupe.append(el('i', i < n ? 'marque' : undefined));
    return groupe;
  }

  function dos(libelle: string, classe = 'combat-dos'): HTMLElement {
    const d = el('div', classe);
    d.setAttribute('role', 'img');
    d.setAttribute('aria-label', libelle);
    d.append(el('span', undefined, 'K'));
    return d;
  }

  function bandeau(partie: Partie, index: 0 | 1): HTMLElement {
    const J = partie.joueurs[index];
    const b = el('div', 'combat-bandeau');
    b.append(el('strong', 'combat-bandeau-nom', index === 0 ? 'Toi' : 'IA'), points(J.points, index));
    if (index === 1) {
      // La main de l'IA : des dos de cartes (on voit combien elle en a, jamais lesquelles).
      const mainIA = el('span', 'combat-main-ia');
      mainIA.dataset.anim = 'main-ia';
      mainIA.setAttribute('aria-label', `Main de l’IA : ${J.main.length} carte${J.main.length > 1 ? 's' : ''}`);
      for (let i = 0; i < Math.min(J.main.length, 10); i++) mainIA.append(el('i'));
      mainIA.append(el('b', undefined, String(J.main.length)));
      b.append(mainIA);
    }
    return b;
  }

  /** Zone d'un joueur : énergie du tour, deck et défausse. */
  function zone(partie: Partie, index: 0 | 1): HTMLElement {
    const J = partie.joueurs[index];
    const z = el('div', 'combat-zone');
    const energie = el('div', `combat-orbe${J.energie ? ' pleine' : ''}`);
    energie.dataset.anim = `energie:${index}`;
    if (J.energie) {
      energie.append(iconeElement(J.energie, 'combat-orbe-icone', null));
      energie.setAttribute('aria-label', `${index === 0 ? 'Ton' : 'Son'} énergie du tour : ${ELEMENTS[J.energie].nom}`);
      if (index === 0 && partie.phase === 'jeu' && partie.joueurActif === 0 && !J.tour.energieAttachee) {
        energie.dataset.glisse = 'energie';
        energie.title = 'Glisse l’énergie sur un de tes personnages (ou touche « + » sur la carte)';
      }
    } else energie.setAttribute('aria-label', J.tour.energieAttachee ? 'Énergie déjà attachée ce tour' : 'Pas d’énergie ce tour');
    energie.setAttribute('role', 'img');
    const legende = el('span', 'combat-orbe-legende', J.energie ? 'Énergie' : J.tour.energieAttachee ? 'Attachée' : '—');
    const piles = el('div', 'combat-piles');
    const deck = el('div', 'combat-pile');
    deck.dataset.anim = `pile:deck:${index}`;
    deck.setAttribute('aria-label', `Deck : ${J.deck.length} carte${J.deck.length > 1 ? 's' : ''}`);
    deck.append(dos('', 'combat-pile-dos'), el('b', undefined, String(J.deck.length)));
    const defausse = el('div', 'combat-pile defausse');
    defausse.dataset.anim = `pile:defausse:${index}`;
    defausse.setAttribute('aria-label', `Défausse : ${J.defausse.length} carte${J.defausse.length > 1 ? 's' : ''}`);
    const dessus = J.defausse[J.defausse.length - 1];
    if (dessus) { const v = el('div', 'combat-pile-face'); v.append(visuels.visuel(idDe(partie, dessus))); defausse.append(v); }
    else defausse.append(el('div', 'combat-pile-vide'));
    defausse.append(el('b', undefined, String(J.defausse.length)));
    piles.append(deck, defausse);
    z.append(energie, legende, piles);
    return z;
  }

  /** Un personnage en jeu : sa carte, ses PV, ses énergies, ses états. */
  function unite(partie: Partie, perso: PersoEnJeu, index: 0 | 1, actions: Action[], role: 'actif' | 'banc'): HTMLElement {
    const fiche = ficheDe(perso);
    const pv = Math.max(0, fiche.pv - perso.degats);
    const cadre = el('div', `combat-case ${role}`);
    const nouvelActif = index === 0 ? actions.find((a): a is ActionDe<'nouvel-actif'> => a.type === 'nouvel-actif' && a.cible === perso.uid) : undefined;
    const carte = bouton('', `combat-unite${selection === perso.uid ? ' choisie' : ''}${nouvelActif ? ' appelee' : ''}`, () => {
      if (nouvelActif) { faireAction(partie, nouvelActif); return; }
      selection = selection === perso.uid ? null : perso.uid;
      afficher();
    });
    carte.dataset.anim = `carte:${perso.uid}`;
    carte.dataset.drop = `carte:${perso.uid}`;
    carte.dataset.carteId = perso.id;
    carte.setAttribute('aria-label', `${index === 0 ? 'Ton' : 'Son'} ${role} : ${fiche.nom}, ${pv} PV sur ${fiche.pv}${perso.energies.length ? `, ${perso.energies.length} énergie${perso.energies.length > 1 ? 's' : ''}` : ''}`
      + `${perso.etats.length ? `, ${perso.etats.map((e) => ETATS[e]).join(', ')}` : ''}${nouvelActif ? ' : le mettre en actif' : ''}`);
    carte.append(visuels.visuel(perso.id));
    const vie = el('span', `combat-pv${pv <= fiche.pv * 0.3 ? ' bas' : ''}`);
    const jauge = el('i');
    jauge.style.transform = `scaleX(${(pv / fiche.pv).toFixed(3)})`;
    vie.append(el('b', undefined, String(pv)), el('small', undefined, `/${fiche.pv}`), jauge);
    carte.append(vie);
    const energies = el('span', 'combat-energies');
    for (const e of perso.energies) energies.append(iconeElement(e, 'combat-energie-attachee', null));
    carte.append(energies);
    if (perso.etats.length) {
      const etats = el('span', 'combat-etats');
      for (const e of perso.etats) etats.append(el('span', `combat-etat ${e}`, ETATS[e]));
      carte.append(etats);
    }
    cadre.append(carte);
    // Énergie du tour : un bouton suffit pour l'attacher (équivalent du glissé).
    const attacher = index === 0 ? actions.find((a): a is ActionDe<'attacher'> => a.type === 'attacher' && a.cible === perso.uid) : undefined;
    const energie = partie.joueurs[0].energie;
    if (attacher && energie) {
      const b = bouton('', 'combat-attacher', () => faireAction(partie, attacher));
      b.setAttribute('aria-label', `Attacher l’énergie ${ELEMENTS[energie].nom} à ${fiche.nom}`);
      b.title = `Attacher l’énergie ${ELEMENTS[energie].nom}`;
      b.append(el('span', undefined, '+'), iconeElement(energie, 'combat-attacher-icone', null));
      cadre.append(b);
    }
    return cadre;
  }

  function placeVide(texte: string, role: 'actif' | 'banc'): HTMLElement {
    const cadre = el('div', `combat-case ${role}`);
    cadre.append(el('div', 'combat-place-vide', texte));
    return cadre;
  }

  function camp(partie: Partie, index: 0 | 1, actions: Action[], cachee: boolean): HTMLElement {
    const J = partie.joueurs[index];
    const section = el('section', `combat-camp ${index === 0 ? 'toi' : 'ia'}${partie.phase === 'jeu' && partie.joueurActif === index ? ' joue' : ''}`);
    section.setAttribute('aria-label', index === 0 ? 'Ton camp' : 'Camp de l’IA');
    const ligneActif = el('div', 'combat-ligne-actif');
    if (!J.actif) ligneActif.append(placeVide('Actif', 'actif'));
    else if (cachee && index === 1) { const c = el('div', 'combat-case actif'); c.append(dos('Actif de l’IA, face cachée')); ligneActif.append(c); }
    else ligneActif.append(unite(partie, J.actif, index, actions, 'actif'));
    const banc = el('div', 'combat-banc');
    if (index === 0) banc.dataset.drop = 'banc';
    for (let i = 0; i < PLACES_BANC; i++) {
      const perso = J.banc[i];
      if (!perso) banc.append(placeVide('Banc', 'banc'));
      else if (cachee && index === 1) { const c = el('div', 'combat-case banc'); c.append(dos('Carte du banc de l’IA, face cachée')); banc.append(c); }
      else banc.append(unite(partie, perso, index, actions, 'banc'));
    }
    section.append(bandeau(partie, index), zone(partie, index), ligneActif, banc);
    return section;
  }

  function centre(partie: Partie, aMoi: boolean): HTMLElement {
    const milieu = el('div', 'combat-centre');
    const tour = el('span', `combat-tour${aMoi ? ' a-moi' : ''}`,
      partie.phase === 'fin' ? (partie.gagnant === 0 ? 'Victoire' : 'Défaite')
        : partie.phase === 'mise-en-place' ? (aMoi ? 'Prépare ton équipe' : 'L’IA prépare son équipe…')
          : partie.phase === 'choix-premier' ? 'Pile ou face'
            : aMoi ? (partie.joueurActif === 0 ? 'À toi de jouer' : 'À toi de choisir') : 'L’IA joue…');
    milieu.append(tour);
    if (partie.terrain) {
      const t = bouton(`Terrain · ${visuels.nom(partie.terrain.id)}`, 'combat-terrain', () => inspecter(partie.terrain!.id));
      t.dataset.carteId = partie.terrain.id;
      milieu.append(t);
    }
    const dernier = dernierJournal.filter((e) => e.texte).slice(-1).map((e) => e.texte).join(' ');
    if (dernier) { const p = el('p', 'combat-dernier', dernier); p.setAttribute('aria-live', 'polite'); milieu.append(p); }
    return milieu;
  }

  // ----- Mise en place -----
  function candidats(partie: Partie): string[] {
    const vus = new Set<string>();
    return partie.joueurs[0].main.filter((uid) => {
      const p = bib.personnages.get(idDe(partie, uid));
      if (!p || p.type === 'eveille' || vus.has(p.id)) return false;
      vus.add(p.id);
      return true;
    });
  }

  function preparerMiseEnPlace(partie: Partie): void {
    const possibles = candidats(partie);
    if (choixActif && !possibles.includes(choixActif)) choixActif = null;
    choixBanc = choixBanc.filter((uid) => possibles.includes(uid) && uid !== choixActif).slice(0, PLACES_BANC);
    if (miseEnPlacePrete) return;
    // Proposition de départ : le plus de PV en actif, les autres sur le banc.
    choixActif = possibles.reduce<string | null>((best, uid) => (!best || (bib.personnages.get(idDe(partie, uid))?.pv ?? 0) > (bib.personnages.get(idDe(partie, best))?.pv ?? 0) ? uid : best), null);
    choixBanc = possibles.filter((uid) => uid !== choixActif).slice(0, PLACES_BANC);
    miseEnPlacePrete = true;
  }

  function campMiseEnPlace(partie: Partie): HTMLElement {
    const section = el('section', 'combat-camp toi joue');
    section.setAttribute('aria-label', 'Ton équipe de départ');
    const place = (uid: string | undefined, role: 'actif' | 'banc', libelle: string): HTMLElement => {
      if (!uid) return placeVide(libelle, role);
      const cadre = el('div', `combat-case ${role}`);
      const b = bouton('', 'combat-unite', () => {
        if (role === 'actif') choixActif = null; else choixBanc = choixBanc.filter((x) => x !== uid);
        transition = { avant: capturer(root), partieAvant: partie, journal: [] };
        afficher();
      });
      b.dataset.anim = `carte:${uid}`;
      b.dataset.carteId = idDe(partie, uid);
      b.setAttribute('aria-label', `${libelle} : ${visuels.nom(idDe(partie, uid))}. Toucher pour le reprendre en main.`);
      b.append(visuels.visuel(idDe(partie, uid)));
      cadre.append(b);
      return cadre;
    };
    const ligneActif = el('div', 'combat-ligne-actif');
    ligneActif.append(place(choixActif ?? undefined, 'actif', 'Actif'));
    const banc = el('div', 'combat-banc');
    for (let i = 0; i < PLACES_BANC; i++) banc.append(place(choixBanc[i], 'banc', 'Banc'));
    section.append(bandeau(partie, 0), zone(partie, 0), ligneActif, banc);
    return section;
  }

  function mainMiseEnPlace(partie: Partie): HTMLElement {
    const possibles = new Set(candidats(partie));
    const zoneMain = el('section', 'combat-main');
    zoneMain.setAttribute('aria-label', 'Ta main');
    const cartes = el('div', 'combat-main-cartes');
    for (const uid of partie.joueurs[0].main) {
      if (uid === choixActif || choixBanc.includes(uid)) continue;
      const id = idDe(partie, uid);
      const jouable = possibles.has(uid) && (!choixActif || choixBanc.length < PLACES_BANC);
      const b = bouton('', `combat-carte-main${jouable ? ' jouable' : ''}`, () => {
        if (!jouable) { inspecter(id); return; }
        if (!choixActif) choixActif = uid;
        else choixBanc = [...choixBanc, uid];
        transition = { avant: capturer(root), partieAvant: partie, journal: [] };
        afficher();
      });
      b.dataset.anim = `carte:${uid}`;
      b.dataset.carteId = id;
      b.setAttribute('aria-label', `${visuels.nom(id)}${jouable ? `, placer ${choixActif ? 'sur le banc' : 'en actif'}` : ', voir les détails'}`);
      b.append(visuels.visuel(id));
      cartes.append(b);
    }
    zoneMain.append(cartes);
    return zoneMain;
  }

  // ----- Main -----
  /** Actions légales d'une carte de la main (les exemplaires identiques partagent leurs actions). */
  function actionsDeMain(partie: Partie, actions: Action[], uid: string): ActionDeMain[] {
    const id = idDe(partie, uid);
    return actions.filter((a): a is ActionDeMain =>
      (a.type === 'poser' || a.type === 'releve' || a.type === 'jouer') && idDe(partie, a.carte) === id);
  }

  function main(partie: Partie, actions: Action[], aMoi: boolean): HTMLElement {
    const J = partie.joueurs[0];
    const zoneMain = el('section', 'combat-main');
    zoneMain.setAttribute('aria-label', `Ta main : ${J.main.length} carte${J.main.length > 1 ? 's' : ''}`);
    const cartes = el('div', 'combat-main-cartes');
    if (!J.main.length) cartes.append(el('p', 'combat-main-vide', 'Ta main est vide.'));
    for (const uid of J.main) {
      const id = idDe(partie, uid);
      const jouable = aMoi && actionsDeMain(partie, actions, uid).length > 0;
      const b = bouton('', `combat-carte-main${jouable ? ' jouable' : ''}${selection === uid ? ' choisie' : ''}`, () => {
        selection = selection === uid ? null : uid;
        afficher();
      });
      b.dataset.anim = `carte:${uid}`;
      b.dataset.carteId = id;
      if (jouable) b.dataset.glisse = `main:${uid}`;
      b.setAttribute('aria-label', `${visuels.nom(id)}${jouable ? ', jouable' : ''}`);
      b.append(visuels.visuel(id));
      cartes.append(b);
    }
    zoneMain.append(cartes);
    return zoneMain;
  }

  // ----- Glisser-déposer (chaque geste a son bouton : toucher la carte, puis l'action du panneau) -----
  function activerGlisser(partie: Partie, actions: Action[], aMoi: boolean): void {
    if (!aMoi) return;
    root.querySelectorAll<HTMLElement>('[data-glisse]').forEach((source) => {
      source.addEventListener('pointerdown', (depart) => {
        if (depart.button !== 0) return;
        const genre = source.dataset.glisse!;
        // Ce que la source peut faire, et où.
        const possibles: { action: Action; cible: string }[] = [];
        if (genre === 'energie') {
          for (const a of actions) if (a.type === 'attacher') possibles.push({ action: a, cible: `carte:${a.cible}` });
        } else {
          const uid = genre.slice(5);
          for (const a of actionsDeMain(partie, actions, uid)) {
            if (a.type === 'poser') possibles.push({ action: a, cible: 'banc' });
            else if (a.type === 'releve') possibles.push({ action: a, cible: `carte:${a.cible}` });
            else possibles.push({ action: a, cible: a.choix.cible ? `carte:${a.choix.cible}` : 'tapis' });
          }
        }
        if (!possibles.length) return;
        const x0 = depart.clientX;
        const y0 = depart.clientY;
        let flottant: HTMLElement | null = null;
        let survolee: HTMLElement | null = null;
        const cibles = new Set(possibles.map((p) => p.cible));
        const rect = source.getBoundingClientRect();
        const bouger = (e: PointerEvent): void => {
          const dx = e.clientX - x0;
          const dy = e.clientY - y0;
          if (!flottant) {
            if (Math.hypot(dx, dy) < 10) return;
            flottant = source.cloneNode(true) as HTMLElement;
            flottant.className = `combat-flottant ${source.className}`;
            Object.assign(flottant.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
            fx.append(flottant);
            source.classList.add('en-glisse');
            root.classList.add('glisse');
            root.querySelectorAll<HTMLElement>('[data-drop]').forEach((d) => { if (cibles.has(d.dataset.drop!)) d.classList.add('cible-possible'); });
          }
          flottant.style.transform = `translate(${dx}px, ${dy}px) rotate(${Math.max(-8, Math.min(8, dx * 0.03)).toFixed(1)}deg) scale(1.06)`;
          // La cible la plus proche qui convient : une carte du banc compte aussi comme « le banc », tout le tapis
          // comme « le tapis ».
          let valide: HTMLElement | null = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-drop]') ?? null;
          while (valide && !cibles.has(valide.dataset.drop!)) valide = valide.parentElement?.closest<HTMLElement>('[data-drop]') ?? null;
          if (valide !== survolee) { survolee?.classList.remove('cible-survolee'); valide?.classList.add('cible-survolee'); survolee = valide; }
        };
        const finir = (e: PointerEvent): void => {
          window.removeEventListener('pointermove', bouger);
          window.removeEventListener('pointerup', finir);
          window.removeEventListener('pointercancel', finir);
          if (!flottant) return; // simple toucher : le clic fait le reste
          e.preventDefault();
          // Le clic qui suit un glissé ne doit pas aussi choisir la carte.
          source.addEventListener('click', (c) => { c.stopImmediatePropagation(); c.preventDefault(); }, { capture: true, once: true });
          flottant.remove();
          source.classList.remove('en-glisse');
          root.classList.remove('glisse');
          root.querySelectorAll('.cible-possible, .cible-survolee').forEach((d) => d.classList.remove('cible-possible', 'cible-survolee'));
          const cible = survolee?.dataset.drop;
          const retenues = possibles.filter((p) => p.cible === cible);
          if (retenues.length === 1) faireAction(partie, retenues[0]!.action);
          else if (retenues.length > 1 && genre.startsWith('main:')) { selection = genre.slice(5); afficher(); } // plusieurs choix : le panneau les propose
        };
        window.addEventListener('pointermove', bouger);
        window.addEventListener('pointerup', finir);
        window.addEventListener('pointercancel', finir);
      });
    });
  }

  // ----- Détails et actions de la carte choisie -----
  function boutonAction(texte: string, detail: string, classe: string, action: () => void, cout?: CodeEnergie[]): HTMLButtonElement {
    const b = bouton('', `combat-action ${classe}`, action);
    const lignes = el('span', 'combat-action-texte');
    lignes.append(el('strong', undefined, texte));
    if (detail) lignes.append(el('small', undefined, detail));
    if (cout) b.append(coutEnIcones(cout));
    b.append(lignes);
    return b;
  }

  /** Boutons des attaques de l'actif du joueur : les légales, puis celles qui ne le sont pas, avec la raison. */
  function boutonsAttaques(partie: Partie, actions: Action[]): HTMLElement[] {
    const actif = partie.joueurs[0].actif;
    if (!actif) return [];
    const fiche = ficheDe(actif);
    const legales = actions.filter((a): a is ActionDe<'attaquer'> => a.type === 'attaquer');
    const resultat: HTMLElement[] = [];
    fiche.attaques.forEach((attaque, i) => {
      const variantes = legales.filter((a) => a.attaque === i);
      const degats = attaque.degats !== '' && attaque.degats !== undefined ? `${attaque.degats}` : '';
      const titre = `${attaque.nom}${degats ? ` · ${degats}` : ''}`;
      if (!variantes.length) {
        const manque = coutManquant(actif.energies, attaque.cout);
        const raison = partie.joueurActif !== 0 ? '' : manque.length ? `Il manque : ${manque.join(', ')}` : 'Indisponible ce tour';
        const b = boutonAction(titre, [attaque.effet, raison].filter(Boolean).join(' — '), 'attaque', () => undefined, attaque.cout);
        b.disabled = true;
        resultat.push(b);
        return;
      }
      for (const v of variantes) {
        const choix = texteChoix(v, bib, partie);
        resultat.push(boutonAction(titre, [variantes.length > 1 ? choix : '', attaque.effet].filter(Boolean).join(' — '), 'attaque', () => faireAction(partie, v), attaque.cout));
      }
    });
    return resultat;
  }

  /** Mise en place : rappel des règles à la place des actions. */
  function panneauAide(): HTMLElement {
    const panneau = el('section', 'combat-panneau ouvert-bureau');
    panneau.append(el('strong', 'combat-panneau-aide-titre', 'Mise en place'),
      el('p', 'combat-panneau-vide', 'Ton actif combat en premier ; ton banc (3 places) attend son tour. Seuls les Bases et les Héros se posent : les Éveillés arriveront par Relève sur un Base de leur série.'));
    return panneau;
  }

  function panneauSelection(partie: Partie, actions: Action[], aMoi: boolean): HTMLElement {
    const J = partie.joueurs[0];
    const panneau = el('section', 'combat-panneau');
    // Sans carte choisie : l'actif du joueur (ses attaques sont ce qu'on cherche le plus souvent).
    const uid = selection ?? J.actif?.uid ?? null;
    panneau.classList.toggle('ouvert', selection !== null);
    if (!uid) { panneau.append(el('p', 'combat-panneau-vide', 'Touche une carte pour voir ses détails.')); return panneau; }
    const enMain = J.main.includes(uid);
    const mien = enJeuDe(partie, 0).find((p) => p.uid === uid);
    const sien = enJeuDe(partie, 1).find((p) => p.uid === uid);
    const perso = mien ?? sien;
    const id = perso?.id ?? idDe(partie, uid);
    const fiche = bib.personnages.get(id);
    const soutien = bib.soutiens.get(id);

    const tete = el('div', 'combat-panneau-tete');
    const titre = el('div', 'combat-panneau-titre');
    titre.append(el('strong', undefined, visuels.nom(id)),
      el('span', undefined, fiche ? `${TYPES[fiche.type]} · ${fiche.serie}${sien ? ' · adversaire' : ''}` : soutien ? TYPES[soutien.type]! : ''));
    tete.append(titre);
    if (selection) tete.append(bouton('Fermer', 'combat-bouton petit', () => { selection = null; afficher(); }));
    const apercu = bouton('', 'combat-panneau-carte', () => inspecter(id));
    apercu.setAttribute('aria-label', `Agrandir la carte ${visuels.nom(id)}`);
    apercu.append(visuels.visuel(id));
    apercu.dataset.defaut = id;
    const infos = el('div', 'combat-panneau-infos');
    if (perso && fiche) {
      infos.append(el('p', undefined, `${Math.max(0, fiche.pv - perso.degats)} / ${fiche.pv} PV · Repli ${fiche.repli}`));
      if (perso.etats.length) infos.append(el('p', undefined, `États : ${perso.etats.map((e) => ETATS[e]).join(', ')}`));
      if (fiche.talent) infos.append(el('p', 'combat-panneau-talent', `Talent — ${fiche.talent.nom} : ${fiche.talent.texte}`));
    } else if (soutien) infos.append(el('p', undefined, soutien.texte));
    const haut = el('div', 'combat-panneau-haut');
    haut.append(apercu, infos);
    panneau.append(tete, haut);

    const liste = el('div', 'combat-actions');
    if (aMoi && enMain) {
      for (const a of actionsDeMain(partie, actions, uid)) {
        if (a.type === 'poser') liste.append(boutonAction('Poser sur le banc', '', 'jouer', () => faireAction(partie, a)));
        else if (a.type === 'releve') {
          const cible = enJeuDe(partie, 0).find((p) => p.uid === a.cible);
          liste.append(boutonAction(`Relever ${cible ? ficheDe(cible).nom : 'un personnage'}`, cible?.uid === J.actif?.uid ? 'Ton actif' : 'Sur ton banc', 'jouer', () => faireAction(partie, a)));
        } else liste.append(boutonAction('Jouer', texteChoix(a, bib, partie), 'jouer', () => faireAction(partie, a)));
      }
      if (!liste.childElementCount) liste.append(el('p', 'combat-panneau-vide', raisonInjouable(partie, id)));
    } else if (mien) {
      const estActif = J.actif?.uid === uid;
      if (estActif) liste.append(...boutonsAttaques(partie, aMoi ? actions : []));
      if (aMoi) {
        for (const a of actions) {
          if (a.type === 'talent' && a.source === uid) liste.append(boutonAction(`Talent · ${ficheDe(mien).talent?.nom ?? ''}`, texteChoix(a, bib, partie), 'talent', () => faireAction(partie, a)));
          else if (a.type === 'nouvel-actif' && a.cible === uid) liste.append(boutonAction('Mettre en actif', '', 'jouer', () => faireAction(partie, a)));
          else if (a.type === 'repli' && (a.cible === uid || estActif)) {
            const remplacant = J.banc.find((p) => p.uid === a.cible);
            liste.append(boutonAction(estActif ? `Se replier · ${remplacant ? ficheDe(remplacant).nom : ''} entre` : 'Mettre en actif (Repli)',
              `Coût du Repli : ${ficheDe(J.actif!).repli} énergie${ficheDe(J.actif!).repli > 1 ? 's' : ''} de ton actif`, 'repli', () => faireAction(partie, a)));
          } else if (a.type === 'releve' && a.cible === uid) {
            liste.append(boutonAction(`Relever en ${visuels.nom(idDe(partie, a.carte))}`, 'Depuis ta main', 'jouer', () => faireAction(partie, a)));
          }
        }
      }
      if (!liste.childElementCount) liste.append(el('p', 'combat-panneau-vide', aMoi ? 'Rien à faire avec ce personnage pour l’instant.' : 'Attends ton tour.'));
    } else if (sien && fiche) {
      for (const attaque of fiche.attaques) {
        const b = boutonAction(`${attaque.nom}${attaque.degats !== '' ? ` · ${attaque.degats}` : ''}`, attaque.effet, 'attaque', () => undefined, attaque.cout);
        b.disabled = true;
        liste.append(b);
      }
    }
    panneau.append(liste);
    // Ordinateur : survoler une carte l'affiche en grand dans le panneau, sans changer la sélection.
    if (survolPossible) {
      requestAnimationFrame(() => {
        root.querySelectorAll<HTMLElement>('[data-carte-id]').forEach((n) => {
          n.addEventListener('mouseenter', () => { if (!root.classList.contains('glisse')) apercu.replaceChildren(visuels.visuel(n.dataset.carteId!)); });
          n.addEventListener('mouseleave', () => apercu.replaceChildren(visuels.visuel(apercu.dataset.defaut!)));
        });
      });
    }
    return panneau;
  }

  /** Pourquoi une carte de la main ne peut pas être jouée maintenant. */
  function raisonInjouable(partie: Partie, id: string): string {
    const J = partie.joueurs[0];
    const fiche = bib.personnages.get(id);
    const soutien = bib.soutiens.get(id);
    if (partie.joueurActif !== 0) return 'Attends ton tour.';
    if (fiche?.type === 'eveille') return `Un Éveillé se pose sur un Base de ${fiche.serie} en jeu depuis un tour (Relève).`;
    if (fiche) return J.banc.length >= PLACES_BANC ? 'Ton banc est plein.' : 'Ne peut pas être posé maintenant.';
    if (soutien?.type === 'soutien' && J.tour.soutien) return 'Tu as déjà joué une carte Soutien ce tour.';
    return 'Ne peut pas être jouée maintenant.';
  }

  function panneauJournal(messages: string[]): HTMLElement {
    const journal = el('details', 'combat-journal');
    journal.open = typeof matchMedia === 'function' && matchMedia('(min-width: 1400px)').matches;
    journal.append(el('summary', undefined, 'Journal de la partie'));
    if (!messages.length) journal.append(el('p', undefined, 'Les actions de la partie apparaîtront ici.'));
    else {
      const liste = el('ol');
      for (const m of [...messages].reverse()) liste.append(el('li', /^IA\b/.test(m) ? 'ia' : /^Toi\b/.test(m) ? 'toi' : undefined, m));
      journal.append(liste);
    }
    return journal;
  }

  // ----- Barre de commande -----
  function commande(partie: Partie, actions: Action[], aMoi: boolean): HTMLElement {
    const barre = el('footer', 'combat-commande');
    if (message) { const alerte = el('p', 'combat-annonce', message); alerte.setAttribute('role', 'status'); barre.append(alerte); }
    if (partie.phase === 'fin') return barre;
    if (!aMoi) { barre.append(el('p', 'combat-consigne', 'L’IA joue…')); return barre; }
    if (partie.phase === 'choix-premier') {
      barre.append(el('p', 'combat-consigne', 'Tu gagnes le pile ou face : qui commence ?'));
      for (const a of actions.filter((x): x is ActionDe<'commencer'> => x.type === 'commencer')) {
        barre.append(bouton(a.premier ? 'Je commence' : 'L’IA commence', a.premier ? 'combat-bouton principal' : 'combat-bouton', () => faireAction(partie, a)));
      }
      return barre;
    }
    const J = partie.joueurs[0];
    const nouveaux = actions.filter((a): a is ActionDe<'nouvel-actif'> => a.type === 'nouvel-actif');
    if (nouveaux.length) {
      barre.append(el('p', 'combat-consigne', 'Ton actif est K.-O. : choisis qui le remplace.'));
      for (const a of nouveaux) {
        const perso = J.banc.find((p) => p.uid === a.cible);
        if (perso) barre.append(bouton(`${ficheDe(perso).nom} · ${ficheDe(perso).pv - perso.degats} PV`, 'combat-bouton principal', () => faireAction(partie, a)));
      }
      return barre;
    }
    const consigne = J.energie && actions.some((a) => a.type === 'attacher')
      ? `Glisse ton énergie ${ELEMENTS[J.energie].nom} sur un personnage (ou touche « + »).`
      : 'Glisse une carte de ta main sur le tapis, ou touche-la pour voir ce qu’elle peut faire.';
    barre.append(el('p', 'combat-consigne', consigne));
    // Raccourcis : les attaques jouables de l'actif (une attaque à choix s'ouvre dans le panneau).
    const attaques = actions.filter((a): a is ActionDe<'attaquer'> => a.type === 'attaquer');
    const fiche = J.actif ? ficheDe(J.actif) : null;
    const boutons = el('div', 'combat-commande-boutons');
    for (const i of [...new Set(attaques.map((a) => a.attaque))]) {
      const attaque = fiche!.attaques[i]!;
      const variantes = attaques.filter((a) => a.attaque === i);
      const b = bouton('', 'combat-bouton attaque', () => {
        if (variantes.length === 1) faireAction(partie, variantes[0]!);
        else { selection = J.actif!.uid; afficher(); }
      });
      b.append(coutEnIcones(attaque.cout), el('span', undefined, `${attaque.nom}${attaque.degats !== '' ? ` · ${attaque.degats}` : ''}`));
      boutons.append(b);
    }
    const passer = actions.find((a): a is ActionDe<'passer'> => a.type === 'passer');
    if (passer) boutons.append(bouton('Fin du tour', 'combat-bouton principal fin-tour', () => faireAction(partie, passer)));
    barre.append(boutons);
    return barre;
  }

  // ----- Fin de partie -----
  function ecranFin(f: FinDePartie): HTMLElement {
    const ecran = el('div', `combat-fin ${f.victoire ? 'victoire' : 'defaite'}`);
    ecran.setAttribute('role', 'dialog');
    ecran.setAttribute('aria-modal', 'true');
    ecran.setAttribute('aria-labelledby', 'combat-fin-titre');
    const boite = el('div', 'combat-fin-boite');
    const titre = el('h2', undefined, f.victoire ? 'Victoire !' : 'Défaite');
    titre.id = 'combat-fin-titre';
    const J = f.partie.joueurs;
    const actions = el('div', 'combat-fin-actions');
    const rejouer = bouton('Rejouer ce défi', 'combat-bouton principal grand', () => lancerDefi(f.defiId));
    actions.append(rejouer, bouton('Retour aux défis', 'combat-bouton grand', () => { fin = null; afficherMenu = false; afficher(); }));
    boite.append(titre, el('p', 'combat-fin-score', `${J[0].points} – ${J[1].points}`), el('p', undefined, f.texte), actions);
    ecran.append(boite);
    requestAnimationFrame(() => rejouer.focus());
    return ecran;
  }

  // ----- Carte en grand -----
  function inspecter(id: string): void {
    const dialogue = el('dialog', 'combat-inspection');
    const carte = el('div', 'combat-inspection-carte');
    carte.append(visuels.visuel(id, true));
    const titre = el('h2', undefined, visuels.nom(id));
    titre.id = 'combat-inspection-titre';
    dialogue.setAttribute('aria-labelledby', titre.id);
    const fermer = bouton('Fermer', 'combat-bouton', () => dialogue.close());
    dialogue.append(titre, carte, fermer);
    dialogue.addEventListener('click', (event) => { if (event.target === dialogue) dialogue.close(); });
    dialogue.addEventListener('close', () => dialogue.remove());
    root.append(dialogue);
    dialogue.showModal();
    fermer.focus();
  }

  window.addEventListener('resize', ajusterMain);
  afficher();
  window.setTimeout(programmerIA, 0);
  return root;
}
