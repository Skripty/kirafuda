// Écran Collection : 140 emplacements (les 100 cartes de base, puis les secrètes), filtres, complétion,
// inspection d'une carte. Tout est calculé à partir de la sauvegarde (src/core/collection.ts).
import './collection.css';
import { ELEMENTS, FINITIONS, ORDRE_FINITIONS } from '../core/regles';
import {
  FILTRES_VIDES,
  completion,
  entreesCollection,
  filtrer,
  series,
  versions,
  type EntreeCollection,
  type EntreeSoutien,
  type Filtres,
  entreesSoutiens,
} from '../core/collection';
import { formaterCote, formaterTendance, tendanceCote } from '../core/cote';
import type { ElementId, Extension, FinitionId, Popularite, Sauvegarde } from '../core/types';
import { creerCarte, numeroCarte } from './carte';
import { TYPES_SOUTIEN, creerCarteSoutien, numeroSoutien } from './carte-soutien';
import { iconeElement } from './element';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, classe?: string, texte?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texte !== undefined) e.textContent = texte;
  return e;
}

function choix(etiquette: string, options: [string, string][]): { label: HTMLLabelElement; select: HTMLSelectElement } {
  const label = el('label', 'col-filtre');
  const select = el('select');
  for (const [valeur, texte] of options) {
    const o = el('option', undefined, texte);
    o.value = valeur;
    select.append(o);
  }
  label.append(el('span', undefined, etiquette), select);
  return { label, select };
}

/** Filtre d'élément : « Tous » puis une icône par élément (boutons à bascule, nom en texte alternatif). */
function choixElement(onChange: () => void): { groupe: HTMLFieldSetElement; valeur: () => ElementId | null; vider: () => void } {
  const groupe = el('fieldset', 'col-filtre col-elements');
  groupe.append(el('legend', undefined, 'Élément'));
  let valeur: ElementId | null = null;
  const boutons: [ElementId | null, HTMLButtonElement][] = [];
  const maj = (): void => { for (const [id, b] of boutons) b.setAttribute('aria-pressed', String(id === valeur)); };
  const ajouter = (id: ElementId | null): void => {
    const b = el('button', id ? 'col-element' : 'col-element col-element-tous');
    b.type = 'button';
    if (id) b.append(iconeElement(id, 'col-element-icone', ELEMENTS[id].nom));
    else b.textContent = 'Tous';
    b.addEventListener('click', () => { valeur = id; maj(); onChange(); });
    boutons.push([id, b]);
    groupe.append(b);
  };
  ajouter(null);
  for (const id of Object.keys(ELEMENTS) as ElementId[]) ajouter(id);
  maj();
  return { groupe, valeur: () => valeur, vider: () => { valeur = null; maj(); } };
}

const pluriel = (n: number, mot: string): string => `${n} ${mot}${n > 1 ? 's' : ''}`;
const libelleFinition = (f: FinitionId): string => `${FINITIONS[f].symbole} ${FINITIONS[f].nom}`;

/**
 * `onInspecter` est appelé à chaque carte inspectée (quêtes : carte inspectée et cote consultée,
 * la fiche affichant la cote de la semaine).
 */
