# Kirafuda — document de reprise (8 novembre 2026)

À lire en entier avant de reprendre le projet. Il résume tout ce qui a été décidé et fait jusqu'ici, et dit où reprendre : **la tâche 27 (combat contre l'IA)**.

Fichiers de référence dans le projet, par ordre d'importance :
1. `AGENTS.md` : règles de travail (lu par Codex ; `CLAUDE.md` y renvoie pour Claude Code).
2. `docs/COMBAT.md` : règles complètes du combat et des decks.
3. `docs/GDD-resume.md` : règles du jeu (boosters, économie, cote, draft, comptes).
4. `docs/TACHES.md` : toutes les tâches, avec le texte exact à donner à l'assistant.
5. `docs/DEPLOIEMENT.md` et `docs/SUPABASE.md` : mise en ligne, comptes, fonctions serveur.

Le GDD complet est un document claude.ai (non accessible à un autre assistant) : ce fichier et les `docs/` en reprennent l'essentiel.

---

## 1. Le jeu en bref

**Kirafuda** est un jeu de collection de cartes de personnages d'anime, dans le navigateur, gratuit et non commercial (projet personnel). Inspirations : Pokémon TCG Pocket (ouverture de boosters, raretés, combat) et Mudae.

- Ouverture de boosters façon TCG Pocket, en 3D (WebGL).
- Cartes à la Pokémon : 8 raretés fixes par carte.
- 9 éléments, une cote qui suit la popularité réelle des personnages, un draft hebdomadaire avec classement.
- Comptes Discord et sauvegarde en ligne.
- **En cours** : combat contre l'IA, decks, cartes Soutien.

Identité visuelle « Graphite » : #121316, #2A2C31, #8B8F98, #F2F2F0 ; dégradé holo #FF5FC8 → #6CCBFF → #A9F26A réservé au K du logo et aux cartes rares ; police Poppins ; logo : monogramme K (branche haute en dégradé holo).

## 2. Technique et hébergement

- Vite + TypeScript strict, sans framework, Vitest. `src/core` = logique pure (jamais de DOM), `src/ui` = écrans, `src/data` = données JSON.
- Aucun `Math.random` : tout passe par `src/core/rng.ts` (graine possible).
- Le tirage d'un booster est fait et sauvegardé **avant** l'animation.
- **Site** : Cloudflare Workers (fichiers statiques), domaine `kirafuda.online` (acheté chez OVH, DNS chez Cloudflare). Déploiement automatique à chaque `git push` sur `main` (dépôt GitHub `Skripty/kirafuda`). Réglages : build `npm run build`, deploy `npx wrangler deploy`, Root directory vide, fichier `wrangler.jsonc` (assets `./dist`). Variables de build : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- **Comptes** : Supabase (projet `ajkmoycsqpffkresruth`, Francfort, offre gratuite). Connexion Discord. Tables `profils`, `sauvegardes`, `drafts`, `recompenses_draft`, vue `classement_draft`. Deux fonctions serveur : `soumettre-draft` (vérifie et note les équipes du draft) et `reclamer-draft` (récompenses).
- **Admin** : uniquement en local (`npm run dev` puis `http://localhost:5173/admin.html`) : images des cartes, cadrage, popularité hebdomadaire (`?onglet=popularite`). Les fiches de combat y sont en lecture seule.

### Commandes utiles

| Commande | Usage |
| --- | --- |
| `npm run dev` | Jeu et admin en local |
| `npm run typecheck`, `npm test` | À faire passer avant chaque commit |
| `npm run images` (`--verifier`, `--refaire <id>`) | Alléger les images (2 Mo max, 5 Mo pour les animations) |
| `npm run fiches` | Recopier `fiches-combat.json` et `soutiens.json` dans le jeu après un changement |
| `npm run simuler -- combat` | 5 000 parties IA contre IA, rapport d'équilibrage |
| `npm run simuler -- joueurs` | Simulation de l'économie |
| `npm run deployer-fonctions` | Redéployer les fonctions serveur (après tout changement de PV, dégâts, cartes ou règles du draft) |

## 3. Cartes et raretés

- **Rareté fixe par carte**, comme TCG Pocket. Un personnage a une carte de base et parfois des versions secrètes.
- 8 raretés : ♦ commune, ♦♦ peu commune, ♦♦♦ holo, ♦♦♦♦ holo intégrale, ★ pleine illustration, ★★ alternative, ★★★ immersive animée, ♛ couronne. Multiplicateurs de cote : ×1, ×1,5, ×3, ×5, ×8, ×15, ×40, ×100.
- **Rang du personnage** (popularité) : C, B, A, S. Il fixe la rareté de la carte de base (C ♦, B ♦♦, A ♦♦♦, S ♦♦♦♦) et le type au combat.
- La rareté ne donne **aucune** puissance : toutes les cartes d'un personnage ont la même fiche de combat.
- Cadres des cartes ★ à ★★★ : bande holo (pastel ★, vive ★★, holo Kirafuda ★★★ avec reflet animé), même épaisseur que l'ancien cadre, rien sur l'illustration.
- Icônes des 9 éléments dans `public/elements/` (Foudre jaune, Lumière ivoire doré).

