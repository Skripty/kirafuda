// Page d'admin des images (/admin.html), développement seulement.
// Ergonomie de docs/reference/atelier-des-cartes.html : liste des cartes | fiche et images | aperçu.
// Une image par carte (deux calques pour alternative et immersive). Les images sont converties en WebP
// dans le navigateur, puis envoyées au plugin Vite (outils/vite-admin.ts).
import '../styles/tokens.css';
import './admin.css';
import { ELEMENTS, FAIBLESSE, FINITIONS, ORDRE_FINITIONS } from '../core/regles';
import { TYPES_PERSONNAGE, texteDegats } from '../core/combat/fiches';
import { CADRAGE_DEFAUT, calquesDeLaFinition, cheminImage } from '../core/images';
import { LIMITES_CADRAGE, TAILLE_MAX_IMAGE, nomFichierImage, planMigrationImages } from '../core/edition';
import { indexer } from '../core/extension';
import type { Cadrage, Calque, Carte, Extension, FinitionId, Personnage } from '../core/types';
import { creerCarte, numeroCarte } from '../ui/carte';
import { iconeElement } from '../ui/element';
import { creerOngletPopularite } from './popularite';
import { animationEnWebp, imageFixeEnWebp } from './webp';

interface Brouillon { cadrages: Partial<Record<Calque, Cadrage>> }

const NOMS_CALQUES: Record<Calque, string> = { illustration: 'Illustration', animation: 'Animation' };
const CONSEILS: Record<FinitionId, string> = {
  'commune': 'Portrait recadré dans la fenêtre (environ 40 % de la carte).',
  'peu-commune': 'Portrait recadré dans la fenêtre (environ 40 % de la carte).',
  'holo': 'Portrait dans la fenêtre, avec le film holographique.',
  'holo-integrale': 'Portrait dans la fenêtre ; cadre argenté et film holo sur toute la carte.',
  'pleine': 'Image haute et nette qui couvre toute la carte (1000 px de haut ou plus). Vide : reprend la carte de base.',
  'alternative': 'Image pleine carte, avec le personnage et son décor. Vide : reprend la carte de base.',
  'immersive': 'Animation pleine carte (GIF ou WebP animé, convertie en WebP animé de 5 Mo maximum), affichée en priorité avec film animé et particules. L’illustration fixe s’affiche en mode animations réduites et si l’animation manque. Vide : reprend la carte de base.',
  'couronne': 'Image pleine carte, passée en doré. Vide : reprend la carte de base.',
};

const app = document.querySelector<HTMLDivElement>('#app')!;
const clone = <T>(x: T): T => structuredClone(x);
function el<K extends keyof HTMLElementTagNameMap>(tag: K, classe?: string, texte?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texte !== undefined) e.textContent = texte;
  return e;
}

// ---------- État ----------
/** Lancement avec toutes ses vagues (chaque carte porte sa « vague »). */
let extension: Extension;
/** Vagues de Lancement (filtre de la liste). */
let vagues: { id: string; nom: string; disponibleLe: string; cartes: number }[] = [];
let fichiers = new Map<string, Set<string>>(); // id de carte → noms de fichiers présents
const versions = new Map<string, number>();      // chemin → numéro de version (contourne le cache après un envoi)
let selId = '';
let brouillon: Brouillon;
let modifie = false;
let calqueActif: Calque = 'illustration';
let filtreTexte = '';
let filtreType: '' | 'base' | 'secretes' = '';
let filtreRarete: FinitionId | '' = '';
let filtreVague = '';
let envoiEnCours: Calque | null = null;
let message: { texte: string; erreur: boolean; details?: string[] } | null = null;

