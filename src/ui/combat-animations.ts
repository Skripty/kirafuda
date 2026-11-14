// Animations du combat. L'écran est reconstruit à chaque action : on photographie les positions des éléments
// marqués [data-anim] avant, puis on anime le passage vers le nouvel état (technique FLIP) et on joue les effets
// du journal (attaque, dégâts, K.-O., énergie, pièces, changement de tour).
// Règles : transform et opacity uniquement ; rien en mode animations réduites. Les animations ne décident de rien :
// l'état affiché est déjà le bon, elles ne font que montrer comment on y est arrivé.
import type { Partie } from '../core/combat/etat';
import type { Evenement } from '../core/combat/moteur';

export interface Capture { rects: Map<string, DOMRect>; noeuds: Map<string, HTMLElement> }

export interface ContexteAnimation {
  racine: HTMLElement;
  /** Calque des effets (position fixe, au-dessus de tout, sans pointeur). */
  fx: HTMLElement;
  avant: Capture;
  partieAvant: Partie | null;
  partieApres: Partie;
  journal: Evenement[];
  /** Visuel d'une carte du jeu par son id (cartes jouées par l'IA, qu'on ne voyait pas). */
  visuel: (id: string) => HTMLElement;
  /** Part de PV restants d'un personnage avant l'action (0 à 1), pour la jauge. */
  ratioAvant: (uid: string) => number | null;
}

export const animationsReduites = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function capturer(racine: ParentNode): Capture {
  const rects = new Map<string, DOMRect>();
  const noeuds = new Map<string, HTMLElement>();
  racine.querySelectorAll<HTMLElement>('[data-anim]').forEach((n) => {
    if (n.closest('.combat-fx')) return;
    const r = n.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) { rects.set(n.dataset.anim!, r); noeuds.set(n.dataset.anim!, n); }
  });
  return { rects, noeuds };
}

type Lieu = { joueur: 0 | 1; zone: 'main' | 'deck' | 'defausse' | 'actif' | 'banc' } | null;
function lieu(p: Partie | null, uid: string): Lieu {
  if (!p) return null;
  for (const j of [0, 1] as const) {
    const J = p.joueurs[j];
    if (J.main.includes(uid)) return { joueur: j, zone: 'main' };
    if (J.actif?.uid === uid) return { joueur: j, zone: 'actif' };
    if (J.banc.some((x) => x.uid === uid)) return { joueur: j, zone: 'banc' };
    if (J.defausse.includes(uid)) return { joueur: j, zone: 'defausse' };
    if (J.deck.includes(uid)) return { joueur: j, zone: 'deck' };
  }
  return null;
}

const centre = (r: DOMRect): { x: number; y: number } => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });

