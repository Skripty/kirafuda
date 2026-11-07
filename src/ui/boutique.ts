// Écran Boutique : échange de points contre une carte, revente de doublons contre des sceaux.
// Chaque opération passe par une confirmation, puis par `enregistrer` (tout ou rien).
import './boutique.css';
import { COTE_PAR_SCEAU, FINITIONS, ORDRE_FINITIONS } from '../core/regles';
import { acheter, doublonsRevendables, prixAchat, revendre, soldePoints } from '../core/boutique';
import { formaterCote } from '../core/cote';
import type { Extension, FinitionId, Popularite, Sauvegarde } from '../core/types';
import { indexer } from '../core/extension';
import { evenementCarte, type Evenement } from '../core/quetes';
import { creerCarte, numeroCarte } from './carte';

export interface OptionsBoutique {
  sauvegarde: Sauvegarde;
  extension: Extension;
  popularite: Popularite;
  /** Enregistre la nouvelle sauvegarde ; false si l'écriture a échoué (rien n'a changé). */
  /** Enregistre (avec les événements de quête) ; renvoie la sauvegarde enregistrée, ou null si rien n'a changé. */
  enregistrer: (s: Sauvegarde, evenements?: Evenement[]) => Sauvegarde | null;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, classe?: string, texte?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texte !== undefined) e.textContent = texte;
  return e;
}
function bouton(texte: string, classe = ''): HTMLButtonElement {
  const b = el('button', classe, texte);
  b.type = 'button';
  return b;
}
const pluriel = (n: number, singulier: string, pl = `${singulier}s`): string => `${n} ${n > 1 ? pl : singulier}`;
const sceaux = (n: number): string => pluriel(n, 'sceau', 'sceaux');
const points = (n: number): string => pluriel(n, 'point');

