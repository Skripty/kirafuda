// Écran affiché à la place du jeu quand les données sont invalides.
import './erreurs.css';

export function afficherErreursDonnees(conteneur: HTMLElement, erreurs: string[]): void {
  const main = document.createElement('main');
  main.className = 'erreurs-donnees';
  main.setAttribute('role', 'alert');

  const titre = document.createElement('h1');
  titre.textContent = 'Le jeu ne peut pas démarrer';

  const intro = document.createElement('p');
  intro.textContent = `${erreurs.length} erreur${erreurs.length > 1 ? 's' : ''} dans les données (src/data) :`;

  const liste = document.createElement('ul');
  for (const erreur of erreurs) {
    const li = document.createElement('li');
    li.textContent = erreur;
    liste.append(li);
  }

  main.append(titre, intro, liste);
  conteneur.replaceChildren(main);
}
