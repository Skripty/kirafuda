// Page de test (/galerie.html) : les cartes d'un personnage, puis un aperçu de son rendu dans les 8 raretés.
import './styles/tokens.css';
import './ui/galerie.css';
import extension from './data/extension-lancement.json';
import booster from './data/booster-lancement.json';
import type { Booster, Carte, Extension } from './core/types';
import { FINITIONS, ORDRE_FINITIONS } from './core/regles';
import { validerDonnees } from './core/validation';
import { indexer } from './core/extension';
import { afficherErreursDonnees } from './ui/erreurs';
import { creerCarte, numeroCarte } from './ui/carte';

const ext = extension as unknown as Extension;
const app = document.querySelector<HTMLDivElement>('#app')!;
const erreurs = validerDonnees(ext, booster as unknown as Booster);

function caseCarte(carte: Carte, legende: string, etendue: Extension): HTMLElement {
  const figure = document.createElement('figure');
  figure.className = 'galerie-case';
  const fc = document.createElement('figcaption');
  fc.textContent = legende;
  figure.append(creerCarte(carte, etendue), fc);
  return figure;
}

if (erreurs.length > 0) {
  afficherErreursDonnees(app, erreurs);
} else {
  const index = indexer(ext);
  const personnages = ext.personnages;
  // ?carte=lan-041 ou ?personnage=per-041
  const params = new URLSearchParams(location.search);
  const parCarte = index.carte(params.get('carte') ?? '')?.personnage;
  let persoId = parCarte ?? (personnages.some((p) => p.id === params.get('personnage')) ? params.get('personnage')! : personnages[0]!.id);

  app.innerHTML = `
    <main class="galerie">
      <header class="galerie-entete">
        <h1>Galerie des cartes</h1>
        <label class="galerie-choix">
          <span>Personnage</span>
          <select id="choix-perso"></select>
        </label>
        <div class="galerie-nav">
          <button type="button" id="precedente">Précédent</button>
          <button type="button" id="suivante">Suivant</button>
        </div>
      </header>
      <p class="galerie-aide">Survole ou fais glisser le doigt sur une carte pour voir le holo et le pivot. Une image par carte : <code>public/cartes/&lt;id-carte&gt;/illustration.webp</code>.</p>
      <h2 class="galerie-titre">Ses cartes</h2>
      <section class="galerie-grille" id="reelles" aria-live="polite"></section>
      <h2 class="galerie-titre">Aperçu du rendu dans les 8 raretés</h2>
      <p class="galerie-aide">Cartes fictives, pour vérifier le rendu : elles reprennent l’illustration de la carte de base.</p>
      <section class="galerie-grille" id="apercu"></section>
    </main>`;

  const select = app.querySelector<HTMLSelectElement>('#choix-perso')!;
  for (const p of personnages) {
    const base = index.base(p.id)!;
    const n = index.cartesDe(p.id).length;
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${numeroCarte(base.numero, ext.total)} · ${p.nom} (${p.rang})${n > 1 ? ` · ${n} cartes` : ''}`;
    select.append(opt);
  }

  const reelles = app.querySelector<HTMLElement>('#reelles')!;
  const apercu = app.querySelector<HTMLElement>('#apercu')!;
  const afficher = (): void => {
    select.value = persoId;
    const base = index.base(persoId)!;
    history.replaceState(null, '', `?carte=${base.id}`);
    reelles.replaceChildren(...index.cartesDe(persoId).map((c) =>
      caseCarte(c, `${numeroCarte(c.numero, ext.total)} · ${FINITIONS[c.finition].symbole} ${FINITIONS[c.finition].nom}${c.secrete ? ' · secrète' : ''}`, ext)));
    // Cartes fictives (une par rareté), ajoutées à une copie de l'extension pour le rendu seulement.
    const fictives: Carte[] = ORDRE_FINITIONS.map((f) => ({
      id: `apercu-${f}`, numero: base.numero, personnage: persoId, finition: f, secrete: f !== base.finition, images: {},
    }));
    const etendue: Extension = { ...ext, cartes: [...ext.cartes, ...fictives] };
    apercu.replaceChildren(...fictives.map((c) => caseCarte(c, `${FINITIONS[c.finition].symbole} ${FINITIONS[c.finition].nom}`, etendue)));
  };

  const decaler = (pas: number): void => {
    const i = personnages.findIndex((p) => p.id === persoId);
    persoId = personnages[(i + pas + personnages.length) % personnages.length]!.id;
    afficher();
  };

  select.addEventListener('change', () => { persoId = select.value; afficher(); });
  app.querySelector('#precedente')!.addEventListener('click', () => decaler(-1));
  app.querySelector('#suivante')!.addEventListener('click', () => decaler(1));
  afficher();
}
