// Panneau « Sauvegarde » : résumé, export en fichier JSON, import avec validation et confirmation.
import './sauvegarde.css';
import type { Sauvegarde } from '../core/types';
import {
  enregistrerSauvegarde,
  exporterSauvegarde,
  importerSauvegarde,
  nomFichierExport,
  type ContexteValidation,
  type Stockage,
} from '../core/sauvegarde';

const MAX_ERREURS_AFFICHEES = 5;

function resume(s: Sauvegarde): string {
  const exemplaires = Object.values(s.collection).reduce((a, b) => a + b, 0);
  const pl = (n: number, singulier: string, pluriel = `${singulier}s`): string => `${n} ${n > 1 ? pluriel : singulier}`;
  return `${pl(s.sceaux, 'sceau', 'sceaux')} · ${pl(exemplaires, 'carte')} · ${pl(s.historique.length, 'ouverture')}`;
}

function telecharger(nom: string, contenu: string): void {
  const url = URL.createObjectURL(new Blob([contenu], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nom;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export interface OptionsPanneau {
  stockage: Stockage;
  contexte: ContexteValidation;
  /** Sauvegarde courante (lue à chaque action, pour toujours exporter l'état à jour). */
  lire: () => Sauvegarde;
  /** Appelé après un import enregistré. */
  remplacer: (s: Sauvegarde) => void;
  avertissement: string | null;
}

export function creerPanneauSauvegarde(options: OptionsPanneau): HTMLElement {
  const section = document.createElement('section');
  section.className = 'sauvegarde';
  section.setAttribute('aria-labelledby', 'sauvegarde-titre');
  section.innerHTML = `
    <h2 id="sauvegarde-titre">Sauvegarde</h2>
    <p class="sauvegarde-resume"></p>
    <div class="sauvegarde-actions">
      <button type="button" data-action="exporter">Exporter</button>
      <button type="button" data-action="importer">Importer</button>
      <input type="file" accept="application/json,.json" hidden>
    </div>
    <div class="sauvegarde-message" role="status" aria-live="polite"></div>`;

  const resumeEl = section.querySelector<HTMLElement>('.sauvegarde-resume')!;
  const message = section.querySelector<HTMLElement>('.sauvegarde-message')!;
  const fichier = section.querySelector<HTMLInputElement>('input[type=file]')!;

  const majResume = (): void => { resumeEl.textContent = resume(options.lire()); };
  const afficher = (classe: string, titre: string, lignes: string[] = []): void => {
    message.className = `sauvegarde-message ${classe}`;
    const p = document.createElement('p');
    p.textContent = titre;
    message.replaceChildren(p);
    if (lignes.length > 0) {
      const ul = document.createElement('ul');
      for (const l of lignes) {
        const li = document.createElement('li');
        li.textContent = l;
        ul.append(li);
      }
      message.append(ul);
    }
  };

  majResume();
  if (options.avertissement) afficher('erreur', options.avertissement);

  section.querySelector('[data-action="exporter"]')!.addEventListener('click', () => {
    telecharger(nomFichierExport(new Date()), exporterSauvegarde(options.lire()));
    afficher('ok', 'Sauvegarde exportée.');
  });

  section.querySelector('[data-action="importer"]')!.addEventListener('click', () => fichier.click());

  fichier.addEventListener('change', async () => {
    const f = fichier.files?.[0];
    fichier.value = '';
    if (!f) return;
    let texte: string;
    try {
      texte = await f.text();
    } catch {
      afficher('erreur', 'Import refusé : le fichier n’a pas pu être lu.');
      return;
    }
    const resultat = importerSauvegarde(texte, options.contexte);
    if (!resultat.ok) {
      const lignes = resultat.erreurs.slice(0, MAX_ERREURS_AFFICHEES);
      const reste = resultat.erreurs.length - lignes.length;
      if (reste > 0) lignes.push(`… et ${reste} autre${reste > 1 ? 's' : ''} erreur${reste > 1 ? 's' : ''}.`);
      afficher('erreur', 'Import refusé : ce fichier n’est pas une sauvegarde valide. Ta sauvegarde actuelle n’a pas changé.', lignes);
      return;
    }

    // Confirmation : l'import remplace toute la progression actuelle.
    const nouvelle = resultat.sauvegarde;
    afficher('confirmation', `Remplacer ta sauvegarde actuelle (${resume(options.lire())}) par celle du fichier (${resume(nouvelle)}) ?`);
    const actions = document.createElement('div');
    actions.className = 'sauvegarde-actions';
    const oui = document.createElement('button');
    oui.type = 'button';
    oui.textContent = 'Remplacer';
    const non = document.createElement('button');
    non.type = 'button';
    non.textContent = 'Annuler';
    actions.append(oui, non);
    message.append(actions);
    oui.focus();

    oui.addEventListener('click', () => {
      const ecriture = enregistrerSauvegarde(options.stockage, nouvelle, options.contexte);
      if (!ecriture.ok) {
        afficher('erreur', `Import impossible : ${ecriture.erreur}`);
        return;
      }
      options.remplacer(nouvelle);
      majResume();
      afficher('ok', 'Sauvegarde importée.');
    });
    non.addEventListener('click', () => afficher('', 'Import annulé.'));
  });

  return section;
}
