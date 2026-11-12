// Écran de résultats : les 5 cartes, nouveau ou ×N, points gagnés.
import { creerCarteDuJeu } from '../carte-soutien';
import { FINITIONS } from '../../core/regles';
import type { Extension, Ouverture } from '../../core/types';

export function creerResultats(ouverture: Ouverture, extension: Extension, onTerminer: () => void): HTMLElement {
  const section = document.createElement('section');
  section.className = 'ouv-resultats';

  const titre = document.createElement('h1');
  titre.tabIndex = -1;
  titre.textContent = ouverture.exceptionnelle ? 'Booster exceptionnel !' : 'Ton booster';

  const nouvelles = ouverture.cartes.filter((c) => c.nouveau).length;
  const bilan = document.createElement('p');
  bilan.className = 'ouv-bilan';
  bilan.textContent = `${nouvelles} nouvelle${nouvelles > 1 ? 's' : ''} carte${nouvelles > 1 ? 's' : ''} · +${ouverture.pointsGagnes} points ${extension.nom}`;

  const liste = document.createElement('ul');
  liste.className = 'ouv-grille';
  for (const tiree of ouverture.cartes) {
    const visuel = creerCarteDuJeu(tiree.carteId, extension, { interactive: false });
    if (!visuel) continue;
    const f = FINITIONS[tiree.finition];
    const li = document.createElement('li');
    visuel.style.setProperty('--carte-largeur', '100%');
    const legende = document.createElement('p');
    legende.className = 'ouv-grille-legende';
    const finition = document.createElement('span');
    finition.textContent = `${f.symbole} ${f.nom}`;
    const statut = document.createElement('strong');
    statut.className = tiree.nouveau ? 'ouv-nouveau' : 'ouv-doublon';
    statut.textContent = tiree.nouveau ? 'Nouveau' : `×${tiree.exemplaires}`;
    legende.append(finition, statut);
    li.append(visuel, legende);
    liste.append(li);
  }

  const retour = document.createElement('button');
  retour.type = 'button';
  retour.className = 'ouv-retour';
  retour.textContent = 'Retour à l’accueil';
  retour.addEventListener('click', onTerminer);

  section.append(titre, bilan, liste, retour);
  return section;
}
