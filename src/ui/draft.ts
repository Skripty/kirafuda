// Écran du draft hebdomadaire : 15 cartes, choix de 5, score détaillé, récompense une fois par semaine.
import './draft.css';
import { ELEMENTS, FAIBLESSE, FINITIONS } from '../core/regles';
import {
  BAREME,
  CARTES_A_GARDER,
  correspondAuTheme,
  estCritereEquipe,
  equipeChoisie,
  genererDraft,
  jouerDraft,
  prochaineSemaine,
  progressionEquipe,
  scorer,
  semaineIso,
  signaleParCarte,
  type Categorie,
  type DraftSemaine,
  type Score,
  type SourcesDraft,
  type Theme,
} from '../core/draft';
import type { ElementId, Personnage, Sauvegarde } from '../core/types';
import { fusionner } from '../core/catalogue';
import { indexer } from '../core/extension';
import type { Evenement } from '../core/quetes';
import { creerCarte } from './carte';

export interface OptionsDraft {
  sauvegarde: Sauvegarde;
  /** Extensions du draft de chaque semaine (sorties au début de la semaine) et leurs boosters. */
  sources: SourcesDraft;
  themes: Theme[];
  maintenant: Date;
  /** Enregistre la nouvelle sauvegarde ; false si l'écriture a échoué (rien n'a changé). */
  /** Récompense de participation (quetes.json, « hebdomadaire »). */
  sceauxParticipation: number;
  /** Enregistre (avec les événements de quête) ; renvoie la sauvegarde enregistrée, ou null si rien n'a changé. */
  enregistrer: (s: Sauvegarde, evenements?: Evenement[]) => Sauvegarde | null;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, classe?: string, texte?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texte !== undefined) e.textContent = texte;
  return e;
}
const duThemeTexte = (n: number, sur: number): string =>
  (sur === 0 ? 'aucune carte choisie' : `${n} carte${n > 1 ? 's' : ''} du thème sur ${sur}`);
const sceaux = (n: number): string => `${n} sceau${n > 1 ? 'x' : ''}`;
const signe = (n: number): string => (n >= 0 ? `+${n}` : `−${Math.abs(n)}`);
const CATEGORIES: Categorie[] = ['Puissance', 'Thème', 'Synergies', 'Défi'];

/** « Lumière bat Ténèbres ; Lumière est faible contre lui. » */
function texteDefi(adversaire: ElementId): string {
  const fort = FAIBLESSE[adversaire];
  const faibles = (Object.keys(FAIBLESSE) as ElementId[]).filter((e) => FAIBLESSE[e] === adversaire);
  const nom = (e: ElementId): string => ELEMENTS[e].nom;
  const plus = signe(BAREME.parCarteForteContreAdversaire);
  const moins = signe(BAREME.parCarteFaibleContreAdversaire);
  // Lumière et Ténèbres sont faibles l'une contre l'autre : les deux effets s'annulent.
  if (fort && faibles.length === 1 && faibles[0] === fort) {
    return `Adversaire ${nom(adversaire)} : les cartes ${nom(fort)} le battent (${plus}) mais lui sont aussi faibles (${moins}), soit 0 au total.`;
  }
  return `Adversaire ${nom(adversaire)} : ${fort ? `les cartes ${nom(fort)} le battent (${plus})` : 'aucun élément ne le bat'}`
    + `${faibles.length ? ` ; les cartes ${faibles.map(nom).join(', ')} lui sont faibles (${moins})` : ''}.`;
}