const index = (): ReturnType<typeof indexer> => indexer(extension);
const carteSel = (): Carte => index().carte(selId)!;
const persoSel = (): Personnage => index().personnageDe(carteSel());
const nomDe = (c: Carte): string => index().personnageDe(c).nom;
const possede = (id: string, k: Calque): boolean => fichiers.get(id)?.has(nomFichierImage(k)) ?? false;
const calquePrincipal = (c: Carte): Calque => calquesDeLaFinition(c.finition)[0]!;
/** Anciennes images (rangées par finition) qui restent à copier vers une carte. */
const anciennes = (): number => planMigrationImages(extension, Object.fromEntries([...fichiers].map(([id, noms]) => [id, [...noms]]))).copies.length;

/** « image propre », « reprend la carte de base » ou « aucune image ». */
function statut(c: Carte): { texte: string; classe: string } {
  if (possede(c.id, calquePrincipal(c))) return { texte: 'image propre', classe: 'propre' };
  const base = c.secrete ? index().base(c.personnage) : undefined;
  if (base && possede(base.id, 'illustration')) return { texte: `reprend la carte de base (${numeroCarte(base.numero, extension.total)})`, classe: 'repli' };
  return { texte: 'aucune image', classe: 'manque' };
}

function brouillonDe(c: Carte): Brouillon {
  return { cadrages: clone(c.images) };
}
const cadrage = (k: Calque): Cadrage => brouillon.cadrages[k] ?? { ...CADRAGE_DEFAUT };

/** Extension d'aperçu : le cadrage du brouillon appliqué à la carte sélectionnée. */
function extensionApercu(): Extension {
  const c = carteSel();
  return {
    ...extension,
    cartes: extension.cartes.map((x) => (x.id === c.id ? { ...x, images: brouillon.cadrages } : x)),
  };
}
/** Ajoute le numéro de version aux images envoyées depuis l'ouverture de la page. */
const avecVersion = (chemin: string): string => (versions.has(chemin) ? `${chemin}?v=${versions.get(chemin)}` : chemin);

// ---------- Rendu ----------
const zoneListe = el('aside', 'adm-panneau adm-liste');
const zoneFiche = el('section', 'adm-panneau adm-fiche');
const zoneApercu = el('aside', 'adm-panneau adm-apercu');

function selectFiltre(etiquette: string, options: [string, string][], valeur: string, surChange: (v: string) => void): HTMLLabelElement {
  const label = el('label', 'adm-champ-filtre');
  const s = el('select');
  for (const [v, t] of options) {
    const o = el('option', undefined, t);
    o.value = v;
    s.append(o);
  }
  s.value = valeur;
  s.setAttribute('aria-label', etiquette);
  s.addEventListener('change', () => surChange(s.value));
  label.append(s);
  return label;
}

