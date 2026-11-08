// Écran « Classement » du draft (tâche 24) : semaine en cours (rang, pseudo, score, équipe au survol ou au toucher),
// ma position mise en avant, et les semaines passées. Lisible sans compte ; il faut un compte pour y figurer.
import './classement.css';
import type { Carte, Extension } from '../core/types';
import { FINITIONS } from '../core/regles';
import { finSemaineDraft, rangTexte, semaineDraft, semaineFermee, semainesPassees, type RecompensesDraft } from '../core/classement';
import type { Classement, LigneClassement, ServeurClassement } from '../en-ligne/classement';
import type { Compte } from '../en-ligne/compte';
import { creerCarte } from './carte';
import { lier } from './compte';

export interface OptionsClassement {
  /** null : jeu sans configuration Supabase (pas de classement). */
  serveur: ServeurClassement | null;
  compte: Compte | null;
  /** Semaine demandée dans l'adresse (#/classement/2026-S45), sinon la semaine en cours. */
  semaine: string | null;
  maintenant: Date;
  carteDe: (id: string) => { carte: Carte; extension: Extension } | null;
  recompenses: RecompensesDraft;
}

/** Nombre de lignes affichées (ma ligne est ajoutée en dessous si je suis plus loin). */
export const LIGNES_AFFICHEES = 100;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, classe?: string, texte?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texte !== undefined) e.textContent = texte;
  return e;
}
const sceaux = (n: number): string => `${n} sceau${n > 1 ? 'x' : ''}`;
const pl = (n: number, s: string): string => `${n} ${s}${n > 1 ? 's' : ''}`;

/** « dimanche 15 novembre à 23 h 59 » (heure de Paris). */
function finLisible(semaine: string): string {
  const fin = new Date(finSemaineDraft(semaine).getTime() - 60_000);
  const jour = fin.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Paris' });
  return `${jour} à 23 h 59`;
}

