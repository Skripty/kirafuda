// Deux IA simples pour la simulation (tâche 26) ; l'IA « normale » de l'écran de combat viendra à la tâche 27.
//  - hasard : choisit uniformément parmi les actions légales ;
//  - gloutonne : prépare son tour (Relèves, Bases, énergie, cartes qui piochent ou soignent), puis choisit l'attaque
//    qui fait le plus de dégâts (simulée sur une copie de la partie).
// Aléatoire : rng.ts avec une graine (règle 2 d’AGENTS.md).
import { rngAGraine, type Rng } from '../rng';
import type { CodeEnergie, ElementId } from '../types';
import type { Bibliotheque, Partie, PersoEnJeu } from './etat';
import { valeurDegats } from './fiches';
import { autre } from './etat';
import { actionsLegales, appliquer, peutPayer, type Action } from './moteur';

export type IA = (partie: Partie, bib: Bibliotheque) => Action;

export function iaHasard(graine: string): IA {
  const rng: Rng = rngAGraine(graine);
  return (partie, bib) => {
    const a = actionsLegales(partie, bib);
    return a[rng.entier(a.length)]!;
  };
}

/** Dégâts infligés à l'adversaire et points gagnés par une action (simulée). */
function gain(partie: Partie, bib: Bibliotheque, a: Action): number {
  const j = a.joueur;
  const adv = autre(j);
  const total = (p: Partie): number => {
    const A = p.joueurs[adv];
    return [...(A.actif ? [A.actif] : []), ...A.banc].reduce((n, x) => n + x.degats, 0) + A.defausse.length * 5;
  };
  const apres = appliquer(partie, a, bib, { verifier: false }).partie;
  return (apres.joueurs[j].points - partie.joueurs[j].points) * 1000 + (total(apres) - total(partie))
    - (apres.joueurs[j].points < partie.joueurs[j].points ? 1000 : 0);
}

const PRIORITE_SOUTIENS = ['sou-entrainement-intensif', 'sou-mentor', 'sou-parchemin-invocation', 'sou-reperage', 'sou-boussole'];

