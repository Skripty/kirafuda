// Écran Probabilités : tables du booster, lues dans le fichier JSON et affichées sans arrondi.
import './infos.css';
import { probabilites, libelleFinition, type TableAffichee } from '../core/probabilites';
import type { Booster, Extension } from '../core/types';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, classe?: string, texte?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texte !== undefined) e.textContent = texte;
  return e;
}

function tableau(legende: string, entetes: string[], lignes: string[][]): HTMLTableElement {
  const t = el('table', 'infos-table');
  t.append(el('caption', undefined, legende));
  const thead = el('thead');
  const tr = el('tr');
  entetes.forEach((h, i) => {
    const th = el('th', i > 0 ? 'nombre' : undefined, h);
    th.scope = 'col';
    tr.append(th);
  });
  thead.append(tr);
  const tbody = el('tbody');
  for (const l of lignes) {
    const r = el('tr');
    l.forEach((v, i) => {
      if (i === 0) { const th = el('th', undefined, v); th.scope = 'row'; r.append(th); }
      else r.append(el('td', 'nombre', v));
    });
    tbody.append(r);
  }
  t.append(thead, tbody);
  return t;
}

function section(t: TableAffichee, intro: string): HTMLElement {
  const s = el('section', 'infos-bloc');
  s.append(el('h2', undefined, t.titre), el('p', 'infos-intro', intro));
  s.append(tableau('Rareté', ['Rareté', 'Chance', 'Cartes', 'Chacune'],
    t.finitions.map((l) => [libelleFinition(l.finition), l.pourcentage, String(l.cartes), l.parCarte])));
  return s;
}

export function creerProbabilites(booster: Booster, extension: Extension): HTMLElement {
  const p = probabilites(booster, extension);
  const main = el('main', 'infos');
  const entete = el('header', 'infos-entete');
  const retour = el('a', 'infos-retour', 'Accueil');
  retour.href = '#/';
  entete.append(retour, el('h1', undefined, 'Probabilités'));

  const resume = el('section', 'infos-bloc');
  resume.append(
    el('h2', undefined, booster.nom),
    el('p', undefined, `${booster.cartesParBooster} cartes par booster. Chaque emplacement tire d’abord une rareté, puis une carte de cette rareté (toutes ont la même chance).`),
    el('p', undefined, `Booster exceptionnel : ${p.tauxExceptionnel}. Booster normal : ${p.tauxNormal}.`),
    el('p', 'infos-intro', 'Valeurs exactes, lues dans le fichier du booster. La colonne « Chacune » (chance d’une carte précise) est une valeur approchée.'),
  );

  main.append(entete, resume,
    ...p.emplacements.map((t) => section(t, `Dans un booster normal (${p.tauxNormal} des boosters).`)),
    section(p.exceptionnelle, `Dans un booster exceptionnel (${p.tauxExceptionnel} des boosters), les ${booster.cartesParBooster} cartes suivent cette table.`));
  return main;
}
