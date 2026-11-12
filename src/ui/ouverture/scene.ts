// Scène d'ouverture d'un booster. Elle ne fait que mettre en scène un résultat déjà tiré
// et enregistré (règle 1) : rien ici ne tire ni n'écrit de cartes.
// Les étapes et les effets viennent de src/core/revelation.ts (machine à états testée).
import './ouverture.css';
import { prechargerImages } from '../carte';
import { creerCarteDuJeu } from '../carte-soutien';
import { creerBooster3D } from '../booster3d';
import { creerResultats } from './resultats';
import { FINITIONS } from '../../core/regles';
import {
  effetsRevelation,
  etatInitial,
  indiceBooster,
  transition,
  type EtatOuverture,
  type Evenement,
} from '../../core/revelation';
import type { Booster, Extension, Ouverture } from '../../core/types';
import { indexer } from '../../core/extension';

export interface OptionsOuverture {
  ouverture: Ouverture;
  extension: Extension;
  booster: Booster;
  /** Appelé une fois, à l'arrivée sur les résultats : l'ouverture peut être marquée vue. */
  onVue: () => void;
  /** « Retour à l'accueil ». */
  onTerminer: () => void;
}

const reduit = (): boolean => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Animation transform/opacity ; instantanée en mode animations réduites. Se résout même si annulée. */
function animer(el: Element, images: Keyframe[], duree: number, easing = 'ease-out'): Promise<void> {
  const a = el.animate(images, { duration: reduit() ? 0 : duree, easing, fill: 'forwards' });
  return a.finished.then(() => undefined, () => undefined);
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, classe?: string, texte?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texte !== undefined) e.textContent = texte;
  return e;
}