export function creerBoutique(o: OptionsBoutique): HTMLElement {
  const ext = o.extension;
  const index = indexer(ext);
  const cartes = index.cartesTriees;
  const nomDe = (carteId: string): string => index.personnageDe(index.carte(carteId)!).nom;
  let s = o.sauvegarde;
  let carteId = cartes[0]!.id;
  /** Filtre de la liste par rareté (null : toutes). */
  let filtreRarete: FinitionId | null = null;
  let annonce = '';

  const main = el('main', 'bout');
  const dialogue = el('dialog', 'bout-confirmation');
  dialogue.setAttribute('aria-labelledby', 'bout-confirmation-titre');

  /** Confirmation obligatoire : message, détail, puis « Confirmer » ou « Annuler ». */
  function confirmer(titre: string, details: string[], libelle: string, action: () => void): void {
    const h2 = el('h2', undefined, titre);
    h2.id = 'bout-confirmation-titre';
    const ul = el('ul');
    for (const d of details) ul.append(el('li', undefined, d));
    const oui = bouton(libelle, 'bout-principal');
    const non = bouton('Annuler');
    oui.addEventListener('click', () => { dialogue.close(); action(); });
    non.addEventListener('click', () => dialogue.close());
    const actions = el('div', 'bout-confirmation-actions');
    actions.append(non, oui);
    dialogue.replaceChildren(h2, ul, actions);
    dialogue.showModal();
    non.focus(); // le choix sûr a le focus
  }

  function appliquer(nouvelle: Sauvegarde, message: string, evenements: Evenement[]): void {
    const enregistree = o.enregistrer(nouvelle, evenements);
    if (enregistree) {
      s = enregistree;
      annonce = message;
    } else {
      annonce = 'L’opération n’a pas pu être enregistrée. Rien n’a changé.';
    }
    rendre();
  }

  // ---------- Échange de points ----------
  function sectionEchange(): HTMLElement {
    const section = el('section', 'bout-section');
    section.setAttribute('aria-labelledby', 'bout-echange');
    const h2 = el('h2', undefined, 'Échanger des points');
    h2.id = 'bout-echange';

    // Filtre par rareté, puis choix de la carte (chaque carte a sa rareté et donc son prix).
    const choixRarete = el('label', 'bout-champ');
    const selRarete = el('select');
    const toutes = el('option', undefined, 'Toutes les raretés');
    toutes.value = '';
    selRarete.append(toutes);
    for (const f of ORDRE_FINITIONS) {
      const n = index.parFinition(f).length;
      if (n === 0) continue;
      const opt = el('option', undefined, `${FINITIONS[f].symbole} ${FINITIONS[f].nom} · ${points(prixAchat(f))} · ${n} carte${n > 1 ? 's' : ''}`);
      opt.value = f;
      selRarete.append(opt);
    }
    selRarete.value = filtreRarete ?? '';
    selRarete.addEventListener('change', () => {
      filtreRarete = (selRarete.value || null) as FinitionId | null;
      const premiere = cartes.find((c) => !filtreRarete || c.finition === filtreRarete);
      if (premiere && filtreRarete && index.carte(carteId)!.finition !== filtreRarete) carteId = premiere.id;
      annonce = '';
      rendre();
    });
    choixRarete.append(el('span', undefined, 'Rareté'), selRarete);

    const choixCarte = el('label', 'bout-champ');
    const select = el('select');
    for (const c of cartes) {
      if (filtreRarete && c.finition !== filtreRarete) continue;
      const opt = el('option', undefined, `${numeroCarte(c.numero, ext.total)} · ${nomDe(c.id)} · ${FINITIONS[c.finition].symbole} · ${points(prixAchat(c.finition))}`);
      opt.value = c.id;
      select.append(opt);
    }
    select.value = carteId;
    select.addEventListener('change', () => { carteId = select.value; annonce = ''; rendre(); });
    choixCarte.append(el('span', undefined, 'Carte'), select);

    const carte = index.carte(carteId)!;
    const finition = carte.finition;
    const apercu = creerCarte(carte, ext);
    apercu.style.setProperty('--carte-largeur', 'min(220px, 60vw)');

    const prix = prixAchat(finition);
    const solde = soldePoints(s, ext);
    const possedes = s.collection[carteId] ?? 0;
    const infos = el('p', 'bout-infos', `Prix : ${points(prix)} · tu en possèdes ${possedes}`);
    const echanger = bouton('Échanger', 'bout-principal');
    const pied = el('div', 'bout-pied');
    pied.append(infos, echanger);
    if (solde < prix) {
      echanger.disabled = true;
      const manque = el('p', 'bout-manque', `Il te manque ${points(prix - solde)}.`);
      manque.id = 'bout-manque-points';
      echanger.setAttribute('aria-describedby', manque.id);
      pied.append(manque);
    }
    echanger.addEventListener('click', () => {
      const nom = `${nomDe(carteId)}, ${numeroCarte(carte.numero, ext.total)}, ${FINITIONS[finition].symbole} ${FINITIONS[finition].nom}`;
      confirmer('Confirmer l’échange', [
        `Carte : ${nom}`,
        `Prix : ${points(prix)} ${ext.nom}`,
        `Solde après l’échange : ${points(solde - prix)}`,
      ], 'Échanger', () => {
        const r = acheter(s, ext, carteId);
        if (!r.ok) { annonce = r.raison === 'points-insuffisants' ? `Il te manque ${points(r.manque)}.` : 'Carte inconnue.'; rendre(); return; }
        const carteObtenue = evenementCarte(ext, carteId, (s.collection[carteId] ?? 0) === 0);
        appliquer(r.sauvegarde, `Échange effectué : ${nom}. Solde : ${points(r.soldeApres)}.`, [{ type: 'achat-boutique' }, ...(carteObtenue ? [carteObtenue] : [])]);
      });
    });

    section.append(h2, choixRarete, choixCarte, apercu, pied);
    return section;
  }

  // ---------- Revente de doublons ----------
  function sectionRevente(): HTMLElement {
    const section = el('section', 'bout-section');
    section.setAttribute('aria-labelledby', 'bout-revente');
    const h2 = el('h2', undefined, 'Revendre des doublons');
    h2.id = 'bout-revente';
    const regle = el('p', 'bout-regle',
      `Le prix suit la cote de la semaine (${o.popularite.semaine}) : 1 sceau par tranche de ${formaterCote(COTE_PAR_SCEAU)} de cote. Le dernier exemplaire de chaque carte reste toujours dans ta collection.`);
    section.append(h2, regle);

    const doublons = doublonsRevendables(s, ext, o.popularite);
    if (doublons.length === 0) {
      section.append(el('p', 'bout-vide', 'Aucun doublon à revendre pour l’instant.'));
      return section;
    }
    const liste = el('ul', 'bout-doublons');
    for (const d of doublons) {
      const li = el('li');
      const f = FINITIONS[d.carte.finition];
      const texte = el('div', 'bout-doublon-texte');
      texte.append(
        el('strong', undefined, `${numeroCarte(d.carte.numero, ext.total)} ${d.personnage.nom}`),
        el('span', undefined, `${f.symbole} ${f.nom} · ×${d.exemplaires} (${d.enTrop} en trop)`),
        el('span', undefined, `Cote ${formaterCote(d.cote)} · ${sceaux(d.prixUnitaire)} chacun`),
      );
      const b = bouton(`Revendre 1`);
      b.setAttribute('aria-label', `Revendre 1 exemplaire de ${d.personnage.nom}, ${f.nom}, contre ${sceaux(d.prixUnitaire)}`);
      b.addEventListener('click', () => {
        confirmer('Confirmer la revente', [
          `Carte : ${d.personnage.nom}, ${numeroCarte(d.carte.numero, ext.total)}, ${f.symbole} ${f.nom}`,
          `Cote de la semaine : ${formaterCote(d.cote)}`,
          `Tu reçois : ${sceaux(d.prixUnitaire)} (solde après : ${sceaux(s.sceaux + d.prixUnitaire)})`,
          `Il t’en restera ${d.exemplaires - 1}.`,
        ], 'Revendre', () => {
          const r = revendre(s, o.popularite, ext, d.carte.id, 1);
          if (!r.ok) { annonce = 'Cette revente n’est plus possible.'; rendre(); return; }
          appliquer(r.sauvegarde, `Revente effectuée : +${sceaux(r.sceauxGagnes)}. Il t’en reste ${r.restants}.`, [{ type: 'doublon-revendu' }]);
        });
      });
      li.append(texte, b);
      liste.append(li);
    }
    section.append(liste);
    return section;
  }

  // ---------- Écran ----------
  function rendre(): void {
    const entete = el('header', 'bout-entete');
    const retour = el('a', 'bout-retour', 'Accueil');
    retour.href = '#/';
    entete.append(retour, el('h1', undefined, 'Boutique'));

    const soldes = el('dl', 'bout-soldes');
    for (const [dt, dd] of [[`Points ${ext.nom}`, soldePoints(s, ext)], ['Sceaux', s.sceaux]] as const) {
      const div = el('div');
      div.append(el('dt', undefined, dt), el('dd', undefined, String(dd)));
      soldes.append(div);
    }
    const message = el('p', 'bout-annonce', annonce);
    message.setAttribute('role', 'status');

    main.replaceChildren(entete, soldes, message, sectionEchange(), sectionRevente(), dialogue);
  }

  rendre();
  return main;
}
