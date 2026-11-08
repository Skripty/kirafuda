// Accueil (maquettes docs/reference/refonte/Main.dc.html et Mobile.dc.html).
// Ordinateur : barre du haut (navigation, sceaux, points, Paramètres) puis trois colonnes (max 1760 px).
// Moins de 1100 px : deux colonnes. Moins de 700 px : une colonne et une barre d'onglets fixe en bas.
// Toutes les données viennent de la sauvegarde et des fichiers JSON.
import './hub.css';
import type { Booster, Extension, Popularite, Sauvegarde } from '../core/types';
import { ELEMENTS, PLAFOND_SCEAUX } from '../core/regles';
import { formaterCote, formaterTendance, plusFortesHausses, valeurCollection } from '../core/cote';
import { completion, completionParRarete, entreesCollection } from '../core/collection';
import { delaiAvantRecompense, formaterDelai, prochaineRecompense, progressionJournee } from '../core/economie';
import { genererDraft, type SourcesDraft, type Theme } from '../core/draft';
import { semaineDraft } from '../core/classement';
import { soldePoints } from '../core/boutique';
import { indexer } from '../core/extension';
import { styleAccent } from './booster';
import { creerBooster3D } from './booster3d';
import { creerCarte } from './carte';
import { creerBlocQuetesDuJour, creerCalendrier } from './quetes';
import type { CibleReclamation, VueLancement, VueQuetes } from '../core/quetes';
import type { Compte } from '../en-ligne/compte';
import { creerBoutonCompte, creerSectionCompte } from './compte';

export interface OptionsHub {
  sauvegarde: Sauvegarde;
  /** Le booster de Lancement et ses cartes sorties (toutes vagues confondues). */
  booster: Booster;
  extension: Extension;
  /** Cartes du draft de la semaine. */
  sourcesDraft: SourcesDraft;
  /** Calendriers de sortie de vague en cours (bandeau). */
  lancements: VueLancement[];
  popularite: Popularite;
  themes: Theme[];
  maintenant: Date;
  /** Message de la récompense quotidienne (ou d'erreur), affiché une fois. */
  annonce: string | null;
  onOuvrir: () => void;
  /** Présent si une ouverture n'a pas été entièrement révélée (page fermée pendant l'animation). */
  onRevelerNonVue: (() => void) | null;
  /** Panneau d'export et d'import, ouvert par le bouton Paramètres. */
  panneauSauvegarde: HTMLElement;
  /** Quêtes du jour, calendrier de bienvenue et récompenses à réclamer. */
  quetes: VueQuetes;
  onReclamer: (cible: CibleReclamation) => void;
  /** Compte en ligne (null : jeu sans configuration Supabase, sauvegarde locale seulement). */
  compte: Compte | null;
}

const SVG = 'http://www.w3.org/2000/svg';
/** Icônes d'interface (traits 24 × 24), reprises des maquettes. */
const ICONES = {
  sceau: '<circle cx="12" cy="12" r="8"/><path d="M12 8v8M8 12h8"/>',
  points: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>',
  parametres: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  probabilites: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  accueil: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  collection: '<rect x="4" y="3" width="11" height="16" rx="2"/><path d="M18 6.5l1.5.4a1.5 1.5 0 0 1 1 1.8l-3 11a1.5 1.5 0 0 1-1.8 1L10 19.5"/>',
  boutique: '<path d="M4 8h16l-1 12H5zM9 8a3 3 0 0 1 6 0"/>',
  draft: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/>',
  plus: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
  quetes: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/>',
  classement: '<path d="M3 20h18M5 20v-6h4v6M10 20V8h4v12M15 20v-9h4v9"/>',
  historique: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
};

function el<K extends keyof HTMLElementTagNameMap>(tag: K, classe?: string, texte?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texte !== undefined) e.textContent = texte;
  return e;
}
function icone(nom: keyof typeof ICONES, taille = 16): SVGSVGElement {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(taille));
  svg.setAttribute('height', String(taille));
  svg.setAttribute('class', 'acc-icone');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = ICONES[nom];
  return svg;
}
function lien(href: string, classe: string, ...contenu: (string | Node)[]): HTMLAnchorElement {
  const a = el('a', classe);
  a.href = href;
  a.append(...contenu);
  return a;
}
function panneau(classe: string, titre: string, id: string): HTMLElement {
  const s = el('section', `acc-panneau ${classe}`);
  s.setAttribute('aria-labelledby', id);
  const h2 = el('h2', undefined, titre);
  h2.id = id;
  s.append(h2);
  return s;
}
const pluriel = (n: number, singulier: string, pl = `${singulier}s`): string => `${n} ${n > 1 ? pl : singulier}`;
const sceaux = (n: number): string => pluriel(n, 'sceau', 'sceaux');
const pourcent = (a: number, b: number): number => (b > 0 ? Math.round((a / b) * 100) : 0);