function rendreListe(): void {
  const q = filtreTexte.trim().toLowerCase();
  const toutes = index().cartesTriees;
  const visibles = toutes.filter((c) =>
    (!q || `${nomDe(c)} ${index().personnageDe(c).serie} ${c.id}`.toLowerCase().includes(q))
    && (filtreType === '' || (filtreType === 'secretes') === c.secrete)
    && (filtreRarete === '' || c.finition === filtreRarete)
    && (filtreVague === '' || c.vague === filtreVague));
  const avecImage = toutes.filter((c) => possede(c.id, calquePrincipal(c))).length;
  const ul = el('ul');
  for (const c of visibles) {
    const li = el('li');
    const b = el('button');
    b.type = 'button';
    b.setAttribute('aria-current', String(c.id === selId));
    const s = statut(c);
    const pastille = el('i', `adm-pastille ${s.classe}`);
    pastille.setAttribute('aria-hidden', 'true');
    b.setAttribute('aria-label', `${numeroCarte(c.numero, extension.total)} ${nomDe(c)}, ${FINITIONS[c.finition].nom}${c.secrete ? ', secrète' : ''} : ${s.texte}`);
    b.append(
      el('span', 'adm-nom', `${numeroCarte(c.numero, extension.total)} ${nomDe(c)}`),
      el('span', 'adm-serie', `${FINITIONS[c.finition].symbole} ${FINITIONS[c.finition].nom}${c.secrete ? ' · secrète' : ''}`),
      pastille,
    );
    b.addEventListener('click', () => choisir(c.id));
    li.append(b);
    ul.append(li);
  }
  const champ = el('input');
  champ.type = 'search';
  champ.placeholder = 'Rechercher un nom, une série, un id';
  champ.setAttribute('aria-label', 'Rechercher');
  champ.value = filtreTexte;
  champ.addEventListener('input', () => {
    filtreTexte = champ.value;
    rendreListe();
    const c2 = zoneListe.querySelector<HTMLInputElement>('input[type=search]')!;
    c2.focus();
    c2.setSelectionRange(filtreTexte.length, filtreTexte.length);
  });
  const filtres = el('div', 'adm-filtres');
  filtres.append(
    selectFiltre('Vague', [['', `Toutes les vagues (${extension.cartes.length})`], ...vagues.map((v): [string, string] => [v.id, `${v.nom} (${v.cartes}) · ${v.disponibleLe}`])], filtreVague, (v) => { filtreVague = v; rendreListe(); }),
    selectFiltre('Type de carte', [['', 'Toutes'], ['base', 'Cartes de base'], ['secretes', 'Cartes secrètes']], filtreType, (v) => { filtreType = v as typeof filtreType; rendreListe(); }),
    selectFiltre('Rareté', [['', 'Toutes les raretés'], ...ORDRE_FINITIONS.map((f): [string, string] => [f, `${FINITIONS[f].symbole} ${FINITIONS[f].nom}`])], filtreRarete, (v) => { filtreRarete = v as typeof filtreRarete; rendreListe(); }),
  );
  const entete = el('div', 'adm-ligne');
  entete.append(el('h2', undefined, 'Cartes'), el('span', 'adm-lbl', `${avecImage}/${toutes.length} avec image propre · ${visibles.length} affichée${visibles.length > 1 ? 's' : ''}`));
  zoneListe.replaceChildren(entete, champ, filtres, visibles.length ? ul : el('p', 'adm-vide', 'Aucun résultat.'));
}