export function iaGloutonne(graine: string): IA {
  const rng: Rng = rngAGraine(graine);
  const auHasard = <T>(l: T[]): T => l[rng.entier(l.length)]!;
  return (partie, bib) => {
    const actions = actionsLegales(partie, bib);
    if (actions.length === 1) return actions[0]!;
    const de = <T extends Action['type']>(t: T): Extract<Action, { type: T }>[] => actions.filter((a): a is Extract<Action, { type: T }> => a.type === t);
    // Mise en place : le plus de personnages possible, l'actif aux PV les plus hauts.
    const mep = de('mise-en-place');
    if (mep.length) {
      const pvDe = (u: string): number => bib.personnages.get(partie.cartes[u]!)?.pv ?? 0;
      return mep.sort((a, b) => b.banc.length - a.banc.length || pvDe(b.actif) - pvDe(a.actif))[0]!;
    }
    const commencer = de('commencer');
    if (commencer.length) return commencer.find((a) => a.premier) ?? commencer[0]!;
    const nouveau = de('nouvel-actif');
    if (nouveau.length) {
      const J = partie.joueurs[nouveau[0]!.joueur];
      const pvRestant = (uid: string): number => { const x = J.banc.find((y) => y.uid === uid)!; return bib.personnages.get(x.id)!.pv - x.degats + x.energies.length * 15; };
      return nouveau.sort((a, b) => pvRestant(b.cible) - pvRestant(a.cible))[0]!;
    }
    const J = partie.joueurs[partie.joueurActif];
    const releves = de('releve');
    if (releves.length) return releves.sort((a, b) => (J.actif?.uid === b.cible ? 1 : 0) - (J.actif?.uid === a.cible ? 1 : 0))[0]!;
    const poses = de('poser');
    if (poses.length) return poses[0]!;
    // Énergie : là où elle rend une attaque payable, sinon à l'actif s'il peut s'en servir, sinon au banc.
    const attaches = de('attacher');
    if (attaches.length && J.energie) {
      const el: ElementId = J.energie;
      const persoDe = (uid: string): PersoEnJeu => (J.actif?.uid === uid ? J.actif : J.banc.find((x) => x.uid === uid)!);
      // Utile : une de ses attaques demande cette énergie (ou ◇) et reste payable avec les éléments du deck.
      const codesDuDeck = new Set(['q', ...J.elements.map((e) => CODE[e])]);
      const utile = (x: PersoEnJeu): boolean => bib.personnages.get(x.id)!.attaques
        .some((a) => fait(a) && a.cout.every((c) => codesDuDeck.has(c)) && a.cout.some((c) => c === 'q' || c === CODE[el]));
      const debloque = (x: PersoEnJeu): boolean => bib.personnages.get(x.id)!.attaques.some((a) => fait(a) && !peutPayer(x.energies, a.cout) && peutPayer([...x.energies, el], a.cout));
      const utileAction = attaches.find((a) => a.cible === J.actif?.uid && debloque(persoDe(a.cible)))
        ?? attaches.find((a) => debloque(persoDe(a.cible)))
        ?? attaches.find((a) => a.cible === J.actif?.uid && utile(persoDe(a.cible)))
        ?? attaches.find((a) => utile(persoDe(a.cible)));
      if (utileAction) return utileAction;
    }
    const jouer = de('jouer');
    for (const id of PRIORITE_SOUTIENS) { const a = jouer.find((x) => partie.cartes[x.carte] === id); if (a) return a; }
    // Soins : seulement si l'actif est blessé.
    if (J.actif && J.actif.degats >= 30) {
      const soin = jouer.find((x) => ['sou-onigiri', 'sou-infirmerie', 'sou-bandage'].includes(partie.cartes[x.carte]!) && (!x.choix.cible || x.choix.cible === J.actif!.uid));
      if (soin) return soin;
    }
    // Talents : ceux qui infligent des dégâts d'abord, sinon les autres.
    const talents = de('talent');
    if (talents.length) {
      const meilleur = talents.map((a) => ({ a, g: gain(partie, bib, a) })).sort((x, y) => y.g - x.g)[0]!;
      if (meilleur.g > 0) return meilleur.a;
      // Au hasard, seulement les talents gratuits (un talent qui défausse une carte ou une énergie se paie).
      const sansCout = talents.filter((a) => {
        const x = [J.actif, ...J.banc].find((y) => y?.uid === a.source);
        const t = x && bib.personnages.get(x.id)!.talent?.effets?.find((e) => e.type === 'activable');
        return !a.choix.defausse && !(t && t.type === 'activable' && t.cout);
      });
      if (sansCout.length) return auHasard(sansCout);
    }
    // Repli : l'actif ne peut pas attaquer mais un personnage du banc le pourrait.
    const replis = de('repli');
    if (replis.length && J.actif && !de('attaquer').length) {
      const pret = replis.find((a) => { const x = J.banc.find((y) => y.uid === a.cible)!; return payable(bib, x, x.energies); });
      if (pret) return pret;
      // Actif bloqué pour de bon : place au personnage du banc le mieux chargé.
      if (bloque(bib, J.actif, J.elements)) {
        const charge = (uid: string): number => J.banc.find((y) => y.uid === uid)!.energies.length;
        return [...replis].sort((a, b) => charge(b.cible) - charge(a.cible))[0]!;
      }
    }
    // Attaque : celle qui fait le plus de dégâts. Si elle n'en fait aucun (ex. Réécriture) et qu'un personnage du banc
    // a une attaque payable qui fait des dégâts, se replier d'abord.
    const attaques = de('attaquer');
    const meilleure = attaques.map((a) => ({ a, g: gain(partie, bib, a) })).sort((x, y) => y.g - x.g)[0];
    if ((!meilleure || meilleure.g <= 0) && replis.length) {
      const frappe = replis.find((r) => {
        const x = J.banc.find((y) => y.uid === r.cible)!;
        return bib.personnages.get(x.id)!.attaques.some((at) => typeof at.degats === 'number' && at.degats > 0 && peutPayer(x.energies, at.cout));
      });
      if (frappe) return frappe;
    }
    if (meilleure) return meilleure.a;
    return de('passer')[0] ?? actions[0]!;
  };
}