export function creerCollection(sauvegarde: Sauvegarde, extension: Extension, popularite: Popularite, onInspecter: () => void = () => {}): HTMLElement {
  const entrees = entreesCollection(sauvegarde, extension);
  const c = completion(entrees);
  let filtres: Filtres = { ...FILTRES_VIDES };

  const main = el('main', 'col');

  // ---------- En-tête et complétion ----------
  const entete = el('header', 'col-entete');
  const retour = el('a', 'col-retour', 'Accueil');
  retour.href = '#/';
  entete.append(retour, el('h1', undefined, 'Collection'));

  const progression = el('div', 'col-completion');
  const texteCompletion = el('p', undefined,
    `${c.possedees} / ${c.total} cartes · ${Math.floor((c.possedees / c.total) * 100)} % — base ${c.base.possedees}/${c.base.total}, secrètes ${c.secretes.possedees}/${c.secretes.total}`);
  const barre = el('div', 'col-barre');
  barre.setAttribute('role', 'progressbar');
  barre.setAttribute('aria-label', 'Complétion de l’extension');
  barre.setAttribute('aria-valuemin', '0');
  barre.setAttribute('aria-valuemax', String(c.total));
  barre.setAttribute('aria-valuenow', String(c.possedees));
  const remplissage = el('span');
  remplissage.style.transform = `scaleX(${c.total ? c.possedees / c.total : 0})`;
  barre.append(remplissage);
  progression.append(texteCompletion, barre);

  // ---------- Filtres ----------
  const zoneFiltres = el('div', 'col-filtres');
  const fSerie = choix('Série', [['', 'Toutes'], ...series(extension).map((s): [string, string] => [s, s])]);
  const fElement = choixElement(() => lireFiltres());
  const fFinition = choix('Rareté', [['', 'Toutes'], ...ORDRE_FINITIONS.map((f): [string, string] => [f, libelleFinition(f)])]);
  const fPossession = choix('Possession', [['', 'Toutes'], ['possedees', 'Possédées'], ['manquantes', 'Manquantes']]);
  const reinitialiser = el('button', 'col-reinit', 'Réinitialiser');
  reinitialiser.type = 'button';
  zoneFiltres.append(fSerie.label, fElement.groupe, fFinition.label, fPossession.label, reinitialiser);

  const resume = el('p', 'col-resume');
  resume.setAttribute('aria-live', 'polite');
  const grille = el('ul', 'col-grille');

  main.append(entete, progression, zoneFiltres, resume, grille);

  // ---------- Cartes Soutien (Objets, Soutiens, Terrains) : après les personnages, sans cote ni filtre ----------
  const soutiens = entreesSoutiens(sauvegarde, extension);
  if (soutiens.length > 0) {
    const section = el('section', 'col-soutiens');
    const possedes = soutiens.filter((e) => e.exemplaires > 0).length;
    const titre = el('h2', undefined, 'Cartes Soutien');
    titre.id = 'col-soutiens-titre';
    section.setAttribute('aria-labelledby', titre.id);
    section.append(titre, el('p', 'col-resume', `${possedes} / ${soutiens.length} possédées · Objets ♦, Soutiens ♦♦, Terrains ♦♦♦. Elles se tirent dans les boosters et se jouent en combat.`));
    const liste = el('ul', 'col-grille');
    for (const e of soutiens) {
      const li = el('li');
      const possedee = e.exemplaires > 0;
      const tuileSoutien = el('button', `col-tuile${possedee ? '' : ' manquante'}`);
      tuileSoutien.type = 'button';
      tuileSoutien.setAttribute('aria-label', `${e.soutien.nom}, carte ${TYPES_SOUTIEN[e.soutien.type].nom}, ${FINITIONS[e.soutien.finition].nom}, `
        + `${possedee ? pluriel(e.exemplaires, 'exemplaire') : 'non possédée'} : inspecter`);
      tuileSoutien.addEventListener('click', () => inspecterSoutien(e));
      const visuel = creerCarteSoutien(e.soutien, extension, { interactive: false });
      visuel.style.setProperty('--carte-largeur', '100%');
      tuileSoutien.append(visuel, el('span', 'col-tuile-legende', possedee ? `×${e.exemplaires}` : 'Non possédée'));
      li.append(tuileSoutien);
      liste.append(li);
    }
    section.append(liste);
    main.append(section);
  }

  // ---------- Inspection ----------
  const dialogue = el('dialog', 'col-inspection');
  dialogue.setAttribute('aria-labelledby', 'col-inspection-titre');
  main.append(dialogue);
  dialogue.addEventListener('click', (e) => {
    if (e.target === dialogue) dialogue.close(); // clic sur le fond
  });

  /** Fiche d'une carte Soutien : la carte en grand, son type, sa règle de jeu et le nombre d'exemplaires. */
  function inspecterSoutien(entree: EntreeSoutien): void {
    const { soutien } = entree;
    const type = TYPES_SOUTIEN[soutien.type];
    const contenu = el('div', 'col-inspection-contenu');
    const haut = el('div', 'col-inspection-haut');
    const h2 = el('h2', undefined, soutien.nom);
    h2.id = 'col-inspection-titre';
    const fermer = el('button', 'col-fermer', 'Fermer');
    fermer.type = 'button';
    fermer.addEventListener('click', () => dialogue.close());
    haut.append(h2, fermer);
    const possedee = entree.exemplaires > 0;
    const visuel = creerCarteSoutien(soutien, extension);
    visuel.style.setProperty('--carte-largeur', 'min(300px, 72vw)');
    const cadreVisuel = el('div', `col-inspection-visuel${possedee ? '' : ' manquante'}`);
    cadreVisuel.append(visuel);
    if (!possedee) cadreVisuel.append(el('span', 'col-badge-manquante', 'Non possédée'));
    const infos = el('p', 'col-inspection-infos',
      `${numeroSoutien(soutien, soutiens.length)} · ${type.nom} (${type.regle.toLowerCase()}) · ${libelleFinition(soutien.finition)} · ${possedee ? pluriel(entree.exemplaires, 'exemplaire') : 'non possédée'}`);
    contenu.append(haut, cadreVisuel, infos, el('p', 'col-inspection-cote', soutien.texte));
    dialogue.replaceChildren(contenu);
    if (!dialogue.open) dialogue.showModal();
    if (possedee) onInspecter();
  }

  function inspecter(entree: EntreeCollection): void {
    const { carte, personnage } = entree;
    const contenu = el('div', 'col-inspection-contenu');

    const haut = el('div', 'col-inspection-haut');
    const h2 = el('h2', undefined, personnage.nom);
    h2.id = 'col-inspection-titre';
    const fermer = el('button', 'col-fermer', 'Fermer');
    fermer.type = 'button';
    fermer.addEventListener('click', () => dialogue.close());
    haut.append(h2, fermer);

    const possedee = entree.exemplaires > 0;
    const visuel = creerCarte(carte, extension);
    visuel.style.setProperty('--carte-largeur', 'min(300px, 72vw)');
    const cadreVisuel = el('div', `col-inspection-visuel${possedee ? '' : ' manquante'}`);
    cadreVisuel.append(visuel);
    if (!possedee) cadreVisuel.append(el('span', 'col-badge-manquante', 'Non possédée'));
    visuel.style.setProperty('--carte-pivot', '10deg'); // pivot horizontal seulement

    const infos = el('p', 'col-inspection-infos',
      `${numeroCarte(carte.numero, extension.total)}${carte.secrete ? ' · carte secrète' : ''} · ${libelleFinition(carte.finition)} · ${personnage.serie} · ${possedee ? pluriel(entree.exemplaires, 'exemplaire') : 'non possédée'}`);
    const t = tendanceCote(popularite, carte);
    const cote = el('p', 'col-inspection-cote', `Cote ${formaterCote(t.actuelle)} · ${formaterTendance(t)} (semaine ${popularite.semaine})`);

    // Les autres cartes du même personnage : la possession de chacune est toujours écrite.
    const autres = versions(entree, entrees);
    const liste = el('div', 'col-finitions');
    liste.setAttribute('role', 'group');
    liste.setAttribute('aria-label', `Cartes de ${personnage.nom}`);
    for (const v of autres) {
      const b = el('button', 'col-finition');
      b.type = 'button';
      b.setAttribute('aria-pressed', String(v.carte.id === carte.id));
      b.append(
        el('span', undefined, `${numeroCarte(v.carte.numero, extension.total)} ${libelleFinition(v.carte.finition)}`),
        el('strong', undefined, v.exemplaires > 0 ? `×${v.exemplaires}` : 'manquante'),
      );
      b.addEventListener('click', () => inspecter(v));
      liste.append(b);
    }

    contenu.append(haut, cadreVisuel, infos, cote, liste);
    dialogue.replaceChildren(contenu);
    if (!dialogue.open) dialogue.showModal();
    // Quêtes « inspecter une carte de ta collection » : seulement une carte possédée.
    if (possedee) onInspecter();
    liste.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus();
  }

  // ---------- Grille ----------
  function tuile(entree: EntreeCollection): HTMLLIElement {
    const li = el('li');
    const numero = numeroCarte(entree.carte.numero, extension.total);
    const possedee = entree.exemplaires > 0;
    const b = el('button', `col-tuile${possedee ? '' : ' manquante'}`);
    b.type = 'button';
    b.setAttribute('aria-label', `${entree.personnage.nom}, ${numero}, ${FINITIONS[entree.carte.finition].nom}, `
      + `${possedee ? pluriel(entree.exemplaires, 'exemplaire') : 'non possédée'} : inspecter`);
    // Toutes les cartes sont visibles ; une carte non possédée est grisée (la mention reste écrite).
    const visuel = creerCarte(entree.carte, extension, { interactive: false });
    visuel.style.setProperty('--carte-largeur', '100%');
    const legende = el('span', 'col-tuile-legende', possedee ? `×${entree.exemplaires}` : 'Non possédée');
    const t = tendanceCote(popularite, entree.carte);
    const cote = el('span', `col-tuile-cote ${t.sens}`);
    cote.append(el('span', undefined, `Cote ${formaterCote(t.actuelle)}`), el('span', undefined, formaterTendance(t)));
    b.append(visuel, legende, cote);
    b.addEventListener('click', () => inspecter(entree));
    li.append(b);
    return li;
  }

  function afficherGrille(): void {
    const visibles = filtrer(entrees, filtres);
    const possedeesVisibles = visibles.filter((e) => e.exemplaires > 0).length;
    resume.textContent = visibles.length === 0
      ? 'Aucune carte ne correspond à ces filtres.'
      : `${pluriel(visibles.length, 'carte')} affichée${visibles.length > 1 ? 's' : ''} · ${possedeesVisibles} possédée${possedeesVisibles > 1 ? 's' : ''}`;
    grille.replaceChildren(...visibles.map(tuile));
  }

  function lireFiltres(): void {
    filtres = {
      serie: fSerie.select.value || null,
      element: fElement.valeur(),
      finition: (fFinition.select.value || null) as FinitionId | null,
      possession: (fPossession.select.value || null) as Filtres['possession'],
    };
    afficherGrille();
  }
  for (const s of [fSerie.select, fFinition.select, fPossession.select]) s.addEventListener('change', lireFiltres);
  reinitialiser.addEventListener('click', () => {
    for (const s of [fSerie.select, fFinition.select, fPossession.select]) s.value = '';
    fElement.vider();
    lireFiltres();
  });

  afficherGrille();
  return main;
}