/** « il y a 2 h », « il y a 5 min », « il y a 3 j ». */
function ilYA(iso: string, maintenant: Date): string {
  const min = Math.max(0, Math.floor((maintenant.getTime() - Date.parse(iso)) / 60_000));
  if (min < 1) return 'à l’instant';
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.floor(h / 24)} j`;
}

/** Initiales d'un nom (« Zenitsu Agatsuma » → « ZA », « Himeno » → « Hi »). */
function initiales(nom: string): string {
  const mots = nom.split(/\s+/).filter(Boolean);
  return mots.length > 1 ? `${mots[0]![0]}${mots[1]![0]}`.toUpperCase() : nom.slice(0, 2);
}

export function creerHub(o: OptionsHub): HTMLElement {
  const { sauvegarde: s, booster, extension, popularite, maintenant } = o;
  const entrees = entreesCollection(s, extension);
  const comp = completion(entrees);
  const cout = booster.cout.quantite;
  const manque = Math.max(0, cout - s.sceaux);
  const points = soldePoints(s, extension);
  const delai = formaterDelai(delaiAvantRecompense(maintenant));
  // La cote porte sur toute la collection : toutes les cartes sorties.
  const valeur = valeurCollection(s, extension, popularite);
  const hausses = plusFortesHausses(s, extension, popularite);

  const racine = el('div', 'acc');

  // ---------- Barre du haut ----------
  const haut = el('header', 'acc-haut');
  const logo = el('img', 'acc-logo');
  logo.src = `${import.meta.env.BASE_URL}logo/kirafuda-logo-sombre.svg`;
  logo.alt = 'Kirafuda';
  const nav = el('nav', 'acc-nav bureau-seul');
  nav.setAttribute('aria-label', 'Navigation principale');
  const accueil = lien('#/', '', 'Accueil');
  accueil.setAttribute('aria-current', 'page');
  nav.append(accueil, lien(`#/collection`, '', 'Collection'), lien(`#/boutique`, '', 'Boutique'), lien('#/draft', '', 'Draft'), lien('#/classement', '', 'Classement'), lien('#/quetes', '', o.quetes.aReclamer > 0 ? `Quêtes (${o.quetes.aReclamer})` : 'Quêtes'), lien('#/historique', '', 'Historique'));
  const soldes = el('div', 'acc-soldes');
  const puceSceaux = el('div', 'acc-puce');
  puceSceaux.append(icone('sceau'), el('strong', undefined, String(s.sceaux)), el('span', 'bureau-seul', `/ ${PLAFOND_SCEAUX} sceaux`), el('span', 'mobile-seul', s.sceaux > 1 ? 'sceaux' : 'sceau'));
  puceSceaux.setAttribute('aria-label', `${sceaux(s.sceaux)} sur ${PLAFOND_SCEAUX} au maximum`);
  const pucePoints = el('div', 'acc-puce');
  pucePoints.append(icone('points'), el('strong', undefined, String(points)), el('span', 'bureau-seul', `pts ${extension.nom}`), el('span', 'mobile-seul', 'pts'));
  pucePoints.setAttribute('aria-label', `${pluriel(points, 'point')} ${extension.nom}`);
  const boutonParametres = el('button', 'acc-bouton-icone bureau-seul');
  boutonParametres.type = 'button';
  boutonParametres.setAttribute('aria-label', 'Paramètres et sauvegarde');
  boutonParametres.append(icone('parametres', 18));
  soldes.append(puceSceaux, pucePoints);
  // Compte : « Se connecter », ou le pseudo et l'état de la synchronisation (ouvre les Paramètres).
  if (o.compte) soldes.append(creerBoutonCompte(o.compte, () => dialogue.showModal()));
  soldes.append(boutonParametres);
  haut.append(logo, nav, soldes);

  const annonce = el('p', 'acc-annonce');
  annonce.setAttribute('role', 'status');
  if (o.annonce) annonce.textContent = o.annonce;

  // ---------- Bandeau : calendrier de sortie d'une vague ----------
  const bandeaux = o.lancements.map((l) => {
    const b = el('section', 'acc-lancement');
    b.setAttribute('aria-labelledby', `acc-t-lancement-${l.extensionId}`);
    b.setAttribute('style', styleAccent(l.extensionId));
    const titre = el('h2', undefined, `Nouvelle vague de ${extension.nom} : ${l.nom}`);
    titre.id = `acc-t-lancement-${l.extensionId}`;
    const texte = el('p', 'acc-fin', `Ses cartes ont rejoint le booster. Calendrier de sortie, jour ${l.jourActuel} sur ${l.cases.length} : une récompense par jour, à prendre le jour même.`);
    const tete = el('div', 'acc-lancement-tete');
    tete.append(titre, texte);
    const cases = el('ol', 'acc-lancement-cases');
    for (const c of l.cases) {
      const li = el('li', `${c.recue ? 'recue' : ''}${c.aujourdhui ? ' aujourdhui' : ''}${c.passee && !c.recue ? ' manquee' : ''}`.trim());
      const etat = c.recue ? 'reçu' : c.passee ? 'manqué' : c.aujourdhui ? 'aujourd’hui' : 'à venir';
      li.setAttribute('aria-label', `Jour ${c.jour} : ${sceaux(c.sceaux)}, ${etat}`);
      li.append(el('span', 'acc-lancement-jour', `J${c.jour}`), el('strong', undefined, `+${c.sceaux}`), el('span', 'acc-lancement-etat', c.recue ? '✓' : c.passee ? '—' : ''));
      cases.append(li);
    }
    b.append(tete, cases);
    return b;
  });

  // ---------- Colonne gauche ----------
  const gauche = el('aside', 'acc-gauche bureau-seul');
  gauche.setAttribute('aria-label', 'Collection, récompense et draft');

  const pCollection = panneau('', 'Ta collection', 'acc-t-collection');
  const voirTout = lien(`#/collection`, 'acc-lien-discret', 'Voir tout');
  pCollection.querySelector('h2')!.after(voirTout);
  const ligneAnneau = el('div', 'acc-anneau-ligne');
  const anneau = document.createElementNS(SVG, 'svg');
  anneau.setAttribute('viewBox', '0 0 84 84');
  anneau.setAttribute('class', 'acc-anneau');
  anneau.setAttribute('role', 'img');
  anneau.setAttribute('aria-label', `${comp.possedees} cartes sur ${comp.total}`);
  const circ = 2 * Math.PI * 34;
  anneau.innerHTML = `<circle cx="42" cy="42" r="34" class="acc-anneau-fond"/><circle cx="42" cy="42" r="34" class="acc-anneau-plein" stroke-dasharray="${((comp.possedees / Math.max(1, comp.total)) * circ).toFixed(1)} ${circ.toFixed(1)}" transform="rotate(-90 42 42)"/>`;
  const chiffres = el('div');
  const gros = el('div', 'acc-gros', String(comp.possedees));
  gros.append(el('span', undefined, ` / ${comp.total}`));
  chiffres.append(gros, el('div', 'acc-fin', `cartes différentes · ${pourcent(comp.possedees, comp.total)} %`));
  ligneAnneau.append(anneau, chiffres);
  const barres = el('div', 'acc-raretes');
  for (const l of completionParRarete(entrees)) {
    const ligne = el('div', 'acc-rarete');
    ligne.title = l.nom;
    const jauge = el('div', 'acc-jauge');
    const plein = el('span');
    plein.style.transform = `scaleX(${l.total ? l.possedees / l.total : 0})`;
    jauge.append(plein);
    ligne.append(el('span', 'acc-rarete-symbole', l.libelle), jauge, el('span', 'acc-rarete-valeur', `${l.possedees} / ${l.total}`));
    barres.append(ligne);
  }
  pCollection.append(ligneAnneau, barres);

  const pRecompense = panneau('', 'Récompense du jour', 'acc-t-recompense');
  const gain = prochaineRecompense(s.sceaux);
  const ligneR = el('div', 'acc-gros-ligne');
  ligneR.append(el('span', 'acc-gros', `+${gain}`), el('span', 'acc-fin', `${gain > 1 ? 'sceaux' : 'sceau'} dans ${delai}`));
  const jaugeJour = el('div', 'acc-jauge acc-jauge-claire');
  const pleinJour = el('span');
  pleinJour.style.transform = `scaleX(${progressionJournee(maintenant).toFixed(3)})`;
  jaugeJour.append(pleinJour);
  pRecompense.append(ligneR, jaugeJour, el('p', 'acc-fin', gain === 0
    ? `Ton stock est plein (${PLAFOND_SCEAUX} sceaux ou plus) : la prochaine récompense n’ajoutera rien.`
    : `Stock maximum : ${PLAFOND_SCEAUX} sceaux.`));

  const semaine = semaineDraft(maintenant);
  const draft = genererDraft(semaine, o.sourcesDraft, o.themes);
  const pDraft = panneau('', 'Draft de la semaine', 'acc-t-draft');
  pDraft.querySelector('h2')!.after(el('span', 'acc-etiquette', 'jusqu’à dimanche 23 h 59'));
  const joue = s.dernierDraft?.semaine === semaine ? s.dernierDraft : null;
  const etatJoue = !joue ? '' : joue.dansClassement ? ' Au classement.' : joue.envoye === false ? ' Envoi au classement en attente.' : ' Hors classement.';
  pDraft.append(
    el('p', 'acc-doux', `Thème : ${draft.theme.nom}`),
    ...(joue ? [el('p', 'acc-fin', `Joué cette semaine : ${joue.score} points.${etatJoue}`)] : []),
    lien('#/draft', 'acc-bouton-secondaire', joue ? 'Voir ou modifier' : 'Participer'),
    ...(o.compte ? [lien('#/classement', 'acc-lien-discret', 'Classement')] : []),
  );
  const calendrier = creerCalendrier(o.quetes);
  gauche.append(creerBlocQuetesDuJour(o.quetes, o.onReclamer), ...(calendrier ? [calendrier] : []), pCollection, pRecompense, pDraft);

  // ---------- Centre : le booster ----------
  const centre = el('div', 'acc-centre');
  const scene = el('section', 'acc-booster');
  scene.setAttribute('aria-labelledby', 'acc-t-extension');
  const tete = el('div', 'acc-booster-tete');
  const titres = el('div');
  const h1 = el('h1', undefined, extension.nom);
  h1.id = 'acc-t-extension';
  titres.append(el('div', 'acc-surtitre', `Extension · ${extension.totalAvecSecretes} cartes`), h1);
  tete.append(titres, lien(`#/probabilites`, 'acc-lien-probas bureau-seul', icone('probabilites'), 'Probabilités'));

  const flotte = el('div', 'acc-booster-flotte');
  // Booster 3D (WebGL, ou repli CSS) : inclinaison seulement, l'ouverture passe par le bouton « Ouvrir ».
  // Aucun reflet ajouté ici : dans la scène d'ouverture, un reflet est un indice honnête (règle 4).
  flotte.append(creerBooster3D({ extension, booster, dechirable: false }).scene);
  scene.setAttribute('style', styleAccent(extension.id));

  const actions = el('div', 'acc-booster-actions');
  const ouvrir = el('button', 'acc-ouvrir', `Ouvrir · ${sceaux(cout)}`);
  ouvrir.type = 'button';
  const info = el('p', 'acc-booster-info');
  info.id = 'acc-booster-info';
  if (manque > 0) {
    ouvrir.disabled = true;
    ouvrir.setAttribute('aria-describedby', info.id);
    info.append(`Il te manque ${sceaux(manque)}. Prochains sceaux dans ${delai}. `);
  } else {
    ouvrir.addEventListener('click', () => {
      ouvrir.disabled = true; // pas de double ouverture
      o.onOuvrir();
    });
  }
  info.append(el('span', 'bureau-seul', `· +${booster.pointsParOuverture} points ${extension.nom} par ouverture`));
  actions.append(ouvrir, info);

  if (o.onRevelerNonVue) {
    const reprise = el('div', 'acc-reprise');
    const b = el('button', undefined, 'Le révéler');
    b.type = 'button';
    b.addEventListener('click', o.onRevelerNonVue);
    reprise.append(el('p', undefined, 'Un booster n’a pas encore été révélé. Ses cartes sont déjà dans ta collection.'), b);
    scene.append(reprise);
  }
  scene.append(tete, flotte, actions);

  // Dernière ouverture : jamais dévoilée tant qu'elle n'a pas été révélée.
  const derniere = s.historique.at(-1);
  const pDerniere = panneau('bureau-seul', 'Dernière ouverture', 'acc-t-derniere');
  const h2D = pDerniere.querySelector('h2')!;
  if (derniere) h2D.append(el('span', 'acc-quand', ` · ${ilYA(derniere.date, maintenant)}`));
  h2D.after(lien('#/historique', 'acc-lien-discret', 'Historique'));
  if (!derniere) {
    pDerniere.append(el('p', 'acc-fin', 'Aucune ouverture pour l’instant.'));
  } else if (!derniere.vue) {
    pDerniere.append(el('p', 'acc-fin', 'Pas encore révélée : ses cartes restent cachées jusqu’à la révélation.'));
  } else {
    const mini = el('div', 'acc-mini-cartes');
    const extDerniere = extension;
    const indexDerniere = indexer(extDerniere);
    for (const t of derniere.cartes) {
      const c = indexDerniere.carte(t.carteId);
      if (!c) continue;
      const v = creerCarte(c, extDerniere, { interactive: false });
      v.style.setProperty('--carte-largeur', '140px');
      mini.append(v);
    }
    pDerniere.append(mini);
  }
  centre.append(scene, pDerniere);

  // ---------- Colonne droite ----------
  const droite = el('aside', 'acc-droite');
  droite.setAttribute('aria-label', 'Cote et boutique');

  const pCote = panneau('bureau-seul', 'Cote', 'acc-t-cote');
  pCote.querySelector('h2')!.after(el('span', 'acc-fin', `semaine ${popularite.semaine}`));
  const ligneV = el('div', 'acc-gros-ligne');
  ligneV.append(el('span', 'acc-tres-gros', formaterCote(valeur.actuelle)), el('span', `acc-tendance ${valeur.sens}`, formaterTendance(valeur)));
  // Courbe : semaine précédente → semaine courante (les seules données disponibles).
  const max = Math.max(valeur.actuelle, valeur.precedente, 1);
  const y = (v: number): number => 52 - (v / max) * 44;
  const courbe = document.createElementNS(SVG, 'svg');
  courbe.setAttribute('viewBox', '0 0 300 60');
  courbe.setAttribute('class', 'acc-courbe');
  courbe.setAttribute('role', 'img');
  courbe.setAttribute('aria-label', `Semaine ${popularite.semainePrecedente} : ${formaterCote(valeur.precedente)} ; semaine ${popularite.semaine} : ${formaterCote(valeur.actuelle)}`);
  courbe.innerHTML = `<polyline points="0,${y(valeur.precedente).toFixed(1)} 300,${y(valeur.actuelle).toFixed(1)}"/>`;
  pCote.append(el('div', 'acc-fin acc-marge', 'Valeur de ta collection'), ligneV, courbe);

  const pHausses = panneau('', 'Plus fortes hausses', 'acc-t-hausses');
  if (hausses.length === 0) pHausses.append(el('p', 'acc-fin', 'Aucune hausse cette semaine.'));
  for (const h of hausses) {
    const ligne = el('div', 'acc-hausse');
    const pastille = el('span', 'acc-avatar', initiales(h.personnage.nom));
    pastille.style.setProperty('--aff', ELEMENTS[h.personnage.element].couleur);
    pastille.setAttribute('aria-hidden', 'true');
    const textes = el('div', 'acc-hausse-textes');
    textes.append(el('div', 'acc-hausse-nom', `${h.personnage.nom}${h.possedee ? ' · possédé' : ''}`), el('div', 'acc-fin', `${h.personnage.serie} · popularité ${h.popularite}`));
    ligne.append(pastille, textes, el('span', 'acc-tendance hausse', `▲ +${h.gain}`));
    pHausses.append(ligne);
  }

  const pBoutique = panneau('bureau-seul', 'Boutique de points', 'acc-t-boutique');
  pBoutique.append(
    el('p', 'acc-doux', `${pluriel(points, 'point')} ${extension.nom} à échanger contre la carte de ton choix.`),
    lien(`#/boutique`, 'acc-bouton-secondaire', 'Ouvrir la boutique'),
  );
  droite.append(pCote, pHausses, pBoutique);

  // ---------- Tuiles (téléphone) ----------
  const tuiles = el('div', 'acc-tuiles mobile-seul');
  const tCollection = lien(`#/collection`, 'acc-tuile', el('span', 'acc-fin', 'Collection'));
  const tc = el('div', 'acc-gros');
  tc.append(String(comp.possedees), el('span', undefined, ` / ${comp.total}`));
  tCollection.append(tc);
  const tCote = el('div', 'acc-tuile');
  const tv = el('div', 'acc-gros');
  tv.append(`${formaterCote(valeur.actuelle)} `, el('span', `acc-tendance ${valeur.sens}`, formaterTendance(valeur)));
  tCote.append(el('span', 'acc-fin', 'Cote'), tv);
  // Quêtes : sur téléphone, une tuile pleine largeur mène à l'écran « Quêtes ».
  const faites = o.quetes.quetesDuJour.filter((l) => l.faite).length;
  const tQuetes = lien('#/quetes', 'acc-tuile acc-tuile-large', el('span', 'acc-fin', 'Quêtes du jour'));
  const tq = el('div', 'acc-gros');
  tq.append(String(faites), el('span', undefined, ` / ${o.quetes.quetesDuJour.length}`));
  tQuetes.append(tq, el('span', 'acc-fin', o.quetes.aReclamer > 0 ? `${o.quetes.aReclamer} à réclamer` : (o.quetes.calendrierFini ? 'Toutes les quêtes' : 'Quêtes et calendrier de bienvenue')));
  tuiles.append(tQuetes, tCollection, tCote);

  const grille = el('main', 'acc-grille');
  grille.append(gauche, centre, tuiles, droite);

  // ---------- Pied ----------
  const pied = el('footer', 'acc-pied bureau-seul',
    `Sauvegarde locale · ${pluriel(comp.possedees, 'carte différente', 'cartes différentes')} · ${pluriel(s.historique.length, 'ouverture')} · Exporter et importer dans Paramètres`);

  // ---------- Paramètres (sauvegarde) ----------
  const dialogue = el('dialog', 'acc-dialogue');
  dialogue.setAttribute('aria-label', 'Paramètres');
  const fermer = el('button', 'acc-bouton-secondaire', 'Fermer');
  fermer.type = 'button';
  fermer.addEventListener('click', () => dialogue.close());
  const enteteD = el('div', 'acc-dialogue-tete');
  enteteD.append(el('h2', undefined, 'Paramètres'), fermer);
  dialogue.append(enteteD, ...(o.compte ? [creerSectionCompte(o.compte)] : []), o.panneauSauvegarde);
  dialogue.addEventListener('click', (e) => { if (e.target === dialogue) dialogue.close(); });
  boutonParametres.addEventListener('click', () => dialogue.showModal());

  // ---------- Barre d'onglets (téléphone) et menu « Plus » ----------
  const onglets = el('nav', 'acc-onglets mobile-seul');
  onglets.setAttribute('aria-label', 'Navigation principale');
  const onglet = (href: string, nom: keyof typeof ICONES, texte: string): HTMLAnchorElement => lien(href, 'acc-onglet', icone(nom, 22), texte);
  const oAccueil = onglet('#/', 'accueil', 'Accueil');
  oAccueil.setAttribute('aria-current', 'page');
  const plus = el('button', 'acc-onglet');
  plus.type = 'button';
  plus.append(icone('plus', 22), 'Plus');
  onglets.append(oAccueil, onglet(`#/collection`, 'collection', 'Collection'), onglet(`#/boutique`, 'boutique', 'Boutique'), onglet('#/draft', 'draft', 'Draft'), plus);

  const menuPlus = el('dialog', 'acc-dialogue acc-menu');
  menuPlus.setAttribute('aria-label', 'Plus');
  const parametresMobile = el('button', 'acc-menu-ligne');
  parametresMobile.type = 'button';
  parametresMobile.append(icone('parametres', 20), 'Paramètres et sauvegarde');
  parametresMobile.addEventListener('click', () => { menuPlus.close(); dialogue.showModal(); });
  const fermerMenu = el('button', 'acc-bouton-secondaire', 'Fermer');
  fermerMenu.type = 'button';
  fermerMenu.addEventListener('click', () => menuPlus.close());
  menuPlus.append(
    lien('#/quetes', 'acc-menu-ligne', icone('quetes', 20), 'Quêtes'),
    lien('#/classement', 'acc-menu-ligne', icone('classement', 20), 'Classement du draft'),
    lien('#/historique', 'acc-menu-ligne', icone('historique', 20), 'Historique'),
    lien(`#/probabilites`, 'acc-menu-ligne', icone('probabilites', 20), 'Probabilités'),
    parametresMobile,
    fermerMenu,
  );
  menuPlus.addEventListener('click', (e) => { if (e.target === menuPlus) menuPlus.close(); });
  plus.addEventListener('click', () => menuPlus.showModal());

  racine.append(haut, annonce, ...bandeaux, grille, pied, onglets, dialogue, menuPlus);
  return racine;
}
