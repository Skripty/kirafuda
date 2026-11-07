# Tâches de la version 1

Donne ces tâches à Codex **une par une**, dans l'ordre. Copie le bloc « À dire à Codex », vérifie les critères « Terminé quand », puis passe à la suivante. Chaque étape doit être jouable avant la suivante.

---

## 1. Démarrer le projet

**À dire à Codex**
> Lis AGENTS.md et docs/GDD-resume.md. Installe les dépendances, vérifie que `npm run dev`, `npm run typecheck` et `npm test` fonctionnent. Ajoute un premier test Vitest qui charge `src/data/extension-lancement.json` et vérifie qu'il contient 100 cartes avec exactement 2 attaques chacune. Ne change rien d'autre.

**Terminé quand** : la page affiche le logo et « 100 cartes », et les tests passent.

## 2. Valider les données

**À dire à Codex**
> Crée `src/core/validation.ts` : une fonction qui vérifie l'extension et le booster (chaque table de poids totalise exactement 100 000, chaque rang avec un poids non nul a au moins une carte, chaque élément et chaque finition existent dans `src/core/regles.ts`, numéros uniques de 1 à total). Elle renvoie la liste des erreurs. Au démarrage, si la liste n'est pas vide, afficher les erreurs au lieu du jeu. Tests Vitest pour chaque règle.

**Terminé quand** : modifier un poids dans le JSON affiche une erreur claire ; les tests passent.

## 3. Aléatoire

