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

/** Animation qui rend ensuite la main au style de l'élément (qui porte déjà l'état final). */
function animerPuisLiberer(el: Element, images: Keyframe[], duree: number, delai = 0, easing = 'cubic-bezier(.2,.8,.2,1)'): Promise<void> {
  const a = el.animate(images, { duration: reduit() ? 0 : duree, delay: reduit() ? 0 : delai, easing, fill: 'backwards' });
  return a.finished.then(() => undefined, () => undefined);
}

/** Badge « NEW » : la carte est obtenue pour la première fois (lu dans l'ouverture enregistrée, jamais deviné). */
export function badgeNouveau(): HTMLElement {
  const b = document.createElement('span');
  b.className = 'ouv-new';
  b.textContent = 'NEW';
  b.setAttribute('aria-label', 'Nouvelle carte');
  return b;
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
  const flash = el('div', 'ouv-flash');
  voile.setAttribute('aria-hidden', 'true');
  dore.setAttribute('aria-hidden', 'true');
  flash.setAttribute('aria-hidden', 'true');
  // Ambiance : projecteur, faisceaux lents et poussières (décor seul ; positions fixes, sans hasard).
  const ambiance = el('div', 'ouv-ambiance');
  ambiance.setAttribute('aria-hidden', 'true');
  ambiance.append(el('div', 'ouv-faisceaux'));
  for (let k = 0; k < 18; k++) {
    const grain = el('i', 'ouv-poussiere');
    grain.style.left = `${(k * 37 + 11) % 100}%`;
    grain.style.top = `${(k * 53 + 7) % 100}%`;
    grain.style.animationDuration = `${7 + (k % 5) * 2}s`;
    grain.style.animationDelay = `${-k * 0.9}s`;
    ambiance.append(grain);
  }
  racine.append(ambiance, voile, barre, scene, legende, actions, aide, dore, flash);
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
  const flotte = el('div', 'ouv-flotte');
  flotte.append(el('div', 'ouv-halo'), booster3d.scene);
  entree.append(flotte, el('div', 'ouv-ombre-sol'));
  scene.append(entree);

  // ---------- Pile ----------
  const pile = el('div', 'ouv-pile');
  const lueur = el('div', 'ouv-lueur');
  // Derrière la carte : rayons (cartes ★ et plus, une fois retournées) et éclat du retournement (holo et mieux).
  const rayons = el('div', 'ouv-rayons');
  const eclat = el('div', 'ouv-eclat');
  pile.append(lueur, rayons, eclat);
  const cartesEl: HTMLElement[] = [];
  const zooms: HTMLElement[] = [];
  const retournes: HTMLElement[] = [];
  const rectos: HTMLElement[] = [];
  const reflets: HTMLElement[] = [];
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
    // Reflet qui balaie la carte quand sa face apparaît.
    const reflet = el('div', 'ouv-glare');
    const bande = el('i');
    reflet.append(bande);
    zoom.append(retourne, reflet);
    carte.append(el('div', 'ouv-ombre-carte'), zoom);
    reflets.push(bande);
    pile.append(carte);
    cartesEl.push(carte);
    zooms.push(zoom);
    retournes.push(retourne);
    rectos.push(recto);
  }

  /** Étincelles qui partent du centre de la carte (holo et mieux ; plus nombreuses et holo pour les ★ et plus). */
  function etincelles(nombre: number, holo: boolean): void {
    if (reduit()) return;
    for (let k = 0; k < nombre; k++) {
      const s = el('i', `ouv-etincelle${holo && k % 2 === 0 ? ' holo' : ''}`);
      pile.append(s);
      const angle = (k / nombre) * Math.PI * 2 + (k % 3) * 0.21;
      const portee = 150 + (k * 47) % 110;
      const x = Math.cos(angle) * portee;
      const y = Math.sin(angle) * portee;
      void animer(s, [
        { opacity: 0, transform: 'translate(-50%, -50%) scale(0.2)' },
        { opacity: 1, transform: `translate(calc(-50% + ${(x * 0.55).toFixed(0)}px), calc(-50% + ${(y * 0.55).toFixed(0)}px)) scale(1.3)`, offset: 0.35 },
        { opacity: 0, transform: `translate(calc(-50% + ${x.toFixed(0)}px), calc(-50% + ${(y + 30).toFixed(0)}px)) scale(0.3)` },
      ], 800 + (k % 4) * 140, 'cubic-bezier(.15,.7,.3,1)').then(() => s.remove());
    }
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
    // Les rayons ne tournent que derrière une carte ★ ou plus déjà retournée (un indice ne ment jamais).
    pile.classList.toggle('avec-rayons', etape === 'REVELEE' && !!t && effetsRevelation(t.finition).tremblement);
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
    // Le booster tombe en place, avec un léger rebond.
    await animer(entree, [
      { opacity: 0, transform: 'translateY(-70px) scale(0.86) rotate(-5deg)' },
      { opacity: 1, transform: 'translateY(10px) scale(1.03) rotate(1.5deg)', offset: 0.6 },
      { opacity: 1, transform: 'translateY(-4px) scale(0.99) rotate(-0.5deg)', offset: 0.82 },
      { opacity: 1, transform: 'none' },
    ], 700, 'ease-out');
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
    // Les cartes sortent du sachet en éventail, puis se rangent en pile.
    void animer(flash, [{ opacity: 0 }, { opacity: 0.55, offset: 0.25 }, { opacity: 0 }], 420);
    const milieu = (n - 1) / 2;
    await Promise.all(cartesEl.map((carte, i) => animerPuisLiberer(carte, [
      { opacity: 0, transform: 'translateY(90px) scale(0.7)' },
      { opacity: 1, transform: `translate(${(i - milieu) * 52}px, -18px) rotate(${(i - milieu) * 9}deg) scale(0.92)`, offset: 0.55 },
      { opacity: 1, transform: decalage(i) },
    ], 620, (n - 1 - i) * 55)));
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
    const duree = effets.tremblement ? 820 : effets.lueur ? 720 : 560;
    if (effets.cinematique) {
      enCours.push(animer(voile, [{ opacity: 0 }, { opacity: 0.8 }], 500));
      enCours.push(animer(zooms[i]!, [{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }], 650, 'cubic-bezier(.2,.7,.2,1)'));
    }
    if (effets.ecranDore) {
      enCours.push(animer(dore, [{ opacity: 0 }, { opacity: 0.9, offset: 0.35 }, { opacity: 0 }], 1100));
    }
    if (!effets.cinematique) {
      // La carte se soulève pendant qu'elle se retourne ; plus la rareté est haute, plus elle monte.
      const hauteur = effets.tremblement ? 1.16 : effets.lueur ? 1.1 : 1.06;
      enCours.push(animerPuisLiberer(zooms[i]!, [
        { transform: 'translateY(0) scale(1)' },
        { transform: 'translateY(4px) scale(0.97)', offset: 0.12 },
        { transform: `translateY(-22px) scale(${hauteur})`, offset: 0.55 },
        { transform: 'translateY(2px) scale(0.99)', offset: 0.88 },
        { transform: 'translateY(0) scale(1)' },
      ], duree, 0, 'ease-in-out'));
    }
    // Le retournement dépasse un peu la position finale, puis revient : la carte a du poids.
    enCours.push(animer(retournes[i]!, [
      { transform: 'rotateY(0deg) rotateZ(0deg)' },
      { transform: 'rotateY(0deg) rotateZ(-2deg)', offset: 0.12 },
      { transform: 'rotateY(196deg) rotateZ(1.5deg)', offset: 0.72 },
      { transform: 'rotateY(176deg) rotateZ(0deg)', offset: 0.88 },
      { transform: 'rotateY(180deg) rotateZ(0deg)' },
    ], duree, 'cubic-bezier(.3,.1,.3,1)'));
    enCours.push(animerPuisLiberer(reflets[i]!, [
      { opacity: 0, transform: 'translateX(-160%) skewX(-18deg)' }, { opacity: 0.9, offset: 0.3 }, { opacity: 0, transform: 'translateX(260%) skewX(-18deg)' },
    ], 620, duree * 0.55, 'ease-out'));
    if (effets.lueur) window.setTimeout(() => { if (!interrompu()) etincelles(effets.tremblement ? 26 : 12, effets.tremblement); }, reduit() ? 0 : duree * 0.6);
    // Éclat au moment où la face apparaît (holo et mieux).
    if (effets.lueur) enCours.push(animerPuisLiberer(eclat, [
      { opacity: 0, transform: 'scale(0.5)' }, { opacity: 0.95, transform: 'scale(1)', offset: 0.5 }, { opacity: 0, transform: 'scale(1.7)' },
    ], 900, 250, 'ease-out'));
    await Promise.all(enCours);
    if (interrompu()) return;

    if (t.nouveau) {
      const badge = badgeNouveau();
      cartesEl[i]!.append(badge);
      void animerPuisLiberer(badge, [
        { opacity: 0, transform: 'scale(0.2) rotate(-24deg)' }, { opacity: 1, transform: 'scale(1.25) rotate(-6deg)', offset: 0.6 }, { opacity: 1, transform: 'scale(1) rotate(-10deg)' },
      ], 380);
    }
    // La carte suivante est prête avant qu'on la demande.
    preparer(i + 1);
    legende.dataset.rang = effets.tremblement ? 'rare' : effets.lueur ? 'holo' : '';
    void animerPuisLiberer(legende, [{ opacity: 0, transform: 'translateY(8px) scale(0.92)' }, { opacity: 1, transform: 'none' }], 260);

    const f = FINITIONS[t.finition];
    legende.textContent = `${f.symbole} ${f.nom} · ${t.nouveau ? 'Nouvelle carte' : `×${t.exemplaires}`}`;
    envoyer('retournee');
  }

  async function lancer(direction: 1 | -1): Promise<void> {
    if (etat.etape !== 'REVELEE') return;
    const i = etat.index;
    const carte = cartesEl[i]!;
    // Une carte ne s'envole qu'une fois : un second clic pendant son vol s'adresse déjà à la carte suivante.
    if (carte.dataset.envol) return;
    carte.dataset.envol = '1';
    const depart = carte.style.transform || decalage(i);
    carte.style.transition = 'none';
    carte.style.pointerEvents = 'none';
    carte.style.zIndex = String(n + 1);
    legende.textContent = '';
    legende.dataset.rang = '';
    const vol = animer(carte, [
      { opacity: 1, transform: depart },
      { opacity: 1, transform: `translate(${direction * 38}vw, -9vh) rotate(${direction * 12}deg)`, offset: 0.45 },
      { opacity: 0, transform: `translate(${direction * 120}vw, 4vh) rotate(${direction * 30}deg)` },
    ], 440, 'cubic-bezier(.4,0,.7,.5)').then(() => carte.remove());
    if (effetsRevelation(tirees[i]!.finition).cinematique) void animer(voile, [{ opacity: 0.8 }, { opacity: 0 }], 300);
    preparer(i + 1);
    // Dernière carte : on la regarde partir avant les résultats.
    if (i + 1 >= n) {
      await vol;
      if (interrompu()) return;
      envoyer('suivante');
      return;
    }
    // Sinon la carte suivante avance tout de suite, pendant que l'autre finit son vol.
    envoyer('suivante');
    void animerPuisLiberer(zooms[i + 1]!, [{ transform: 'translateY(10px) scale(0.94)' }, { transform: 'translateY(-3px) scale(1.02)', offset: 0.7 }, { transform: 'none' }], 300);
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
