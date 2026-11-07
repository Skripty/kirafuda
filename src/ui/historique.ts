// Écran Historique : ouvertures récentes, filtre par finition.
// Une ouverture pas encore révélée ne montre pas ses cartes (et n'apparaît dans aucun filtre).
import './infos.css';
import { ORDRE_FINITIONS } from '../core/regles';
import { cartesParFinition, filtrerHistorique, libelleFinition } from '../core/probabilites';
import type { Booster, Extension, FinitionId, Ouverture, Sauvegarde } from '../core/types';
import { numeroCarte } from './carte';
import { indexer } from '../core/extension';

const PAR_PAGE = 20;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, classe?: string, texte?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texte !== undefined) e.textContent = texte;
  return e;
}

export interface OptionsHistorique {
  sauvegarde: Sauvegarde;
  extension: Extension;
  booster: Booster;
  /** Rejoue la mise en scène d'une ouverture pas encore révélée. */
  onReveler: (o: Ouverture) => void;
}

export function creerHistorique(o: OptionsHistorique): HTMLElement {
  const index = indexer(o.extension);
  // Un seul booster (Lancement, toutes vagues) : tout l'historique est affiché.
  const historique = o.sauvegarde.historique;
  const comptes = cartesParFinition(historique);
  let filtre: FinitionId | null = null;
  let affichees = PAR_PAGE;

  const main = el('main', 'infos');
  const entete = el('header', 'infos-entete');
  const retour = el('a', 'infos-retour', 'Accueil');
  retour.href = '#/';
  entete.append(retour, el('h1', undefined, 'Historique'));

  const champ = el('label', 'infos-champ');
  const select = el('select');
  const tout = el('option', undefined, `Toutes (${historique.length} ouverture${historique.length > 1 ? 's' : ''})`);
  tout.value = '';
  select.append(tout);
  for (const f of ORDRE_FINITIONS) {
    const opt = el('option', undefined, `${libelleFinition(f)} (${comptes[f]} carte${comptes[f] > 1 ? 's' : ''})`);
    opt.value = f;
    select.append(opt);
  }
  champ.append(el('span', undefined, 'Finition'), select);

  const resume = el('p', 'infos-intro');
  resume.setAttribute('aria-live', 'polite');
  const liste = el('ol', 'infos-historique');
  const plus = el('button', 'infos-plus', `Afficher ${PAR_PAGE} de plus`);
  plus.type = 'button';
  main.append(entete, champ, resume, liste, plus);

  const date = (iso: string): string => new Date(iso).toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' });

  function entree(ouv: Ouverture): HTMLLIElement {
    const li = el('li', 'infos-ouverture');
    const haut = el('div', 'infos-ouverture-haut');
    haut.append(el('strong', undefined, date(ouv.date)));
    const detail = [ouv.boosterId === o.booster.id ? o.booster.nom : ouv.boosterId];
    if (ouv.exceptionnelle && ouv.vue) detail.push('Exceptionnel');
    detail.push(`+${ouv.pointsGagnes} points`);
    haut.append(el('span', undefined, detail.join(' · ')));
    li.append(haut);

    if (!ouv.vue) {
      const cache = el('div', 'infos-non-revelee');
      cache.append(el('p', undefined, 'Pas encore révélée : ses cartes sont déjà dans ta collection.'));
      const b = el('button', undefined, 'La révéler');
      b.type = 'button';
      b.addEventListener('click', () => o.onReveler(ouv));
      cache.append(b);
      li.append(cache);
      return li;
    }

    const ul = el('ul', 'infos-cartes');
    for (const t of ouv.cartes) {
      const carte = index.carte(t.carteId);
      const ligne = el('li', filtre && t.finition === filtre ? 'infos-surligne' : undefined);
      ligne.append(
        el('span', undefined, carte ? `${numeroCarte(carte.numero, o.extension.total)} ${index.personnageDe(carte).nom}` : t.carteId),
        el('span', 'infos-finition', libelleFinition(t.finition)),
        el('strong', undefined, t.nouveau ? 'Nouveau' : `×${t.exemplaires}`),
      );
      ul.append(ligne);
    }
    li.append(ul);
    return li;
  }

  function rendre(): void {
    const toutes = filtrerHistorique(historique, filtre);
    resume.textContent = historique.length === 0
      ? 'Aucune ouverture pour l’instant. Ouvre ton premier booster depuis l’accueil.'
      : filtre
        ? `${toutes.length} ouverture${toutes.length > 1 ? 's' : ''} avec au moins une carte ${libelleFinition(filtre)}.`
        : `${toutes.length} ouverture${toutes.length > 1 ? 's' : ''}, de la plus récente à la plus ancienne.`;
    liste.replaceChildren(...toutes.slice(0, affichees).map(entree));
    plus.hidden = toutes.length <= affichees;
  }

  select.addEventListener('change', () => {
    filtre = (select.value || null) as FinitionId | null;
    affichees = PAR_PAGE;
    rendre();
  });
  plus.addEventListener('click', () => { affichees += PAR_PAGE; rendre(); });
  rendre();
  return main;
}
