# AGENTS.md — règles pour travailler sur Kirafuda

Kirafuda est un jeu de collection de cartes de personnages d'anime, jouable dans le navigateur : ouverture de boosters façon TCG Pocket, cartes à la Pokémon avec 8 raretés fixes par carte (système TCG Pocket), 9 éléments, une cote qui suit la popularité, un draft hebdomadaire, et un combat de cartes contre l'IA avec des decks et des cartes Soutien (règles : `docs/COMBAT.md`). Le résumé complet des règles est dans `docs/GDD-resume.md`. **Lis-le avant toute tâche.**

## Façon de travailler

- **Une tâche à la fois**, dans l'ordre de `docs/TACHES.md`. Ne commence pas la tâche suivante sans qu'on te le demande.
- **N'ajoute aucune mécanique** absente du GDD ou de `docs/COMBAT.md` (pas d’échanges, pas de Wonder Pick ; le combat entre joueurs viendra plus tard ; le serveur se limite aux comptes, à la sauvegarde en ligne et au classement du draft). Si une tâche semble en demander, arrête-toi et pose la question.
- **Combat** : contre l'IA, avec des decks de 20 cartes et des cartes Soutien, exactement selon `docs/COMBAT.md`. Le moteur (`src/core/combat/`) est pur et déterministe : tout l'aléatoire (pioche, pile ou face, énergie) passe par `src/core/rng.ts`.
- Avant de terminer une tâche : `npm run typecheck` et `npm test` doivent passer, sans erreur.
- Explique en quelques lignes ce que tu as changé et comment le vérifier dans le navigateur.
- Petits commits, un par tâche, message en français.

## Pile technique

- TypeScript strict, Vite, HTML et CSS. **Pas de framework** (ni React, ni Vue) et pas de nouvelle dépendance sans demande explicite.
- Tests avec Vitest, dans `tests/`.
- Le jeu reste **jouable sans compte** : sauvegarde dans `localStorage`, avec export et import d'un fichier JSON. La sauvegarde locale est toujours la référence pendant la partie.
- Depuis la tâche 23 : compte **facultatif** (Supabase, connexion Discord, dépendance `@supabase/supabase-js` autorisée) et sauvegarde en ligne. Seule la clé publique (`VITE_SUPABASE_ANON_KEY`) est dans le jeu ; jamais de clé secrète. Tables et règles d'accès (Row Level Security) dans `supabase/migrations/`. Depuis la tâche 24 : classement du draft vérifié par des fonctions serveur (`supabase/fonctions/`, qui réutilisent `src/core`) ; si `npm test` signale une fonction qui n’est plus à jour (fichiers du draft modifiés), lancer `npm run deployer-fonctions`. Voir `docs/SUPABASE.md`.

## Structure

```
src/
  core/   logique pure, sans DOM : types, règles, tirage, économie, cote, draft
  core/combat/ moteur de combat (état, actions légales, effets, IA de simulation)
  data/   données du jeu en JSON (extension, booster, attaques) — ne pas modifier à la main sans raison
  ui/     écrans et composants (DOM, CSS, animations)
  en-ligne/ compte et synchronisation (Supabase) ; les règles de décision sont dans core/synchro.ts
  styles/ jetons de l'identité visuelle Graphite
tests/    tests Vitest de src/core
public/   logo, images des cartes (public/cartes/<id-carte>/illustration.webp)
docs/     GDD résumé, liste des tâches, références (Atelier des cartes), mise en ligne, Supabase
supabase/migrations/  SQL versionné de la base (à exécuter dans Supabase → SQL Editor)
supabase/fonctions/   sources des fonctions serveur (classement du draft), qui réutilisent src/core
supabase/functions/   fichiers déployés, GÉNÉRÉS par `npm run fonctions` (ne pas modifier à la main)
```

`src/core` ne doit jamais importer depuis `src/ui`.

## Règles non négociables

1. **Le tirage précède l'animation.** Les résultats d'une ouverture sont calculés et sauvegardés avant toute animation. L'animation ne fait que mettre en scène un résultat figé.
2. **Aucun `Math.random()` dans la logique du jeu.** Tout l'aléatoire passe par le module `src/core/rng.ts` (basé sur `crypto.getRandomValues`), qui accepte aussi une graine pour les tests et le draft.
3. **Probabilités exactes et vérifiables.** Les poids sont des entiers sur 100 000 ; chaque table doit totaliser exactement 100 000, sinon le jeu refuse de démarrer avec un message clair.
4. **Les indices disent la vérité.** Une lueur ou un effet qui annonce une carte rare n'est joué que si le tirage la contient.
5. **La rareté ne donne aucune puissance.** Ni le rang, ni la finition, ni la cote ne modifient les PV ou les attaques.
6. **Une opération = une mise à jour complète de la sauvegarde.** Dépense de sceaux, ajout des cartes, points et historique : tout ou rien.
7. **Une carte n'est jamais vide.** Si l'image d'une carte secrète manque, utiliser celle de la carte de base du même personnage, puis un visuel de remplacement.

## Interface

- Identité **Graphite** : utiliser uniquement les variables de `src/styles/tokens.css`. Le dégradé holo est réservé au K du logo et aux effets des cartes rares.
- Animations uniquement avec `transform` et `opacity`. Respecter `prefers-reduced-motion`.
- Tout geste de glissé a un équivalent par bouton. Le symbole de rareté est toujours écrit, jamais indiqué par la seule couleur.
- Doit fonctionner sur téléphone (largeur 375 px) et ordinateur.
- Textes de l'interface en français.

## Référence visuelle

`docs/reference/atelier-des-cartes.html` contient le rendu des cartes validé (mise en page, finitions, holo, couronne, immersive). Reprends sa logique de rendu dans `src/ui`, en TypeScript, sans copier son code de sauvegarde.