function rendreFiche(): void {
  const c = carteSel();
  const p = persoSel();
  const autres = index().cartesDe(p.id).filter((x) => x.id !== c.id);

  const haut = el('div', 'adm-ligne');
  const enregistrer = el('button', 'adm-principal', 'Enregistrer');
  enregistrer.type = 'button';
  enregistrer.disabled = !modifie;
  enregistrer.addEventListener('click', () => void sauver());
  haut.append(
    el('h2', 'adm-titre', p.nom),
    el('span', 'adm-lbl', `${c.id} · ${numeroCarte(c.numero, extension.total)} · ${FINITIONS[c.finition].symbole} ${FINITIONS[c.finition].nom}${c.secrete ? ' · secrète' : ''} · ${p.serie} · rang ${p.rang} · ${p.pv} PV`),
    enregistrer,
  );

  const msg = el('div', `adm-message${message?.erreur ? ' erreur' : ''}`);
  msg.setAttribute('role', 'status');
  if (message) {
    msg.append(el('p', undefined, message.texte));
    if (message.details?.length) {
      const ul = el('ul');
      for (const d of message.details) ul.append(el('li', undefined, d));
      msg.append(ul);
    }
  }

  // Données de combat : celles du personnage (communes à toutes ses cartes), en lecture seule.
  // Elles viennent de src/data/fiches-combat.json : on les modifie là, puis npm run fiches.
  const form = el('div', 'adm-form');
  const perso = indexer(extension).personnageDe(c);
  form.append(el('p', 'adm-aide', `Données de combat du personnage${autres.length ? `, communes à ses ${autres.length + 1} cartes` : ''}. `
    + 'Pour les modifier : src/data/fiches-combat.json, puis npm run fiches.'));
  const faiblesse = FAIBLESSE[perso.element];
  const ligneEl = el('div', 'adm-champ');
  // Icônes de l'élément et de sa faiblesse (public/elements), le nom en texte alternatif.
  const aideFaiblesse = el('span', 'adm-aide adm-faiblesse', faiblesse ? 'Faiblesse : ' : 'Faiblesse : aucune');
  if (faiblesse) aideFaiblesse.append(iconeElement(faiblesse, 'adm-element-icone', null), ELEMENTS[faiblesse].nom);
  ligneEl.append(el('span', 'adm-lbl', 'Élément'), iconeElement(perso.element, 'adm-element-icone adm-element-choisi', ELEMENTS[perso.element].nom),
    el('span', undefined, ELEMENTS[perso.element].nom), aideFaiblesse);
  form.append(ligneEl);
  const resume = el('ul', 'adm-combat');
  resume.append(
    el('li', undefined, `${TYPES_PERSONNAGE[perso.type].nom}${perso.type === 'eveille' ? ` (Relève : ${perso.serie})` : ''} · ${perso.pv} PV · Repli ${perso.repli}`),
    el('li', undefined, perso.talent ? `Talent « ${perso.talent.nom} » : ${perso.talent.texte}` : 'Pas de talent'),
    ...perso.attaques.map((x) => el('li', undefined,
      `${x.nom} — coût ${x.cout.join(' ')} — ${texteDegats(x.degats) || 'pas de dégâts'}${x.effet ? ` — ${x.effet}` : ''}`)),
  );
  form.append(resume);

  // Image(s) de la carte.
  const titreImages = el('div', 'adm-ligne');
  titreImages.append(el('h2', undefined, 'Image de la carte'), el('span', 'adm-lbl', 'glisser-déposer · clic · Ctrl+V'));
  const s = statut(c);
  const tuile = el('div', 'adm-tuile');
  const th = el('div', 'adm-tuile-haut');
  th.append(el('strong', undefined, FINITIONS[c.finition].nom), el('span', 'adm-symbole', FINITIONS[c.finition].symbole));
  tuile.append(th, el('span', `adm-statut ${s.classe}`, s.texte), el('p', 'adm-aide', CONSEILS[c.finition]));
  const cases = el('div', 'adm-cases');
  for (const k of calquesDeLaFinition(c.finition)) cases.append(caseDepot(k));
  tuile.append(cases);

  zoneFiche.replaceChildren(haut, msg, form, titreImages, tuile);
}

function caseDepot(k: Calque): HTMLElement {
  const chemin = cheminImage(selId, k);
  const present = possede(selId, k);
  const d = el('div', `adm-depot${present ? ' plein' : ''}${k === calqueActif ? ' actif' : ''}`);
  d.tabIndex = 0;
  d.setAttribute('role', 'button');
  d.setAttribute('aria-label', `${NOMS_CALQUES[k]} : ${present ? 'remplacer l’image' : 'ajouter une image'}`);
  if (present) {
    const img = el('img');
    img.src = `/${avecVersion(chemin)}`;
    img.alt = '';
    d.append(img, el('span', 'adm-legende', NOMS_CALQUES[k]));
  } else {
    d.append(el('span', undefined, NOMS_CALQUES[k]), el('span', undefined, 'Déposer ou cliquer'));
  }
  if (envoiEnCours === k) d.append(el('span', 'adm-occupe', 'Envoi…'));
  const ouvrir = (): void => {
    choisirCalque(k);
    const input = el('input');
    input.type = 'file';
    input.accept = k === 'animation' ? 'image/gif,image/webp' : 'image/png,image/jpeg,image/webp,image/gif';
    input.addEventListener('change', () => { const fi = input.files?.[0]; if (fi) void envoyer(k, fi); });
    input.click();
  };
  d.addEventListener('click', ouvrir);
  d.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ouvrir(); } });
  d.addEventListener('dragover', (e) => { e.preventDefault(); d.classList.add('survol'); });
  d.addEventListener('dragleave', () => d.classList.remove('survol'));
  d.addEventListener('drop', (e) => {
    e.preventDefault();
    d.classList.remove('survol');
    const fi = e.dataTransfer?.files[0];
    if (fi) void envoyer(k, fi);
  });
  return d;
}

