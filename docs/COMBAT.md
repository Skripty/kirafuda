# Kirafuda — règles du combat et des decks

Référence pour coder le combat. Version complète et discussions : GDD, onglet « Combat et decks ». Les chiffres des cartes sont des valeurs de départ, à équilibrer par simulation.

## Principe

Deux joueurs. Chacun a un personnage **actif** et jusqu'à **3 personnages sur le banc**. On gagne **1 point** en mettant K.-O. un Base adverse, **2 points** pour un Éveillé. Le premier à **3 points** gagne. On gagne aussi si l'adversaire n'a plus aucun personnage en jeu.

La rareté ne change rien : toutes les cartes d'un même personnage ont la même fiche (`src/data/fiches-combat.json`).

## Base et Éveillé

| Type | Rangs | Entrée en jeu | Points si K.-O. |
| --- | --- | --- | --- |
| Base | C, B | Posé depuis la main, sur le banc ou en actif | 1 |
| Éveillé | A, S | Uniquement par **Relève** | 2 |

**Relève** : un Éveillé remplace un de tes personnages en jeu **de la même série**, qui est en jeu depuis le début de ton tour (posé à un tour précédent). L'Éveillé garde les énergies attachées, les dégâts et la position (actif ou banc) du personnage remplacé ; les états sont retirés. Le personnage remplacé va à la défausse. Pas de Relève au premier tour de chaque joueur. Exception : talent « Roi des fléaux » de Sukuna.

## Mise en place

1. Chaque joueur mélange son deck de 20 cartes et pioche 5 cartes. Une main sans Base : on montre, on remélange, on repioche (garanti : au moins un Base dans la main de départ).
2. Chaque joueur pose un Base face cachée en actif, et jusqu'à 3 Bases sur le banc.
3. Pile ou face : le gagnant choisit de commencer ou non.

## Tour

1. Piocher 1 carte (si le deck est vide : on ne pioche pas, sans pénalité).
2. La zone d'énergie produit 1 énergie, tirée au hasard parmi les 1 à 3 éléments du deck. Le premier joueur n'en reçoit pas à son premier tour. L'énergie non attachée ce tour est perdue.
3. Dans l'ordre voulu :
   - attacher l'énergie à un de ses personnages (une fois par tour) ;
   - poser des Bases sur le banc (3 maximum) ;
   - faire des Relèves ;
   - jouer des **Objets** (autant que voulu), **un Soutien**, **un Terrain** ;
   - utiliser les talents « une fois par tour » ;
   - se replier une fois : défausser autant d'énergies de l'actif que son Repli, puis l'échanger avec un personnage du banc.
4. Attaquer avec l'actif (optionnel), ce qui termine le tour. Le premier joueur ne peut pas attaquer à son premier tour.
5. Entre les tours : appliquer Brûlure, puis les effets « à la fin de chacun de tes tours », vérifier les K.-O.

Quand l'actif est mis K.-O., son propriétaire choisit un remplaçant sur le banc. S'il n'en a pas, il perd.

## Énergies et coûts

Éléments : feu, eau, glace, foudre, vent, terre, lumière, ténèbres, neutre. Coûts dans les fiches : `f` Feu, `e` Eau, `g` Glace, `z` Foudre, `v` Vent, `t` Terre, `l` Lumière, `n` Ténèbres, `q` énergie quelconque (◇). Il n'y a pas d'énergie « neutre » : les personnages Neutres paient en ◇.

## Dégâts

Ordre de calcul d'une attaque : dégâts de base → bonus de l'attaque et des talents de l'attaquant → **Faiblesse +20** → réductions et boucliers de la cible (sauf effet « ignore les boucliers ») → minimum 0. Les dégâts au banc ne prennent pas la Faiblesse.

Faiblesses : Feu faible à Eau, Eau à Foudre, Foudre à Terre, Terre à Vent, Vent à Glace, Glace à Feu, Lumière à Ténèbres, Ténèbres à Lumière, Neutre sans faiblesse.

## États (sur l'actif ; retirés quand il va sur le banc)

| État | Effet |
| --- | --- |
| Brûlure | 10 dégâts entre chaque tour |
| Gel | Ne peut ni attaquer ni se replier au prochain tour de son propriétaire, puis disparaît |
| Étourdi | Pour attaquer, lancer une pièce : pile, l'attaque échoue. Disparaît à la fin du prochain tour de son propriétaire |
| Malédiction | La prochaine attaque subie fait +20, puis disparaît |

Un personnage peut avoir plusieurs états différents.

## Cartes Soutien

| Type | Règle |
| --- | --- |
| Objet | Autant que voulu par tour |
| Soutien | Un seul par tour, pas au premier tour du premier joueur |
| Terrain | Un seul en jeu pour les deux joueurs ; un nouveau remplace l'ancien ; on ne peut pas jouer un Terrain du même nom que celui en jeu |

Liste de départ : `src/data/soutiens.json`. Dans les boosters : Objets en ♦, Soutiens en ♦♦, Terrains en ♦♦♦, tirés avec les personnages de la même rareté.

## Decks

- 20 cartes, au moins 1 Base.
- 2 exemplaires maximum d'un même personnage, toutes raretés confondues.
- 2 exemplaires maximum d'une même carte Soutien.
- 1 à 3 éléments d'énergie choisis par le joueur.
- On ne joue que les cartes possédées. Exception : les **decks de départ**, jouables par tous sans posséder les cartes.
- Jusqu'à 10 decks enregistrés (nom, carte de couverture).

## Modes

1. Combat contre l'IA (premier objectif).
2. Combat entre amis (plus tard, via Supabase).
3. Le draft actuel ne change pas pour l'instant.