const CODE: Record<ElementId, CodeEnergie> = { feu: 'f', eau: 'e', glace: 'g', foudre: 'z', vent: 'v', terre: 't', lumiere: 'l', tenebres: 'n', neutre: 'q' };
const payable = (bib: Bibliotheque, x: PersoEnJeu, energies: ElementId[]): boolean =>
  bib.personnages.get(x.id)!.attaques.some((a) => peutPayer(energies, a.cout));
/** Aucune attaque du personnage n'est payable avec les éléments du deck (il ne pourra jamais attaquer). */
const bloque = (bib: Bibliotheque, x: PersoEnJeu, elements: ElementId[]): boolean => {
  const codes = new Set(['q', ...elements.map((e) => CODE[e])]);
  return !bib.personnages.get(x.id)!.attaques.some((a) => a.cout.every((c) => codes.has(c)));
};
/** L'attaque fait-elle des dégâts ? (Réécriture, Massage spécial, Reine des murs : non) */
const fait = (a: { degats: number | string }): boolean => (typeof a.degats === 'number' ? a.degats > 0 : a.degats.trim() !== '');

/**
 * IA « normale » de l'écran de combat : compare l'effet immédiat de chaque action et la qualité de la position
 * qui en résulte. Elle reste déterministe et n'emploie pas un talent payant simplement parce qu'il est disponible.
 */
export function iaNormale(): IA {
  return (partie, bib) => {
    const actions = actionsLegales(partie, bib);
    if (actions.length <= 1) return actions[0]!;
    const de = <T extends Action['type']>(t: T): Extract<Action, { type: T }>[] =>
      actions.filter((a): a is Extract<Action, { type: T }> => a.type === t);

    const mep = de('mise-en-place');
    if (mep.length) {
      const pvDe = (uid: string): number => bib.personnages.get(partie.cartes[uid]!)?.pv ?? 0;
      return mep.reduce((best, a) => {
        if (a.banc.length > best.banc.length) return a;
        return a.banc.length === best.banc.length && pvDe(a.actif) > pvDe(best.actif) ? a : best;
      }, mep[0]!);
    }
    const commencer = de('commencer');
    if (commencer.length) return commencer.find((a) => a.premier) ?? commencer[0]!;

    const j = actions[0]!.joueur;
    const J = partie.joueurs[j];
    const nouveaus = de('nouvel-actif');
    if (nouveaus.length) {
      const valeur = (uid: string): number => {
        const x = J.banc.find((p) => p.uid === uid)!;
        return pvRestants(bib, x) + x.energies.length * 16 + meilleurDegats(bib, x, x.energies) * 0.45;
      };
      return nouveaus.reduce((best, a) => valeur(a.cible) > valeur(best.cible) ? a : best, nouveaus[0]!);
    }

    // Comme l'IA gloutonne de simulation : une énergie ne va qu'à un personnage qui peut réellement préparer une
    // attaque à dégâts avec les éléments du deck. Les attaques de soin et de préparation ne justifient pas l'énergie.
    const avant = evaluation(partie, bib, j);
    let meilleur: { action: Action; score: number } | null = null;
    for (const action of actions) {
      if (action.type === 'attacher' && J.energie) {
        const x = personnage(J, action.cible);
        const codes = new Set(['q', ...J.elements.map((e) => CODE[e])]);
        if (!bib.personnages.get(x.id)!.attaques.some((a) => fait(a) && a.cout.every((c) => codes.has(c))
          && (a.cout.includes('q') || a.cout.includes(CODE[J.energie!]!)))) continue;
      }
      let apres: Partie;
      try { apres = appliquer(partie, action, bib).partie; }
      catch { continue; }
      let score = evaluation(apres, bib, j) - avant;
      if (action.type === 'repli' && partie.joueurs[j].actif) {
        const actif = partie.joueurs[j].actif;
        const meilleurActif = meilleurDegats(bib, actif, actif.energies);
        const bancPeutFrapper = partie.joueurs[j].banc.some((x) => x.uid === action.cible && meilleurDegats(bib, x, x.energies) > 0);
        if (meilleurActif <= 0 && bancPeutFrapper) score += 180;
      }
      if (action.type === 'talent' && talentPayant(partie, bib, action) && score < 18) continue;
      if (meilleur === null || score > meilleur.score) meilleur = { action, score };
    }

    if (meilleur && meilleur.action.type !== 'passer' && meilleur.score > 0) return meilleur.action;
    const replis = de('repli');
    if (replis.length && J.actif) {
      const peutFrapper = replis.find((r) => {
        const x = J.banc.find((p) => p.uid === r.cible)!;
        return bib.personnages.get(x.id)!.attaques.some((a) => fait(a) && peutPayer(x.energies, a.cout));
      });
      const attaques = de('attaquer');
      const meilleureAttaque = attaques.map((a) => ({ a, gain: gain(partie, bib, a) })).sort((a, b) => b.gain - a.gain)[0];
      if ((!meilleureAttaque || meilleureAttaque.gain <= 0) && peutFrapper
        && (!meilleur || meilleur.score <= 0 || meilleur.action.type === 'passer')) return peutFrapper;
    }
    return de('passer')[0] ?? meilleur?.action ?? actions[0]!;
  };
}