const scene = el('div', 'adm-scene');
const notes = el('p', 'adm-aide');
const reglages = el('div', 'adm-reglages');

function rendreApercu(): void {
  const entete = el('div', 'adm-ligne');
  entete.append(el('h2', undefined, 'Aperçu'), el('span', 'adm-lbl', 'bouge la souris sur la carte'));
  // Les autres cartes du personnage, pour passer de l'une à l'autre.
  const seg = el('div', 'adm-seg');
  seg.setAttribute('role', 'group');
  seg.setAttribute('aria-label', `Cartes de ${persoSel().nom}`);
  for (const x of index().cartesDe(carteSel().personnage)) {
    const b = el('button', undefined, `${FINITIONS[x.finition].symbole} ${numeroCarte(x.numero, extension.total).split('/')[0]}`);
    b.type = 'button';
    b.title = `${FINITIONS[x.finition].nom}${x.secrete ? ' (secrète)' : ''}`;
    b.setAttribute('aria-pressed', String(x.id === selId));
    b.addEventListener('click', () => choisir(x.id));
    seg.append(b);
  }
  zoneApercu.replaceChildren(entete, seg, scene, notes, reglages);
  rafraichirApercu();
  rendreReglages();
}

function rafraichirApercu(): void {
  // La carte vient de l'extension d'aperçu : elle porte le cadrage en cours de réglage (pas l'ancien).
  const apercu = extensionApercu();
  scene.replaceChildren(creerCarte(apercu.cartes.find((x) => x.id === selId)!, apercu, { transformerSrc: avecVersion }));
  const c = carteSel();
  const n: string[] = [];
  for (const k of calquesDeLaFinition(c.finition)) {
    if (possede(c.id, k)) continue;
    const base = c.secrete ? index().base(c.personnage) : undefined;
    if (k === 'animation') n.push('Pas d’animation : l’illustration fixe est affichée.');
    else if (base && possede(base.id, 'illustration')) n.push(`${NOMS_CALQUES[k]} reprise de la carte de base.`);
    else n.push(`${NOMS_CALQUES[k]} manquante : silhouette de remplacement.`);
  }
  notes.textContent = n.join(' ') || 'Toutes les images de cette carte lui sont propres.';
}

function rendreReglages(): void {
  if (!calquesDeLaFinition(carteSel().finition).includes(calqueActif)) calqueActif = calquePrincipal(carteSel());
  if (!possede(selId, calqueActif)) {
    reglages.replaceChildren(el('p', 'adm-aide', `Ajoute une image « ${NOMS_CALQUES[calqueActif]} » à cette carte pour la cadrer.`));
    return;
  }
  const cad = cadrage(calqueActif);
  const lignes: HTMLElement[] = [el('span', 'adm-lbl', `Cadrage · ${NOMS_CALQUES[calqueActif]}`)];
  for (const [cle, nom] of [['zoom', 'Zoom'], ['x', 'Horizontal'], ['y', 'Vertical']] as const) {
    const label = el('label');
    const curseur = el('input');
    curseur.type = 'range';
    curseur.min = String(LIMITES_CADRAGE[cle][0]);
    curseur.max = String(LIMITES_CADRAGE[cle][1]);
    curseur.step = '1';
    curseur.value = String(cad[cle]);
    const sortie = el('output', undefined, `${cad[cle]} %`);
    curseur.addEventListener('input', () => {
      brouillon.cadrages[calqueActif] = { ...cadrage(calqueActif), [cle]: Number(curseur.value) };
      sortie.textContent = `${curseur.value} %`;
      marquer();
      rafraichirApercu();
    });
    label.append(el('span', undefined, nom), curseur, sortie);
    lignes.push(label);
  }
  const reinit = el('button', undefined, 'Réinitialiser le cadrage');
  reinit.type = 'button';
  reinit.addEventListener('click', () => {
    brouillon.cadrages[calqueActif] = { ...CADRAGE_DEFAUT };
    marquer();
    rafraichirApercu();
    rendreReglages();
  });
  lignes.push(reinit);
  reglages.replaceChildren(...lignes);
}

