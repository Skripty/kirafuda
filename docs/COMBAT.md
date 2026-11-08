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

## Moteur (tâche 26)

Code : `src/core/combat/` — `moteur.ts` (création de la partie, actions légales, application d'une action → nouvel état + journal), `etat.ts` (état sérialisable, aléatoire par graine), `effets.ts` (vocabulaire des effets), `ia.ts` (IA de simulation), `decks.ts` (decks de série générés). Chaque attaque, talent et carte Soutien porte un champ `effets` écrit dans ce vocabulaire (`src/data/fiches-combat.json`, `src/data/soutiens.json`) ; après une modification des fiches : `npm run fiches`. Simulation : `npm run simuler -- combat`.

### Interprétations retenues

Textes ambigus des fiches, et choix faits par le moteur (à corriger dans les données ou ici si une autre lecture est voulue) :

- **Dégâts hors attaque** (Brûlure, talents de Geto, Reze, Luffy, Kunai, dégâts à soi, Poing divergent) : fixes, sans bonus, Faiblesse, réduction ni bouclier.
- **Bonus** : une attaque qui fait 0 (Chaos sur pile, Rafale sans face, attaques de soin) reste à 0, les bonus ne s'ajoutent pas.
- **Malédiction (+20) et « Trahison » de Rachel (+10)** : comptées avec les bonus, avant les réductions ; seulement sur l'actif, seulement pour les attaques.
- **Boucliers et réductions** : un *bouclier* est temporaire (« jusqu'à ton prochain tour » : Talisman, Titan Cuirassé, Garde de fer, Durcissement) ; une *réduction* vient d'un talent permanent (Stark, Infini, Lien Ackerman, Titan Féminin, Thorfinn, Calme plat, Igris, Himmel, Lee Hyunsung). Chidori ignore les boucliers seulement ; Zoltraak, Reelseiden et Lance inverse céleste ignorent les deux.
- **Pièces** : « pile : +X » (Black Flash, Quanxi, Thorfinn, Aira) réussit sur pile ; Chaos fait 50 sur face ; Rafale compte les faces ; Pochita sauve Denji sur face. Pile ou face à 50 %.
- **Sharingan, Mode Turbo** : à la première attaque subie à chaque tour adverse (y compris une attaque de zone ou au banc), sur pile, toute l'attaque échoue contre lui (ni dégâts ni effet).
- **Poing divergent** : les 30 dégâts supplémentaires tombent entre les tours, juste après le tour de l'attaque, si la cible est encore en jeu.
- **Sanctuaire malveillant** : « défausse toutes ses énergies » = celles de Sukuna. Démantèlement et Poing à distance : la Faiblesse ne compte pas au banc.
- **Bleu** : c'est l'adversaire qui choisit son nouvel actif ; l'ancien va sur le banc (ses états sont retirés).
- **Roi des fléaux** : Sukuna peut relever Itadori entré ce tour-ci, mais pas au premier tour du joueur (règle générale).
- **Multiclonage** : aucun Base de Naruto n'existe encore (vague 3) ; l'effet ne trouve rien. La série Naruto n'a donc pas de deck possible pour l'instant.
- **Genjutsu des corbeaux** : Itachi doit être en jeu ; le personnage qui entre n'est Étourdi que s'il entre en actif (les états ne vont que sur l'actif).
- **Contrôle (Makima)** : retire la dernière énergie attachée. **Durcissement (Eren)** : défausse la dernière énergie attachée.
- **Manœuvre tridimensionnelle, Dribble du monstre** : l'échange après l'attaque est facultatif (le joueur peut garder son actif).
- **Démon de la Guerre (Asa)** : le bonus ne vaut que pour la prochaine attaque de ce tour, puis disparaît.
- **Consacrez vos cœurs, Roi, Entraîneur** : +10 par personnage portant ce talent en jeu (actif ou banc), pour tes autres personnages de sa série.
- **Je n'ai pas d'ennemis** : « ton tour précédent » = le tour précédent de son propriétaire.
- **Retraité (Sakamoto)** : les points sont comparés au moment de l'attaque. À égalité de points, Sakamoto ne peut jamais mettre K.-O. (risque de partie bloquée si l'adversaire ne peut pas le battre : à surveiller à l'équilibrage).
- **Irrégulier (Bam)** : retire un ◇ du coût ; sans effet sur une attaque sans ◇.
- **Archéologue, Repérage** : les cartes non gardées vont sous le deck dans l'ordre où elles étaient (Repérage : « dans l'ordre de ton choix » simplifié). Baratin et Méta-vision : le joueur choisit l'ordre.
- **Stratège de la Tour (Khun), Informateur (Franky)** : la carte rendue (sous le deck ou défaussée) est choisie automatiquement : une carte Soutien de la main s'il y en a, sinon la carte piochée.
- **Arise** : le Base revient sur le banc avec 30 PV restants (place sur le banc nécessaire).
- **Chef mercenaire (Askeladd)** : Askeladd doit déjà être en jeu ; tout Base de Vinland Saga posé (depuis la main, le deck ou la défausse) fait piocher.
- **Régression (Yoo)** : le K.-O. compte quand même (points) ; la carte est remélangée dans le deck.
- **Magie du temps (Nikaido)** : une fois par partie, soigne les dégâts subis pendant le dernier tour adverse.
- **Relique maudite** : « 1 énergie Ténèbres de ta zone » = une énergie Ténèbres en plus, seulement si Ténèbres fait partie des éléments du deck, sur un personnage Ténèbres, qui subit 10.
- **Pierre d'énergie** : une énergie en plus (tirée parmi les éléments du deck) sur un personnage du banc, puis défausse d'une carte de la main ; une Pierre par tour.
- **Terrains** : Mur Maria et Mont Sagiri valent pour les deux joueurs ; Mont Sagiri soigne entre chaque tour. Un Terrain remplacé va dans la défausse de son propriétaire.
- **Gel, Étourdi** : disparaissent à la fin du prochain tour de leur propriétaire. Étourdi : la pièce est lancée avant tout le reste de l'attaque.
- **Pile ou face du début** : le gagnant choisit de commencer ou non (les IA de simulation choisissent de commencer).