function personnage(joueur: Partie['joueurs'][number], uid: string): PersoEnJeu {
  return joueur.actif?.uid === uid ? joueur.actif : joueur.banc.find((x) => x.uid === uid)!;
}

function pvRestants(bib: Bibliotheque, x: PersoEnJeu): number {
  return (bib.personnages.get(x.id)?.pv ?? 0) - x.degats;
}

function meilleurDegats(bib: Bibliotheque, x: PersoEnJeu, energies: ElementId[]): number {
  return Math.max(0, ...((bib.personnages.get(x.id)?.attaques ?? [])
    .filter((a) => fait(a) && peutPayer(energies, a.cout)).map((a) => valeurDegats(a.degats))));
}

function evaluation(partie: Partie, bib: Bibliotheque, joueur: 0 | 1): number {
  return scoreJoueur(partie, bib, joueur) - scoreJoueur(partie, bib, autre(joueur));
}

function scoreJoueur(partie: Partie, bib: Bibliotheque, j: 0 | 1): number {
  const J = partie.joueurs[j];
  let score = J.points * 1800;
  const enJeu = [...(J.actif ? [J.actif] : []), ...J.banc];
  for (const x of enJeu) {
    const fiche = bib.personnages.get(x.id);
    if (!fiche) continue;
    const restant = Math.max(0, fiche.pv - x.degats);
    score += restant * (x === J.actif ? 0.72 : 0.48) + x.energies.length * 9;
    score += meilleurDegats(bib, x, x.energies) * (x === J.actif ? 0.85 : 0.28);
    if (x.etats.includes('brulure')) score -= 13;
    if (x.etats.includes('gel')) score -= 12;
    if (x.etats.includes('etourdi')) score -= 8;
    if (x.etats.includes('malediction')) score -= 6;
  }
  for (const uid of J.main) {
    const id = partie.cartes[uid]!;
    const fiche = bib.personnages.get(id);
    if (fiche) score += fiche.type === 'eveille' ? 7 : 11;
    else if (bib.soutiens.has(id)) score += 4;
  }
  const ennemi = partie.joueurs[autre(j)];
  if (J.actif && ennemi.actif) {
    const menace = meilleurDegats(bib, ennemi.actif, ennemi.actif.energies);
    const restant = pvRestants(bib, J.actif);
    if (menace >= restant && restant > 0) score -= 95;
    else if (menace >= restant * 0.7) score -= 38;
  }
  // Une Base de la même série que l'Éveillé en main prépare une Relève au tour suivant.
  for (const uid of J.main) {
    const ev = bib.personnages.get(partie.cartes[uid]!);
    if (!ev || ev.type !== 'eveille') continue;
    if (enJeu.some((x) => {
      const base = bib.personnages.get(x.id);
      return base?.serie === ev.serie && base.type !== 'eveille' && x.entreAuTour < partie.tour;
    })) score += 14;
  }
  return score;
}

function talentPayant(partie: Partie, bib: Bibliotheque, action: Action): boolean {
  if (action.type !== 'talent') return false;
  const x = partie.joueurs[action.joueur].actif?.uid === action.source
    ? partie.joueurs[action.joueur].actif
    : partie.joueurs[action.joueur].banc.find((p) => p.uid === action.source);
  return !!x && !!bib.personnages.get(x.id)?.talent?.effets?.some((e) => e.type === 'activable' && !!e.cout);
}
