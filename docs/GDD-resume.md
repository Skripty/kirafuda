# Kirafuda — résumé du GDD (version 1)

Référence complète : le GDD « Kirafuda — GDD de la version 1 » et la « Spécification du système d'invocation par boosters » (documents claude.ai). Ce résumé contient tout ce qu'il faut pour coder la version 1.

## Statut

Projet personnel, gratuit, non commercial. Aucun paiement, aucune publicité. Version 1 locale, sans serveur.

## Cartes, rareté et cote (système TCG Pocket)

**Chaque carte de l'extension a une seule rareté, fixe.** Un personnage peut avoir plusieurs cartes distinctes (sa carte de base, parfois des versions rares), chacune avec son numéro et son image. Données : `src/data/extension-lancement.json` contient `personnages` (100, avec PV et attaques) et `cartes` (140, chacune = un personnage + une `finition` qui est sa rareté).

| Notion | Valeurs | Rôle |
| --- | --- | --- |
| Rang du personnage | C, B, A, S | Décide de la rareté de sa carte de base (C ♦, B ♦♦, A ♦♦♦, S ♦♦♦♦) et des versions rares qu'il reçoit. N'intervient plus dans le tirage. |
| Rareté de la carte (`finition`) | commune ♦, peu-commune ♦♦, holo ♦♦♦, holo-integrale ♦♦♦♦, pleine ★, alternative ★★, immersive ★★★, couronne ♛ | Fixée par carte. Probabilité de tirage, visuel, multiplicateur de cote. |
| Cote | nombre | Popularité de la semaine du personnage (0 à 100) × multiplicateur de la rareté. |

- Cartes 001 à 100 : une carte de base par personnage. Cartes 101 à 140 : **cartes secrètes** (★ et plus), affichées « 127/100 ».
- Toutes les cartes d'un personnage ont les mêmes PV et attaques. Aucune notion ne change la puissance.
- La collection compte les exemplaires **par carte** (id `lan-xxx`).

## Éléments

9 éléments (voir `src/core/regles.ts`). Faiblesses : Feu ← Eau ← Foudre ← Terre ← Vent ← Glace ← Feu ; Lumière et Ténèbres faibles l'une contre l'autre ; Neutre sans faiblesse.

## Cartes

