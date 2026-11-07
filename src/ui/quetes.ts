// Quêtes : bloc « Quêtes du jour » et calendrier de bienvenue (accueil), écran « Quêtes » complet.
// Même style que la refonte (panneaux .acc-panneau). Toutes les données viennent de vueQuetes().
import './hub.css';
import './quetes.css';
import type { CibleReclamation, LigneQuete, VueQuetes } from '../core/quetes';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, classe?: string, texte?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texte !== undefined) e.textContent = texte;
  return e;
}
const sceaux = (n: number): string => `${n} ${n > 1 ? 'sceaux' : 'sceau'}`;

function panneau(titre: string, id: string): HTMLElement {
  const s = el('section', 'acc-panneau');
  s.setAttribute('aria-labelledby', id);
  const h2 = el('h2', undefined, titre);
  h2.id = id;
  s.append(h2);
  return s;
}

function bouton(texte: string, action: () => void, actif: boolean, libelle?: string): HTMLButtonElement {
  const b = el('button', 'q-reclamer', texte);
  b.type = 'button';
  b.disabled = !actif;
  if (libelle) b.setAttribute('aria-label', libelle);
  b.addEventListener('click', action);
  return b;
}

/** Une ligne de quête : texte, barre de progression, compteur, et éventuellement un bouton Réclamer. */
function ligne(l: LigneQuete, reclamer?: () => void): HTMLElement {
  const d = el('div', `q-ligne${l.faite ? ' faite' : ''}`);
  const haut = el('div', 'q-ligne-haut');
  haut.append(el('span', 'q-texte', l.texte));
  if (l.sceaux > 0) haut.append(el('span', 'q-gain', `+${sceaux(l.sceaux)}`));
  const jauge = el('div', 'acc-jauge');
  jauge.setAttribute('role', 'progressbar');
  jauge.setAttribute('aria-label', l.texte);
  jauge.setAttribute('aria-valuemin', '0');
  jauge.setAttribute('aria-valuemax', String(l.objectif));
  jauge.setAttribute('aria-valuenow', String(l.progres));
  const plein = el('span');
  plein.style.transform = `scaleX(${(l.progres / l.objectif).toFixed(3)})`;
  jauge.append(plein);
  const bas = el('div', 'q-ligne-bas');
  bas.append(el('span', 'acc-fin', l.faite ? '✓ Faite' : `${l.progres} / ${l.objectif}`));
  if (reclamer) {
    if (l.reclamee) bas.append(el('span', 'q-reclamee', 'Réclamée'));
    else bas.append(bouton('Réclamer', reclamer, l.faite, `Réclamer : ${l.texte}`));
  }
  d.append(haut, jauge, bas);
  return d;
}

/** Bloc « Quêtes du jour » : les 3 quêtes (mêmes pour tous) et le bonus « les 3 faites ». */
export function creerBlocQuetesDuJour(vue: VueQuetes, onReclamer: (c: CibleReclamation) => void, lienToutes = true): HTMLElement {
  const p = panneau('Quêtes du jour', 'q-t-jour');
  if (lienToutes) {
    const a = el('a', 'acc-lien-discret', vue.aReclamer > 0 ? `Toutes les quêtes (${vue.aReclamer})` : 'Toutes les quêtes');
    a.href = '#/quetes';
    p.querySelector('h2')!.after(a);
  }
  for (const l of vue.quetesDuJour) p.append(ligne(l));
  const bonus = el('div', 'q-bonus');
  const faites = vue.quetesDuJour.filter((l) => l.faite).length;
  bonus.append(el('span', undefined, `Les ${vue.quetesDuJour.length} faites (${faites} / ${vue.quetesDuJour.length}) : +${sceaux(vue.bonus.sceaux)}`));
  if (vue.bonus.reclame) bonus.append(el('span', 'q-reclamee', 'Réclamé'));
  else bonus.append(bouton('Réclamer', () => onReclamer({ type: 'bonus-jour' }), vue.bonus.pret, 'Réclamer le bonus des quêtes du jour'));
  p.append(bonus);
  return p;
}

/** Calendrier de bienvenue : 7 cases, une par jour joué. Rien si le calendrier est fini. */
export function creerCalendrier(vue: VueQuetes): HTMLElement | null {
  if (vue.calendrierFini) return null;
  const p = panneau('Calendrier de bienvenue', 'q-t-calendrier');
  const obtenus = vue.calendrier.filter((j) => j.obtenu).length;
  p.querySelector('h2')!.after(el('span', 'acc-fin', `${obtenus} / ${vue.calendrier.length}`));
  const cases = el('ol', 'q-calendrier');
  for (const j of vue.calendrier) {
    const li = el('li', `q-case${j.obtenu ? ' obtenue' : ''}${j.aujourdhui ? ' aujourdhui' : ''}`);
    li.setAttribute('aria-label', `Jour ${j.jour} : ${sceaux(j.sceaux)}${j.garanti ? ', booster avec une carte ★ garantie' : ''}${j.obtenu ? ', obtenu' : ''}`);
    li.append(el('span', 'q-case-jour', `J${j.jour}`), el('strong', undefined, `+${j.sceaux}`));
    if (j.garanti) li.append(el('span', 'q-case-garanti', '★'));
    cases.append(li);
  }
  p.append(cases, el('p', 'acc-fin', 'Une case par jour joué. ★ : booster avec une carte ★ ou plus garantie.'));
  return p;
}

export interface OptionsEcranQuetes {
  vue: VueQuetes;
  onReclamer: (c: CibleReclamation) => void;
  annonce: string | null;
}

/** Écran « Quêtes » : quêtes du jour, calendrier, quête de la semaine, quêtes de débutant. */
export function creerEcranQuetes(o: OptionsEcranQuetes): HTMLElement {
  const { vue } = o;
  const main = el('main', 'acc q-ecran');
  const entete = el('header', 'q-entete');
  const retour = el('a', 'q-retour', 'Accueil');
  retour.href = '#/';
  entete.append(retour, el('h1', undefined, 'Quêtes'));
  const annonce = el('p', 'acc-annonce', o.annonce ?? '');
  annonce.setAttribute('role', 'status');

  const grille = el('div', 'q-grille');
  const colonneA = el('div', 'q-colonne');
  colonneA.append(creerBlocQuetesDuJour(vue, o.onReclamer, false));
  const calendrier = creerCalendrier(vue);
  if (calendrier) colonneA.append(calendrier);
  const pSemaine = panneau('Quête de la semaine', 'q-t-semaine');
  pSemaine.append(ligne(vue.semaine, () => o.onReclamer({ type: 'semaine' })));
  colonneA.append(pSemaine);

  const pDebutant = panneau('Quêtes de débutant', 'q-t-debutant');
  pDebutant.append(el('p', 'acc-fin', 'Une seule fois chacune.'));
  for (const l of vue.debutant) pDebutant.append(ligne(l, () => o.onReclamer({ type: 'debutant', id: l.id })));
  const colonneB = el('div', 'q-colonne');
  colonneB.append(pDebutant);

  grille.append(colonneA, colonneB);
  main.append(entete, annonce, grille);
  return main;
}
