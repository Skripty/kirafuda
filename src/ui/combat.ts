import './combat.css';
import type { Bibliotheque, Deck, Partie, PersoEnJeu } from '../core/combat/etat';
import { DECKS_DEPART, DEFIS_COMBAT } from '../core/combat/defis';
import { deckStandard } from '../core/combat/decks';
import { exemplairesParPersonnage, validerDeckPossede } from '../core/combat/decks-joueur';
import { iaNormale } from '../core/combat/ia';
import { actionsLegales, appliquer, creerPartie, type Action, type Evenement } from '../core/combat/moteur';
import { rngAGraine, rngSecurise } from '../core/rng';
import { ELEMENTS } from '../core/regles';
import type { DeckEnregistre, Extension, Personnage, ProgressionCombat, Sauvegarde } from '../core/types';

const BASE = import.meta.env.BASE_URL;
const CODE: Record<string, string> = { feu: 'f', eau: 'e', glace: 'g', foudre: 'z', vent: 'v', terre: 't', lumiere: 'l', tenebres: 'n', neutre: 'q' };

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

function afficherCout(cout: string[]): string {
  return cout.map((code) => code === 'q' ? '◇' : Object.entries(CODE).find(([, v]) => v === code)?.[0] ?? code)
    .map((e) => e === '◇' ? e : ELEMENTS[e as keyof typeof ELEMENTS]?.nom ?? e).join(' ');
}

function coutManquant(energies: string[], cout: string[]): string[] {
  const reste = [...energies];
  const manque: string[] = [];
  for (const code of cout) {
    if (code === 'q') continue;
    const element = Object.entries(CODE).find(([, valeur]) => valeur === code)?.[0];
    const i = element ? reste.indexOf(element) : -1;
    if (i < 0) manque.push(element ?? code);
    else reste.splice(i, 1);
  }
  const quelconques = cout.filter((c) => c === 'q').length;
  const manquantes = Math.max(0, quelconques - reste.length);
  for (let i = 0; i < manquantes; i++) manque.push('une énergie quelconque');
  return manque;
}

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
  return morceaux.length ? ` · ${morceaux.join(' · ')}` : '';
}