- Mise en page Pokémon : en-tête (nom, PV, pastille d'élément), fenêtre d'illustration (~40 % de la carte), ligne de série, deux attaques (coût en pastilles, nom, dégâts), pied (faiblesse, numéro « 041/100 », symbole de finition, rang).
- Finitions ★ et plus : illustration pleine carte, texte sur panneaux translucides.
- Alternative et immersive : personnage détouré (`perso`) sur un fond (`fond`, généré si absent). Immersive : parallaxe entre les calques, film holo animé, particules.
- Holo intégrale (♦♦♦♦) : mise en page fenêtre, cadre argenté, film holo sur toute la carte (fond, cadre, illustration).
- Couronne : toute la carte en monochrome doré.
- Images : une par carte, `public/cartes/<id-carte>/illustration.webp` ; pour ★★ et ★★★ : `perso.webp` + `fond.webp`. Repli : une carte secrète sans image reprend l'image de la carte de base du même personnage, puis un visuel de remplacement.

## Attaques

Chaque carte a une attaque légère (coût 1) et une forte (coût 2 ou 3), déjà dans `src/data/extension-lancement.json`. Réserves complètes : `src/data/attaques.json`. Les effets ne servent qu'au futur combat ; en version 1 on les affiche seulement.

## Boosters (voir `src/data/booster-lancement.json`)

- 5 cartes. Chaque emplacement tire **une rareté** dans sa table, puis **une carte** de cette rareté parmi les cartes de l'extension (poids égaux).
- Emplacements 1 à 3, 4 et 5 ont des tables distinctes. Raretés des emplacements 4 et 5 = taux exacts de Pokémon TCG Pocket :

| Finition | Emplacement 4 | Emplacement 5 |
| --- | --- | --- |
| peu-commune ♦♦ | 90 000 | 60 000 |
| holo ♦♦♦ | 5 000 | 20 000 |
| holo-integrale ♦♦♦♦ | 1 666 | 6 664 |
| pleine ★ | 2 572 | 10 288 |
| alternative ★★ | 500 | 2 000 |
| immersive ★★★ | 222 | 888 |
| couronne ♛ | 40 | 160 |
| **Total** | 100 000 | 100 000 |

- Emplacements 1 à 3 : commune 100 000. Booster exceptionnel : 50 / 100 000 (0,05 %), toutes ses cartes dans la table exceptionnelle (★ 55 %, ★★ 30 %, ★★★ 12 %, ♛ 3 %).
- Coût : 1 sceau. +5 points de l'extension par ouverture.

## Ouverture (états)

`HUB → PRESENTATION → BOOSTER_PRET → DECHIRURE → OUVERT → PILE ⇄ REVELATION → REVELEE → RESULTATS`

- Le résultat est tiré et sauvegardé **avant** `PRESENTATION`.
- Booster : inclinaison légère (±15° horizontal, ±8° vertical) et parallaxe. Déchirure : glisser sur la bande du haut, validée à 75 % de la largeur.
- Pile : toucher la carte du dessus pour la retourner (600 ms). Carte révélée : pivot horizontal seulement (±10°). Lancer ou toucher pour passer à la suivante ; seule la carte du dessus bouge.
- Révélation selon la finition : simple pour commune ; lueur avant retournement dès holo ; tremblement dès pleine ; agrandissement cinématique pour immersive ; écran doré pour couronne.
- Indices : reflet sur le booster si une carte ★ ou plus est présente. Jamais d'indice mensonger.
- Bouton « Tout révéler » à tout moment.

## Économie

- Sceaux (1 sceau = 1 booster), gagnés uniquement en jouant :
  - connexion quotidienne : 2 par jour, au premier lancement de la journée (stock de connexion plafonné à 10 ; les autres récompenses ne sont pas plafonnées) ;
  - quêtes du jour : 3 par jour, tirées dans une réserve avec la graine du jour (les mêmes pour tous) ; les 3 faites = +1 sceau ;
  - calendrier de bienvenue, les 7 premiers jours : J1 4, J2 3, J3 3, J4 2, J5 2, J6 2, J7 4. Le tout premier booster et le booster du J7 garantissent une carte ★ (exactement ★) en 5e position ;
  - quêtes de débutant (une seule fois) : premier booster +2, 30 boosters ouverts +2, inspecter une carte +1, un échange en boutique +1, 25 cartes +1, 75 cartes +2, une série complète +2, 3 drafts joués +2 ;
  - hebdomadaire : participation au draft +2, quête de la semaine +1 ;
  - revente de doublons.
- Rythme visé : une dizaine de boosters le premier jour, une première semaine riche, puis 2 à 3 boosters par jour hors événement.
- Points de booster : par extension, sans expiration. Boutique de points : chaque carte a un prix selon sa rareté (commune 35, peu-commune 70, holo 150, holo-integrale 500, pleine 400, alternative 1250, immersive 1500, couronne 2500).
- Doublons conservés. Revente d'un exemplaire en trop d'une carte contre des sceaux, selon sa cote (taux à équilibrer). Le premier exemplaire d'une carte n'est jamais revendu sans confirmation.

## Cote

- Popularité d'un personnage (1 à 100) = base + ajustement de la semaine.
  - Base : `src/data/popularite-base.json`, fixée une fois pour toutes.
  - Chaque lundi : ajustement = Math.trunc(ajustement précédent × 0,7) (arrondi vers zéro), puis on ajoute les coups de pouce de la semaine. Résultat borné entre 1 et 100. Sans coup de pouce, +10 donne 7, 4, 2, 1, 0 ; −5 donne −3, −2, −1, 0.
  - Coups de pouce, sur une série entière ou un personnage : +5 (épisode ou chapitre marquant), +10 (nouvelle saison, film, fin d'arc), +15 (événement majeur) ; −5 sur une série en pause depuis longtemps.
- Fichier `src/data/popularite.json` : semaine courante et précédente (popularité et ajustement par personnage), généré par l'admin, jamais écrit à la main.
- Cote d'un exemplaire = popularité × multiplicateur de rareté. Flèche de tendance par rapport à la semaine précédente.
- Valeur totale de la collection et « plus fortes hausses de la semaine » à l'accueil.

## Draft hebdomadaire (solo en version 1)

- Une graine par semaine : tout le monde ouvre les mêmes 3 boosters de draft (15 cartes) et en garde 5.
- Score déterministe : puissance (PV + dégâts), respect du thème de la semaine, synergies (même série, éléments complémentaires, pas de faiblesse partagée), défi (adversaire d'un élément donné).
- Détail des points affiché. Récompense en sceaux.

## Hors version 1

Combat, serveur et comptes, classements en ligne, Wonder Pick, échanges, ouverture ×10, son.