/** Joue la transition ; renvoie sa durée totale (ms), 0 en mode animations réduites. */
export function animerTransition(c: ContexteAnimation): number {
  if (animationsReduites()) return 0;
  const apres = capturer(c.racine);
  const { journal } = c;
  let fin = 0;
  const jouer = (el: Element, images: Keyframe[], duree: number, delai = 0, easing = 'cubic-bezier(.2,.8,.2,1)', remplissage: FillMode = 'backwards'): Animation => {
    fin = Math.max(fin, delai + duree);
    return el.animate(images, { duration: duree, delay: delai, easing, fill: remplissage });
  };
  /** Copie flottante d'un élément (ou d'un visuel) posée à l'emplacement donné, dans le calque des effets. */
  const fantome = (rect: DOMRect, contenu: HTMLElement, classe = ''): HTMLElement => {
    const f = document.createElement('div');
    f.className = `combat-fantome ${classe}`;
    Object.assign(f.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
    f.append(contenu);
    c.fx.append(f);
    return f;
  };
  const retirerApres = (a: Animation, el: Element): void => { a.finished.then(() => el.remove(), () => el.remove()); };
  /** Animation d'un rectangle vers un autre (translation et échelle, coin haut gauche). */
  const versRect = (de: DOMRect, vers: DOMRect): string =>
    `translate(${(vers.left - de.left).toFixed(1)}px, ${(vers.top - de.top).toFixed(1)}px) scale(${(vers.width / de.width).toFixed(3)}, ${(vers.height / de.height).toFixed(3)})`;
  const depuisRect = (el: HTMLElement, de: DOMRect, vers: DOMRect, duree: number, delai: number, opacite = false): void => {
    el.style.transformOrigin = '0 0';
    const a = jouer(el, [
      { transform: versRect(vers, de), opacity: opacite ? 0 : 1 },
      { transform: 'none', opacity: 1 },
    ], duree, delai);
    a.finished.then(() => { el.style.transformOrigin = ''; }, () => { el.style.transformOrigin = ''; });
  };

  const debutTour = journal.find((e) => e.type === 'tour');
  const pieces = journal.filter((e) => e.type === 'piece');
  const attaque = journal.find((e) => e.type === 'attaque');

  // ---------- Pièces (pile ou face) : montrées avant ce qu'elles décident ----------
  let t = 0;
  if (pieces.length) {
    const p = pieces[0]!;
    const resultat = /face/i.test(p.texte) && !/^Pile ou face/.test(p.texte) ? 'FACE' : /pile/i.test(p.texte) && !/^Pile ou face/.test(p.texte) ? 'PILE' : '';
    const debut = /^Pile ou face/.test(p.texte);
    const boite = document.createElement('div');
    boite.className = 'combat-piece';
    const disque = document.createElement('div');
    disque.className = 'combat-piece-disque';
    disque.textContent = 'K';
    const texte = document.createElement('p');
    texte.textContent = debut ? (p.joueur === 0 ? 'Tu choisis qui commence' : 'L’IA choisit qui commence') : pieces.length > 1 ? p.texte : resultat;
    boite.append(disque, texte);
    c.fx.append(boite);
    jouer(disque, [
      { transform: 'translateY(0) rotateY(0deg) scale(.8)' },
      { transform: 'translateY(-60px) rotateY(900deg) scale(1.1)', offset: 0.5 },
      { transform: 'translateY(0) rotateY(1800deg) scale(1)' },
    ], 820, 0, 'ease-out');
    jouer(texte, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], 240, 700);
    retirerApres(jouer(boite, [{ opacity: 1 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }], 1400, 0, 'linear', 'both'), boite);
    t = debut ? 0 : 950;
  }

  // ---------- Déplacements (FLIP) et cartes qui arrivent ----------
  const delaiPioche = debutTour ? 650 : 0;
  let rangPioche = 0;
  for (const [cle, rect] of apres.rects) {
    if (!cle.startsWith('carte:')) continue;
    const el = apres.noeuds.get(cle)!;
    const ancien = c.avant.rects.get(cle);
    if (ancien) {
      if (Math.abs(ancien.left - rect.left) > 2 || Math.abs(ancien.top - rect.top) > 2 || Math.abs(ancien.width - rect.width) > 2) depuisRect(el, ancien, rect, 420, 0);
      continue;
    }
    const uid = cle.slice(6);
    const avantLieu = lieu(c.partieAvant, uid);
    if (avantLieu?.zone === 'deck') {
      const pile = c.avant.rects.get(`pile:deck:${avantLieu.joueur}`) ?? apres.rects.get(`pile:deck:${avantLieu.joueur}`);
      if (pile) { depuisRect(el, rect, pile, 460, delaiPioche + rangPioche++ * 110, true); continue; }
    }
    if (avantLieu?.zone === 'main' && avantLieu.joueur === 1) {
      const main = c.avant.rects.get('main-ia');
      if (main) { depuisRect(el, rect, main, 460, t, true); continue; }
    }
    jouer(el, [{ opacity: 0, transform: 'scale(.7)' }, { opacity: 1, transform: 'none' }], 360, t);
  }
  // L'IA pioche : un dos de carte va de son deck à sa main.
  for (const e of journal) {
    if (e.type !== 'pioche' || e.joueur !== 1) continue;
    const de = c.avant.rects.get('pile:deck:1') ?? apres.rects.get('pile:deck:1');
    const vers = apres.rects.get('main-ia');
    if (!de || !vers) continue;
    for (let k = 0; k < Math.min(3, e.valeur ?? 1); k++) {
      const dos = document.createElement('div');
      dos.className = 'combat-dos-mini';
      const f = fantome(de, dos);
      f.style.transformOrigin = '0 0';
      retirerApres(jouer(f, [{ transform: 'none', opacity: 1 }, { transform: versRect(de, vers), opacity: 0.2 }], 460, delaiPioche + k * 110, 'ease-in-out', 'both'), f);
    }
  }

  // ---------- Attaque : l'attaquant s'élance vers l'actif adverse ----------
  let impact = t;
  if (attaque?.cible) {
    const attaquant = apres.noeuds.get(`carte:${attaque.cible}`);
    const cibleUid = journal.find((e) => e.type === 'degats')?.cible ?? c.partieAvant?.joueurs[attaque.joueur === 0 ? 1 : 0].actif?.uid;
    const cibleRect = (cibleUid && (apres.rects.get(`carte:${cibleUid}`) ?? c.avant.rects.get(`carte:${cibleUid}`))) || null;
    if (attaquant && cibleRect) {
      const a = centre(attaquant.getBoundingClientRect());
      const b = centre(cibleRect);
      const dx = (b.x - a.x) * 0.38;
      const dy = (b.y - a.y) * 0.38;
      attaquant.style.zIndex = '30';
      jouer(attaquant, [
        { transform: 'none' },
        { transform: 'translate(0, 0) scale(1.06) rotate(-2deg)', offset: 0.25 },
        { transform: `translate(${dx.toFixed(0)}px, ${dy.toFixed(0)}px) scale(1.14)`, offset: 0.5 },
        { transform: 'none' },
      ], 520, t, 'cubic-bezier(.3,.1,.3,1)').finished.then(() => { attaquant.style.zIndex = ''; }, () => undefined);
      impact = t + 260;
    }
  }

  // ---------- Cartes qui quittent l'écran ----------
  const koParUid = new Map(journal.filter((e) => e.type === 'ko' && e.cible).map((e) => [e.cible!, e]));
  const fantomesKo = new Map<string, HTMLElement>();
  const tKo = impact + 520;
  for (const [cle, rect] of c.avant.rects) {
    if (!cle.startsWith('carte:') || apres.rects.has(cle)) continue;
    const uid = cle.slice(6);
    const noeud = c.avant.noeuds.get(cle)!;
    const ou = lieu(c.partieApres, uid);
    const pileDefausse = ou ? apres.rects.get(`pile:defausse:${ou.joueur}`) : undefined;
    const f = fantome(rect, noeud.cloneNode(true) as HTMLElement);
    f.style.transformOrigin = '0 0';
    if (journal.some((e) => e.type === 'soutien' && e.cible === uid)) {
      vitrine(f, rect, 0);
    } else if (koParUid.has(uid)) {
      fantomesKo.set(uid, f);
      retirerApres(jouer(f, [
        { transform: 'none', opacity: 1 },
        { transform: 'translateY(-8px) rotate(-3deg)', opacity: 1, offset: 0.25 },
        { transform: 'translateY(70px) rotate(14deg) scale(.82)', opacity: 0 },
      ], 760, tKo, 'cubic-bezier(.5,0,.8,.4)', 'both'), f);
    } else if (pileDefausse) {
      retirerApres(jouer(f, [{ transform: 'none', opacity: 1 }, { transform: versRect(rect, pileDefausse), opacity: 0.3 }], 460, t, 'ease-in', 'both'), f);
    } else {
      retirerApres(jouer(f, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.92)' }], 320, t, 'ease-out', 'both'), f);
    }
  }
  // Carte Soutien jouée par l'IA : on ne la voyait pas, on la montre en grand.
  for (const e of journal) {
    if (e.type !== 'soutien' || e.joueur !== 1 || !e.cible || !c.partieAvant) continue;
    const id = c.partieAvant.cartes[e.cible];
    const de = c.avant.rects.get('main-ia');
    if (!id || !de) continue;
    const largeur = Math.min(150, de.height * 3);
    const rect = new DOMRect(de.left + de.width / 2 - largeur / 2, de.top, largeur, largeur * 1.4);
    const v = c.visuel(id);
    v.style.setProperty('--carte-largeur', '100%');
    const f = fantome(rect, v);
    f.style.transformOrigin = '0 0';
    vitrine(f, rect, t);
  }

  /** Carte Soutien jouée : elle vient au centre en grand, reste un instant, puis part à la défausse. */
  function vitrine(f: HTMLElement, rect: DOMRect, delai: number): void {
    const hauteur = Math.min(window.innerHeight * 0.5, 420);
    const largeur = hauteur / 1.4;
    const cible = new DOMRect(window.innerWidth / 2 - largeur / 2, window.innerHeight / 2 - hauteur / 2, largeur, hauteur);
    const voile = document.createElement('div');
    voile.className = 'combat-voile';
    c.fx.prepend(voile);
    retirerApres(jouer(voile, [{ opacity: 0 }, { opacity: 0.6, offset: 0.2 }, { opacity: 0.6, offset: 0.8 }, { opacity: 0 }], 1350, delai, 'linear', 'both'), voile);
    retirerApres(jouer(f, [
      { transform: 'none', opacity: 1 },
      { transform: versRect(rect, cible), opacity: 1, offset: 0.25 },
      { transform: versRect(rect, cible), opacity: 1, offset: 0.8 },
      { transform: `${versRect(rect, cible)} translateY(-30px)`, opacity: 0 },
    ], 1350, delai, 'cubic-bezier(.2,.8,.2,1)', 'both'), f);
    t = Math.max(t, delai + 1100);
    impact = Math.max(impact, t);
  }

  // ---------- Dégâts, soins, états ----------
  const nombre = (rect: DOMRect, texte: string, classe: string, delai: number): void => {
    const n = document.createElement('div');
    n.className = `combat-nombre ${classe}`;
    n.textContent = texte;
    const p = centre(rect);
    Object.assign(n.style, { left: `${p.x}px`, top: `${p.y}px` });
    c.fx.append(n);
    retirerApres(jouer(n, [
      { opacity: 0, transform: 'translate(-50%, -50%) scale(.4)' },
      { opacity: 1, transform: 'translate(-50%, -70%) scale(1.25)', offset: 0.2 },
      { opacity: 1, transform: 'translate(-50%, -110%) scale(1)', offset: 0.7 },
      { opacity: 0, transform: 'translate(-50%, -150%) scale(.95)' },
    ], 1100, delai, 'ease-out', 'both'), n);
  };
  let k = 0;
  for (const e of journal) {
    if (!e.cible || !['degats', 'soin', 'etat'].includes(e.type)) continue;
    const vivant = apres.noeuds.get(`carte:${e.cible}`);
    const el = vivant ?? fantomesKo.get(e.cible);
    const rect = el?.getBoundingClientRect() ?? c.avant.rects.get(`carte:${e.cible}`);
    if (!rect) continue;
    const delai = impact + k++ * 90;
    if (e.type === 'degats' && e.valeur) {
      nombre(rect, `−${e.valeur}`, 'degats', delai);
      if (el) {
        jouer(el, [
          { transform: 'translateX(0)' }, { transform: 'translateX(-9px) rotate(-1.5deg)' }, { transform: 'translateX(8px) rotate(1deg)' },
          { transform: 'translateX(-5px)' }, { transform: 'translateX(0)' },
        ], 380, delai, 'linear');
        const eclair = document.createElement('i');
        eclair.className = 'combat-eclair';
        el.append(eclair);
        retirerApres(jouer(eclair, [{ opacity: 0 }, { opacity: 0.85, offset: 0.2 }, { opacity: 0 }], 360, delai, 'ease-out', 'both'), eclair);
      }
    } else if (e.type === 'soin' && e.valeur) {
      nombre(rect, `+${e.valeur}`, 'soin', delai);
    } else if (e.type === 'etat' && vivant) {
      vivant.querySelectorAll('.combat-etat').forEach((x) => jouer(x, [{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1.3)', opacity: 1, offset: 0.6 }, { transform: 'none', opacity: 1 }], 380, delai));
    }
    // Jauge de PV : de l'ancienne valeur à la nouvelle.
    const jauge = vivant?.querySelector<HTMLElement>('.combat-pv i');
    const ancien = c.ratioAvant(e.cible);
    if (jauge && ancien !== null && e.type !== 'etat') {
      const nouveau = jauge.style.transform;
      jouer(jauge, [{ transform: `scaleX(${ancien.toFixed(3)})` }, { transform: nouveau }], 600, delai + 120, 'ease-out');
    }
  }

  // ---------- K.-O. et points ----------
  for (const [uid, e] of koParUid) {
    const rect = c.avant.rects.get(`carte:${uid}`);
    if (rect) {
      const texte = document.createElement('div');
      texte.className = 'combat-ko';
      texte.textContent = 'K.-O.';
      const p = centre(rect);
      Object.assign(texte.style, { left: `${p.x}px`, top: `${p.y}px` });
      c.fx.append(texte);
      retirerApres(jouer(texte, [
        { opacity: 0, transform: 'translate(-50%, -50%) scale(2.2) rotate(-12deg)' },
        { opacity: 1, transform: 'translate(-50%, -50%) scale(1) rotate(-8deg)', offset: 0.25 },
        { opacity: 1, transform: 'translate(-50%, -50%) scale(1) rotate(-8deg)', offset: 0.75 },
        { opacity: 0, transform: 'translate(-50%, -50%) scale(.9) rotate(-8deg)' },
      ], 1000, tKo - 150, 'ease-out', 'both'), texte);
    }
    const marqueur = e.joueur === 0 ? 1 : 0;
    apres.noeuds.get(`points:${marqueur}`)?.querySelectorAll('i.marque').forEach((pip) =>
      jouer(pip, [{ transform: 'scale(1)' }, { transform: 'scale(1.9)', offset: 0.4 }, { transform: 'scale(1)' }], 520, tKo + 500));
  }

  // ---------- Énergie attachée : l'orbe vole jusqu'au personnage ----------
  for (const e of journal) {
    if (e.type !== 'energie-attachee' || !e.cible) continue;
    const vers = apres.noeuds.get(`carte:${e.cible}`);
    if (!vers) continue;
    const orbe = e.joueur !== undefined ? c.avant.noeuds.get(`energie:${e.joueur}`) : undefined;
    const de = orbe ? c.avant.rects.get(`energie:${e.joueur}`)! : new DOMRect(window.innerWidth / 2 - 20, window.innerHeight / 2 - 20, 40, 40);
    const contenu = orbe ? (orbe.querySelector('img')?.cloneNode(true) as HTMLElement | undefined) ?? document.createElement('i') : document.createElement('i');
    contenu.className = 'combat-orbe-volante';
    const f = fantome(new DOMRect(de.left, de.top, Math.min(de.width, 48), Math.min(de.height, 48)), contenu);
    const a = centre(de);
    const b = centre(vers.getBoundingClientRect());
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    retirerApres(jouer(f, [
      { transform: 'translate(0, 0) scale(1)', opacity: 1 },
      { transform: `translate(${(dx * 0.5).toFixed(0)}px, ${(dy * 0.5 - 70).toFixed(0)}px) scale(1.3)`, opacity: 1, offset: 0.5 },
      { transform: `translate(${dx.toFixed(0)}px, ${dy.toFixed(0)}px) scale(.6)`, opacity: 0.2 },
    ], 520, t, 'ease-in-out', 'both'), f);
    const energies = vers.querySelector('.combat-energies');
    if (energies) jouer(energies, [{ transform: 'scale(1)' }, { transform: 'scale(1.45)', offset: 0.4 }, { transform: 'scale(1)' }], 380, t + 480);
  }

  // ---------- Relève : un anneau de lumière sur le nouveau personnage ----------
  for (const e of journal) {
    if (e.type !== 'releve' || !e.cible) continue;
    const el = apres.noeuds.get(`carte:${e.cible}`);
    if (!el) continue;
    const anneau = document.createElement('i');
    anneau.className = 'combat-anneau';
    el.append(anneau);
    retirerApres(jouer(anneau, [{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'scale(1)', offset: 0.35 }, { opacity: 0, transform: 'scale(1.35)' }], 900, t + 300, 'ease-out', 'both'), anneau);
  }

  // ---------- Changement de tour : bandeau ----------
  if (debutTour) {
    const bandeau = document.createElement('div');
    bandeau.className = `combat-banniere ${debutTour.joueur === 0 ? 'toi' : 'ia'}`;
    const titre = document.createElement('strong');
    titre.textContent = debutTour.joueur === 0 ? 'À toi de jouer' : 'Tour de l’IA';
    const sous = document.createElement('span');
    sous.textContent = `Tour ${debutTour.valeur ?? ''}`;
    bandeau.append(titre, sous);
    c.fx.append(bandeau);
    const debut = Math.max(0, fin - 200);
    retirerApres(jouer(bandeau, [
      { opacity: 0, transform: 'translate(-50%, -50%) scaleX(.2)' },
      { opacity: 1, transform: 'translate(-50%, -50%) scaleX(1)', offset: 0.18 },
      { opacity: 1, transform: 'translate(-50%, -50%) scaleX(1)', offset: 0.8 },
      { opacity: 0, transform: 'translate(-50%, -50%) scaleX(1.06)' },
    ], 1150, debut, 'ease-out', 'both'), bandeau);
  }
  return fin;
}