## 4. Boosters et contenu

- **Un seul booster : Lancement.** 5 cartes ; emplacements 1-3 : ♦ ; emplacements 4 et 5 : taux exacts de TCG Pocket (Puissance Génétique) ; booster exceptionnel 0,05 % (cartes ★ et plus uniquement). Chaque emplacement tire une rareté, puis une carte de cette rareté parmi toutes les cartes sorties.
- **Lancement est fait de vagues** :
  - vague 1 : 100 personnages, 140 cartes (100 de base + 40 secrètes) ;
  - vague 2, « Renforts » : 24 personnages, 32 cartes (Hunter x Hunter, Dandadan, Kaiju No. 8, Spy x Family, Blue Lock). **Sa date de sortie dans `src/data/extensions.json` doit être remise environ deux semaines après le début du test entre amis** ;
  - vague 3 (tâche 30, à faire) : 8 Bases pour Naruto (Kakashi, Sakura, Gaara, Rock Lee) et One Piece (Sanji, Nami, Usopp, Chopper), sortie avec le combat.
- Cartes Soutien (tâche 29) : 20 cartes dans `src/data/soutiens.json`, dans les mêmes boosters (Objets ♦, Soutiens ♦♦, Terrains ♦♦♦).

## 5. Économie et quêtes (réglages dans `src/data/quetes.json`)

- 1 sceau = 1 booster. Connexion : 2 sceaux par jour (stock plafonné à 10). Quêtes du jour (3, mêmes pour tous) : +1 si les 3 sont faites. Calendrier de bienvenue sur 7 jours : 4, 3, 3, 2, 2, 2, 4 (boosters des jours 1 et 7 avec une ★ garantie). Quêtes de débutant : 13 sceaux. Hebdomadaire : draft + quête de la semaine. Calendrier de sortie d'une vague : 2, 2, 1, 1, 1, 1, 2.
- Résultat simulé (joueur assidu) : environ 14 boosters le premier jour, cartes de base complètes vers le jour 39, première ♛ vers le jour 100.
- Boutique de points (5 points par booster) : prix ♦ 35, ♦♦ 70, ♦♦♦ 150, ♦♦♦♦ 500, ★ 400, ★★ 1 250, ★★★ 1 500, ♛ 2 500. Revente des doublons à la cote.

## 6. Cote et popularité

- Cote d'une carte = popularité du personnage (1 à 100) × multiplicateur de rareté.
- Popularité = base (`src/data/popularite-base.json`, fixée une fois) + ajustement. Chaque lundi, dans l'admin : l'ajustement précédent × 0,7 (arrondi vers zéro), puis coups de pouce sur une série ou un personnage (−5, +5, +10, +15), puis « Publier la semaine ».

## 7. Draft hebdomadaire et classement

- Chaque semaine (heure de Paris), tous les joueurs reçoivent les mêmes 15 cartes (3 boosters de draft) et en gardent 5. Score déterministe : puissance ((PV + dégâts) ÷ 10), thème de la semaine (`src/data/themes-draft.json`, tirage sans répétition), synergies, défi.
- Classement vérifié par le serveur (fonction `soumettre-draft`). Récompenses : 1er +5, 2e +4, 3e +3, participation +2. Sans compte : +2, hors classement.
- Le draft reste tel quel pendant le chantier combat.

## 8. Combat (règles complètes dans `docs/COMBAT.md`)

- Actif + 3 sur le banc, 1 énergie par tour (1 à 3 éléments choisis pour le deck), **3 points** pour gagner.
- **Base** (rang C, B) : posé directement, 1 point s'il est mis K.-O.
- **Héros** (8 personnages principaux de séries sans Éveillé : Mob, Twenty-Fifth Bam, Kim Dokja, Taro Sakamoto, Caiman, Yu, Thorfinn, Yoichi Isagi) : posé directement, gros PV, **2 points**.
- **Éveillé** (rang A, S) : entre uniquement par **Relève**, en remplaçant un personnage **de la même série** en jeu depuis au moins un tour ; garde ses énergies et ses dégâts ; **2 points**.
- **Règle du rang C** : les attaques des personnages de rang C ne coûtent que des énergies ◇ (quelconques).
- Faiblesse +20 (cycle Feu ← Eau ← Foudre ← Terre ← Vent ← Glace ← Feu ; Lumière et Ténèbres l'une contre l'autre ; Neutre sans faiblesse). États : Brûlure, Gel, Étourdi, Malédiction.
- Cartes Soutien : Objets (illimités par tour), Soutien (1 par tour), Terrain (1 en jeu).
- Decks : 20 cartes, 2 exemplaires maximum par personnage et par carte Soutien, au moins 1 Base ou Héros ; 2 decks de départ jouables par tous.
- Chaque personnage a des attaques et talents **uniques, nommés d'après sa série**. Source de vérité : `src/data/fiches-combat.json` (132 fiches, dont 8 de la vague 3 marquées `nouveau`). Après modification : `npm run fiches`, puis `npm run deployer-fonctions` si des PV ou dégâts changent.