/** Détail du score, groupé par catégorie. */
function detailScore(score: Score): HTMLElement {
  const bloc = el('div', 'draft-detail');
  for (const cat of CATEGORIES) {
    const lignes = score.lignes.filter((l) => l.categorie === cat);
    const sousTotal = lignes.reduce((a, l) => a + l.points, 0);
    const groupe = el('div', 'draft-detail-groupe');
    const titre = el('p', 'draft-detail-titre');
    titre.append(el('span', undefined, cat), el('strong', undefined, signe(sousTotal)));
    groupe.append(titre);
    if (lignes.length === 0) groupe.append(el('p', 'draft-detail-vide', 'Rien pour l’instant'));
    const ul = el('ul');
    for (const l of lignes) {
      const li = el('li');
      li.append(el('span', undefined, l.libelle), el('span', 'draft-points', signe(l.points)));
      ul.append(li);
    }
    groupe.append(ul);
    bloc.append(groupe);
  }
  const total = el('p', 'draft-total');
  total.append(el('span', undefined, 'Total'), el('strong', undefined, String(score.total)));
  bloc.append(total);
  return bloc;
}

function regles(sceauxParticipation: number): HTMLElement {
  const d = el('details', 'draft-regles');
  d.append(el('summary', undefined, 'Comment le score est calculé'));
  const ul = el('ul');
  for (const t of [
    `Puissance : (PV + dégâts des deux attaques) ÷ ${BAREME.diviseurPuissance}, pour chaque carte. La finition et le rang ne comptent pas.`,
    `Thème : +${BAREME.parCarteDuTheme} par carte du thème, +${BAREME.equipeEntiereDuTheme} si toute l’équipe l’est. Thème d’équipe (rang, éléments différents, paires d’une même série) : +${BAREME.critereEquipeRespecte} si les 5 cartes le respectent ensemble.`,
    `Même série : +${BAREME.parCarteMemeSerie} par carte en plus d’une même série.`,
    `Éléments complémentaires : +${BAREME.parCarteCouverte} par carte couverte (une autre carte bat l’élément qui la bat).`,
    `Aucune faiblesse partagée entre deux cartes : +${BAREME.aucuneFaiblessePartagee}.`,
    `Défi : +${BAREME.parCarteForteContreAdversaire} par carte forte contre l’adversaire, ${BAREME.parCarteFaibleContreAdversaire} par carte faible contre lui.`,
    `Récompense : ${sceaux(sceauxParticipation)} pour ta participation, quel que soit le score. Une fois par semaine.`,
    'Les cartes du draft servent seulement à composer l’équipe : elles n’entrent pas dans ta collection.',
  ]) ul.append(el('li', undefined, t));
  d.append(ul);
  return d;
}

