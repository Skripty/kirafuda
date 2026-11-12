// Écran Combat : choix du deck et du défi, puis le tapis de jeu.
// Tapis : l'adversaire en haut (banc, actif), le joueur en bas (actif, banc), sa main en dessous. Les cartes sont les
// vraies cartes du jeu ; toucher une carte montre ses détails et ce qu'elle peut faire (règles : docs/COMBAT.md).
// L'écran ne décide de rien : il n'offre que les actions légales données par le moteur (src/core/combat/moteur.ts).
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
import { iconeElement } from './element';

const ELEMENT_DU_CODE: Record<CodeEnergie, ElementId> = { f: 'feu', e: 'eau', g: 'glace', z: 'foudre', v: 'vent', t: 'terre', l: 'lumiere', n: 'tenebres', q: 'neutre' };
const TYPES: Record<string, string> = { base: 'Base', eveille: 'Éveillé', heros: 'Héros', objet: 'Objet', soutien: 'Soutien', terrain: 'Terrain' };
const ETATS: Record<string, string> = { brulure: 'Brûlé', gel: 'Gelé', etourdi: 'Étourdi', malediction: 'Maudit' };
const PLACES_BANC = 3;
type ActionDe<T extends Action['type']> = Extract<Action, { type: T }>;

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
  const root = el('main', 'combat-page');
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
      message = victoire
        ? gain > 0 ? 'Victoire ! Défi gagné : +2 sceaux.' : 'Victoire ! La récompense de ce défi a déjà été reçue.'
        : 'Défaite : l’IA remporte la partie. Tu peux retenter ce défi.';
      selection = null;
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
      const resultat = appliquer(partie, action, bib);
      const qui = action.joueur === 1 ? 'IA' : 'Toi';
      const journalIA = [...enCours.journalIA, ...resultat.journal.map((e) => `${qui} · ${e.texte}`)].slice(-24);
      message = null;
      // La carte choisie reste affichée si elle est encore en jeu ; une carte jouée depuis la main ne l'est plus.
      if (selection && !enJeuDe(resultat.partie, 0).some((p) => p.uid === selection) && !enJeuDe(resultat.partie, 1).some((p) => p.uid === selection)) selection = null;
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
      if (suivante && tourIA(suivante.partie) && root.isConnected) window.setTimeout(jouer, 650);
      else iaEnCours = false;
    };
    window.setTimeout(jouer, 600);
  }

  function afficher(): void {
    root.replaceChildren();
    const enCours = session();
    root.classList.toggle('en-partie', !!enCours && !afficherMenu);
    if (enCours && !afficherMenu) afficherPartie(enCours);
    else afficherDefis();
    programmerIA();
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
    // Le nom du deck sert de nom de joueur dans le journal : « Toi pioche 1 carte ».
    const partie = creerPartie(bib, [{ ...deckJoueur, nom: 'Toi' }, { ...deckIA, nom: `IA · ${defi.nom}` }], nouvelleGraine());
    choixActif = null;
    choixBanc = [];
    miseEnPlacePrete = false;
    selection = null;
    afficherMenu = false;
    dernierJournal = partie.journal;
    message = null;
    if (enregistrerCombat({ ...sauvegarde.combat, enCours: { defiId, partie: partie.partie, journalIA: [], deckJoueur: { ...deckJoueur } } })) afficher();
  }

  // ---------- Partie ----------
  function afficherPartie(courante: NonNullable<ProgressionCombat['enCours']>): void {
    const partie = courante.partie;
    const defi = DEFIS_COMBAT.find((d) => d.id === courante.defiId);
    if (!defi) {
      root.append(el('h1', undefined, 'Défi indisponible'), bouton('Retour aux défis', 'combat-bouton principal', () => {
        enregistrerCombat({ ...sauvegarde.combat, enCours: null });
        afficher();
      }));
      return;
    }
    const actions = actionsLegales(partie, bib);
    const aMoi = actions[0]?.joueur === 0;

    const barre = el('header', 'combat-barre');
    const titre = el('div', 'combat-barre-titre');
    titre.append(el('strong', undefined, defi.nom), el('span', undefined,
      partie.phase === 'jeu' ? `Tour ${partie.tour} · ${partie.joueurActif === 0 ? 'à toi' : 'à l’IA'}` : partie.phase === 'mise-en-place' ? 'Mise en place' : 'Pile ou face'));
    barre.append(bouton('‹ Défis', 'combat-bouton', () => { afficherMenu = true; message = null; afficher(); }), titre);
    root.append(barre);

    const miseEnPlace = partie.phase === 'mise-en-place' && aMoi
      ? actions.filter((a): a is ActionDe<'mise-en-place'> => a.type === 'mise-en-place') : null;
    if (miseEnPlace) preparerMiseEnPlace(partie);

    const corps = el('div', 'combat-corps');
    const tapis = el('section', 'combat-tapis');
    tapis.setAttribute('aria-label', 'Tapis de jeu');
    const cachee = partie.phase !== 'jeu' && partie.phase !== 'fin';
    tapis.append(camp(partie, 1, actions, cachee), centre(partie, aMoi), miseEnPlace ? campMiseEnPlace(partie) : camp(partie, 0, actions, false));
    const cote = el('aside', 'combat-cote');
    corps.append(tapis, cote);
    root.append(corps);

    if (miseEnPlace) {
      root.append(mainMiseEnPlace(partie));
      const action = miseEnPlace.find((a) => a.actif === choixActif && a.banc.length === choixBanc.length && a.banc.every((uid) => choixBanc.includes(uid)));
      const commande = el('footer', 'combat-commande');
      const valider = bouton('Commencer le combat', 'combat-bouton principal', () => { if (action) faireAction(partie, action); });
      valider.disabled = !action;
      commande.append(el('p', 'combat-consigne', choixActif ? 'Touche une carte pour la placer ou la reprendre.' : 'Choisis ton personnage actif.'), valider);
      root.append(commande);
      cote.append(panneauJournal(courante.journalIA));
      return;
    }

    root.append(main(partie, actions, aMoi));
    cote.append(panneauSelection(partie, actions, aMoi), panneauJournal(courante.journalIA));
    root.append(commande(partie, actions, aMoi));
  }

  // ----- Camps -----
  function points(n: number, qui: string): HTMLElement {
    const groupe = el('span', 'combat-points');
    groupe.setAttribute('role', 'img');
    groupe.setAttribute('aria-label', `${qui} : ${n} point${n > 1 ? 's' : ''} sur 3`);
    for (let i = 0; i < 3; i++) groupe.append(el('i', i < n ? 'marque' : undefined));
    return groupe;
  }

  function bandeau(partie: Partie, index: 0 | 1): HTMLElement {
    const J = partie.joueurs[index];
    const b = el('div', 'combat-bandeau');
    const nom = el('strong', 'combat-bandeau-nom', index === 0 ? 'Toi' : 'IA');
    const piles = el('span', 'combat-piles', `${index === 1 ? `Main ${J.main.length} · ` : ''}Deck ${J.deck.length} · Défausse ${J.defausse.length}`);
    b.append(nom, points(J.points, index === 0 ? 'Toi' : 'IA'), piles);
    if (index === 0 && partie.phase === 'jeu') {
      const energie = el('span', 'combat-energie-zone');
      if (J.energie) energie.append(iconeElement(J.energie, 'combat-energie-icone'), el('span', undefined, 'Énergie à attacher'));
      else energie.append(el('span', undefined, J.tour.energieAttachee ? 'Énergie attachée' : 'Pas d’énergie ce tour'));
      b.append(energie);
    }
    return b;
  }

  function dos(libelle: string): HTMLElement {
    const d = el('div', 'combat-dos');
    d.setAttribute('role', 'img');
    d.setAttribute('aria-label', libelle);
    d.append(el('span', undefined, 'K'));
    return d;
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
    carte.setAttribute('aria-label', `${index === 0 ? 'Ton' : 'Son'} ${role} : ${fiche.nom}, ${pv} PV sur ${fiche.pv}${perso.energies.length ? `, ${perso.energies.length} énergie${perso.energies.length > 1 ? 's' : ''}` : ''}`
      + `${perso.etats.length ? `, ${perso.etats.map((e) => ETATS[e]).join(', ')}` : ''}${nouvelActif ? ' : le mettre en actif' : ''}`);
    carte.append(visuels.visuel(perso.id));
    const vie = el('span', `combat-pv${pv <= fiche.pv * 0.3 ? ' bas' : ''}`);
    const jauge = el('i');
    jauge.style.transform = `scaleX(${pv / fiche.pv})`;
    vie.append(el('b', undefined, String(pv)), el('small', undefined, `/${fiche.pv}`), jauge);
    carte.append(vie);
    if (perso.energies.length) {
      const energies = el('span', 'combat-energies');
      for (const e of perso.energies) energies.append(iconeElement(e, 'combat-energie-attachee', null));
      carte.append(energies);
    }
    if (perso.etats.length) {
      const etats = el('span', 'combat-etats');
      for (const e of perso.etats) etats.append(el('span', `combat-etat ${e}`, ETATS[e]));
      carte.append(etats);
    }
    const coup = dernierJournal.find((e) => e.type === 'degats' && e.cible === perso.uid && e.valeur);
    if (coup) { cadre.classList.add('touche'); carte.append(el('span', 'combat-degats-flottants', `−${coup.valeur}`)); }
    cadre.append(carte);
    // Énergie du tour : un geste suffit pour l'attacher.
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
    for (let i = 0; i < PLACES_BANC; i++) {
      const perso = J.banc[i];
      if (!perso) banc.append(placeVide('Banc', 'banc'));
      else if (cachee && index === 1) { const c = el('div', 'combat-case banc'); c.append(dos('Carte du banc de l’IA, face cachée')); banc.append(c); }
      else banc.append(unite(partie, perso, index, actions, 'banc'));
    }
    // L'adversaire a son banc en haut ; le joueur a le sien en bas, près de sa main.
    if (index === 1) section.append(bandeau(partie, 1), banc, ligneActif);
    else section.append(ligneActif, banc, bandeau(partie, 0));
    return section;
  }

  function centre(partie: Partie, aMoi: boolean): HTMLElement {
    const milieu = el('div', 'combat-centre');
    const tour = el('span', `combat-tour${aMoi ? ' a-moi' : ''}`,
      partie.phase === 'mise-en-place' ? (aMoi ? 'Prépare ton équipe' : 'L’IA prépare son équipe…')
        : partie.phase === 'choix-premier' ? 'Pile ou face'
          : aMoi ? (partie.joueurActif === 0 ? 'À toi de jouer' : 'À toi de choisir') : 'L’IA joue…');
    milieu.append(tour);
    if (partie.terrain) milieu.append(bouton(`Terrain · ${visuels.nom(partie.terrain.id)}`, 'combat-terrain', () => inspecter(partie.terrain!.id)));
    const dernier = dernierJournal.filter((e) => e.texte).slice(-2).map((e) => e.texte).join(' ');
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
        afficher();
      });
      b.setAttribute('aria-label', `${libelle} : ${visuels.nom(idDe(partie, uid))}. Toucher pour le reprendre en main.`);
      b.append(visuels.visuel(idDe(partie, uid)));
      cadre.append(b);
      return cadre;
    };
    const ligneActif = el('div', 'combat-ligne-actif');
    ligneActif.append(place(choixActif ?? undefined, 'actif', 'Actif'));
    const banc = el('div', 'combat-banc');
    for (let i = 0; i < PLACES_BANC; i++) banc.append(place(choixBanc[i], 'banc', 'Banc'));
    section.append(ligneActif, banc, bandeau(partie, 0));
    return section;
  }

  function mainMiseEnPlace(partie: Partie): HTMLElement {
    const possibles = new Set(candidats(partie));
    const zone = el('section', 'combat-main');
    zone.append(el('h2', undefined, 'Ta main'));
    const cartes = el('div', 'combat-main-cartes');
    for (const uid of partie.joueurs[0].main) {
      const id = idDe(partie, uid);
      const place = uid === choixActif || choixBanc.includes(uid);
      const jouable = possibles.has(uid) && !place;
      const b = bouton('', `combat-carte-main${jouable ? ' jouable' : ''}${place ? ' placee' : ''}`, () => {
        if (!jouable) { inspecter(id); return; }
        if (!choixActif) choixActif = uid;
        else if (choixBanc.length < PLACES_BANC) choixBanc = [...choixBanc, uid];
        afficher();
      });
      b.setAttribute('aria-label', `${visuels.nom(id)}${place ? ', déjà placé' : jouable ? `, placer ${choixActif ? 'sur le banc' : 'en actif'}` : ', voir les détails'}`);
      b.append(visuels.visuel(id));
      cartes.append(b);
    }
    zone.append(cartes);
    return zone;
  }

  // ----- Main -----
  /** Actions légales d'une carte de la main (les exemplaires identiques partagent leurs actions). */
  function actionsDeMain(partie: Partie, actions: Action[], uid: string): (ActionDe<'poser'> | ActionDe<'releve'> | ActionDe<'jouer'>)[] {
    const id = idDe(partie, uid);
    return actions.filter((a): a is ActionDe<'poser'> | ActionDe<'releve'> | ActionDe<'jouer'> =>
      (a.type === 'poser' || a.type === 'releve' || a.type === 'jouer') && idDe(partie, a.carte) === id);
  }

  function main(partie: Partie, actions: Action[], aMoi: boolean): HTMLElement {
    const J = partie.joueurs[0];
    const zone = el('section', 'combat-main');
    zone.append(el('h2', undefined, `Ta main · ${J.main.length}`));
    const cartes = el('div', 'combat-main-cartes');
    if (!J.main.length) cartes.append(el('p', 'combat-main-vide', 'Ta main est vide.'));
    for (const uid of J.main) {
      const id = idDe(partie, uid);
      const jouable = aMoi && actionsDeMain(partie, actions, uid).length > 0;
      const b = bouton('', `combat-carte-main${jouable ? ' jouable' : ''}${selection === uid ? ' choisie' : ''}`, () => {
        selection = selection === uid ? null : uid;
        afficher();
      });
      b.setAttribute('aria-label', `${visuels.nom(id)}${jouable ? ', jouable' : ''}`);
      b.append(visuels.visuel(id));
      cartes.append(b);
    }
    zone.append(cartes);
    return zone;
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
    if (selection) tete.append(bouton('Fermer', 'combat-bouton', () => { selection = null; afficher(); }));
    const apercu = bouton('', 'combat-panneau-carte', () => inspecter(id));
    apercu.setAttribute('aria-label', `Agrandir la carte ${visuels.nom(id)}`);
    apercu.append(visuels.visuel(id));
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
    journal.append(el('summary', undefined, 'Journal de la partie'));
    if (!messages.length) journal.append(el('p', undefined, 'Les actions de la partie apparaîtront ici.'));
    else {
      const liste = el('ol');
      for (const m of [...messages].reverse()) liste.append(el('li', undefined, m));
      journal.append(liste);
    }
    return journal;
  }

  // ----- Barre de commande -----
  function commande(partie: Partie, actions: Action[], aMoi: boolean): HTMLElement {
    const barre = el('footer', 'combat-commande');
    if (message) { const alerte = el('p', 'combat-annonce', message); alerte.setAttribute('role', 'status'); barre.append(alerte); }
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
      barre.append(el('p', 'combat-consigne', 'Choisis ton nouvel actif :'));
      for (const a of nouveaux) {
        const perso = J.banc.find((p) => p.uid === a.cible);
        if (perso) barre.append(bouton(`${ficheDe(perso).nom} · ${ficheDe(perso).pv - perso.degats} PV`, 'combat-bouton principal', () => faireAction(partie, a)));
      }
      return barre;
    }
    const consigne = J.energie && actions.some((a) => a.type === 'attacher')
      ? `Attache ton énergie ${ELEMENTS[J.energie].nom} avec le bouton « + » d’un personnage.`
      : 'Touche une carte pour la jouer, ou attaque pour finir ton tour.';
    barre.append(el('p', 'combat-consigne', consigne));
    // Raccourcis : les attaques jouables de l'actif (une attaque à choix s'ouvre dans le panneau).
    const attaques = actions.filter((a): a is ActionDe<'attaquer'> => a.type === 'attaquer');
    const fiche = J.actif ? ficheDe(J.actif) : null;
    for (const i of [...new Set(attaques.map((a) => a.attaque))]) {
      const attaque = fiche!.attaques[i]!;
      const variantes = attaques.filter((a) => a.attaque === i);
      barre.append(bouton(`${attaque.nom}${attaque.degats !== '' ? ` · ${attaque.degats}` : ''}`, 'combat-bouton attaque', () => {
        if (variantes.length === 1) faireAction(partie, variantes[0]!);
        else { selection = J.actif!.uid; afficher(); }
      }));
    }
    const passer = actions.find((a): a is ActionDe<'passer'> => a.type === 'passer');
    if (passer) barre.append(bouton('Terminer le tour', 'combat-bouton principal', () => faireAction(partie, passer)));
    return barre;
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

  afficher();
  window.setTimeout(programmerIA, 0);
  return root;
}