### Équilibrage (fait, par simulation)

4 tours d'équilibrage avec 5 000 parties IA gloutonne contre IA gloutonne et des decks standardisés. Dernier rapport : 17 séries sur 19 entre 40 et 64 % de victoires. À surveiller en jeu réel :
- **L'Attaque des Titans** (69,5 %) : toute la série monte ensemble, piste principale = le talent d'Erwin (+10 à tous les personnages de la série) ;
- **Tower of God** (36,6 %) ;
- Naruto n'a pas encore de deck possible (vague 3).

On a décidé d'**arrêter l'équilibrage par simulation** et de passer aux vraies parties.

## 9. État d'avancement

| Tâches | État |
| --- | --- |
| 1 à 14 | Version 1 : boosters, collection, boutique, cote, draft, probabilités, historique |
| 15 à 21 | Admin des images, taux TCG Pocket, raretés fixes, refonte visuelle, quêtes, vagues, popularité |
| 22 à 24 | Mise en ligne, comptes Discord et sauvegarde en ligne, classement du draft |
| 25 | Données de combat et nouvelle mise en page des cartes (fait) |
| 26 + 4 tours d'équilibrage | Moteur de combat dans `src/core/combat/`, effets structurés, simulation (fait, dernier commit `daf8099`) |
| 27 | Combat contre l’IA (fait) |
| 28 | Constructeur de decks et decks de départ (fait : The Boxer et Spy x Family) |
| 29 | Cartes Soutien dans le jeu (fait) |
| 30 | Vague 3 (Naruto, One Piece) |
| plus tard | Combat entre amis (Supabase temps réel), classement de collection (demanderait des tirages côté serveur) |

## 10. Reprendre maintenant

1. Lancer `npm run deployer-fonctions` (des PV et dégâts ont changé au dernier tour d'équilibrage).
2. Donner à l'assistant :

> Lis AGENTS.md, docs/COMBAT.md et docs/REPRISE.md. Fais la tâche 27 de docs/TACHES.md (combat contre l'IA). Pour l'IA « normale », reprends les corrections faites sur l'IA gloutonne de la simulation (elle n'attache des énergies qu'à un personnage qui a une attaque à dégâts, se replie si sa meilleure attaque ne fait rien et qu'un personnage du banc peut frapper, n'utilise pas au hasard les talents qui défaussent une carte ou une énergie). À la fin, commit.

3. Après la tâche 27 : jouer une dizaine de parties et noter ce qui n'est pas clair, le rythme, le niveau de l'IA, les cartes injustes ou inutiles. Ajuster ensuite les fiches dans `fiches-combat.json`.
4. Enchaîner les tâches 28, 29, 30, une par une.

### Façon de travailler qui a bien marché

- **Une tâche à la fois**, en commençant chaque demande par « Fais uniquement cette tâche, puis arrête-toi ». L'assistant explique ce qu'il a fait et comment le vérifier, puis s'arrête.
- Chaque tâche se termine par `npm run typecheck`, `npm test` et un commit.
- Rien n'est inventé hors des documents : si une règle manque, l'assistant pose la question.
- Toute valeur réglable vit dans un fichier JSON de `src/data/`, pas dans le code.

## 11. Points en suspens

- Remettre la date de sortie de Renforts avant le test entre amis.
- Test avec 5 à 10 amis pendant deux semaines (message d'invitation et questionnaire prévus : jouer sur le même appareil ou se connecter avec Discord, poster ses scores de draft, retours à la fin).
- Images à prévoir : 8 personnages de la vague 3, 20 cartes Soutien, quelques cartes secrètes encore sans image propre (lan-122 à 124, fonds des ★★★ lan-135 à 137).
- Optionnel : 10 cartes ★★ pour 3 ★★★ dans Lancement fait qu'une ★★★ précise sort plus souvent qu'une ★★ précise (comme dans TCG Pocket) ; correction possible en passant 2 cartes de ★★ à ★★★.
- Prochaine grande extension vers le 2e ou 3e mois.
