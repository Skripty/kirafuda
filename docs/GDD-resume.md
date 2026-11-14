# Kirafuda — résumé du GDD (version 1)

Référence complète : le GDD « Kirafuda — GDD de la version 1 » et la « Spécification du système d'invocation par boosters » (documents claude.ai). Ce résumé contient tout ce qu'il faut pour coder la version 1.

## Statut

Projet personnel, gratuit, non commercial. Aucun paiement, aucune publicité. Le jeu est jouable sans compte, avec une sauvegarde locale. Un compte Discord, facultatif, ajoute la sauvegarde en ligne et le classement du draft (voir « Comptes et sauvegarde en ligne »).

## Cartes, rareté et cote (système TCG Pocket)

**Chaque carte de l'extension a une seule rareté, fixe.** Un personnage peut avoir plusieurs cartes distinctes (sa carte de base, parfois des versions rares), chacune avec son numéro et son image. Données : `src/data/extension-lancement.json` contient `personnages` (100, avec leurs données de combat : type, PV, Repli, talent, attaques) et `cartes` (140, chacune = un personnage + une `finition` qui est sa rareté).

L’extension Lancement sort en **vagues** qui rejoignent le même booster à leur date (`src/data/extensions.json`) : Lancement (140 cartes, 2026-11-01), Renforts (32 cartes, 2026-11-06), Vague 3 (8 cartes de base de Naruto et One Piece, 2026-11-13, `extension-vague3.json`). Les ids ne changent jamais ; chaque vague après la première a un calendrier de sortie de 7 jours.

| Notion | Valeurs | Rôle |
| --- | --- | --- |
| Rang du personnage | C, B, A, S | Décide de la rareté de sa carte de base (C ♦, B ♦♦, A ♦♦♦, S ♦♦♦♦) et des versions rares qu'il reçoit. N'intervient plus dans le tirage. |
| Rareté de la carte (`finition`) | commune ♦, peu-commune ♦♦, holo ♦♦♦, holo-integrale ♦♦♦♦, pleine ★, alternative ★★, immersive ★★★, couronne ♛ | Fixée par carte. Probabilité de tirage, visuel, multiplicateur de cote. |
| Cote | nombre | Popularité de la semaine du personnage (0 à 100) × multiplicateur de la rareté. |

- Cartes 001 à 100 : une carte de base par personnage. Cartes 101 à 140 : **cartes secrètes** (★ et plus), affichées « 127/100 ».
- Toutes les cartes d'un personnage ont la même fiche de combat (PV, talent, attaques). Aucune notion ne change la puissance.
- La collection compte les exemplaires **par carte** (id `lan-xxx`).

## Éléments

9 éléments (voir `src/core/regles.ts`). Faiblesses : Feu ← Eau ← Foudre ← Terre ← Vent ← Glace ← Feu ; Lumière et Ténèbres faibles l'une contre l'autre ; Neutre sans faiblesse.

## Cartes