export function creerEcranCombat(options: OptionsCombat): HTMLElement {
  let sauvegarde = options.sauvegarde;
  let message: string | null = null;
  let dernierJournal: Evenement[] = [];
  let choixActif: string | null = null;
  let choixBanc = new Set<string>();
  let selectionMiseEnPlaceInitialisee = false;
  let afficherMenu = false;
  let iaEnCours = false;
  const root = el('main', 'combat-page');
  const choisirIA = iaNormale();
  const possedeesParPersonnage = exemplairesParPersonnage(sauvegarde, options.extensions);
  const possedees = new Set<string>([
    ...[...options.bib.personnages.keys()].filter((id) => (possedeesParPersonnage.get(id) ?? 0) > 0),
    ...[...options.bib.soutiens.keys()].filter((id) => (sauvegarde.collection[id] ?? 0) > 0),
  ]);
  const decksUtilisables = (): DeckEnregistre[] => sauvegarde.decks.filter((d) => validerDeckPossede(d, options.bib, possedees).length === 0);
  let deckChoisi = sauvegarde.deckSelectionne && decksUtilisables().some((d) => d.id === sauvegarde.deckSelectionne)
    ? `deck:${sauvegarde.deckSelectionne}` : `depart:${DECKS_DEPART[0]!.id}`;
  const cartesBase = new Map<string, string>();
  for (const extension of options.extensions) {
    for (const c of extension.cartes) if (!c.secrete && !cartesBase.has(c.personnage)) cartesBase.set(c.personnage, c.id);
  }

  function enregistrerCombat(combat: ProgressionCombat, sceaux = sauvegarde.sceaux): boolean {
    const resultat = options.enregistrer({ ...sauvegarde, sceaux, combat });
    if (!resultat) { message = 'La sauvegarde du combat a échoué. Réessaie après avoir vérifié ton stockage.'; return false; }
    sauvegarde = resultat;
    return true;
  }

  function session(): NonNullable<ProgressionCombat['enCours']> | null {
    return sauvegarde.combat.enCours;
  }

  function tourIA(partie: Partie): boolean {
    if (partie.phase === 'fin') return false;
    const actions = actionsLegales(partie, options.bib);
    return actions[0]?.joueur === 1;
  }

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
        ? gain > 0 ? `Défi gagné : +2 sceaux. La victoire de ce défi est enregistrée.` : 'Défi gagné ! La récompense de ce défi a déjà été réclamée.'
        : 'L’IA remporte la partie. Tu pourras retenter ce défi.';
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
      const resultat = appliquer(partie, action, options.bib);
      const journalIA = action.joueur === 1
        ? [...enCours.journalIA, ...resultat.journal.map((e) => e.texte)].slice(-12)
        : enCours.journalIA;
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
      const legales = actionsLegales(enCours.partie, options.bib);
      if (!legales.length) { iaEnCours = false; return; }
      const action = choisirIA(enCours.partie, options.bib);
      faireAction(enCours.partie, action);
      const suivante = session();
      if (suivante && tourIA(suivante.partie) && root.isConnected) {
        window.setTimeout(jouer, 430);
      } else iaEnCours = false;
    };
    window.setTimeout(jouer, 480);
  }

  function afficher(): void {
    root.replaceChildren();
    const enCours = session();
    if (enCours && !afficherMenu) afficherPartie(enCours);
    else afficherDefis();
    if (message) {
      const alerte = el('p', 'combat-annonce', message);
      alerte.setAttribute('role', 'status');
      root.prepend(alerte);
    }
    programmerIA();
  }

  function afficherDefis(): void {
    const enTete = el('header', 'combat-entete');
    enTete.append(bouton('‹ Accueil', 'combat-bouton-retour', () => { window.location.hash = '#/'; }),
      el('p', 'combat-surtitre', 'COMBAT • DÉFIS'), el('h1', undefined, 'Combat contre l’IA'));
    enTete.append(el('p', 'combat-intro', 'Choisis ton deck puis un adversaire. Les decks de départ restent jouables sans posséder leurs cartes.'));
    const liste = el('section', 'combat-defis');
    liste.setAttribute('aria-label', 'Défis disponibles');
    root.append(enTete, selecteurDeck());
    const partieEnCours = session();
    if (partieEnCours) {
      const defiEnCours = DEFIS_COMBAT.find((d) => d.id === partieEnCours.defiId);
      const reprendre = el('aside', 'combat-reprise');
      reprendre.append(el('div', undefined, `Partie en cours${defiEnCours ? ` · ${defiEnCours.nom}` : ''}`),
        bouton('Reprendre la partie', 'combat-bouton-principal', () => { afficherMenu = false; message = null; afficher(); }));
      root.append(reprendre);
    }
    for (const defi of DEFIS_COMBAT) {
      const gagne = sauvegarde.combat.defisGagnes.includes(defi.id);
      const partieEnCoursIci = partieEnCours?.defiId === defi.id;
      const carte = el('article', 'combat-defi');
      const haut = el('div', 'combat-defi-haut');
      haut.append(el('span', 'combat-defi-symbole', '⚔'), el('span', 'combat-defi-series', defi.serie));
      const recompense = el('span', gagne ? 'combat-recompense gagnee' : 'combat-recompense', gagne ? 'Récompense reçue' : '+2 sceaux · première victoire');
      carte.append(haut, el('h2', undefined, defi.nom), el('p', 'combat-defi-texte', `Un deck de ${defi.serie}. Victoire en 3 points.`), recompense,
        bouton(partieEnCoursIci ? 'Reprendre le défi' : partieEnCours ? 'Partie en cours' : gagne ? 'Rejouer le défi' : 'Lancer le défi', 'combat-bouton-principal', () => {
          if (partieEnCoursIci) { afficherMenu = false; message = null; afficher(); }
          else if (!partieEnCours) lancerDefi(defi.id);
        }));
      const actionDefi = carte.querySelector('button')!;
      actionDefi.disabled = !!partieEnCours && !partieEnCoursIci;
      liste.append(carte);
    }
    root.append(liste);
  }

  function selecteurDeck(): HTMLElement {
    const cadre = el('section', 'combat-choix-deck');
    const texte = el('div');
    texte.append(el('strong', undefined, 'Deck utilisé'), el('span', undefined, 'Sélectionne le deck joueur avant de lancer un défi.'));
    const select = el('select', 'combat-select-deck');
    for (const d of DECKS_DEPART) { const depart = el('option', undefined, d.nom); depart.value = `depart:${d.id}`; select.append(depart); }
    for (const deck of decksUtilisables()) {
      const option = el('option', undefined, `${deck.nom} · ${deck.cartes.length} cartes`); option.value = `deck:${deck.id}`; select.append(option);
    }
    if (![...select.options].some((o) => o.value === deckChoisi)) deckChoisi = `depart:${DECKS_DEPART[0]!.id}`;
    select.value = deckChoisi;
    select.addEventListener('change', () => {
      deckChoisi = select.value;
      const id = deckChoisi.startsWith('deck:') ? deckChoisi.slice(5) : null;
      const resultat = options.enregistrer({ ...sauvegarde, deckSelectionne: id });
      if (resultat) sauvegarde = resultat;
      message = resultat ? null : 'La sélection du deck n’a pas été sauvegardée.';
      afficher();
    });
    cadre.append(texte, select, bouton('Gérer mes decks', 'combat-bouton-secondaire', () => { window.location.hash = '#/decks'; }));
    return cadre;
  }

  function deckSelectionne(): Deck | null {
    if (deckChoisi.startsWith('deck:')) {
      const enregistre = decksUtilisables().find((d) => d.id === deckChoisi.slice(5));
      return enregistre ? { nom: enregistre.nom, cartes: [...enregistre.cartes], elements: [...enregistre.elements] } : null;
    }
    const depart = DECKS_DEPART.find((d) => `depart:${d.id}` === deckChoisi) ?? DECKS_DEPART[0]!;
    return { nom: depart.nom, cartes: [...depart.cartes], elements: [...depart.elements] };
  }

  function lancerDefi(defiId: string): void {
    const defi = DEFIS_COMBAT.find((d) => d.id === defiId);
    if (!defi) return;
    const deckJoueur = deckSelectionne();
    const deckIA = deckStandard(defi.serie, options.bib, rngAGraine(`deck-defi:${defi.id}`));
    if (!deckJoueur || !deckIA) { message = `Le deck choisi ou le deck du défi « ${defi.nom} » ne peut pas être créé.`; afficher(); return; }
    const deckDepart: Deck = { ...deckJoueur };
    const adversaire: Deck = { ...deckIA, nom: `IA · ${defi.nom}` };
    const partie = creerPartie(options.bib, [deckDepart, adversaire], nouvelleGraine());
    choixActif = null;
    choixBanc = new Set();
    selectionMiseEnPlaceInitialisee = false;
    afficherMenu = false;
    dernierJournal = partie.journal;
    message = null;
    if (enregistrerCombat({ ...sauvegarde.combat, enCours: { defiId, partie: partie.partie, journalIA: [], deckJoueur: deckDepart } })) afficher();
  }

  function afficherPartie(courante: NonNullable<ProgressionCombat['enCours']>): void {
    const partie = courante.partie;
    const defi = DEFIS_COMBAT.find((d) => d.id === courante.defiId);
    if (!defi) {
      root.append(el('h1', undefined, 'Défi indisponible'), bouton('Retour aux défis', 'combat-bouton-principal', () => {
        enregistrerCombat({ ...sauvegarde.combat, enCours: null }); afficher();
      }));
      return;
    }
    const barre = el('header', 'combat-barre');
    const titrePartie = el('div', 'combat-titre-partie');
    titrePartie.append(el('span', 'combat-surtitre', 'DÉFI'), el('h1', undefined, defi.nom));
    barre.append(bouton('‹ Défis', 'combat-bouton-retour', () => { afficherMenu = true; message = null; afficher(); }),
      titrePartie, el('div', 'combat-tour-etat', partie.phase === 'jeu' ? `Tour ${partie.tour}` : libellePhase(partie.phase)));
    root.append(barre);

    if (partie.phase === 'mise-en-place') {
      const actions = actionsLegales(partie, options.bib);
      if (actions[0]?.joueur === 0) {
        afficherMiseEnPlace(partie, actions.filter((a): a is Extract<Action, { type: 'mise-en-place' }> => a.type === 'mise-en-place'));
        return;
      }
    }

    afficherPlateau(partie);
    const actions = actionsLegales(partie, options.bib);
    if (partie.phase === 'choix-premier' && actions[0]?.joueur === 0) {
      const choix = el('section', 'combat-choix-premier');
      choix.append(el('h2', undefined, 'La pièce est pour toi'), el('p', undefined, 'Choisis qui commence.'));
      for (const action of actions.filter((a): a is Extract<Action, { type: 'commencer' }> => a.type === 'commencer')) {
        choix.append(bouton(action.premier ? 'Je commence' : 'Je laisse commencer l’IA', 'combat-bouton-principal', () => faireAction(partie, action)));
      }
      root.append(choix);
      return;
    }
    if (actions[0]?.joueur === 0) afficherActions(partie, actions);
    else if (partie.phase !== 'fin') root.append(el('p', 'combat-ia-pense', 'L’IA prépare son tour…'));
    afficherJournal(courante.journalIA);
    if (partie.phase === 'fin') {
      const fin = el('section', 'combat-fin');
      fin.append(el('h2', undefined, partie.gagnant === 0 ? 'Victoire !' : 'Défaite'),
        bouton('Retour aux défis', 'combat-bouton-principal', () => { window.location.hash = '#/combat'; }));
      root.append(fin);
    }
  }

  function afficherMiseEnPlace(partie: Partie, actions: Extract<Action, { type: 'mise-en-place' }>[]): void {
    const joueur = partie.joueurs[0];
    const dejaVus = new Set<string>();
    const candidats = joueur.main.filter((uid) => {
      const id = partie.cartes[uid]!;
      const p = options.bib.personnages.get(id);
      if (!p || p.type === 'eveille' || dejaVus.has(id)) return false;
      dejaVus.add(id);
      return true;
    });
    if (!choixActif || !candidats.includes(choixActif)) {
      choixActif = candidats.reduce<string | null>((best, uid) => {
        if (!best) return uid;
        return (options.bib.personnages.get(partie.cartes[uid]!)?.pv ?? 0) > (options.bib.personnages.get(partie.cartes[best]!)?.pv ?? 0) ? uid : best;
      }, null);
    }
    choixBanc = new Set([...choixBanc].filter((uid) => candidats.includes(uid) && uid !== choixActif).slice(0, 3));
    if (!selectionMiseEnPlaceInitialisee) {
      for (const uid of candidats) if (uid !== choixActif && choixBanc.size < 3) choixBanc.add(uid);
      selectionMiseEnPlaceInitialisee = true;
    }
    const section = el('section', 'combat-mise-en-place');
    section.append(el('h2', undefined, 'Prépare ton équipe'), el('p', undefined, 'Choisis ton actif et jusqu’à trois personnages de banc. Les deux actifs sont révélés au début du combat.'));
    const choix = el('div', 'combat-choix-cartes');
    for (const uid of candidats) {
      const p = options.bib.personnages.get(partie.cartes[uid]!)!;
      const ligne = el('article', 'combat-choix-carte');
      const carte = creerCarteCombat(p, 0, cartesBase, () => ouvrirInspection(p.id));
      ligne.append(carte);
      const actionsCarte = el('div', 'combat-choix-carte-actions');
      actionsCarte.append(bouton(choixActif === uid ? 'Actif sélectionné' : 'Choisir actif', choixActif === uid ? 'combat-bouton-selectionne' : 'combat-bouton-secondaire', () => {
        const ancien = choixActif;
        choixActif = uid;
        choixBanc.delete(uid);
        if (ancien && ancien !== uid && choixBanc.size < 3) choixBanc.add(ancien);
        afficher();
      }));
      if (choixActif !== uid) actionsCarte.append(bouton(choixBanc.has(uid) ? 'Retirer du banc' : 'Choisir pour le banc', choixBanc.has(uid) ? 'combat-bouton-selectionne' : 'combat-bouton-secondaire', () => {
        if (choixBanc.has(uid)) choixBanc.delete(uid); else if (choixBanc.size < 3) choixBanc.add(uid);
        afficher();
      }));
      ligne.append(actionsCarte);
      choix.append(ligne);
    }
    const action = actions.find((a) => a.actif === choixActif && a.banc.length === choixBanc.size && a.banc.every((uid) => choixBanc.has(uid)));
    const valider = bouton('Poser mon équipe', 'combat-bouton-principal', () => { if (action) faireAction(partie, action); });
    valider.disabled = !action;
    section.append(choix, valider);
    root.append(section);
  }

  function afficherPlateau(partie: Partie): void {
    const visible = partie.phase === 'jeu' || partie.phase === 'fin';
    const plateau = el('section', `combat-plateau${classesAnimation(dernierJournal)}`);
    plateau.setAttribute('aria-label', 'Plateau de combat');
    plateau.append(afficherJoueur(partie, 1, visible));
    const milieu = el('div', 'combat-milieu');
    milieu.append(el('div', 'combat-tour-marqueur', partie.phase === 'jeu' ? `Tour ${partie.tour} · ${partie.joueurActif === 0 ? 'à toi' : 'IA'}` : 'Mise en place'));
    if (partie.terrain) milieu.append(el('div', 'combat-terrain', `Terrain : ${options.bib.soutiens.get(partie.terrain.id)?.nom ?? 'en jeu'}`));
    const joueur = partie.joueurs[0];
    const main = el('section', 'combat-main');
    main.append(el('h2', undefined, `Ta main · ${joueur.main.length} carte${joueur.main.length === 1 ? '' : 's'}`));
    const mainCartes = el('div', 'combat-main-cartes');
    for (const uid of joueur.main) {
      const id = partie.cartes[uid]!;
      const fiche = options.bib.personnages.get(id);
      const soutien = options.bib.soutiens.get(id);
      const carte = el('article', 'combat-carte-main');
      carte.append(el('span', 'combat-carte-type', fiche?.type === 'eveille' ? 'Éveillé' : fiche ? fiche.type === 'heros' ? 'Héros' : 'Base' : soutien?.type ?? 'Carte'),
        el('strong', undefined, fiche?.nom ?? soutien?.nom ?? id));
      const apercu = el('div', 'combat-main-apercu');
      if (fiche) {
        if (fiche.talent) apercu.append(el('span', undefined, `${fiche.talent.nom} : ${fiche.talent.texte}`));
        for (const attaque of fiche.attaques) apercu.append(el('span', undefined, `${attaque.nom} · ${afficherCout(attaque.cout)} · ${attaque.degats || attaque.effet || 'Sans dégâts directs'}`));
      } else if (soutien) apercu.append(el('span', undefined, `${soutien.type} : ${soutien.texte}`));
      carte.append(apercu);
      carte.tabIndex = 0;
      let inspection: number | null = null;
      carte.addEventListener('pointerdown', () => { inspection = window.setTimeout(() => ouvrirInspection(id), 550); });
      carte.addEventListener('pointerup', () => { if (inspection !== null) window.clearTimeout(inspection); });
      carte.addEventListener('pointerleave', () => { if (inspection !== null) window.clearTimeout(inspection); });
      carte.addEventListener('mouseenter', () => carte.classList.add('survol'));
      carte.addEventListener('mouseleave', () => carte.classList.remove('survol'));
      mainCartes.append(carte);
    }
    main.append(mainCartes);
    plateau.append(milieu, afficherJoueur(partie, 0, true), main);
    root.append(plateau);
  }

  function afficherJoueur(partie: Partie, index: 0 | 1, visible: boolean): HTMLElement {
    const joueur = partie.joueurs[index];
    const section = el('section', `combat-camp combat-camp-${index === 0 ? 'toi' : 'ia'}${partie.joueurActif === index && partie.phase === 'jeu' ? ' actif' : ''}`);
    const entete = el('div', 'combat-camp-entete');
    entete.append(el('div', 'combat-camp-nom', index === 0 ? 'Toi' : `IA · ${DEFIS_COMBAT.find((d) => `IA · ${d.nom}` === joueur.nom)?.nom ?? joueur.nom.replace('IA · ', '')}`),
      afficherPoints(joueur.points), el('span', 'combat-piles', `Deck ${joueur.deck.length} · Défausse ${joueur.defausse.length}`));
    section.append(entete);
    const energie = el('div', 'combat-zone-energie');
    energie.append(el('span', 'combat-zone-label', 'Zone d’énergie'));
    if (joueur.energie) {
      const contenu = index === 0
        ? bouton(`Énergie ${ELEMENTS[joueur.energie].nom} · glisser`, 'combat-energie', () => energie.classList.toggle('selectionnee'))
        : el('span', 'combat-energie-epuisee', `Énergie ${ELEMENTS[joueur.energie].nom}`);
      if (index === 0 && contenu instanceof HTMLButtonElement) {
        contenu.draggable = true;
        contenu.addEventListener('dragstart', (event) => event.dataTransfer?.setData('text/plain', 'energie'));
      }
      energie.append(contenu);
    } else energie.append(el('span', 'combat-energie-epuisee', joueur.tour.energieAttachee ? 'Attachée' : 'Aucune'));
    section.append(energie);
    const terrainJoueur = el('div', 'combat-champ');
    if (joueur.actif && (visible || index === 0)) terrainJoueur.append(creerCarteCombat(options.bib.personnages.get(joueur.actif.id)!, joueur.actif.degats, cartesBase,
      () => ouvrirInspection(joueur.actif!.id), index === 0 ? cibleEnergie(partie, joueur.actif.uid) : null, index === 0 ? joueur.actif : undefined));
    else terrainJoueur.append(el('div', 'combat-actif-vide', joueur.actif ? 'Actif face cachée' : 'Choisis ton actif'));
    const banc = el('div', 'combat-banc');
    banc.append(el('span', 'combat-zone-label', 'Banc'));
    if (!joueur.banc.length) banc.append(el('span', 'combat-banc-vide', 'Aucun personnage'));
    for (const perso of joueur.banc) {
      const fiche = options.bib.personnages.get(perso.id);
      if (!visible && index === 1) banc.append(el('div', 'combat-carte-cachee', 'Carte face cachée'));
      else if (fiche) banc.append(creerCarteCombat(fiche, perso.degats, cartesBase, () => ouvrirInspection(perso.id), index === 0 ? cibleEnergie(partie, perso.uid) : null, index === 0 ? perso : undefined, true));
    }
    section.append(terrainJoueur, banc);
    return section;
  }

  function afficherPoints(points: number): HTMLElement {
    const groupe = el('span', 'combat-points');
    groupe.setAttribute('aria-label', `${points} point${points === 1 ? '' : 's'} sur 3`);
    for (let i = 0; i < 3; i++) groupe.append(el('i', i < points ? 'marque' : undefined));
    return groupe;
  }

  function cibleEnergie(partie: Partie, uid: string): (() => void) | null {
    const joueur = partie.joueurs[0];
    const action = actionsLegales(partie, options.bib).find((a): a is Extract<Action, { type: 'attacher' }> => a.type === 'attacher' && a.cible === uid);
    if (!action || !joueur.energie) return null;
    return () => faireAction(partie, action);
  }

  function creerCarteCombat(
    fiche: Personnage,
    degats: number,
    images: Map<string, string>,
    inspecter: () => void,
    attacher: (() => void) | null = null,
    perso?: PersoEnJeu,
    compacte = false,
  ): HTMLElement {
    const carte = el('article', `combat-unite${compacte ? ' compacte' : ''}${attacher ? ' energie-possible' : ''}`);
    carte.setAttribute('aria-label', `${fiche.nom}, ${Math.max(0, fiche.pv - degats)} PV restants`);
    const illustration = el('div', 'combat-unite-art');
    const baseId = images.get(fiche.id);
    if (baseId) {
      const img = el('img');
      img.alt = '';
      img.loading = 'lazy';
      img.src = `${BASE}cartes/${baseId}/illustration.webp`;
      img.addEventListener('error', () => img.remove());
      illustration.append(img);
    }
    illustration.append(el('span', 'combat-unite-monogramme', fiche.nom.slice(0, 1)));
    const entete = el('div', 'combat-unite-entete');
    entete.append(el('span', 'combat-unite-type', fiche.type === 'eveille' ? 'Éveillé' : fiche.type === 'heros' ? 'Héros' : 'Base'),
      el('strong', undefined, fiche.nom));
    const ligne = el('div', 'combat-unite-vie');
    const actuel = Math.max(0, fiche.pv - degats);
    ligne.append(el('span', undefined, `${actuel} / ${fiche.pv} PV`));
    const vie = el('span', 'combat-vie-barre');
    const remplissage = el('i');
    remplissage.style.width = `${Math.max(0, Math.min(100, (actuel / fiche.pv) * 100))}%`;
    vie.append(remplissage);
    ligne.append(vie);
    const stats = el('div', 'combat-unite-stats');
    stats.append(el('span', undefined, `${ELEMENTS[fiche.element].nom}`), el('span', undefined, `${'◇ '.repeat(fiche.repli).trim() || 'Repli gratuit'}`));
    const energies = el('div', 'combat-unite-energies');
    for (const energie of perso?.energies ?? []) energies.append(el('i', `energie-${energie}`, ELEMENTS[energie].nom.slice(0, 1)));
    const tooltip = el('div', 'combat-unite-apercu');
    tooltip.append(el('strong', undefined, fiche.talent ? `${fiche.talent.nom} · ${fiche.talent.texte}` : fiche.serie));
    for (const attaque of fiche.attaques) tooltip.append(el('span', undefined, `${attaque.nom} · ${afficherCout(attaque.cout)} · ${attaque.degats || attaque.effet || 'Sans dégâts directs'}`));
    carte.append(illustration, entete, ligne, stats, energies, tooltip);
    const degatRecent = dernierJournal.find((e) => e.type === 'degats' && e.cible === perso?.uid && e.valeur);
    if (degatRecent) carte.append(el('span', 'combat-degats-flottants', `−${degatRecent.valeur}`));
    carte.addEventListener('mouseenter', () => carte.classList.add('survol'));
    carte.addEventListener('mouseleave', () => carte.classList.remove('survol'));
    let minuteur: number | null = null;
    carte.addEventListener('pointerdown', () => { minuteur = window.setTimeout(inspecter, 560); });
    const arreter = (): void => { if (minuteur !== null) window.clearTimeout(minuteur); minuteur = null; };
    carte.addEventListener('pointerup', arreter);
    carte.addEventListener('pointercancel', arreter);
    carte.addEventListener('pointerleave', arreter);
    carte.addEventListener('dragover', (event) => { if (attacher) event.preventDefault(); });
    carte.addEventListener('drop', (event) => { if (attacher && event.dataTransfer?.getData('text/plain') === 'energie') { event.preventDefault(); attacher(); } });
    if (attacher) carte.append(bouton('Attacher ici', 'combat-attacher-ici', attacher));
    return carte;
  }

  function afficherActions(partie: Partie, actions: Action[]): void {
    const joueur = partie.joueurs[0];
    const panneau = el('section', 'combat-actions');
    panneau.append(el('h2', undefined, partie.joueurActif === 0 ? 'À toi de jouer' : 'Prépare ton équipe'));
    const zone = el('div', 'combat-actions-grille');
    const nouveaux = actions.filter((a): a is Extract<Action, { type: 'nouvel-actif' }> => a.type === 'nouvel-actif');
    if (nouveaux.length) {
      panneau.querySelector('h2')!.textContent = 'Choisis ton nouvel actif';
      panneau.append(el('p', 'combat-guide-energie', 'Ton actif a quitté le combat : choisis le personnage du banc qui le remplace.'));
      for (const action of nouveaux) {
        const perso = joueur.banc.find((x) => x.uid === action.cible);
        const fiche = perso && options.bib.personnages.get(perso.id);
        zone.append(bouton(`${fiche?.nom ?? 'Personnage'} · ${fiche && perso ? `${fiche.pv - perso.degats} PV` : ''}`, 'combat-action-attaque', () => faireAction(partie, action)));
      }
    }
    const poser = actions.filter((a): a is Extract<Action, { type: 'poser' }> => a.type === 'poser');
    for (const action of poser) zone.append(bouton(`Poser au banc · ${options.bib.personnages.get(partie.cartes[action.carte]!)?.nom ?? 'Base'}`, 'combat-action-secondaire', () => faireAction(partie, action)));
    const releves = actions.filter((a): a is Extract<Action, { type: 'releve' }> => a.type === 'releve');
    for (const action of releves) {
      const p = [...(joueur.actif ? [joueur.actif] : []), ...joueur.banc].find((x) => x.uid === action.cible);
      zone.append(bouton(`Relève · ${options.bib.personnages.get(partie.cartes[action.carte]!)?.nom ?? 'Éveillé'} → ${p ? options.bib.personnages.get(p.id)?.nom : 'personnage'}`, 'combat-action-releve', () => faireAction(partie, action)));
    }
    const talents = actions.filter((a): a is Extract<Action, { type: 'talent' }> => a.type === 'talent');
    for (const action of talents) {
      const p = [...(joueur.actif ? [joueur.actif] : []), ...joueur.banc].find((x) => x.uid === action.source);
      const fiche = p && options.bib.personnages.get(p.id);
      zone.append(bouton(`Talent · ${fiche?.talent?.nom ?? fiche?.nom ?? 'Talent'}${texteChoix(action, options.bib, partie)}`, 'combat-action-secondaire', () => faireAction(partie, action)));
    }
    const soutiens = actions.filter((a): a is Extract<Action, { type: 'jouer' }> => a.type === 'jouer');
    for (const action of soutiens) {
      const nom = options.bib.soutiens.get(partie.cartes[action.carte]!)?.nom ?? 'Soutien';
      zone.append(bouton(`Jouer · ${nom}${texteChoix(action, options.bib, partie)}`, 'combat-action-secondaire', () => faireAction(partie, action)));
    }
    const replis = actions.filter((a): a is Extract<Action, { type: 'repli' }> => a.type === 'repli');
    for (const action of replis) {
      const perso = joueur.banc.find((x) => x.uid === action.cible);
      zone.append(bouton(`Se replier avec ${perso ? options.bib.personnages.get(perso.id)?.nom : 'le banc'}`, 'combat-action-secondaire', () => faireAction(partie, action)));
    }
    const attaques = actions.filter((a): a is Extract<Action, { type: 'attaquer' }> => a.type === 'attaquer');
    for (const action of attaques) {
      const attaque = options.bib.personnages.get(joueur.actif!.id)!.attaques[action.attaque]!;
      const choix = texteChoix(action, options.bib, partie);
      zone.append(bouton(`${attaque.nom} · ${attaque.degats || attaque.effet || 'effet'}${choix}`, 'combat-action-attaque', () => faireAction(partie, action)));
    }
    panneau.append(zone);
    if (joueur.energie && !joueur.tour.energieAttachee && actions.some((a) => a.type === 'attacher')) {
      const guide = el('p', 'combat-guide-energie', `Glisse l’énergie ${ELEMENTS[joueur.energie].nom} sur un personnage, ou touche « Attacher ici ».`);
      panneau.prepend(guide);
    }
    if (joueur.actif) {
      const fiche = options.bib.personnages.get(joueur.actif.id)!;
      const payables = new Set(attaques.map((a) => a.attaque));
      const inaccessibles = fiche.attaques.map((attaque, index) => ({ attaque, index })).filter((x) => !payables.has(x.index));
      if (inaccessibles.length) {
        const liste = el('div', 'combat-attaques-inaccessibles');
        liste.append(el('span', 'combat-zone-label', 'Attaques indisponibles'));
        for (const { attaque, index } of inaccessibles) {
          const manque = coutManquant(joueur.actif.energies, attaque.cout);
          const raison = manque.length ? `Manque : ${manque.map((e) => ELEMENTS[e as keyof typeof ELEMENTS]?.nom ?? e).join(', ')}` : 'Indisponible ce tour';
          const b = bouton(`${attaque.nom} · ${attaque.degats || attaque.effet || 'effet'} · ${raison}`, 'combat-action-inaccessible', () => undefined);
          b.disabled = true;
          b.dataset.attaque = String(index);
          liste.append(b);
        }
        panneau.append(liste);
      }
    }
    const passer = actions.find((a): a is Extract<Action, { type: 'passer' }> => a.type === 'passer');
    if (passer) panneau.append(bouton('Terminer le tour', 'combat-bouton-principal', () => faireAction(partie, passer)));
    root.append(panneau);
  }

  function afficherJournal(messages: string[]): void {
    const journal = el('aside', 'combat-journal');
    journal.append(el('h2', undefined, 'Journal de l’IA'));
    if (!messages.length) journal.append(el('p', undefined, 'Les actions de l’IA apparaîtront ici.'));
    else {
      const liste = el('ol');
      for (const messageIA of messages.slice(-6).reverse()) liste.append(el('li', undefined, messageIA));
      journal.append(liste);
    }
    root.append(journal);
  }

  function ouvrirInspection(id: string): void {
    const perso = options.bib.personnages.get(id);
    const soutien = options.bib.soutiens.get(id);
    const dialogue = el('dialog', 'combat-inspection');
    const fermer = bouton('Fermer', 'combat-bouton-secondaire', () => dialogue.close());
    dialogue.append(el('button', 'combat-inspection-fermer', '×'));
    const boutonX = dialogue.querySelector('button')!;
    boutonX.type = 'button';
    boutonX.setAttribute('aria-label', 'Fermer les détails');
    boutonX.addEventListener('click', () => dialogue.close());
    if (perso) {
      dialogue.append(el('p', 'combat-surtitre', `${perso.serie} · ${perso.element}`), el('h2', undefined, perso.nom),
        el('p', 'combat-inspection-vie', `${perso.type === 'eveille' ? 'Éveillé' : perso.type === 'heros' ? 'Héros' : 'Base'} · ${perso.pv} PV · Repli ${perso.repli}`));
      if (perso.talent) dialogue.append(el('p', 'combat-inspection-texte', `Talent · ${perso.talent.nom} : ${perso.talent.texte}`));
      for (const attaque of perso.attaques) dialogue.append(el('p', 'combat-inspection-texte', `${attaque.nom} · ${afficherCout(attaque.cout)} · ${attaque.degats || attaque.effet || 'Sans dégâts directs'}`));
    } else if (soutien) {
      dialogue.append(el('p', 'combat-surtitre', soutien.type.toUpperCase()), el('h2', undefined, soutien.nom), el('p', 'combat-inspection-texte', soutien.texte));
    }
    dialogue.append(fermer);
    dialogue.addEventListener('click', (event) => { if (event.target === dialogue) dialogue.close(); });
    root.append(dialogue);
    dialogue.showModal();
  }

  afficher();
  window.setTimeout(programmerIA, 0);
  return root;
}

function libellePhase(phase: Partie['phase']): string {
  return phase === 'mise-en-place' ? 'Mise en place' : phase === 'choix-premier' ? 'Choix du premier joueur' : phase === 'fin' ? 'Partie terminée' : 'Combat';
}

function classesAnimation(journal: Evenement[]): string {
  const types = new Set(journal.map((e) => e.type));
  if (types.has('ko')) return 'animation-ko';
  if (types.has('releve')) return 'animation-releve';
  if (types.has('attaque') || types.has('degats')) return 'animation-attaque';
  if (types.has('tour') || types.has('commencer')) return 'animation-tour';
  return '';
}