const zoneMigration = el('div', 'adm-migration');
function rendreMigration(): void {
  const n = anciennes();
  if (n === 0) { zoneMigration.replaceChildren(); return; }
  const b = el('button', undefined, 'Migrer les anciennes images');
  b.type = 'button';
  b.addEventListener('click', () => void migrer());
  zoneMigration.replaceChildren(
    el('p', undefined, `${n} ancienne${n > 1 ? 's' : ''} image${n > 1 ? 's' : ''} rangée${n > 1 ? 's' : ''} par finition (public/cartes/<id>/<finition>.webp) peu${n > 1 ? 'vent' : 't'} être copiée${n > 1 ? 's' : ''} vers ${n > 1 ? 'leurs cartes' : 'sa carte'}. Rien n’est écrasé ni supprimé.`),
    b,
  );
}

function toutRendre(): void {
  rendreMigration();
  rendreListe();
  rendreFiche();
  rendreApercu();
}

// ---------- Actions ----------
function marquer(): void {
  if (!modifie) {
    modifie = true;
    const b = zoneFiche.querySelector<HTMLButtonElement>('.adm-principal');
    if (b) b.disabled = false;
  }
}

function choisir(id: string): void {
  if (id === selId) return;
  if (modifie && !confirm('Cette fiche a des modifications non enregistrées. Les abandonner ?')) return;
  selId = id;
  brouillon = brouillonDe(carteSel());
  modifie = false;
  message = null;
  calqueActif = calquePrincipal(carteSel());
  const adresse = new URL(location.href);
  adresse.searchParams.set('carte', id);
  history.replaceState(null, '', adresse);
  toutRendre();
}

function choisirCalque(k: Calque): void {
  calqueActif = k;
  rendreFiche();
  rendreReglages();
}

/** Convertit n'importe quelle image en WebP (qualité 0,9) avec un canvas, en gardant la transparence. */
async function rechargerFichiers(): Promise<void> {
  const r = await fetch('/__admin/fichiers');
  const f = await r.json() as Record<string, string[]>;
  fichiers = new Map(Object.entries(f).map(([id, noms]) => [id, new Set(noms)]));
}

async function envoyer(k: Calque, fichier: File): Promise<void> {
  if (k === 'animation' ? !['image/gif', 'image/webp'].includes(fichier.type) : !/^image\/(png|jpeg|webp|gif)$/.test(fichier.type)) {
    message = { texte: k === 'animation' ? 'L’animation doit être un GIF ou un WebP animé.' : 'Format non pris en charge : utilise un PNG, JPEG, WebP ou GIF.', erreur: true };
    rendreFiche();
    return;
  }
  const id = selId;
  calqueActif = k;
  envoiEnCours = k;
  message = null;
  rendreFiche();
  try {
    // Mêmes règles que npm run images : WebP qualité 85, 1400 px de haut au plus, 5 Mo au plus pour une animation.
    const conv = k === 'animation' ? await animationEnWebp(fichier) : await imageFixeEnWebp(fichier);
    const donnees = new Blob([conv.octets], { type: 'image/webp' });
    if (donnees.size > TAILLE_MAX_IMAGE) throw new Error('Image trop lourde après conversion : 20 Mo maximum.');
    const r = await fetch(`/__admin/image?carte=${encodeURIComponent(id)}&calque=${k}`, {
      method: 'POST',
      headers: { 'Content-Type': 'image/webp' },
      body: donnees,
    });
    const corps = await r.json() as { ok: boolean; erreurs?: string[] };
    if (!r.ok || !corps.ok) throw new Error(corps.erreurs?.join(' ') ?? `Erreur ${r.status}`);
    const chemin = cheminImage(id, k);
    versions.set(chemin, Date.now());
    if (!fichiers.has(id)) fichiers.set(id, new Set());
    fichiers.get(id)!.add(nomFichierImage(k));
    const reduite = conv.images < conv.imagesSource ? ` · ${conv.images} images gardées sur ${conv.imagesSource} pour rester sous 5 Mo` : '';
    message = { texte: `Image enregistrée : public/${chemin} (${conv.largeur}×${conv.hauteur}, ${Math.round(donnees.size / 1024)} Ko${reduite}).`, erreur: false };
  } catch (e) {
    message = { texte: `L’envoi a échoué : ${(e as Error).message}`, erreur: true };
  } finally {
    envoiEnCours = null;
    if (id === selId) toutRendre();
  }
}

