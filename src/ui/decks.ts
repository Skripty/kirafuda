// Écran Decks : la liste des decks (tuiles avec leurs cartes en éventail), puis l'éditeur d'un deck.
// Éditeur : les 20 emplacements du deck en haut (toucher une carte la retire), les cartes possédées en dessous
// (toucher une carte l'ajoute). Tout est enregistré à chaque geste (src/core/combat/decks-joueur.ts pour les règles).
import './decks.css';
import type { Bibliotheque } from '../core/combat/etat';
import { elementsDe, seriesDe } from '../core/combat/decks';
import { completerDeck, construireDeckAuto, nomDeckAuto, personnagesParElement, type CritereDeck } from '../core/combat/deck-auto';
import { exemplairesParPersonnage, MAX_DECKS_JOUEUR, validerDeckPossede } from '../core/combat/decks-joueur';
import type { DeckEnregistre, ElementId, Extension, Personnage, Sauvegarde } from '../core/types';
import { ELEMENTS } from '../core/regles';
import { creerVisuelsCombat } from './cartes-combat';
import { iconeElement } from './element';

export interface OptionsDecks {
  sauvegarde: Sauvegarde;
  bib: Bibliotheque;
  extensions: Extension[];
  enregistrer: (sauvegarde: Sauvegarde) => Sauvegarde | null;
}

const TAILLE_DECK = 20;
const MAX_EXEMPLAIRES = 2;
const ELEMENTS_ENERGIE = (Object.keys(ELEMENTS) as ElementId[]).filter((id) => id !== 'neutre');
const TYPES: Record<string, string> = { base: 'Base', eveille: 'Éveillé', heros: 'Héros', objet: 'Objet', soutien: 'Soutien', terrain: 'Terrain' };

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

function creerId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `deck-${Date.now().toString(36)}`;
}

