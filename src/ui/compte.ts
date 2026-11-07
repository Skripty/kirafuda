// Compte (tâche 23) : bouton de la barre du haut, section « Compte » des Paramètres,
// fenêtres du premier login (pseudo) et du choix entre deux sauvegardes.
// Chaque élément se met à jour seul quand l'état du compte change.
import './compte.css';
import type { Compte, CoteChoix, EtatCompte, EtatSynchro } from '../en-ligne/compte';
import { PSEUDO_MAX, PSEUDO_MIN } from '../core/synchro';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, classe?: string, texte?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texte !== undefined) e.textContent = texte;
  return e;
}
function bouton(texte: string, classe: string, action: () => void): HTMLButtonElement {
  const b = el('button', classe, texte);
  b.type = 'button';
  b.addEventListener('click', action);
  return b;
}

/** Abonne un élément à l'état du compte ; l'abonnement s'arrête quand l'élément a quitté la page. */
function lier(compte: Compte, racine: HTMLElement, rendre: (e: EtatCompte) => void): void {
  rendre(compte.etat());
  let vu = false;
  const fin = compte.abonner((e) => {
    if (!racine.isConnected) { if (vu) fin(); return; }
    vu = true;
    rendre(e);
  });
  queueMicrotask(() => { if (racine.isConnected) vu = true; });
}

const TEXTES_SYNCHRO: Record<EtatSynchro, string> = {
  'a-jour': 'Sauvegarde en ligne à jour',
  'envoi': 'Envoi de la sauvegarde…',
  'en-attente': 'Envoi en attente',
  'hors-ligne': 'Hors ligne : le jeu continue, la sauvegarde sera envoyée au retour du réseau',
  'erreur': 'Envoi impossible pour le moment : nouvel essai dans 30 secondes',
  'bloquee': 'Synchronisation arrêtée : recharge la page',
};

const dateLisible = (iso: string | null): string => {
  if (!iso) return 'date inconnue';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? 'date inconnue' : d.toLocaleString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};
const pl = (n: number, s: string, p = `${s}s`): string => `${n} ${n > 1 ? p : s}`;

/** Bouton de la barre du haut : « Se connecter », ou le pseudo avec l'état de la synchronisation. */
export function creerBoutonCompte(compte: Compte, ouvrirParametres: () => void): HTMLElement {
  const b = el('button', 'compte-bouton');
  b.type = 'button';
  lier(compte, b, (e) => {
    b.hidden = e.statut === 'desactive';
    b.disabled = e.statut === 'chargement';
    b.dataset.synchro = e.statut === 'connecte' ? e.synchro : '';
    b.replaceChildren();
    if (e.statut === 'deconnecte' || e.statut === 'chargement') {
      b.append(el('span', undefined, e.statut === 'chargement' ? 'Compte…' : 'Se connecter'));
      b.setAttribute('aria-label', e.statut === 'chargement' ? 'Compte : chargement' : 'Se connecter avec Discord');
    } else if (e.statut === 'pseudo') {
      b.append(el('span', undefined, 'Choisir un pseudo'));
      b.setAttribute('aria-label', 'Choisir un pseudo');
    } else if (e.statut === 'choix') {
      b.append(el('span', undefined, 'Choisir la sauvegarde'));
      b.setAttribute('aria-label', 'Choisir la sauvegarde à garder');
    } else {
      const point = el('i', 'compte-point');
      point.setAttribute('aria-hidden', 'true');
      b.append(point, el('span', 'compte-pseudo', e.pseudo ?? 'Compte'));
      b.setAttribute('aria-label', `Compte ${e.pseudo ?? ''} : ${TEXTES_SYNCHRO[e.synchro]}`);
      b.title = TEXTES_SYNCHRO[e.synchro];
    }
  });
  b.addEventListener('click', () => {
    const s = compte.etat().statut;
    if (s === 'deconnecte') void compte.seConnecter();
    else if (s === 'pseudo' || s === 'choix') ouvrirDialogues(compte, true);
    else ouvrirParametres();
  });
  return b;
}