async function sauver(): Promise<void> {
  const c = carteSel();
  try {
    const r = await fetch('/__admin/carte', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: c.id, cadrages: brouillon.cadrages }),
    });
    const corps = await r.json() as { ok: boolean; erreurs?: string[]; carte?: Carte; personnage?: Personnage; sauvegarde?: string; fichier?: string; inchange?: boolean };
    if (!r.ok || !corps.ok || !corps.carte || !corps.personnage) {
      message = { texte: 'Enregistrement refusé :', erreur: true, details: corps.erreurs?.length ? corps.erreurs : [`Réponse inattendue du serveur (code ${r.status}).`] };
    } else {
      const { carte, personnage } = corps;
      extension = {
        ...extension,
        cartes: extension.cartes.map((x) => (x.id === carte.id ? carte : x)),
        personnages: extension.personnages.map((x) => (x.id === personnage.id ? personnage : x)),
      };
      brouillon = brouillonDe(carte);
      modifie = false;
      message = { texte: corps.inchange ? 'Rien à enregistrer : la fiche est déjà à jour.' : `Fiche enregistrée dans ${corps.fichier} (copie : ${corps.sauvegarde}).`, erreur: false };
    }
  } catch (e) {
    message = { texte: `L’enregistrement a échoué : ${(e as Error).message}`, erreur: true };
  }
  toutRendre();
}

async function migrer(): Promise<void> {
  try {
    const r = await fetch('/__admin/migrer-images', { method: 'POST' });
    const corps = await r.json() as { ok: boolean; erreurs?: string[]; copiees?: string[]; dejaPresentes?: string[]; sansCarte?: string[]; calquesAbandonnes?: string[] };
    if (!r.ok || !corps.ok) throw new Error(corps.erreurs?.join(' ') ?? `Erreur ${r.status}`);
    await rechargerFichiers();
    for (const ligne of corps.copiees ?? []) versions.set(ligne.split(' → ')[1]!, Date.now());
    const details = [
      ...(corps.copiees ?? []).map((x) => `Copiée : ${x}`),
      ...(corps.dejaPresentes ?? []).map((x) => `Déjà en place, non copiée : ${x}`),
      ...(corps.sansCarte ?? []).map((x) => `Pas de carte de cette rareté pour ce personnage : ${x}`),
      ...(corps.calquesAbandonnes ?? []).map((x) => `Ancien calque séparé, plus utilisé (une seule image par carte) : ${x}`),
    ];
    message = { texte: `Migration terminée : ${corps.copiees?.length ?? 0} image(s) copiée(s). Les anciens fichiers sont toujours là ; tu peux les supprimer une fois vérifié.`, erreur: false, details };
  } catch (e) {
    message = { texte: `La migration a échoué : ${(e as Error).message}`, erreur: true };
  }
  toutRendre();
}

