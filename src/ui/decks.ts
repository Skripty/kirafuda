import './decks.css';
import type { Bibliotheque } from '../core/combat/etat';
import { elementsDe } from '../core/combat/decks';
import { exemplairesParPersonnage, MAX_DECKS_JOUEUR, validerDeckPossede } from '../core/combat/decks-joueur';
import type { DeckEnregistre, Extension, Sauvegarde } from '../core/types';
import { ELEMENTS } from '../core/regles';

export interface OptionsDecks {
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
  const b = el('button', classe, texte); b.type = 'button'; b.addEventListener('click', action); return b;
}

function creerId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `deck-${Date.now().toString(36)}`;
}

export function creerEcranDecks(options: OptionsDecks): HTMLElement {
  let sauvegarde = options.sauvegarde;
  const personnages = [...options.bib.personnages.values()].sort((a, b) => a.serie.localeCompare(b.serie, 'fr') || a.nom.localeCompare(b.nom, 'fr'));
  const soutiens = [...options.bib.soutiens.values()].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  const exemplaires = exemplairesParPersonnage(sauvegarde, options.extensions);
  const carteBase = new Map<string, string>();
  for (const extension of options.extensions) for (const carte of extension.cartes) {
    if (!carte.secrete && !carteBase.has(carte.personnage)) carteBase.set(carte.personnage, carte.id);
  }
  const images = new Map(options.extensions.flatMap((extension) => extension.cartes.map((carte) => [carte.id, carte.id] as const)));
  let editionId = sauvegarde.deckSelectionne ?? sauvegarde.decks[0]?.id ?? null;
  let annonce = '';
  let filtreSerie = '';
  let filtreElement = '';
  let filtreNature = 'personnage';
  let filtreType = '';
  const racine = el('main', 'decks-page');

  function courant(): DeckEnregistre | null { return sauvegarde.decks.find((d) => d.id === editionId) ?? null; }

  function ecrire(nouvelle: Sauvegarde, rendre = true): boolean {
    const ecrite = options.enregistrer(nouvelle);
    if (!ecrite) { annonce = 'La sauvegarde a échoué. Vérifie le stockage puis réessaie.'; if (rendre) afficher(); return false; }
    sauvegarde = ecrite;
    annonce = '';
    return true;
  }

  function modifierDeck(id: string, changer: (deck: DeckEnregistre) => DeckEnregistre, rendre = true): void {
    const decks = sauvegarde.decks.map((deck) => deck.id === id ? changer(deck) : deck);
    ecrire({ ...sauvegarde, decks }, rendre);
  }

  function creerDeck(): void {
    if (sauvegarde.decks.length >= MAX_DECKS_JOUEUR) return;
    const id = creerId();
    const deck: DeckEnregistre = { id, nom: `Deck ${sauvegarde.decks.length + 1}`, couverture: '', cartes: [], elements: ['feu'] };
    editionId = id;
    if (ecrire({ ...sauvegarde, decks: [...sauvegarde.decks, deck], deckSelectionne: id })) afficher();
  }

  function copierDeck(id: string): void {
    if (sauvegarde.decks.length >= MAX_DECKS_JOUEUR) return;
    const source = sauvegarde.decks.find((d) => d.id === id);
    if (!source) return;
    const copie: DeckEnregistre = { ...source, id: creerId(), nom: `${source.nom} (copie)`.slice(0, 40), cartes: [...source.cartes], elements: [...source.elements] };
    editionId = copie.id;
    if (ecrire({ ...sauvegarde, decks: [...sauvegarde.decks, copie], deckSelectionne: copie.id })) afficher();
  }

  function supprimerDeck(id: string): void {
    const deck = sauvegarde.decks.find((d) => d.id === id);
    if (!deck || !window.confirm(`Supprimer le deck « ${deck.nom} » ?`)) return;
    const decks = sauvegarde.decks.filter((d) => d.id !== id);
    editionId = decks[0]?.id ?? null;
    if (ecrire({ ...sauvegarde, decks, deckSelectionne: sauvegarde.deckSelectionne === id ? editionId : sauvegarde.deckSelectionne })) afficher();
  }

  function choisirDeck(id: string): void {
    editionId = id;
    if (ecrire({ ...sauvegarde, deckSelectionne: id })) afficher();
  }

  function afficher(): void {
    racine.replaceChildren();
    const entete = el('header', 'decks-entete');
    const retour = el('a', 'decks-retour', '‹ Accueil'); retour.href = '#/';
    entete.append(retour, el('p', 'decks-surtitre', 'COMBAT • PRÉPARATION'), el('h1', undefined, 'Decks'),
      el('p', 'decks-intro', 'Construis et enregistre jusqu’à dix decks. Les modifications sont sauvegardées automatiquement.'));
    const corps = el('div', 'decks-corps');

    const liste = el('aside', 'decks-liste');
    const listeTete = el('div', 'decks-liste-tete');
    listeTete.append(el('h2', undefined, `Mes decks · ${sauvegarde.decks.length}/${MAX_DECKS_JOUEUR}`), bouton('+ Nouveau deck', 'decks-bouton decks-bouton-principal', creerDeck));
    liste.append(listeTete);
    if (!sauvegarde.decks.length) liste.append(el('p', 'decks-vide', 'Aucun deck enregistré. Crée ton premier deck pour commencer.'));
    for (const deck of sauvegarde.decks) {
      const item = el('article', deck.id === editionId ? 'decks-ligne choisi' : 'decks-ligne');
      const ouvrir = bouton('', 'decks-ligne-ouvrir', () => choisirDeck(deck.id));
      const image = el('span', 'decks-couverture');
      const imgId = deck.couverture;
      if (images.has(imgId)) { const img = el('img'); img.src = `${import.meta.env.BASE_URL}cartes/${imgId}/illustration.webp`; img.alt = ''; img.onerror = () => { img.remove(); image.textContent = 'K'; }; image.append(img); }
      else image.textContent = 'K';
      const info = el('span', 'decks-ligne-info');
      info.append(el('strong', undefined, deck.nom), el('small', undefined, `${deck.cartes.length}/20 cartes${sauvegarde.deckSelectionne === deck.id ? ' · choisi en combat' : ''}`));
      ouvrir.append(image, info);
      const actions = el('div', 'decks-ligne-actions');
      const copier = bouton('Copier', 'decks-mini', () => copierDeck(deck.id)); copier.disabled = sauvegarde.decks.length >= MAX_DECKS_JOUEUR;
      const supprimer = bouton('Supprimer', 'decks-mini decks-supprimer', () => supprimerDeck(deck.id));
      actions.append(copier, supprimer); item.append(ouvrir, actions); liste.append(item);
    }

    const contenu = el('section', 'decks-contenu');
    const deck = courant();
    if (!deck) {
      const demarrer = el('div', 'decks-demarrage');
      demarrer.append(el('h2', undefined, 'Crée un deck pour commencer'),
        el('p', undefined, 'Ajoute des personnages possédés, choisis ses éléments d’énergie et complète les 20 cartes.'));
      contenu.append(demarrer);
    } else {
      const enteteDeck = el('div', 'decks-editeur-tete');
      const nomLabel = el('label', 'decks-champ'); nomLabel.append(el('span', undefined, 'Nom du deck'));
      const nom = el('input'); nom.type = 'text'; nom.maxLength = 40; nom.value = deck.nom; nom.setAttribute('aria-label', 'Nom du deck');
      nom.addEventListener('input', () => modifierDeck(deck.id, (d) => ({ ...d, nom: nom.value.trimStart() || 'Deck sans nom' }), false));
      nomLabel.append(nom);

      const couverture = el('label', 'decks-champ'); couverture.append(el('span', undefined, 'Carte de couverture'));
      const selectCouverture = el('select');
      const vide = el('option', undefined, 'Choisir dans les cartes du deck'); vide.value = ''; selectCouverture.append(vide);
      const personnagesDuDeck = [...new Set(deck.cartes.filter((id) => options.bib.personnages.has(id)))];
      for (const id of personnagesDuDeck) {
        const carteId = carteBase.get(id); if (!carteId) continue;
        const option = el('option', undefined, options.bib.personnages.get(id)!.nom); option.value = carteId; selectCouverture.append(option);
      }
      selectCouverture.value = deck.couverture;
      selectCouverture.addEventListener('change', () => modifierDeck(deck.id, (d) => ({ ...d, couverture: selectCouverture.value }), false));
      couverture.append(selectCouverture);
      const sommaire = el('div', 'decks-compteur');
      sommaire.append(el('strong', undefined, `${deck.cartes.length}/20`), el('span', undefined, 'cartes'));
      const suggestion = bouton('Suggérer les éléments', 'decks-bouton decks-bouton-secondaire', () => {
        const elements = elementsDe(deck.cartes.map((id) => options.bib.personnages.get(id)).filter((p): p is NonNullable<typeof p> => !!p));
        modifierDeck(deck.id, (d) => ({ ...d, elements }));
      });
      enteteDeck.append(nomLabel, couverture, sommaire, suggestion);
      contenu.append(enteteDeck);

      const energie = el('fieldset', 'decks-energies'); energie.append(el('legend', undefined, 'Éléments d’énergie · 1 à 3'));
      const choixElements = el('div', 'decks-elements');
      const elementIds = Object.keys(ELEMENTS).filter((id) => id !== 'neutre') as import('../core/types').ElementId[];
      for (const id of elementIds) {
        const label = el('label', 'decks-element'); const input = el('input'); input.type = 'checkbox'; input.value = id; input.checked = deck.elements.includes(id);
        input.disabled = !input.checked && deck.elements.length >= 3;
        label.append(input, el('span', undefined, ELEMENTS[id].nom));
        input.addEventListener('change', () => {
          const selection = new Set(deck.elements); if (input.checked) selection.add(id); else selection.delete(id);
          modifierDeck(deck.id, (d) => ({ ...d, elements: elementIds.filter((e) => selection.has(e)) }));
        });
        choixElements.append(label);
      }
      energie.append(choixElements); contenu.append(energie);

      const deckMoteur = { nom: deck.nom, cartes: deck.cartes, elements: deck.elements };
      const possedees = new Set<string>([
        ...personnages.filter((p) => (exemplaires.get(p.id) ?? 0) > 0).map((p) => p.id),
        ...soutiens.filter((s) => (sauvegarde.collection[s.id] ?? 0) > 0).map((s) => s.id),
      ]);
      const erreurs = validerDeckPossede(deckMoteur, options.bib, possedees);
      const validation = el('div', erreurs.length ? 'decks-validation invalid' : 'decks-validation valide');
      validation.setAttribute('aria-live', 'polite');
      validation.append(el('strong', undefined, erreurs.length ? 'Deck à compléter' : 'Deck prêt pour le combat'));
      if (erreurs.length) { const ul = el('ul'); for (const erreur of erreurs) ul.append(el('li', undefined, erreur)); validation.append(ul); }
      contenu.append(validation);

      const filtres = el('div', 'decks-filtres');
      const filtre = (texte: string, valeur: string, valeurs: [string, string][], change: (val: string) => void): HTMLLabelElement => {
        const label = el('label', 'decks-filtre'); label.append(el('span', undefined, texte)); const select = el('select');
        for (const [id, nom] of valeurs) { const op = el('option', undefined, nom); op.value = id; select.append(op); }
        select.value = valeur; select.addEventListener('change', () => { change(select.value); afficher(); }); label.append(select); return label;
      };
      const series = [...new Set(personnages.map((p) => p.serie))].sort((a, b) => a.localeCompare(b, 'fr'));
      filtres.append(
        filtre('Série', filtreSerie, [['', 'Toutes'], ...series.map((s): [string, string] => [s, s])], (v) => { filtreSerie = v; }),
        filtre('Élément', filtreElement, [['', 'Tous'], ...elementIds.map((e): [string, string] => [e, ELEMENTS[e].nom])], (v) => { filtreElement = v; }),
        filtre('Catégorie', filtreNature, [['personnage', 'Personnages'], ['soutien', 'Soutiens'], ['tout', 'Tout']], (v) => { filtreNature = v; }),
        filtre('Type', filtreType, [['', 'Tous'], ['base', 'Base'], ['eveille', 'Éveillé'], ['heros', 'Héros'], ['objet', 'Objet'], ['soutien', 'Soutien'], ['terrain', 'Terrain']], (v) => { filtreType = v; }),
      );
      const resultats = el('div', 'decks-cartes');
      const nombres = new Map<string, number>(); for (const id of deck.cartes) nombres.set(id, (nombres.get(id) ?? 0) + 1);
      const ajouterLigne = (id: string, nomCarte: string, sousTitre: string, restant: number, type: 'personnage' | 'soutien'): void => {
        const ligne = el('article', 'decks-carte');
        ligne.append(el('span', 'decks-carte-symbole', type === 'personnage' ? '♙' : '✧'), el('span', 'decks-carte-nom', nomCarte), el('small', 'decks-carte-detail', sousTitre));
        const etat = el('span', 'decks-carte-compte', `${nombres.get(id) ?? 0}/2 · possédés ${restant}`);
        const moins = bouton('−', 'decks-ajuster', () => modifierDeck(deck.id, (d) => {
          const i = d.cartes.lastIndexOf(id); if (i < 0) return d; const cartes = [...d.cartes]; cartes.splice(i, 1);
          const cover = d.couverture && carteBase.get(id) === d.couverture && !cartes.includes(id) ? '' : d.couverture;
          return { ...d, cartes, couverture: cover };
        }));
        moins.disabled = !(nombres.get(id) ?? 0);
        const plus = bouton('+', 'decks-ajuster', () => modifierDeck(deck.id, (d) => {
          if (d.cartes.length >= 20 || (nombres.get(id) ?? 0) >= 2 || (nombres.get(id) ?? 0) >= restant) return d;
          return { ...d, cartes: [...d.cartes, id], couverture: d.couverture || (type === 'personnage' ? carteBase.get(id) ?? '' : '') };
        }));
        plus.disabled = deck.cartes.length >= 20 || (nombres.get(id) ?? 0) >= 2 || (nombres.get(id) ?? 0) >= restant;
        ligne.append(etat, moins, plus); resultats.append(ligne);
      };
      if (filtreNature !== 'soutien') for (const p of personnages) {
        if ((exemplaires.get(p.id) ?? 0) < 1 || (filtreSerie && p.serie !== filtreSerie) || (filtreElement && p.element !== filtreElement)
          || (filtreType && filtreType !== p.type)) continue;
        ajouterLigne(p.id, p.nom, `${p.serie} · ${ELEMENTS[p.element].nom} · ${p.type === 'eveille' ? 'Éveillé' : p.type === 'heros' ? 'Héros' : 'Base'}`, exemplaires.get(p.id) ?? 0, 'personnage');
      }
      if (filtreNature !== 'personnage') for (const soutien of soutiens) {
        if ((sauvegarde.collection[soutien.id] ?? 0) < 1 || (filtreType && filtreType !== soutien.type)) continue;
        ajouterLigne(soutien.id, soutien.nom, `${soutien.type} · ${soutien.texte}`, sauvegarde.collection[soutien.id] ?? 0, 'soutien');
      }
      if (!resultats.childElementCount) resultats.append(el('p', 'decks-cartes-vide', filtreNature === 'soutien'
        ? 'Aucune carte Soutien possédée. Elles rejoindront la collection à l’étape Cartes Soutien.'
        : 'Aucune carte possédée ne correspond à ces filtres.'));
      const collection = el('section', 'decks-collection');
      collection.append(el('h2', undefined, 'Collection possédée'), filtres, resultats);
      contenu.append(collection);
      const pied = el('p', 'decks-enregistre', 'Deck sauvegardé automatiquement sur cet appareil et synchronisé avec le compte si la sauvegarde en ligne est activée.');
      contenu.append(pied);
    }
    corps.append(liste, contenu);
    racine.append(entete, corps);
    if (annonce) { const alert = el('p', 'decks-annonce', annonce); alert.setAttribute('role', 'status'); racine.prepend(alert); }
    const nouveau = listeTete.querySelector('button');
    if (nouveau) nouveau.disabled = sauvegarde.decks.length >= MAX_DECKS_JOUEUR;
  }

  afficher();
  return racine;
}