/** Section « Compte » des Paramètres. */
export function creerSectionCompte(compte: Compte): HTMLElement {
  const section = el('section', 'compte-section');
  section.setAttribute('aria-labelledby', 'compte-titre');
  lier(compte, section, (e) => {
    section.hidden = e.statut === 'desactive';
    const titre = el('h2', undefined, 'Compte');
    titre.id = 'compte-titre';
    const lignes: HTMLElement[] = [titre];
    const message = el('p', 'compte-message');
    message.setAttribute('role', 'status');
    if (e.message) message.textContent = e.message;
    if (e.statut === 'chargement') lignes.push(el('p', 'compte-texte', 'Vérification de la connexion…'));
    else if (e.statut === 'deconnecte') {
      lignes.push(
        el('p', 'compte-texte', 'Sans compte, ta partie est sauvegardée sur cet appareil seulement. Connecte-toi pour la retrouver sur ton téléphone ou un autre ordinateur.'),
        bouton('Se connecter avec Discord', 'compte-principal', () => void compte.seConnecter()),
      );
    } else if (e.statut === 'pseudo') {
      lignes.push(el('p', 'compte-texte', 'Connecté avec Discord. Il reste à choisir ton pseudo.'), bouton('Choisir un pseudo', 'compte-principal', () => ouvrirDialogues(compte, true)));
    } else if (e.statut === 'choix') {
      lignes.push(el('p', 'compte-texte', 'Cet appareil et ton compte ont deux sauvegardes différentes. Choisis celle à garder ; en attendant, rien n’est envoyé.'), bouton('Choisir la sauvegarde', 'compte-principal', () => ouvrirDialogues(compte, true)));
    } else if (e.statut === 'connecte') {
      const qui = el('p', 'compte-texte');
      qui.append('Connecté : ', el('strong', undefined, e.pseudo ?? '—'), ' (Discord)');
      const etat = el('p', `compte-etat ${e.synchro}`, TEXTES_SYNCHRO[e.synchro]);
      if (e.derniereSynchro && e.synchro === 'a-jour') etat.textContent += ` · ${dateLisible(e.derniereSynchro)}`;
      lignes.push(qui, etat, el('p', 'compte-aide', 'La sauvegarde de cet appareil est envoyée après chaque action (toutes les 5 secondes au plus) et quand tu quittes le jeu.'),
        bouton('Se déconnecter', 'compte-secondaire', () => void compte.seDeconnecter()));
    }
    lignes.push(message);
    section.replaceChildren(...lignes);
  });
  return section;
}

// ---------- Fenêtres : pseudo et choix de la sauvegarde ----------

let dialogue: HTMLDialogElement | null = null;
/** Fenêtre fermée par le joueur (« Plus tard ») : elle ne se rouvre pas d'elle-même pour le même état. */
let refusePour: string | null = null;

function cleEtat(e: EtatCompte): string { return `${e.statut}:${e.choix ? `${e.choix.locale.date}|${e.choix.enLigne.date}` : ''}`; }

function cote(titre: string, c: CoteChoix): HTMLElement {
  const bloc = el('div', 'compte-cote');
  bloc.append(
    el('h3', undefined, titre),
    el('p', 'compte-date', dateLisible(c.date)),
    el('p', undefined, `${pl(c.cartes, 'carte')} (${pl(c.cartesDifferentes, 'différente')})`),
    el('p', undefined, `${pl(c.boosters, 'booster ouvert', 'boosters ouverts')}`),
    el('p', undefined, pl(c.sceaux, 'sceau', 'sceaux')),
  );
  return bloc;
}