// Ctrl+V : colle l'image dans la case active.
document.addEventListener('paste', (e) => {
  if ((e.target as HTMLElement).closest?.('input, textarea, select')) return;
  const f = [...(e.clipboardData?.files ?? [])][0];
  if (f) { e.preventDefault(); void envoyer(calqueActif, f); }
});
window.addEventListener('beforeunload', (e) => { if (modifie) e.preventDefault(); });

// ---------- Démarrage ----------
async function demarrer(): Promise<void> {
  if (!import.meta.env.DEV) {
    app.replaceChildren(el('p', 'adm-vide', 'La page d’admin n’existe qu’avec npm run dev.'));
    return;
  }
  try {
    const rVagues = await fetch('/__admin/vagues');
    if (!rVagues.ok) throw new Error();
    vagues = await rVagues.json() as typeof vagues;
    const rExt = await fetch('/__admin/extension');
    if (!rExt.ok) throw new Error();
    extension = await rExt.json() as Extension;
    await rechargerFichiers();
  } catch {
    app.replaceChildren(el('p', 'adm-vide', 'Routes d’admin introuvables : lance le jeu avec npm run dev.'));
    return;
  }
  const demande = new URLSearchParams(location.search).get('carte');
  selId = index().carte(demande ?? '') ? demande! : index().cartesTriees[0]!.id;
  brouillon = brouillonDe(carteSel());
  calqueActif = calquePrincipal(carteSel());

  const entete = el('header', 'adm-haut');
  const descImages = el('p', undefined, `Toutes les cartes de ${extension.nom}, toutes vagues (${vagues.map((v) => v.nom).join(', ')}). Une image par carte, quelle que soit sa rareté. Vérifie le rendu en direct. Développement seulement.`);
  // Onglets : Images | Popularité (?onglet=popularite dans l'adresse, gardé au rechargement).
  const onglets = el('div', 'adm-onglets');
  onglets.setAttribute('role', 'tablist');
  onglets.setAttribute('aria-label', 'Sections de l’admin');
  const mise = el('main', 'adm-grille');
  mise.id = 'adm-panneau-images';
  mise.append(zoneListe, zoneFiche, zoneApercu);
  let popularite: HTMLElement | null = null;
  const boutonsOnglet: HTMLButtonElement[] = [];
  const afficherOnglet = (nom: 'images' | 'popularite'): void => {
    const adresse = new URL(location.href);
    if (nom === 'popularite') adresse.searchParams.set('onglet', 'popularite'); else adresse.searchParams.delete('onglet');
    history.replaceState(null, '', adresse);
    if (nom === 'popularite' && !popularite) {
      popularite = creerOngletPopularite();
      popularite.id = 'adm-panneau-popularite';
      popularite.setAttribute('role', 'tabpanel');
    }
    mise.hidden = nom !== 'images';
    descImages.hidden = nom !== 'images';
    zoneMigration.hidden = nom !== 'images';
    for (const b of boutonsOnglet) b.setAttribute('aria-selected', String(b.dataset.onglet === nom));
    app.replaceChildren(entete, nom === 'images' ? mise : popularite!);
  };
  for (const [nom, texte] of [['images', 'Images'], ['popularite', 'Popularité']] as const) {
    const b = el('button', 'adm-onglet', texte);
    b.type = 'button';
    b.dataset.onglet = nom;
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-controls', `adm-panneau-${nom}`);
    b.addEventListener('click', () => afficherOnglet(nom));
    boutonsOnglet.push(b);
    onglets.append(b);
  }
  mise.setAttribute('role', 'tabpanel');
  entete.append(el('h1', undefined, `Admin · ${extension.nom}`), onglets, descImages, zoneMigration);
  toutRendre();
  afficherOnglet(new URLSearchParams(location.search).get('onglet') === 'popularite' ? 'popularite' : 'images');
}

void demarrer();
