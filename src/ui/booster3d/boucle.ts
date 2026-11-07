// Une seule boucle de rendu pour tous les boosters 3D (requestAnimationFrame).
// - En pause quand l'onglet est caché, ou quand aucun booster inscrit n'est affiché (IntersectionObserver).
// - Un booster retiré de la page est libéré (ses ressources WebGL rendues) à la mutation suivante du DOM.

interface Inscrit {
  element: HTMLElement;
  image: (t: number) => void;
  liberer: () => void;
  visible: boolean;
}

const inscrits = new Set<Inscrit>();
let demande = 0;

function tick(t: number): void {
  demande = 0;
  for (const i of [...inscrits]) {
    if (!i.element.isConnected) { retirer(i); continue; }
    if (i.visible) i.image(t);
  }
  planifier();
}

function planifier(): void {
  const actif = !document.hidden && [...inscrits].some((i) => i.visible && i.element.isConnected);
  if (actif && demande === 0) demande = requestAnimationFrame(tick);
  if (!actif && demande !== 0) { cancelAnimationFrame(demande); demande = 0; }
}

function retirer(i: Inscrit): void {
  if (!inscrits.delete(i)) return;
  observateur?.unobserve(i.element);
  i.liberer();
  if (inscrits.size === 0) mutations?.disconnect();
  planifier();
}

let observateur: IntersectionObserver | null = null;
let mutations: MutationObserver | null = null;
let ecouteVisibilite = false;

/**
 * Inscrit un booster dans la boucle. `image` est appelée à chaque image tant qu'il est affiché ;
 * `liberer` une seule fois, quand il quitte la page ou à la désinscription. Renvoie la désinscription.
 */
export function inscrire(element: HTMLElement, image: (t: number) => void, liberer: () => void): () => void {
  const i: Inscrit = { element, image, liberer, visible: true };
  inscrits.add(i);
  if (typeof IntersectionObserver !== 'undefined') {
    observateur ??= new IntersectionObserver((entrees) => {
      for (const e of entrees) for (const x of inscrits) if (x.element === e.target) x.visible = e.isIntersecting;
      planifier();
    });
    observateur.observe(element);
  }
  mutations ??= new MutationObserver(() => {
    for (const x of [...inscrits]) if (!x.element.isConnected) retirer(x);
  });
  mutations.observe(document.body, { childList: true, subtree: true });
  if (!ecouteVisibilite) {
    ecouteVisibilite = true;
    document.addEventListener('visibilitychange', planifier);
  }
  planifier();
  return () => retirer(i);
}

/** Pour les tests et la vérification : nombre de boosters inscrits, boucle active ou non. */
export const etatBoucle = (): { inscrits: number; active: boolean } => ({ inscrits: inscrits.size, active: demande !== 0 });