export function creerClassement(o: OptionsClassement): HTMLElement {
  const courante = semaineDraft(o.maintenant);
  const passees = semainesPassees(o.maintenant);
  const semaine = o.semaine && (o.semaine === courante || passees.includes(o.semaine)) ? o.semaine : courante;
  const fermee = semaineFermee(semaine, o.maintenant);

  const main = el('main', 'classement');
  const entete = el('header', 'classement-entete');
  const retour = el('a', 'classement-lien', 'Accueil');
  retour.href = '#/';
  const versDraft = el('a', 'classement-lien', 'Draft');
  versDraft.href = '#/draft';
  entete.append(retour, el('h1', undefined, 'Classement du draft'), versDraft);

  // Choix de la semaine : en cours, ou une semaine passée.
  const choixSemaine = el('div', 'classement-semaines');
  const etiquette = el('label', undefined, 'Semaine');
  const liste = el('select');
  liste.id = 'classement-semaine';
  etiquette.htmlFor = liste.id;
  for (const s of [courante, ...passees]) {
    const opt = el('option', undefined, s === courante ? `${s} (en cours)` : s);
    opt.value = s;
    opt.selected = s === semaine;
    liste.append(opt);
  }
  liste.addEventListener('change', () => { location.hash = liste.value === courante ? '#/classement' : `#/classement/${liste.value}`; });
  choixSemaine.append(etiquette, liste);

  const p = o.recompenses.podium;
  const infos = el('section', 'classement-infos');
  infos.setAttribute('aria-label', 'Règles du classement');
  infos.append(
    el('p', undefined, fermee
      ? `Semaine ${semaine} fermée : le classement est figé.`
      : `Semaine en cours : ton équipe peut changer jusqu’au ${finLisible(semaine)} (heure de Paris).`),
    el('p', 'classement-doux', `Récompenses, à réclamer après la fermeture : ${p.map((n, i) => `${rangTexte(i + 1)} +${sceaux(n)}`).join(', ')}, `
      + `puis +${sceaux(o.recompenses.participation)} pour toute participation. Score vérifié par le serveur ; à égalité, la première équipe envoyée passe devant.`),
  );

  const invitation = el('div', 'classement-invitation');
  if (o.compte) {
    const compte = o.compte;
    lier(compte, invitation, (e) => {
      invitation.replaceChildren();
      invitation.hidden = e.statut === 'connecte' || e.statut === 'desactive';
      if (invitation.hidden) return;
      const b = el('button', undefined, 'Se connecter avec Discord');
      b.type = 'button';
      b.disabled = e.statut === 'chargement';
      b.addEventListener('click', () => { void compte.seConnecter(); });
      invitation.append(el('p', undefined, 'Sans compte, le draft reste jouable mais hors classement. Connecte-toi pour y apparaître.'), b);
    });
  } else invitation.hidden = true;

  const contenu = el('section', 'classement-contenu');
  contenu.setAttribute('aria-live', 'polite');
  main.append(entete, choixSemaine, infos, invitation, contenu);

  if (!o.serveur) {
    contenu.append(el('p', 'classement-vide', 'Le classement en ligne n’est pas disponible dans cette version du jeu.'));
    return main;
  }
  const serveur = o.serveur;

  async function charger(): Promise<void> {
    contenu.replaceChildren(el('p', 'classement-vide', 'Chargement du classement…'));
    let c: Classement;
    try {
      c = await serveur.lireClassement(semaine, LIGNES_AFFICHEES);
    } catch {
      const reessayer = el('button', undefined, 'Réessayer');
      reessayer.type = 'button';
      reessayer.addEventListener('click', () => { void charger(); });
      contenu.replaceChildren(el('p', 'classement-vide', 'Classement injoignable pour le moment (hors ligne ?).'), reessayer);
      return;
    }
    afficher(c);
  }

  function afficher(c: Classement): void {
    contenu.replaceChildren();
    if (c.lignes.length === 0) {
      contenu.append(el('p', 'classement-vide', fermee ? 'Personne n’a participé cette semaine-là.' : 'Personne n’est encore classé cette semaine : sois le premier !'));
      return;
    }
    contenu.append(el('p', 'classement-doux', `${pl(c.participants, 'participant')}.`));
    if (c.moi) contenu.append(el('p', 'classement-ma-position', `Ta position : ${rangTexte(c.moi.rang)} sur ${c.participants}, ${c.moi.score} points.`));
    const ol = el('ol', 'classement-liste');
    for (const l of c.lignes) ol.append(ligne(l, c.moi?.rang === l.rang));
    if (c.moi && !c.lignes.some((l) => l.rang === c.moi!.rang)) {
      ol.append(el('li', 'classement-ellipse', '…'), ligne(c.moi, true));
    }
    contenu.append(ol);
  }

  /** Une ligne : rang, pseudo, score ; l'équipe s'ouvre au toucher (bouton) ou au survol. */
  function ligne(l: LigneClassement, moi: boolean): HTMLLIElement {
    const li = el('li', `classement-ligne${moi ? ' moi' : ''}`);
    if (moi) li.setAttribute('aria-current', 'true');
    const bouton = el('button', 'classement-resume');
    bouton.type = 'button';
    bouton.setAttribute('aria-expanded', 'false');
    const idEquipe = `classement-equipe-${semaine}-${l.rang}`;
    bouton.setAttribute('aria-controls', idEquipe);
    bouton.append(
      el('span', 'classement-rang', rangTexte(l.rang)),
      el('span', 'classement-pseudo', moi ? `${l.pseudo} (toi)` : l.pseudo),
      el('span', 'classement-score', `${l.score} pts`),
      el('span', 'classement-voir', 'Équipe'),
    );
    const equipe = el('ul', 'classement-equipe');
    equipe.id = idEquipe;
    equipe.hidden = true;
    let rempli = false;
    const ouvrir = (oui: boolean): void => {
      if (oui && !rempli) {
        rempli = true;
        for (const id of l.cartes) {
          const item = el('li');
          const trouvee = o.carteDe(id);
          if (trouvee) {
            const v = creerCarte(trouvee.carte, trouvee.extension, { interactive: false });
            v.style.setProperty('--carte-largeur', '100%');
            v.setAttribute('aria-label', `${trouvee.extension.personnages.find((p) => p.id === trouvee.carte.personnage)?.nom ?? id}, ${FINITIONS[trouvee.carte.finition].nom}`);
            item.append(v);
          } else item.append(el('span', 'classement-doux', id));
          equipe.append(item);
        }
      }
      equipe.hidden = !oui;
      bouton.setAttribute('aria-expanded', String(oui));
    };
    let ouvertParClic = false;
    bouton.addEventListener('click', () => { ouvertParClic = equipe.hidden; ouvrir(equipe.hidden); });
    // Survol (souris) : l'équipe s'affiche tant que le pointeur est sur la ligne.
    li.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') ouvrir(true); });
    li.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && !ouvertParClic) ouvrir(false); });
    li.append(bouton, equipe);
    return li;
  }

  void charger();
  return main;
}