export function lancerOuverture(conteneur: HTMLElement, o: OptionsOuverture): void {
  const index = indexer(o.extension);
  const tirees = o.ouverture.cartes;
  const n = tirees.length;
  // Le tirage est déjà fait et sauvegardé : on précharge ses images pendant l'animation du booster.
  prechargerImages(tirees.map((t) => index.carte(t.carteId)).filter((c) => c !== undefined), o.extension);
  let etat: EtatOuverture = etatInitial(n);
  let vueSignalee = false;

  // ---------- Squelette ----------
  const racine = el('section', 'ouv');
  racine.setAttribute('aria-label', 'Ouverture du booster');
  const barre = el('div', 'ouv-barre');
  const compteur = el('span', 'ouv-compteur');
  compteur.setAttribute('aria-live', 'polite');
  const toutReveler = el('button', 'ouv-tout', 'Tout révéler');
  toutReveler.type = 'button';
  barre.append(compteur, toutReveler);

  const scene = el('div', 'ouv-scene');
  const legende = el('p', 'ouv-legende');
  legende.setAttribute('aria-live', 'polite');
  const actions = el('div', 'ouv-actions');
  const aide = el('p', 'ouv-aide');
  const voile = el('div', 'ouv-voile');
  const dore = el('div', 'ouv-dore');
  voile.setAttribute('aria-hidden', 'true');
  dore.setAttribute('aria-hidden', 'true');
  racine.append(voile, barre, scene, legende, actions, aide, dore);
  conteneur.replaceChildren(racine);

  // ---------- Booster (3D : WebGL, ou repli CSS) ----------
  // Gestes mesurés sur la scène du booster : tiers haut = déchirure (75 %), le reste = inclinaison.
  const entree = el('div', 'ouv-booster-entree');
  const booster3d = creerBooster3D({
    extension: o.extension,
    booster: o.booster,
    dechirable: true,
    // Indice honnête : le reflet n'existe que si le booster contient une carte ★ ou plus (règle 4).
    superposition: indiceBooster(o.ouverture) ? el('div', 'ouv-reflet') : undefined,
    surDebutCoupe: () => envoyer('debut-dechirure'),
    surCoupeValidee: () => void dechirer(),
    surCoupeAnnulee: () => {
      envoyer('dechirure-annulee');
      aide.textContent = 'Encore un peu : glisse jusqu’au bout des pointillés.';
    },
  });
  entree.append(booster3d.scene);
  scene.append(entree);

  // ---------- Pile ----------
  const pile = el('div', 'ouv-pile');
  const lueur = el('div', 'ouv-lueur');
  pile.append(lueur);
  const cartesEl: HTMLElement[] = [];
  const zooms: HTMLElement[] = [];
  const retournes: HTMLElement[] = [];
  const rectos: HTMLElement[] = [];
  const decalage = (i: number): string => `translateY(${i * 3}px)`;
  for (let i = 0; i < n; i++) {
    const carte = el('div', 'ouv-carte');
    carte.style.zIndex = String(n - i);
    carte.style.transform = decalage(i);
    const zoom = el('div', 'ouv-zoom');
    const retourne = el('div', 'ouv-retourne');
    const dos = el('div', 'ouv-face dos');
    const k = el('img');
    k.src = `${import.meta.env.BASE_URL}logo/kirafuda-embleme-sombre.svg`;
    k.alt = '';
    k.draggable = false;
    dos.append(k);
    const recto = el('div', 'ouv-face recto');
    retourne.append(dos, recto);
    zoom.append(retourne);
    carte.append(zoom);
    pile.append(carte);
    cartesEl.push(carte);
    zooms.push(zoom);
    retournes.push(retourne);
    rectos.push(recto);
  }

  /** Prépare la face de la carte du dessus (images chargées avant le retournement). */
  function preparer(i: number): void {
    const t = tirees[i];
    if (!t || rectos[i]!.childElementCount > 0) return;
    const face = creerCarteDuJeu(t.carteId, o.extension);
    if (!face) return;
    face.style.setProperty('--carte-largeur', '100%');
    face.style.setProperty('--carte-pivot', '10deg'); // pivot horizontal ±10°
    rectos[i]!.append(face);
  }

  // ---------- Interface selon l'étape ----------
  function bouton(texte: string, action: () => void): HTMLButtonElement {
    const b = el('button', 'ouv-action', texte);
    b.type = 'button';
    b.addEventListener('click', action);
    return b;
  }

  function majInterface(): void {
    const { etape, index } = etat;
    racine.dataset.etape = etape;
    compteur.textContent = ['PILE', 'REVELATION', 'REVELEE'].includes(etape) ? `Carte ${index + 1} / ${n}` : '';

    const focusDansActions = actions.contains(document.activeElement);
    const boutons: HTMLButtonElement[] = [];
    if (etape === 'BOOSTER_PRET') boutons.push(bouton('Ouvrir le booster', () => dechirer()));
    if (etape === 'PILE') boutons.push(bouton('Retourner la carte', () => void retourner()));
    if (etape === 'REVELEE') boutons.push(bouton(index + 1 < n ? 'Carte suivante' : 'Voir les résultats', () => void lancer(1)));
    actions.replaceChildren(...boutons);
    if (focusDansActions) boutons[0]?.focus();

    aide.textContent =
      etape === 'BOOSTER_PRET' || etape === 'DECHIRURE' ? 'Glisse le long des pointillés, en haut du booster, pour l’ouvrir.'
      : etape === 'PILE' ? 'Touche la carte pour la retourner.'
      : etape === 'REVELEE' ? 'Lance la carte sur le côté, ou touche-la, pour passer à la suivante.'
      : '';

    // Lueur avant le retournement, seulement si la carte du dessus est holo ou mieux.
    const t = tirees[index];
    pile.classList.toggle('avec-lueur', etape === 'PILE' && !!t && effetsRevelation(t.finition).lueur);
  }

  function envoyer(ev: Evenement): boolean {
    const suivant = transition(etat, ev);
    if (suivant === etat) return false;
    etat = suivant;
    if (etat.etape === 'RESULTATS') afficherResultats();
    else majInterface();
    return true;
  }
  const interrompu = (): boolean => etat.etape === 'RESULTATS';

  // ---------- Présentation ----------
  async function presenter(): Promise<void> {
    majInterface();
    await animer(entree, [{ opacity: 0, transform: 'translateY(24px) scale(0.92)' }, { opacity: 1, transform: 'none' }], 500);
    envoyer('presente');
  }

  // ---------- Déchirure ----------
  // Glissé validé, ou bouton « Ouvrir le booster » : le haut s'envole, le sachet descend, puis la pile apparaît.
  async function dechirer(): Promise<void> {
    if (!envoyer('dechire')) return;
    await booster3d.ouvrir();
    if (interrompu()) return;
    entree.remove();
    booster3d.detruire();
    preparer(0);
    scene.append(pile);
    await animer(pile, [{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'none' }], 350);
    if (interrompu()) return;
    envoyer('pile-prete');
  }

  // ---------- Révélation ----------
  async function retourner(): Promise<void> {
    if (!envoyer('toucher')) return;
    const i = etat.index;
    const t = tirees[i]!;
    const effets = effetsRevelation(t.finition);
    preparer(i);

    if (effets.tremblement) {
      await animer(zooms[i]!, [
        { transform: 'translateX(0)' }, { transform: 'translateX(-6px) rotate(-1deg)' }, { transform: 'translateX(6px) rotate(1deg)' },
        { transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(0)' },
      ], 450, 'linear');
      if (interrompu()) return;
    }
    const enCours: Promise<void>[] = [];
    if (effets.cinematique) {
      enCours.push(animer(voile, [{ opacity: 0 }, { opacity: 0.8 }], 500));
      enCours.push(animer(zooms[i]!, [{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }], 650, 'cubic-bezier(.2,.7,.2,1)'));
    }
    if (effets.ecranDore) {
      enCours.push(animer(dore, [{ opacity: 0 }, { opacity: 0.9, offset: 0.35 }, { opacity: 0 }], 1100));
    }
    enCours.push(animer(retournes[i]!, [{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(180deg)' }], 600, 'cubic-bezier(.2,.7,.2,1)'));
    await Promise.all(enCours);
    if (interrompu()) return;

    const f = FINITIONS[t.finition];
    legende.textContent = `${f.symbole} ${f.nom} · ${t.nouveau ? 'Nouveau' : `×${t.exemplaires}`}`;
    envoyer('retournee');
  }

  async function lancer(direction: 1 | -1): Promise<void> {
    if (etat.etape !== 'REVELEE') return;
    const i = etat.index;
    const carte = cartesEl[i]!;
    const depart = carte.style.transform || decalage(i);
    carte.style.transition = 'none';
    legende.textContent = '';
    const sortie: Promise<void>[] = [
      animer(carte, [
        { opacity: 1, transform: depart },
        { opacity: 0, transform: `translate(${direction * 130}vw, -8vh) rotate(${direction * 28}deg)` },
      ], 380, 'ease-in'),
    ];
    if (effetsRevelation(tirees[i]!.finition).cinematique) sortie.push(animer(voile, [{ opacity: 0.8 }, { opacity: 0 }], 300));
    await Promise.all(sortie);
    if (interrompu()) return;
    carte.remove();
    preparer(i + 1);
    envoyer('suivante');
  }

  // Toucher la carte du dessus : la retourner (pile) ou la lancer (révélée). Glisser : la lancer.
  cartesEl.forEach((carte, i) => {
    let x0 = 0;
    let t0 = 0;
    let dx = 0;
    let glisse = false;
    carte.addEventListener('pointerdown', (e) => {
      if (i !== etat.index) return;
      if (etat.etape === 'PILE') {
        void retourner();
        return;
      }
      if (etat.etape !== 'REVELEE') return;
      carte.setPointerCapture(e.pointerId);
      glisse = true;
      x0 = e.clientX;
      t0 = performance.now();
      dx = 0;
      carte.style.transition = 'none';
    });
    carte.addEventListener('pointermove', (e) => {
      if (!glisse || etat.etape !== 'REVELEE') return;
      dx = e.clientX - x0;
      carte.style.transform = `${decalage(i)} translateX(${dx}px) rotate(${(dx * 0.04).toFixed(2)}deg)`;
    });
    const fin = (): void => {
      if (!glisse) return;
      glisse = false;
      if (etat.etape !== 'REVELEE') return;
      const largeur = carte.getBoundingClientRect().width;
      const vitesse = Math.abs(dx) / Math.max(1, performance.now() - t0);
      if (Math.abs(dx) < 8) void lancer(1); // simple toucher
      else if (Math.abs(dx) > largeur * 0.25 || vitesse > 0.6) void lancer(dx > 0 ? 1 : -1);
      else {
        carte.style.transition = 'transform 0.2s ease-out';
        carte.style.transform = decalage(i);
      }
    };
    carte.addEventListener('pointerup', fin);
    carte.addEventListener('pointercancel', fin);
  });

  // ---------- Résultats ----------
  function afficherResultats(): void {
    if (!vueSignalee) {
      vueSignalee = true;
      o.onVue();
    }
    const resultats = creerResultats(o.ouverture, o.extension, o.onTerminer);
    conteneur.replaceChildren(resultats);
    resultats.querySelector<HTMLElement>('h1')?.focus();
  }

  toutReveler.addEventListener('click', () => envoyer('tout-reveler'));
  void presenter();
}