**À dire à Codex**
> Crée `src/core/rng.ts` : un générateur avec deux modes, sécurisé (`crypto.getRandomValues`) et à graine (déterministe, pour les tests et le draft). Fonctions : entier dans [0, n[, tirage pondéré dans une table de poids sur 100 000. Tests : même graine = mêmes résultats ; sur 1 000 000 de tirages, chaque fréquence est à moins de 0,2 point de son poids.

**Terminé quand** : les tests passent. Aucun `Math.random` dans `src/core`.

## 4. Tirage d'un booster

**À dire à Codex**
> Crée `src/core/tirage.ts` : `tirerBooster(booster, extension, rng)` renvoie 5 `CarteTiree` selon docs/GDD-resume.md (exceptionnel d'abord, puis pour chaque emplacement : rang, personnage de ce rang à poids égaux, finition). Ajoute un script `npm run simuler` qui ouvre 100 000 boosters et affiche les fréquences observées à côté des taux configurés. Tests avec une graine fixe.

**Terminé quand** : la simulation montre des fréquences proches des taux ; les tests passent.

## 5. Rendu des cartes

**À dire à Codex**
> Crée `src/ui/carte.ts` : une fonction qui produit l'élément DOM d'une carte pour une finition donnée, en reprenant le rendu de `docs/reference/atelier-des-cartes.html` (mise en page Pokémon, 7 finitions, holo qui suit le pointeur, pivot horizontal léger, immersive avec parallaxe et particules, couronne dorée). Images lues dans `public/cartes/<id>/<finition>.webp` avec la règle de repli d'AGENTS.md et un visuel de remplacement. Ajoute une page de test `/galerie.html` qui affiche une carte choisie dans ses 7 finitions.

**Terminé quand** : la galerie affiche correctement les 7 finitions, même sans image.

## 6. Sauvegarde locale

**À dire à Codex**
> Crée `src/core/sauvegarde.ts` : lecture et écriture de la `Sauvegarde` (version 1) dans `localStorage`, avec valeurs par défaut, migration prévue par numéro de version, export en fichier JSON et import avec validation. Les écritures sont atomiques (on écrit l'état complet). Tests.

**Terminé quand** : recharger la page conserve l'état ; un import invalide est refusé avec un message.

## 7. Ouvrir un booster (logique)

**À dire à Codex**
> Crée `src/core/ouverture.ts` : `ouvrir(sauvegarde, booster, extension, rng)` vérifie le solde, tire le booster, met à jour en une fois les sceaux, la collection, les points et l'historique (statut nouveau ou doublon, en tenant compte des doublons dans le même booster), puis renvoie la nouvelle sauvegarde et le résultat. Solde insuffisant : rien ne change. Tests.

**Terminé quand** : les tests couvrent solde insuffisant, doublons et nouveautés.

## 8. Hub des invocations

**À dire à Codex**
> Crée l'écran d'accueil des invocations en identité Graphite : logo, solde de sceaux, points de l'extension, le booster Lancement (fond anthracite, monogramme K, « Lancement · 01 ») avec un léger flottement, bouton « Ouvrir » (désactivé avec le manque si solde insuffisant), accès aux probabilités et à l'historique. Ajoute la récompense quotidienne de 2 sceaux (plafond 10).

**Terminé quand** : on voit le booster et son coût, la récompense quotidienne fonctionne.

## 9. Animation d'ouverture

**À dire à Codex**
> Crée `src/ui/ouverture/` en suivant la machine à états de docs/GDD-resume.md : présentation, booster inclinable, déchirure au glissé (75 %), pile de 5 cartes, retournement au toucher, pivot horizontal, carte lancée sur le côté (seule la carte du dessus bouge), effets par finition, indices honnêtes, « Tout révéler », écran de résultats (nouveau / ×N, points gagnés). Le résultat vient de la tâche 7, déjà sauvegardé avant l'animation. Mode animations réduites.

**Terminé quand** : on peut ouvrir un booster de bout en bout sur téléphone et ordinateur ; fermer la page en plein milieu ne perd aucune carte.

## 10. Collection et inspection

**À dire à Codex**
> Crée l'écran Collection : grille de l'extension (silhouettes pour les cartes manquantes, avec numéro), filtres par série, élément, finition possédée, compteur de complétion. Inspection : carte agrandie, pivot horizontal, finitions possédées, nombre d'exemplaires.

**Terminé quand** : la collection reflète exactement la sauvegarde.

## 11. Boutique de points et doublons

**À dire à Codex**
> Ajoute la boutique de points de l'extension (prix par finition dans docs/GDD-resume.md, confirmation, solde après échange) et la revente de doublons contre des sceaux (pas le premier exemplaire, confirmation obligatoire). Tests de la logique dans `src/core`.

**Terminé quand** : échanger et revendre mettent à jour la sauvegarde correctement.

## 12. Cote

**À dire à Codex**
> Crée `src/data/popularite.json` (semaine courante et précédente, popularité 0 à 100 par carte) et `src/core/cote.ts` (cote = popularité × multiplicateur de finition, tendance). Affiche la cote sur les cartes de la collection, la valeur totale et les plus fortes hausses à l'accueil. La revente de doublons utilise la cote.

**Terminé quand** : changer le fichier de popularité change les cotes affichées.

## 13. Draft hebdomadaire

**À dire à Codex**
> Crée le draft solo : graine dérivée de la semaine, 3 boosters de draft identiques pour tous, choix de 5 cartes parmi 15, thème de la semaine (liste de thèmes dans `src/data/themes-draft.json`), score déterministe avec détail des points, récompense en sceaux une fois par semaine. Logique dans `src/core/draft.ts` avec tests.

**Terminé quand** : deux navigateurs différents obtiennent les mêmes 15 cartes la même semaine.

## 14. Probabilités et historique

**À dire à Codex**
> Ajoute l'écran Probabilités (tables par emplacement et booster exceptionnel, lues dans le JSON) et l'écran Historique (ouvertures récentes, filtres par finition).

**Terminé quand** : les pourcentages affichés correspondent exactement au fichier du booster.

---

Après la tâche 14 : faire jouer 5 à 10 amis pendant deux semaines (critères dans le GDD, section Périmètre de la version 1).

## 16. Taux de TCG Pocket et finition Holo intégrale

**À dire à Codex**
> Fais uniquement cette tâche, puis arrête-toi. Lis docs/GDD-resume.md (section Boosters et Cartes).
> 1. Ajoute la finition `holo-integrale` (♦♦♦♦, nom affiché « Holo intégrale », multiplicateur de cote ×5, prix boutique 500), placée entre `holo` et `pleine`, dans `src/core/types.ts` (FinitionId) et `src/core/regles.ts` (FINITIONS, ORDRE_FINITIONS).
> 2. Dans `src/data/booster-lancement.json`, remplace les finitions des emplacements 4 et 5 par ces poids exacts : emplacement 4 = peu-commune 90000, holo 5000, holo-integrale 1666, pleine 2572, alternative 500, immersive 222, couronne 40 ; emplacement 5 = peu-commune 60000, holo 20000, holo-integrale 6664, pleine 10288, alternative 2000, immersive 888, couronne 160. Emplacements 1 à 3 et booster exceptionnel inchangés. Ne touche pas aux rangs.
> 3. Rendu (`src/ui/carte.ts`) : mise en page fenêtre comme la holo, cadre argenté, film holo qui suit le pointeur sur toute la carte (fond, cadre et illustration). Image : `holo-integrale.webp`, repli holo puis commune (mets à jour la règle de repli dans AGENTS.md).
> 4. Ajoute la finition partout où les finitions sont listées : galerie, page d'admin, collection (filtres), boutique, probabilités, historique, révélation (même effet que holo, avec la lueur).
> 5. Tests : les deux tables totalisent 100 000 ; avec une graine fixe sur 1 000 000 de tirages, chaque fréquence est à moins de 0,2 point de son poids. Lance `npm run simuler` et montre le résultat.

**Terminé quand** : l'écran Probabilités affiche 90 % / 5 % / 1,666 % / 2,572 % / 0,5 % / 0,222 % / 0,04 % pour la 4e carte et 60 % / 20 % / 6,664 % / 10,288 % / 2 % / 0,888 % / 0,16 % pour la 5e.

## 17. Raretés fixes par carte (système TCG Pocket)

Avant : remplace dans ton projet `docs/GDD-resume.md`, `AGENTS.md` et `src/data/booster-lancement.json` par les nouvelles versions. Place la nouvelle extension à côté de l'ancienne sous le nom `src/data/extension-lancement.v2.json` (ne remplace pas l'ancienne : elle contient peut-être des réglages faits dans la page d'admin).

**À dire à Codex**
> Fais uniquement cette tâche, puis arrête-toi. Relis AGENTS.md et docs/GDD-resume.md (section « Cartes, rareté et cote ») : le modèle change. Chaque carte a désormais une rareté fixe, comme dans Pokémon TCG Pocket.
> 0. Remplace `src/data/extension-lancement.json` par `src/data/extension-lancement.v2.json`, en reportant dans les `personnages` toute modification faite depuis la page d'admin dans l'ancien fichier (élément, PV, attaques, cadrage : le cadrage va sur la carte de base du personnage). Montre-moi la liste des différences reportées, puis supprime le fichier v2. Le nouveau fichier contient `personnages` (100, avec PV et attaques) et `cartes` (140 : id, numero, personnage, finition, secrete). `src/data/booster-lancement.json` n'a plus de `rangs` : chaque table ne contient que des `finitions`.
> 1. Types et validation : adapte `types.ts` (Personnage, Carte, Extension, TableEmplacement sans rangs) et `validation.ts` (chaque carte référence un personnage existant ; numéros uniques de 1 à 140 ; chaque finition avec un poids non nul dans une table a au moins une carte ; tables à 100 000).
> 2. Tirage (`tirage.ts`) : pour chaque emplacement, tirer une finition dans la table, puis une carte de cette finition à poids égaux. Plus aucun tirage de rang ni de finition par personnage. `npm run simuler` affiche en plus la fréquence d'une carte précise par rareté.
> 3. Sauvegarde : passe à la version 2. La collection compte les exemplaires par id de carte. Migration depuis la version 1 : garder les sceaux, les points et l'historique ; pour chaque exemplaire possédé, s'il existe une carte du même personnage dans la même finition, la convertir ; sinon convertir l'exemplaire en points de booster au prix de la boutique de sa finition.
> 4. Rendu et images : une image par carte, `public/cartes/<id-carte>/illustration.webp` (ou `perso.webp` + `fond.webp` pour alternative et immersive). Repli : carte secrète sans image → image de la carte de base du même personnage → visuel de remplacement. Les cartes secrètes affichent « 127/100 ».
> 5. Page d'admin : liste des 140 cartes (filtre base / secrètes, par rareté), un emplacement d'image par carte (deux pour alternative et immersive), même aperçu en direct et même enregistrement qu'avant. Les images existantes rangées par finition restent lisibles le temps de les déplacer : ajoute un bouton « Migrer les anciennes images » qui copie `public/cartes/<id>/<finition>.webp` vers la carte correspondante quand elle existe.
> 6. Collection, boutique, probabilités, draft, cote : tout passe par l'id de carte. La collection affiche 140 emplacements (secrètes après les 100 de base). La boutique vend chaque carte au prix de sa rareté. La cote = popularité du personnage × multiplicateur de la rareté.
> 7. Tests à jour pour tout ça, `npm run typecheck` et `npm test` sans erreur.

**Terminé quand** : la collection montre 140 cartes ; ouvrir des boosters ne donne jamais une rareté qu'une carte n'a pas (par exemple jamais de Himeno ♦♦) ; une ancienne sauvegarde se charge sans perte de sceaux ni de points.

## 18. Refonte visuelle : cartes de base et accueil

Avant : décompresse `refonte-accueil-cartes.zip` dans `docs/reference/refonte/`.

**À dire à Codex**
> Fais uniquement cette tâche, puis arrête-toi. Refonte visuelle d'après les maquettes de `docs/reference/refonte/` : les `.dc.html` sont des maquettes, n'en reprends que le HTML et les styles inline (ignore `support.js`, `<x-dc>`, `sc-for` et le script `DCLogic`).
> 1. Cartes (`src/ui/carte.ts`) : reprends le rendu de `Carte.dc.html` pour les raretés ♦ à ♦♦♦♦ : fond sombre teinté par l'élément, filigrane, pastille d'élément avec icône SVG, coûts en pastilles, cadre selon la rareté (graphite, acier, acier + holo sur l'illustration, argent + holo sur toute la carte). Le holo suit la souris comme avant. Mets les couleurs et les icônes des éléments dans `src/core/regles.ts`. Ne touche pas aux cartes ★ et plus.
> 2. Accueil : reprends `Main.dc.html` sur ordinateur : barre du haut avec la navigation, les sceaux, les points et un bouton Paramètres qui ouvre la sauvegarde (export/import), puis trois colonnes (largeur max 1760 px, aucune marge vide sur les côtés). Au-dessous de 1100 px, passe à deux colonnes ; au-dessous de 700 px, reprends `Mobile.dc.html` (une colonne, barre d'onglets fixe en bas).
> 3. Toutes les données affichées viennent de la sauvegarde et des JSON. Rien n'est écrit en dur.
> 4. Utilise les variables de `tokens.css` et ajoute celles qui manquent. Respecte `prefers-reduced-motion`. `npm run typecheck` et `npm test` doivent passer.

**Terminé quand** : la galerie montre les 4 cartes de base comme dans `Cartes.dc.html` ; sur un écran de 1920 px, l'accueil occupe toute la largeur en trois colonnes ; sur téléphone (375 px), une colonne avec la barre d'onglets en bas.

## 19. Quêtes, calendrier de bienvenue et sceaux

Avant : remplace `docs/GDD-resume.md` par la nouvelle version (section Économie) et place `src/data/quetes.json` (tous les réglages des quêtes, déjà remplis).

**À dire à Codex**
> Fais uniquement cette tâche, puis arrête-toi. Lis la section Économie de docs/GDD-resume.md.
> 1. `src/data/quetes.json` est déjà rempli (réserve de quêtes du jour, quêtes de débutant, calendrier de bienvenue, hebdomadaire, calendrier de lancement d'extension). Utilise-le tel quel, sans changer les chiffres ; ajoute seulement sa validation au démarrage.
> 2. `src/core/quetes.ts` (logique pure, testée) : tirage des 3 quêtes du jour avec la graine de la date (les mêmes pour tous), suivi de la progression à partir des événements du jeu (booster ouvert, carte obtenue avec sa rareté et sa série, carte inspectée, échange en boutique, doublon revendu, cote consultée, draft joué), récompenses réclamées une seule fois. Le calendrier de bienvenue avance d'un jour par jour joué (pas par jour calendaire). Plafond de 10 uniquement sur les sceaux de connexion.
> 3. Booster garanti : le tout premier booster et celui du 7e jour du calendrier ont une carte ★ ou plus en 5e position (tirée dans la table exceptionnelle). C'est un tirage normal par ailleurs, et il passe par `tirage.ts`.
> 4. Sauvegarde : ajoute l'état des quêtes et du calendrier (migration de version, sans perte).
> 5. Interface : sur l'accueil, colonne de gauche, un bloc « Quêtes du jour » (3 lignes avec barre de progression et bouton Réclamer), le calendrier de bienvenue tant qu'il n'est pas fini (7 cases), et un écran « Quêtes » avec les quêtes de débutant. Même style que la refonte.
> 6. `npm run simuler` : ajoute un mode qui simule 500 joueurs sur 365 jours (assidu et occasionnel) avec ces règles et affiche les jours médians pour : 100 cartes de base, première ★★, ★★★ et ♛.
> 7. Tests, `npm run typecheck` et `npm test` sans erreur.

**Terminé quand** : un nouveau joueur ouvre une dizaine de boosters le premier jour ; les quêtes du jour sont les mêmes dans deux navigateurs ; une récompense ne se réclame qu'une fois ; une ancienne sauvegarde se charge sans perte.

## 20. Plusieurs extensions et mini-extension Renforts

Avant : place `extension-renforts.json` et `booster-renforts.json` dans `src/data/`.

**À dire à Codex**
> Fais uniquement cette tâche, puis arrête-toi. Le jeu doit gérer plusieurs extensions. Nouvelle mini-extension : `src/data/extension-renforts.json` (24 personnages, 32 cartes, ids `ren-xxx`) et `src/data/booster-renforts.json` (mêmes taux que Lancement).
> 1. `src/data/extensions.json` : liste des extensions dans l'ordre, avec pour chacune son fichier, son booster et une date de sortie (`disponibleLe`, format AAAA-MM-JJ). Une extension n'apparaît qu'à partir de sa date (mets Renforts à aujourd'hui pour tester).
> 2. Validation : chaque extension et chaque booster sont validés comme Lancement ; ids de cartes et de personnages uniques entre toutes les extensions.
> 3. Accueil : un sélecteur de booster dans la scène centrale (flèches et vignettes des boosters disponibles ; sur téléphone, un glissé horizontal avec un équivalent en boutons). Le booster Renforts a sa propre couleur d'accent et son nom ; même monogramme K.
> 4. Points de boutique, collection, probabilités, historique : par extension (onglets ou filtre). La boutique de Renforts utilise les points Renforts.
> 5. Calendrier de lancement d'une extension : à sa sortie, 7 jours de récompenses (2, 2, 1, 1, 1, 1, 2 sceaux), réglés dans `src/data/quetes.json`, avec un bandeau sur l'accueil.
> 6. Images : `public/cartes/ren-xxx/…`, même règle que Lancement ; la page d'admin propose de choisir l'extension.
> 7. Draft et cote incluent toutes les extensions sorties. Tests, `npm run typecheck` et `npm test` sans erreur.

**Terminé quand** : on peut choisir entre Lancement et Renforts à l'accueil ; ouvrir Renforts ne donne que des cartes `ren-xxx` ; les points et la collection sont séparés par extension.

## 21. Popularité hebdomadaire depuis l'admin

Avant : remplace `docs/GDD-resume.md` (section Cote) et place `src/data/popularite-base.json`.

**À dire à Codex**
> Fais uniquement cette tâche, puis arrête-toi. Lis la section Cote de docs/GDD-resume.md.
> 1. `src/core/popularite.ts` (logique pure, testée) : calcul de la semaine suivante à partir de la base, de l'ajustement précédent (× 0,7, arrondi) et des coups de pouce (série ou personnage, valeurs autorisées −5, +5, +10, +15), borné entre 1 et 100. Un personnage qui n'a pas encore d'ajustement part de 0.
> 2. `src/data/popularite.json` : nouveau format (semaine courante et précédente ; pour chaque personnage, popularité et ajustement). Migration automatique de l'ancien fichier : la semaine courante devient la base + 0.
> 3. Admin, nouvel onglet « Popularité » : la semaine à publier, la liste des séries avec des boutons −5 / +5 / +10 / +15, une recherche pour donner un coup de pouce à un personnage, un aperçu avant publication (nouvelle popularité, flèche, plus fortes hausses et baisses), puis « Publier la semaine ». La publication écrit `popularite.json` via le plugin d'admin (avec sauvegarde de l'ancien fichier), refuse de publier deux fois la même semaine, et propose « Publier sans actualité » en un clic.
> 4. Validation : chaque personnage des vagues sorties a une base ; valeurs entre 1 et 100.
> 5. Tests, `npm run typecheck` et `npm test` sans erreur.

**Terminé quand** : en 3 clics (+10 sur une série, aperçu, publier), la cote des cartes de cette série monte dans le jeu et les flèches de tendance s'affichent ; la semaine suivante sans coup de pouce, elle redescend d'environ 30 % de l'écart.

## 22. Préparer la mise en ligne (Cloudflare Pages)

**À dire à Codex**
> Fais uniquement cette tâche, puis arrête-toi. Le jeu sera hébergé gratuitement sur Cloudflare Pages, déployé automatiquement à chaque `git push` sur GitHub.
> 1. Build : vérifie que `npm run build` ne contient ni l'admin, ni le plugin d'admin, ni `sauvegardes-admin/`, ni `docs/`. Liste ce que contient `dist/` et sa taille.
> 2. Images : signale les cartes de la vague 1 sans image. Crée `npm run images`, qui réduit les images trop lourdes (hauteur max 1400 px, WebP qualité 85) en gardant les originaux dans un dossier ignoré par git. Aucune image au-dessus de 2 Mo. Chargement à la demande, sauf les cartes du booster qu'on vient d'ouvrir, préchargées pendant l'animation.
> 3. Ajoute `public/_headers` (cache long pour les images et les fichiers versionnés, pas de cache pour `index.html`) et un `.gitignore` complet (node_modules, dist, sauvegardes-admin, originaux d'images, fichiers `.env`).
> 4. Écris `docs/DEPLOIEMENT.md` : comment créer le dépôt GitHub, le relier à Cloudflare Pages (commande `npm run build`, dossier `dist`, version de Node), et le cycle de mise à jour (admin en local → `git push` → site mis à jour).
> 5. Une nouvelle version publiée se charge sans perdre la sauvegarde (la migration s'applique).
> 6. Vérifie avec `npm run preview` dans Chrome à 1440 px et 375 px. `npm run typecheck` et `npm test` sans erreur.

## 23. Comptes et sauvegarde en ligne (Supabase)

Avant : crée un projet gratuit sur supabase.com, et une application Discord (portail développeur Discord) pour la connexion ; suis `docs/SUPABASE.md` que Codex écrira à l'étape 1.

**À dire à Codex**
> Fais uniquement cette tâche, puis arrête-toi. On ajoute des comptes et une sauvegarde en ligne avec Supabase (offre gratuite). J'autorise la dépendance `@supabase/supabase-js`.
> 1. Écris d'abord `docs/SUPABASE.md` : ce que je dois créer et où (projet, connexion Discord, adresses de redirection pour le local et pour le site Cloudflare, variables `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans un `.env` local et dans Cloudflare Pages). Arrête-toi et attends que je confirme que c'est fait.
> 2. Base de données, dans `supabase/migrations/` (SQL versionné) : table `profils` (id = utilisateur, pseudo unique de 3 à 20 caractères, date de création) et table `sauvegardes` (utilisateur, données JSON, version, date de mise à jour). Row Level Security : chacun ne lit et n'écrit que ses propres lignes ; les pseudos sont lisibles par tous.
> 3. Connexion avec Discord. Le jeu reste jouable sans compte (sauvegarde locale) ; un bouton « Se connecter » dans la barre du haut et dans Paramètres. Au premier login : choix du pseudo.
> 4. Synchronisation : la sauvegarde locale reste la référence pendant la partie, elle est envoyée en ligne après chaque opération (regroupée, au plus une fois toutes les 5 secondes) et au moment de quitter. À la connexion : si une seule des deux existe, on la garde ; si les deux existent, on propose de choisir (avec date, nombre de cartes et de boosters de chacune). Hors ligne, le jeu continue et synchronise au retour du réseau.
> 5. Aucune clé secrète dans le code du jeu (seule la clé publique `anon` est autorisée).
> 6. Tests de la logique de synchronisation (sans réseau), `npm run typecheck` et `npm test` sans erreur. Vérifie le scénario : je joue sur ordinateur, je me connecte sur téléphone, je retrouve ma collection.

## 24. Classement du draft

**À dire à Codex**
> Fais uniquement cette tâche, puis arrête-toi. Classement hebdomadaire du draft, vérifié par le serveur pour éviter la triche.
> 1. Table `drafts` (utilisateur, semaine, 5 cartes, score, détail, date). Lecture : tout le monde (pseudo, score, cartes). Écriture : uniquement par la fonction ci-dessous.
> 2. Fonction Supabase (Edge Function) `soumettre-draft` : recalcule les 15 cartes de la semaine à partir de la graine, vérifie que les 5 cartes en font partie et sont différentes, recalcule le score avec le même code que le jeu (réutilise `src/core`, qui ne dépend pas du DOM) et enregistre. Une équipe peut être modifiée jusqu'au dimanche 23 h 59 (heure de Paris) ; après, la semaine est fermée.
> 3. Écran « Classement » : la semaine en cours (rang, pseudo, score, cartes au survol ou au toucher), ma position mise en avant, et les semaines passées. Accessible depuis le draft et la navigation.
> 4. Récompenses de fin de semaine (dans `quetes.json`) : 1er +5 sceaux, 2e +4, 3e +3, puis +2 pour toute participation (remplace la récompense actuelle). Réclamées une seule fois, via une fonction serveur qui lit le classement figé.
> 5. Sans compte, le draft reste jouable mais hors classement, avec une invitation à se connecter.
> 6. Tests (validation des 5 cartes, recalcul du score, fermeture de la semaine), `npm run typecheck` et `npm test` sans erreur.