export function creerDraft(o: OptionsDraft): HTMLElement {
  const semaine = semaineIso(o.maintenant);
  const draft: DraftSemaine = genererDraft(semaine, o.sources, o.themes);
  const sources = typeof o.sources === 'function' ? o.sources(semaine) : o.sources;
  // Vue réunie pour le score (personnages de toutes les extensions du draft) ; chaque carte s'affiche avec la sienne.
  const toutes = fusionner(sources.map((x) => x.extension));
  const idx = indexer(toutes);
  const extensionDe = (carteId: string) => sources.find((x) => indexer(x.extension).carte(carteId))!.extension;
  /** Le thème se signale-t-il carte par carte (sinon : seulement la progression de l'équipe) ? */
  const parCarte = signaleParCarte(draft.theme);
  /** Personnage d'une carte du draft (score et thème viennent du personnage). */
  const persoDe = (i: number): Personnage => idx.personnageDe(idx.carte(draft.cartes[i]!.carteId)!);
  const prochain = prochaineSemaine(o.maintenant).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  let s = o.sauvegarde;
  let choix: number[] = [];
  let message = '';
  let detailOuvert = false;

  const main = el('main', 'draft');
  const dialogue = el('dialog', 'draft-confirmation');
  dialogue.setAttribute('aria-labelledby', 'draft-confirmation-titre');

  function entete(): HTMLElement[] {
    const h = el('header', 'draft-entete');
    const retour = el('a', 'draft-retour', 'Accueil');
    retour.href = '#/';
    h.append(retour, el('h1', undefined, 'Draft de la semaine'));
    const infos = el('section', 'draft-infos');
    infos.setAttribute('aria-label', 'Thème et défi');
    infos.append(
      el('p', 'draft-semaine', `Semaine ${semaine} · nouveau draft ${prochain}`),
      el('p', 'draft-theme', `Thème : ${draft.theme.nom}`),
      el('p', 'draft-theme-desc', draft.theme.description + (estCritereEquipe(draft.theme.critere) ? ` Critère d’équipe : il se juge sur les ${CARTES_A_GARDER} cartes gardées.` : '')),
      el('p', 'draft-defi', texteDefi(draft.adversaire)),
    );
    const annonce = el('p', 'draft-annonce', message);
    annonce.setAttribute('role', 'status');
    return [h, infos, annonce];
  }

  function vignette(index: number): HTMLElement {
    const t = draft.cartes[index]!;
    const v = creerCarte(idx.carte(t.carteId)!, extensionDe(t.carteId), { interactive: false });
    v.style.setProperty('--carte-largeur', '100%');
    return v;
  }

  // ---------- Draft déjà joué : résultat de la semaine ----------
  function vueResultat(): void {
    const dj = s.dernierDraft!;
    const equipe = equipeChoisie(draft, dj.choix, toutes);
    const section = el('section', 'draft-resultat');
    section.append(el('h2', undefined, 'Ton équipe'));
    const grille = el('ul', 'draft-grille');
    dj.choix.forEach((i) => {
      if (!idx.carte(draft.cartes[i]!.carteId)) return;
      const li = el('li');
      li.append(vignette(i));
      grille.append(li);
    });
    section.append(grille);
    if (typeof equipe !== 'string') section.append(detailScore(scorer(equipe, draft.theme, draft.adversaire)));
    section.append(el('p', 'draft-recompense', `Récompense reçue : ${sceaux(dj.sceaux)}. Prochain draft ${prochain}.`));
    main.replaceChildren(...entete(), section, regles(o.sceauxParticipation), dialogue);
  }

  // ---------- Choix de l'équipe ----------
  function vueChoix(): void {
    // Personnages déjà dans l'équipe : un même personnage ne peut pas être pris deux fois (même dans deux raretés).
    const choisis = new Set(choix.map((i) => persoDe(i).id));
    const boosters = el('div', 'draft-boosters');
    draft.boosters.forEach((cartesBooster, b) => {
      const section = el('section', 'draft-booster');
      section.append(el('h2', undefined, `Booster ${b + 1}`));
      const grille = el('ul', 'draft-grille');
      cartesBooster.forEach((_, k) => {
        const index = b * cartesBooster.length + k;
        const t = draft.cartes[index]!;
        const carte = persoDe(index);
        const estChoisie = choix.includes(index);
        const memePerso = !estChoisie && choisis.has(carte.id);
        const plein = !estChoisie && choix.length >= CARTES_A_GARDER;
        const li = el('li');
        const bouton = el('button', 'draft-carte');
        bouton.type = 'button';
        bouton.setAttribute('aria-pressed', String(estChoisie));
        bouton.disabled = memePerso || plein;
        const duTheme = parCarte && correspondAuTheme(carte, draft.theme);
        bouton.setAttribute('aria-label', `${carte.nom}, ${FINITIONS[t.finition].nom}${duTheme ? ', du thème' : ''}${estChoisie ? ', choisie' : ''}`);
        const etiquettes = el('span', 'draft-etiquettes');
        if (estChoisie) etiquettes.append(el('span', 'draft-choisie', '✓ Choisie'));
        if (duTheme) etiquettes.append(el('span', 'draft-du-theme', 'Thème'));
        if (memePerso) etiquettes.append(el('span', undefined, 'Déjà dans l’équipe'));
        bouton.append(vignette(index), etiquettes);
        bouton.addEventListener('click', () => {
          choix = estChoisie ? choix.filter((i) => i !== index) : [...choix, index];
          message = '';
          vueChoix();
          main.querySelector<HTMLButtonElement>(`.draft-carte[data-index="${index}"]`)?.focus();
        });
        bouton.dataset.index = String(index);
        li.append(bouton);
        grille.append(li);
      });
      section.append(grille);
      boosters.append(section);
    });

    // Panneau de l'équipe : score en direct et validation.
    const panneau = el('section', 'draft-equipe');
    panneau.setAttribute('aria-label', 'Ton équipe');
    const equipe = choix.map(persoDe);
    const score = scorer(equipe, draft.theme, draft.adversaire);
    const haut = el('div', 'draft-equipe-haut');
    // Thème d'équipe : la progression de l'équipe (« 3 éléments sur 5 »).
    const progression = progressionEquipe(equipe, draft.theme);
    const ligneTheme = progression
      ? el('p', `draft-progression${progression.respecte ? ' respecte' : ''}`, `${progression.respecte ? '✓ ' : ''}Thème « ${draft.theme.nom} » : ${progression.texte}`)
      : el('p', 'draft-progression', `Thème « ${draft.theme.nom} » : ${duThemeTexte(equipe.filter((c) => correspondAuTheme(c, draft.theme)).length, choix.length)}`);
    ligneTheme.setAttribute('aria-live', 'polite');
    haut.append(
      el('p', undefined, `Équipe : ${choix.length} / ${CARTES_A_GARDER}`),
      ligneTheme,
      el('p', 'draft-apercu', choix.length === CARTES_A_GARDER ? `Score ${score.total} · participation +${sceaux(o.sceauxParticipation)}` : `Score provisoire ${score.total}`),
    );
    const valider = el('button', 'draft-valider', 'Valider mon équipe');
    valider.type = 'button';
    valider.disabled = choix.length !== CARTES_A_GARDER;
    valider.addEventListener('click', confirmer);
    // Détail replié par défaut pour que le panneau ne cache pas les cartes sur téléphone.
    const detail = el('details', 'draft-detail-repli');
    detail.open = detailOuvert;
    detail.addEventListener('toggle', () => { detailOuvert = detail.open; });
    detail.append(el('summary', undefined, 'Détail du score'), detailScore(score));
    panneau.append(haut, detail, valider);

    main.replaceChildren(...entete(), regles(o.sceauxParticipation), boosters, panneau, dialogue);
  }

  function confirmer(): void {
    const equipe = equipeChoisie(draft, choix, toutes);
    if (typeof equipe === 'string') { message = equipe; vueChoix(); return; }
    const score = scorer(equipe, draft.theme, draft.adversaire);
    const h2 = el('h2', undefined, 'Valider ton équipe ?');
    h2.id = 'draft-confirmation-titre';
    const p = el('p', undefined,
      `${equipe.map((c) => c.nom).join(', ')}. Score ${score.total}, participation +${sceaux(o.sceauxParticipation)}. Un seul essai par semaine : l’équipe ne pourra plus changer.`);
    const non = el('button', undefined, 'Revenir');
    const oui = el('button', 'draft-valider', 'Valider');
    non.type = 'button';
    oui.type = 'button';
    non.addEventListener('click', () => dialogue.close());
    oui.addEventListener('click', () => {
      dialogue.close();
      const r = jouerDraft(s, draft, choix, toutes, o.sceauxParticipation);
      if (!r.ok) { message = r.message; vueChoix(); return; }
      const enregistree = o.enregistrer(r.sauvegarde, [{ type: 'draft-joue' }]);
      if (!enregistree) { message = 'Le draft n’a pas pu être enregistré. Rien n’a changé.'; vueChoix(); return; }
      s = enregistree;
      message = `Équipe validée : ${r.score.total} points, +${sceaux(r.sceaux)}.`;
      vueResultat();
    });
    const actions = el('div', 'draft-confirmation-actions');
    actions.append(non, oui);
    dialogue.replaceChildren(h2, p, actions);
    dialogue.showModal();
    non.focus();
  }

  if (s.dernierDraft?.semaine === semaine) vueResultat();
  else vueChoix();
  return main;
}