- Mise en page Pokémon : en-tête (pastille « Base » ou « Éveillé », série — « Relève : <série> » pour un Éveillé —, nom, PV, icône d'élément), fenêtre d'illustration (~40 % de la carte), bloc Talent (nom + texte) s'il y en a un, 1 ou 2 attaques (coût en icônes d'éléments et ◇ gris pour l'énergie quelconque, nom, effet, dégâts), pied (faiblesse, Repli en ◇, numéro « 041/100 », symbole de finition, rang). Un texte long est écrit plus petit ; l'illustration garde toujours sa taille.
- Finitions ★ et plus : illustration pleine carte, texte sur panneaux translucides.
- Alternative et immersive : personnage détouré (`perso`) sur un fond (`fond`, généré si absent). Immersive : parallaxe entre les calques, film holo animé, particules.
- Holo intégrale (♦♦♦♦) : mise en page fenêtre, cadre argenté, film holo sur toute la carte (fond, cadre, illustration).
- Couronne : toute la carte en monochrome doré.
- Images : une par carte, `public/cartes/<id-carte>/illustration.webp` ; pour ★★ et ★★★ : `perso.webp` + `fond.webp`. Repli : une carte secrète sans image reprend l'image de la carte de base du même personnage, puis un visuel de remplacement.

## Données de combat (voir `docs/COMBAT.md`)

- Chaque personnage a une fiche dans `src/data/fiches-combat.json` (fichier d'équilibrage) : type **Base** (rangs C et B), **Éveillé** (rangs A et S, entre en jeu par Relève sur un personnage de la même série) ou **Héros** (rangs C et B, posé comme un Base, 2 points), PV, Repli (énergies à défausser pour se replier), talent éventuel, 1 ou 2 attaques.
- Coût d'une attaque : 1 à 4 énergies de l'élément du personnage ou ◇ (quelconque) ; un Neutre paie en ◇. Dégâts : un nombre, « 30× » (30 par face), « 50 / 0 » (pile ou face) ou aucun.
- `npm run fiches` recopie les fiches dans les personnages des extensions ; le jeu refuse de démarrer si un personnage sorti n'a pas de données de combat valides.
- Les attaques, talents et cartes Soutien portent aussi des effets structurés (champ `effets`), lus par le moteur de combat.

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
  - hebdomadaire : draft (avec un compte, classement de fin de semaine : 1er +5, 2e +4, 3e +3, puis +2 pour toute participation ; sans compte, +2 tout de suite), quête de la semaine +1 ;
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

## Draft hebdomadaire et classement

- Une graine par semaine : tout le monde ouvre les mêmes 3 boosters de draft (15 cartes) et en garde 5. Les cartes du draft n'entrent pas dans la collection.
- Score déterministe : puissance ((PV + dégâts des attaques) ÷ 10 ; « 30× » compte 45, « 50 / 0 » compte 25, pas de dégâts 0), respect du thème de la semaine, synergies (même série, éléments complémentaires, pas de faiblesse partagée), défi (adversaire d'un élément donné). Détail des points affiché.
- Semaine du lundi 00:00 au dimanche 23:59, heure de Paris. L'équipe peut être modifiée jusqu'à la fermeture ; une modification ne donne pas de nouvelle récompense.
- **Avec un compte** : classement hebdomadaire en ligne (rang, pseudo, score, cartes ; semaines passées consultables). Le serveur recalcule les 15 cartes depuis la graine, vérifie les 5 choisies et recalcule le score avec le code du jeu. À égalité, la première équipe envoyée passe devant.
- Récompenses de fin de semaine (`quetes.json`), réclamées une seule fois d'après le classement figé : 1er +5 sceaux, 2e +4, 3e +3, puis +2 pour toute participation.
- **Sans compte** : draft jouable, hors classement, +2 sceaux de participation tout de suite (une fois par semaine), avec une invitation à se connecter. Ces 2 sceaux sont déduits de la récompense de fin de semaine si le joueur rejoint le classement la même semaine. Une équipe qui n'a pas pu être envoyée avant la fermeture (réseau absent) reçoit la participation sur l'appareil.

## Comptes et sauvegarde en ligne

- Compte facultatif, connexion avec Discord (Supabase). Pseudo unique choisi au premier login (3 à 20 caractères).
- La sauvegarde locale reste la référence pendant la partie. Elle est envoyée en ligne après chaque opération (au plus toutes les 5 secondes) et au départ ; hors ligne, le jeu continue et envoie au retour du réseau.
- À la connexion : si une seule sauvegarde existe (locale ou en ligne), on la garde ; si les deux existent et diffèrent, le joueur choisit (date, cartes, boosters de chacune).
- Seule la clé publique est dans le jeu ; les règles d'accès de la base (Row Level Security) protègent les données. Détails : `docs/SUPABASE.md`.

## Combat, decks et cartes Soutien (règles complètes : `docs/COMBAT.md`)

- Combat contre l'IA : un actif et jusqu'à 3 personnages sur le banc ; 1 point par Base mis K.-O., 2 par Éveillé ou Héros ; 3 points pour gagner (ou l'adversaire n'a plus de personnage en jeu).
- Éveillés (rangs A et S) : entrent en jeu par **Relève** sur un personnage de la même série. Héros (rangs C et B) : se posent depuis la main comme un Base, mais valent 2 points. Énergies : 1 par tour, tirée parmi les 1 à 3 éléments du deck. Faiblesse +20. États : Brûlure, Gel, Étourdi, Malédiction.
- Cartes Soutien (`src/data/soutiens.json`) : Objets (autant que voulu), Soutien (un par tour), Terrain (un seul en jeu).
- Cartes Soutien dans le jeu (tâche 29) : elles appartiennent à l’extension Lancement (`"soutiens": "soutiens.json"` dans `extensions.json`), numérotées « S01/20 » à part des personnages. Un booster les tire avec les personnages de même rareté, à chances égales (Objets ♦, Soutiens ♦♦, Terrains ♦♦♦) ; le draft ne tire que des personnages. Elles se voient dans la Collection (section « Cartes Soutien »), s’échangent en boutique au prix de leur rareté, n’ont ni cote ni revente, et ne comptent ni pour une série ni pour un élément dans les quêtes. Image : `public/cartes/sou-xxx/illustration.webp`, sinon un visuel de remplacement.
- Decks de 20 cartes, au moins 1 Base, 2 exemplaires maximum par personnage et par carte Soutien, 1 à 3 éléments d'énergie ; on ne joue que ses cartes, sauf les decks de départ.
- Deck automatique (constructeur de decks) : le joueur choisit un type (élément) ou une série ; le deck est construit avec ses meilleures cartes possédées de ce type (Bases et Héros d’abord, Éveillés seulement avec un Base de leur série), puis complété par des cartes Soutien. Un deck commencé peut aussi être complété automatiquement. Aucun hasard : même collection, même deck.
- La rareté ne change rien en combat (règle 5). Combat entre joueurs : plus tard.

## Hors version 1

Combat entre joueurs (plus tard, via Supabase), Wonder Pick, échanges, ouverture ×10, son.