function remplir(compte: Compte, d: HTMLDialogElement, e: EtatCompte): void {
  if (e.statut === 'pseudo') {
    const form = el('form', 'compte-form');
    form.method = 'dialog';
    const titre = el('h2', undefined, 'Choisis ton pseudo');
    titre.id = 'compte-dialogue-titre';
    const aide = el('p', 'compte-texte', `Il sera visible des autres joueurs (classement du draft). ${PSEUDO_MIN} à ${PSEUDO_MAX} caractères : lettres, chiffres, espace, « _ », « - » et « . ».`);
    const champ = el('input', 'compte-champ');
    champ.type = 'text';
    champ.name = 'pseudo';
    champ.required = true;
    champ.minLength = PSEUDO_MIN;
    champ.maxLength = PSEUDO_MAX + 10;
    champ.setAttribute('autocomplete', 'nickname');
    champ.value = e.pseudoPropose;
    champ.setAttribute('aria-label', 'Pseudo');
    const erreur = el('p', 'compte-erreur');
    erreur.setAttribute('role', 'alert');
    const valider = el('button', 'compte-principal', 'Valider');
    valider.type = 'submit';
    const plusTard = bouton('Plus tard', 'compte-secondaire', () => { refusePour = cleEtat(compte.etat()); d.close(); });
    const actions = el('div', 'compte-actions');
    actions.append(plusTard, valider);
    form.append(titre, aide, champ, erreur, actions);
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      valider.disabled = true;
      erreur.textContent = '';
      void compte.choisirPseudo(champ.value).then((m) => {
        valider.disabled = false;
        if (m) { erreur.textContent = m; champ.focus(); }
      });
    });
    d.replaceChildren(form);
    d.setAttribute('aria-labelledby', titre.id);
    queueMicrotask(() => { champ.focus(); champ.select(); });
  } else if (e.statut === 'choix' && e.choix) {
    const titre = el('h2', undefined, 'Quelle sauvegarde garder ?');
    titre.id = 'compte-dialogue-titre';
    const cotes = el('div', 'compte-cotes');
    cotes.append(cote('Sur cet appareil', e.choix.locale), cote('En ligne (ton compte)', e.choix.enLigne));
    const actions = el('div', 'compte-actions compte-actions-choix');
    const choisir = (l: 'locale' | 'en-ligne'): void => { d.close(); void compte.choisirSauvegarde(l); };
    actions.append(
      bouton('Garder celle de cet appareil', 'compte-secondaire', () => choisir('locale')),
      bouton('Reprendre celle en ligne', 'compte-principal', () => choisir('en-ligne')),
    );
    const plusTard = bouton('Décider plus tard', 'compte-lien', () => { refusePour = cleEtat(compte.etat()); d.close(); });
    d.replaceChildren(titre, el('p', 'compte-texte', 'Ton compte et cet appareil ont deux parties différentes. Celle que tu ne gardes pas sera remplacée.'), cotes, actions, plusTard);
    d.setAttribute('aria-labelledby', titre.id);
  }
}

/** Ouvre la fenêtre adaptée à l'état (pseudo ou choix), si besoin. `force` : même après « Plus tard ». */
function ouvrirDialogues(compte: Compte, force: boolean): void {
  const e = compte.etat();
  if (!dialogue) return;
  const d = dialogue;
  if (e.statut !== 'pseudo' && e.statut !== 'choix') { if (d.open) d.close(); return; }
  if (!force && refusePour === cleEtat(e)) return;
  if (d.open && d.dataset.cle === cleEtat(e)) return;
  d.dataset.cle = cleEtat(e);
  remplir(compte, d, e);
  if (!d.open) d.showModal();
}

/** Installe les fenêtres du compte (une seule fois, hors des écrans du jeu). */
export function installerDialoguesCompte(compte: Compte): void {
  if (dialogue) return;
  dialogue = el('dialog', 'compte-dialogue');
  // Échap = « Plus tard » : la fenêtre ne revient pas d'elle-même.
  dialogue.addEventListener('cancel', () => { refusePour = cleEtat(compte.etat()); });
  document.body.append(dialogue);
  compte.abonner(() => ouvrirDialogues(compte, false));
  ouvrirDialogues(compte, false);
}