export function creerEcranDecks(options: OptionsDecks): HTMLElement {
  const { bib } = options;
  let sauvegarde = options.sauvegarde;
  const visuels = creerVisuelsCombat(bib, options.extensions);
  const exemplaires = exemplairesParPersonnage(sauvegarde, options.extensions);
  /** Exemplaires possédés d'une carte de deck (personnage ou carte Soutien). */
  const possedes = (id: string): number => (bib.personnages.has(id) ? exemplaires.get(id) ?? 0 : sauvegarde.collection[id] ?? 0);
  const carteBase = new Map<string, string>();
  for (const extension of options.extensions) for (const carte of extension.cartes) {
    if (!carte.secrete && !carteBase.has(carte.personnage)) carteBase.set(carte.personnage, carte.id);
  }
  const personnages = [...bib.personnages.values()].filter((p) => possedes(p.id) > 0)
    .sort((a, b) => a.serie.localeCompare(b.serie, 'fr') || a.nom.localeCompare(b.nom, 'fr'));
  const soutiens = [...bib.soutiens.values()].filter((s) => possedes(s.id) > 0).sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0));
  const possedees = new Set<string>([...personnages.map((p) => p.id), ...soutiens.map((s) => s.id)]);
  /** Ordre d'affichage du deck : personnages (Bases et Héros, puis Éveillés), puis cartes Soutien. */
  const rang = (id: string): number => {
    const p = bib.personnages.get(id);
    return p ? (p.type === 'eveille' ? 1 : 0) : 2;
  };
  const trier = (cartes: string[]): string[] => [...cartes].sort((a, b) => rang(a) - rang(b) || visuels.nom(a).localeCompare(visuels.nom(b), 'fr'));

  let editionId: string | null = null;
  let annonce = '';
  let filtreNature: 'tout' | 'personnage' | 'soutien' = 'tout';
  let filtreSerie = '';
  let filtreElement = '';
  const racine = el('main', 'decks-page');
  const dialogue = el('dialog', 'decks-inspection');
  dialogue.addEventListener('click', (e) => { if (e.target === dialogue) dialogue.close(); });

  const erreursDe = (deck: DeckEnregistre): string[] => validerDeckPossede({ nom: deck.nom, cartes: deck.cartes, elements: deck.elements }, bib, possedees);

  function ecrire(nouvelle: Sauvegarde): boolean {
    const ecrite = options.enregistrer(nouvelle);
    if (!ecrite) { annonce = 'La sauvegarde a échoué. Vérifie le stockage puis réessaie.'; return false; }
    sauvegarde = ecrite;
    annonce = '';
    return true;
  }

  function modifierDeck(id: string, changer: (deck: DeckEnregistre) => DeckEnregistre): boolean {
    return ecrire({ ...sauvegarde, decks: sauvegarde.decks.map((deck) => (deck.id === id ? changer(deck) : deck)) });
  }

  function creerDeck(): void {
    if (sauvegarde.decks.length >= MAX_DECKS_JOUEUR) return;
    const id = creerId();
    const deck: DeckEnregistre = { id, nom: `Deck ${sauvegarde.decks.length + 1}`, couverture: '', cartes: [], elements: ['feu'] };
    if (ecrire({ ...sauvegarde, decks: [...sauvegarde.decks, deck] })) editionId = id;
    afficher();
  }

  /** Deck automatique : construit à partir de la collection autour d'un type ou d'une série, puis ouvert. */
  function creerDeckAuto(critere: CritereDeck): void {
    if (sauvegarde.decks.length >= MAX_DECKS_JOUEUR) return;
    const r = construireDeckAuto(critere, bib, possedes);
    if (!r) return;
    const id = creerId();
    const premier = r.deck.cartes.find((c) => carteBase.has(c));
    const deck: DeckEnregistre = { id, nom: nomDeckAuto(critere), couverture: premier ? carteBase.get(premier)! : '', cartes: r.deck.cartes, elements: r.deck.elements };
    dialogue.close();
    if (ecrire({ ...sauvegarde, decks: [...sauvegarde.decks, deck] })) {
      editionId = id;
      annonce = r.manque > 0
        ? `Ta collection ne suffit pas encore : il manque ${r.manque} carte${r.manque > 1 ? 's' : ''}. Ouvre des boosters ou complète avec d’autres cartes.`
        : '';
    }
    afficher();
  }

  /** Choix du type (ou de la série) d'un deck automatique. */
  function choisirDeckAuto(): void {
    const parElement = personnagesParElement(bib, possedes);
    const contenu = el('div', 'decks-auto');
    const titre = el('h2', undefined, 'Deck automatique');
    titre.id = 'decks-auto-titre';
    dialogue.setAttribute('aria-labelledby', titre.id);
    contenu.append(titre, el('p', 'decks-inspection-detail', 'Choisis un type : le deck est construit avec tes meilleures cartes de ce type, puis complété par des cartes Soutien. Tu pourras le modifier ensuite.'));
    const types = el('div', 'decks-auto-types');
    for (const e of (Object.keys(ELEMENTS) as ElementId[])) {
      const n = parElement.get(e);
      const b = bouton('', 'decks-auto-type', () => creerDeckAuto({ element: e }));
      b.disabled = !n || n.posables === 0;
      b.setAttribute('aria-label', `Deck ${ELEMENTS[e].nom}, ${n?.total ?? 0} personnage${(n?.total ?? 0) > 1 ? 's' : ''} possédé${(n?.total ?? 0) > 1 ? 's' : ''}`);
      b.append(iconeElement(e, 'decks-auto-icone', null), el('strong', undefined, ELEMENTS[e].nom),
        el('span', undefined, !n ? 'Aucune carte' : n.posables === 0 ? 'Aucun Base' : `${n.total} perso${n.total > 1 ? 's' : ''}`));
      types.append(b);
    }
    const parSerie = el('label', 'decks-auto-serie');
    const select = el('select');
    const vide = el('option', undefined, 'Ou par série…');
    vide.value = '';
    select.append(vide);
    for (const s of seriesDe(bib)) {
      if (!personnages.some((p) => p.serie === s && p.type !== 'eveille')) continue;
      const o = el('option', undefined, s);
      o.value = s;
      select.append(o);
    }
    select.addEventListener('change', () => { if (select.value) creerDeckAuto({ serie: select.value }); });
    parSerie.append(select);
    contenu.append(types, parSerie, bouton('Annuler', 'decks-bouton', () => dialogue.close()));
    dialogue.replaceChildren(contenu);
    if (!dialogue.open) dialogue.showModal();
  }

  function copierDeck(id: string): void {
    const source = sauvegarde.decks.find((d) => d.id === id);
    if (!source || sauvegarde.decks.length >= MAX_DECKS_JOUEUR) return;
    const copie: DeckEnregistre = { ...source, id: creerId(), nom: `${source.nom} (copie)`.slice(0, 40), cartes: [...source.cartes], elements: [...source.elements] };
    ecrire({ ...sauvegarde, decks: [...sauvegarde.decks, copie] });
    afficher();
  }

  function supprimerDeck(id: string): void {
    const deck = sauvegarde.decks.find((d) => d.id === id);
    if (!deck || !window.confirm(`Supprimer le deck « ${deck.nom} » ?`)) return;
    ecrire({ ...sauvegarde, decks: sauvegarde.decks.filter((d) => d.id !== id), deckSelectionne: sauvegarde.deckSelectionne === id ? null : sauvegarde.deckSelectionne });
    if (editionId === id) editionId = null;
    afficher();
  }

  function inspecter(id: string): void {
    const p = bib.personnages.get(id);
    const s = bib.soutiens.get(id);
    const contenu = el('div', 'decks-inspection-contenu');
    const carte = el('div', 'decks-inspection-carte');
    carte.append(visuels.visuel(id, true));
    const titre = el('h2', undefined, visuels.nom(id));
    titre.id = 'decks-inspection-titre';
    dialogue.setAttribute('aria-labelledby', titre.id);
    const detail = el('p', 'decks-inspection-detail', p ? `${p.serie} · ${TYPES[p.type]} · ${ELEMENTS[p.element].nom} · ${p.pv} PV` : s ? `${TYPES[s.type]} · ${s.texte}` : '');
    contenu.append(titre, carte, detail, el('p', 'decks-inspection-detail', `Tu en possèdes ${possedes(id)}.`), bouton('Fermer', 'decks-bouton', () => dialogue.close()));
    dialogue.replaceChildren(contenu);
    if (!dialogue.open) dialogue.showModal();
  }

  /** Pastilles des éléments d'énergie d'un deck. */
  function pastillesElements(elements: ElementId[]): HTMLElement {
    const groupe = el('span', 'decks-pastilles');
    for (const e of elements) groupe.append(iconeElement(e, 'decks-pastille'));
    return groupe;
  }

  // ---------- Liste des decks ----------
  function afficherListe(): void {
    const entete = el('header', 'decks-entete');
    const retour = el('a', 'decks-retour', '‹ Accueil');
    retour.href = '#/';
    const titre = el('div', 'decks-titre');
    titre.append(el('h1', undefined, 'Mes decks'), el('span', 'decks-compte', `${sauvegarde.decks.length} / ${MAX_DECKS_JOUEUR}`));
    entete.append(retour, titre, el('p', 'decks-intro', 'Un deck : 20 cartes de ta collection et 1 à 3 éléments d’énergie. Touche un deck pour le modifier.'));

    const grille = el('div', 'decks-grille');
    for (const deck of sauvegarde.decks) {
      const erreurs = erreursDe(deck);
      const choisi = sauvegarde.deckSelectionne === deck.id;
      const tuile = el('article', `decks-tuile${choisi ? ' choisi' : ''}`);
      const ouvrir = bouton('', 'decks-tuile-ouvrir', () => { editionId = deck.id; afficher(); });
      ouvrir.setAttribute('aria-label', `Modifier le deck ${deck.nom}, ${deck.cartes.length} cartes sur ${TAILLE_DECK}`);
      // Éventail : la carte de couverture devant, deux autres personnages du deck derrière.
      const eventail = el('span', 'decks-eventail');
      const couverture = [...carteBase].find(([, carteId]) => carteId === deck.couverture)?.[0];
      const distincts = [...new Set(trier(deck.cartes))].filter((id) => id !== couverture);
      const montrees = [...distincts.slice(0, 2), ...(couverture ? [couverture] : distincts.slice(2, 3))];
      if (!montrees.length) eventail.append(el('span', 'decks-eventail-vide', 'Deck vide'));
      montrees.forEach((id, i) => {
        const carte = el('span', `decks-eventail-carte pos-${montrees.length - 1 - i}`);
        carte.append(visuels.visuel(id));
        eventail.append(carte);
      });
      const infos = el('span', 'decks-tuile-infos');
      const ligne = el('span', 'decks-tuile-ligne');
      ligne.append(el('span', 'decks-tuile-compte', `${deck.cartes.length}/${TAILLE_DECK}`), pastillesElements(deck.elements));
      infos.append(el('strong', undefined, deck.nom), ligne,
        el('span', erreurs.length ? 'decks-etat incomplet' : 'decks-etat pret', erreurs.length ? 'À compléter' : choisi ? 'Prêt · utilisé en combat' : 'Prêt'));
      ouvrir.append(eventail, infos);

      const actions = el('div', 'decks-tuile-actions');
      const utiliser = bouton(choisi ? 'Utilisé en combat' : 'Utiliser', 'decks-mini', () => {
        ecrire({ ...sauvegarde, deckSelectionne: deck.id });
        afficher();
      });
      utiliser.disabled = choisi || erreurs.length > 0;
      if (erreurs.length) utiliser.title = 'Complète le deck pour l’utiliser en combat.';
      const copier = bouton('Copier', 'decks-mini', () => copierDeck(deck.id));
      copier.disabled = sauvegarde.decks.length >= MAX_DECKS_JOUEUR;
      actions.append(utiliser, copier, bouton('Supprimer', 'decks-mini decks-supprimer', () => supprimerDeck(deck.id)));
      tuile.append(ouvrir, actions);
      grille.append(tuile);
    }
    if (sauvegarde.decks.length < MAX_DECKS_JOUEUR) {
      const auto = bouton('', 'decks-tuile decks-nouveau decks-nouveau-auto', choisirDeckAuto);
      auto.disabled = personnages.length === 0;
      auto.append(el('span', 'decks-nouveau-plus', '✦'), el('strong', undefined, 'Deck automatique'),
        el('span', undefined, personnages.length ? 'Choisis un type, le deck se construit seul' : 'Ouvre des boosters pour obtenir des cartes'));
      const nouveau = bouton('', 'decks-tuile decks-nouveau', creerDeck);
      nouveau.append(el('span', 'decks-nouveau-plus', '+'), el('strong', undefined, 'Nouveau deck'),
        el('span', undefined, sauvegarde.decks.length ? 'Pars de zéro' : 'Crée ton premier deck'));
      grille.append(auto, nouveau);
    }
    const combat = el('a', 'decks-bouton decks-lien-combat', 'Aller au combat');
    combat.href = '#/combat';
    racine.append(entete, grille, combat);
  }

  // ---------- Éditeur d'un deck ----------
  function afficherEditeur(deckInitial: DeckEnregistre): void {
    const id = deckInitial.id;
    const deck = (): DeckEnregistre => sauvegarde.decks.find((d) => d.id === id)!;
    const nombre = (carte: string): number => deck().cartes.filter((x) => x === carte).length;
    const maximum = (carte: string): number => Math.min(MAX_EXEMPLAIRES, possedes(carte));
    const peutAjouter = (carte: string): boolean => deck().cartes.length < TAILLE_DECK && nombre(carte) < maximum(carte);

    function ajouter(carte: string): void {
      if (!peutAjouter(carte)) return;
      modifierDeck(id, (d) => ({ ...d, cartes: [...d.cartes, carte], couverture: d.couverture || carteBase.get(carte) || '' }));
      majDeck();
    }
    function retirer(carte: string): void {
      modifierDeck(id, (d) => {
        const i = d.cartes.lastIndexOf(carte);
        if (i < 0) return d;
        const cartes = [...d.cartes];
        cartes.splice(i, 1);
        // La couverture suit le deck : si son personnage n'y est plus, le premier personnage restant la remplace.
        const garde = d.couverture && cartes.some((x) => carteBase.get(x) === d.couverture);
        const suivante = cartes.map((x) => carteBase.get(x)).find((x) => !!x) ?? '';
        return { ...d, cartes, couverture: garde ? d.couverture : suivante };
      });
      majDeck();
    }

    // En-tête : retour, nom, compteur.
    const barre = el('header', 'decks-barre');
    const nom = el('input', 'decks-nom');
    nom.type = 'text';
    nom.maxLength = 40;
    nom.value = deckInitial.nom;
    nom.setAttribute('aria-label', 'Nom du deck');
    nom.addEventListener('input', () => { modifierDeck(id, (d) => ({ ...d, nom: nom.value.trimStart() || 'Deck sans nom' })); });
    const compteur = el('span', 'decks-compteur');
    compteur.setAttribute('aria-live', 'polite');
    barre.append(bouton('‹ Mes decks', 'decks-bouton', () => { editionId = null; afficher(); }), nom, compteur);

    // Le deck : énergies, 20 emplacements, état.
    const panneauDeck = el('section', 'decks-panneau');
    const energies = el('div', 'decks-energies');
    energies.setAttribute('role', 'group');
    energies.setAttribute('aria-label', 'Éléments d’énergie du deck, 1 à 3');
    const emplacements = el('div', 'decks-emplacements');
    const etat = el('div', 'decks-validation');
    etat.setAttribute('aria-live', 'polite');
    const couverture = el('label', 'decks-couverture-choix');
    const selectCouverture = el('select');
    selectCouverture.addEventListener('change', () => { modifierDeck(id, (d) => ({ ...d, couverture: selectCouverture.value })); });
    couverture.append(el('span', undefined, 'Carte de couverture'), selectCouverture);
    panneauDeck.append(energies, emplacements, etat, couverture);

    // Les cartes possédées.
    const panneauCartes = el('section', 'decks-panneau');
    const titreCartes = el('h2', undefined, 'Tes cartes');
    const filtres = el('div', 'decks-filtres');
    const grille = el('div', 'decks-cartes');
    panneauCartes.append(titreCartes, filtres, grille);
    /** Ce qui change sur une carte de la collection quand le deck change. */
    const tuiles = new Map<string, { racine: HTMLElement; ajout: HTMLButtonElement; moins: HTMLButtonElement; badge: HTMLElement }>();

    function rendreFiltres(): void {
      filtres.replaceChildren();
      const natures = el('div', 'decks-onglets');
      natures.setAttribute('role', 'group');
      natures.setAttribute('aria-label', 'Catégorie de cartes');
      for (const [valeur, texte] of [['tout', 'Tout'], ['personnage', 'Personnages'], ['soutien', 'Soutiens']] as const) {
        const b = bouton(texte, 'decks-onglet', () => { filtreNature = valeur; rendreFiltres(); rendreCartes(); });
        b.setAttribute('aria-pressed', String(filtreNature === valeur));
        natures.append(b);
      }
      const choix = (libelle: string, valeur: string, valeurs: [string, string][], change: (v: string) => void): HTMLLabelElement => {
        const label = el('label', 'decks-filtre');
        const select = el('select');
        select.setAttribute('aria-label', libelle);
        for (const [v, t] of valeurs) { const o = el('option', undefined, t); o.value = v; select.append(o); }
        select.value = valeur;
        select.addEventListener('change', () => { change(select.value); rendreCartes(); });
        label.append(select);
        return label;
      };
      const series = [...new Set(personnages.map((p) => p.serie))];
      const elements = (Object.keys(ELEMENTS) as ElementId[]).filter((e) => personnages.some((p) => p.element === e));
      filtres.append(natures);
      if (filtreNature !== 'soutien') filtres.append(
        choix('Série', filtreSerie, [['', 'Toutes les séries'], ...series.map((s): [string, string] => [s, s])], (v) => { filtreSerie = v; }),
        choix('Élément', filtreElement, [['', 'Tous les éléments'], ...elements.map((e): [string, string] => [e, ELEMENTS[e].nom])], (v) => { filtreElement = v; }),
      );
    }

    function tuile(carte: string, sousTitre: string): HTMLElement {
      const racineTuile = el('div', 'decks-carte');
      const ajout = bouton('', 'decks-carte-ajout', () => ajouter(carte));
      ajout.append(visuels.visuel(carte));
      const badge = el('span', 'decks-carte-badge');
      const moins = bouton('−', 'decks-carte-moins', () => retirer(carte));
      moins.setAttribute('aria-label', `Retirer un exemplaire de ${visuels.nom(carte)}`);
      const info = bouton('i', 'decks-carte-info', () => inspecter(carte));
      info.setAttribute('aria-label', `Détails de ${visuels.nom(carte)}`);
      const pied = el('div', 'decks-carte-pied');
      pied.append(moins, badge, info);
      racineTuile.append(ajout, el('span', 'decks-carte-nom', visuels.nom(carte)), el('span', 'decks-carte-detail', sousTitre), pied);
      tuiles.set(carte, { racine: racineTuile, ajout, moins, badge });
      return racineTuile;
    }

    function rendreCartes(): void {
      tuiles.clear();
      grille.replaceChildren();
      if (filtreNature !== 'soutien') for (const p of personnages) {
        if ((filtreSerie && p.serie !== filtreSerie) || (filtreElement && p.element !== filtreElement)) continue;
        grille.append(tuile(p.id, `${p.serie} · ${TYPES[p.type]}`));
      }
      // Les filtres de série et d'élément ne concernent que les personnages.
      if (filtreNature !== 'personnage' && !(filtreNature === 'tout' && (filtreSerie || filtreElement))) for (const s of soutiens) grille.append(tuile(s.id, TYPES[s.type]!));
      if (!grille.childElementCount) {
        grille.append(el('p', 'decks-cartes-vide', possedees.size === 0
          ? 'Ta collection est vide : ouvre des boosters pour obtenir des cartes.'
          : filtreNature === 'soutien' ? 'Aucune carte Soutien dans ta collection pour l’instant : elles se trouvent dans les boosters.'
            : 'Aucune carte possédée ne correspond à ces filtres.'));
      }
      titreCartes.textContent = `Tes cartes · ${grille.querySelectorAll('.decks-carte').length}`;
      majTuiles();
    }

    function majTuiles(): void {
      for (const [carte, t] of tuiles) {
        const n = nombre(carte);
        const max = maximum(carte);
        t.badge.textContent = `${n}/${max}`;
        t.racine.classList.toggle('dans-deck', n > 0);
        t.racine.classList.toggle('complet', !peutAjouter(carte));
        t.moins.disabled = n === 0;
        t.ajout.disabled = !peutAjouter(carte);
        t.ajout.setAttribute('aria-label', `Ajouter ${visuels.nom(carte)} au deck (${n} sur ${max})`);
      }
    }

    function majDeck(): void {
      const d = deck();
      compteur.textContent = `${d.cartes.length} / ${TAILLE_DECK}`;
      compteur.classList.toggle('plein', d.cartes.length === TAILLE_DECK);

      // Énergies : une pastille par élément, 3 au plus.
      energies.replaceChildren(el('span', 'decks-energies-titre', 'Énergies'));
      for (const e of ELEMENTS_ENERGIE) {
        const actif = d.elements.includes(e);
        const b = bouton('', 'decks-energie', () => {
          const selection = new Set(deck().elements);
          if (selection.has(e)) selection.delete(e); else selection.add(e);
          modifierDeck(id, (x) => ({ ...x, elements: ELEMENTS_ENERGIE.filter((y) => selection.has(y)) }));
          majDeck();
        });
        b.setAttribute('aria-pressed', String(actif));
        b.setAttribute('aria-label', `Énergie ${ELEMENTS[e].nom}`);
        b.title = ELEMENTS[e].nom;
        b.disabled = !actif && d.elements.length >= 3;
        b.append(iconeElement(e, 'decks-energie-icone', null), el('span', undefined, ELEMENTS[e].nom));
        energies.append(b);
      }
      const completer = bouton('Compléter automatiquement', 'decks-mini decks-completer', () => {
        const r = completerDeck(deck(), bib, possedes);
        modifierDeck(id, (x) => ({ ...x, cartes: r.deck.cartes, elements: r.deck.elements,
          couverture: x.couverture || (r.deck.cartes.map((c) => carteBase.get(c)).find((c) => !!c) ?? '') }));
        annonce = r.manque > 0 ? `Il manque encore ${r.manque} carte${r.manque > 1 ? 's' : ''} : ta collection ne suffit pas.` : '';
        majDeck();
      });
      completer.disabled = possedees.size === 0;
      energies.append(bouton('Suggérer', 'decks-mini', () => {
        const persos = deck().cartes.map((c) => bib.personnages.get(c)).filter((p): p is Personnage => !!p);
        if (!persos.length) return;
        modifierDeck(id, (x) => ({ ...x, elements: elementsDe(persos) }));
        majDeck();
      }));

      // Les 20 emplacements : les cartes du deck, puis les places libres.
      emplacements.replaceChildren();
      const cartes = trier(d.cartes);
      for (let i = 0; i < TAILLE_DECK; i++) {
        const carte = cartes[i];
        if (!carte) { emplacements.append(el('span', 'decks-emplacement vide', String(i + 1))); continue; }
        const b = bouton('', 'decks-emplacement', () => retirer(carte));
        b.setAttribute('aria-label', `Retirer ${visuels.nom(carte)} du deck`);
        b.title = `${visuels.nom(carte)} — toucher pour retirer`;
        b.append(visuels.visuel(carte));
        emplacements.append(b);
      }

      const erreurs = erreursDe(d);
      etat.className = erreurs.length ? 'decks-validation incomplet' : 'decks-validation pret';
      etat.replaceChildren(el('strong', undefined, erreurs.length ? 'Deck à compléter' : 'Deck prêt pour le combat'));
      if (erreurs.length) {
        const ul = el('ul');
        for (const e of erreurs) ul.append(el('li', undefined, e));
        etat.append(ul);
        if (d.cartes.length < TAILLE_DECK) etat.append(completer);
      }
      else if (sauvegarde.deckSelectionne !== id) etat.append(bouton('Utiliser en combat', 'decks-mini', () => { ecrire({ ...sauvegarde, deckSelectionne: id }); majDeck(); }));
      else etat.append(el('span', undefined, 'C’est le deck utilisé en combat.'));
      if (annonce) etat.append(el('p', 'decks-annonce', annonce));

      selectCouverture.replaceChildren();
      const distincts = [...new Set(cartes.filter((c) => carteBase.has(c)))];
      if (!distincts.length) { const o = el('option', undefined, 'Ajoute un personnage'); o.value = ''; selectCouverture.append(o); }
      for (const c of distincts) { const o = el('option', undefined, visuels.nom(c)); o.value = carteBase.get(c)!; selectCouverture.append(o); }
      selectCouverture.value = d.couverture;
      selectCouverture.disabled = distincts.length === 0;
      majTuiles();
    }

    racine.append(barre, panneauDeck, panneauCartes,
      el('p', 'decks-enregistre', 'Enregistré automatiquement. Touche une carte pour l’ajouter, touche une carte du deck pour la retirer.'));
    rendreFiltres();
    rendreCartes();
    majDeck();
  }

  function afficher(): void {
    racine.replaceChildren();
    const deck = editionId ? sauvegarde.decks.find((d) => d.id === editionId) : undefined;
    racine.classList.toggle('edition', !!deck);
    if (deck) afficherEditeur(deck);
    else { editionId = null; afficherListe(); }
    if (annonce && !deck) { const alerte = el('p', 'decks-annonce', annonce); alerte.setAttribute('role', 'status'); racine.prepend(alerte); }
    racine.append(dialogue);
    window.scrollTo(0, 0);
  }

  afficher();
  return racine;
}
