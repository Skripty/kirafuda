# Tâche 31 — Nouveau design des cartes (8 raretés)

## Fichier de référence

`docs/design/cartes-reference.dc.html` est la maquette validée.

- C'est un fichier d'outil de design : la partie HTML entre `<x-dc>` et `</x-dc>` est un gabarit, avec des trous `{{c.xxx}}` et des boucles `<sc-for>` et `<sc-if>`.
- Toutes les valeurs (fonds, dégradés, ombres, effets) sont calculées dans la fonction `renderVals()` du `<script>` en bas du fichier.
- Les fonctions `scene`, `ornements`, `asanoha`, `hishi`, `bruit`, `craquele`, `etincelles` et `poussiere` y génèrent des SVG en data-URI.
- Ne copie pas ce format tel quel : lis-le comme une spécification, puis réimplémente-le dans le composant carte du projet, en TypeScript et en CSS, sans framework, comme le reste du code.
- Le fichier contient deux rangées : la première, « Avec ton illustration », est celle qui sert de référence. La seconde, avec un décor généré, ne sert que de remplissage quand une carte n'a pas encore d'image.
- Les `url('/_blob/…')` sont des fichiers de l'outil de design. Remplace-les par les icônes d'élément déjà présentes dans le projet, et l'image par l'image réelle de la carte.

## Ce qu'il faut faire

1. Trouver le composant qui affiche une carte (collection, ouverture de booster, combat) et le refaire selon la maquette. Il doit y avoir un seul composant, réutilisé partout.
2. Les mesures de la maquette sont pour une carte de 320 × 448. Exprime-les en proportion de la largeur (variables CSS ou `cqw`), pour que la carte s'affiche à n'importe quelle taille.
3. **Structure commune** :
   - cadre de 10 px avec double filet, rangée de perles, coins renforcés, losange en haut, losanges sur les côtés et gemme de rareté en bas au centre (SVG `ornements`) ;
   - au-dessus du nom, l'étiquette du type (Base / Héros / Éveillé) avec la ligne « ↱ Relève : série » ;
   - plaque de nom avec les PV, médaillon d'élément rond en relief ;
   - bannière d'infos (n°, série, rang) ;
   - encart Talent ;
   - attaques avec leur coût dans des creux ronds (◇ gris pour l'énergie quelconque) et des dégâts en Oswald ;
   - barre Faiblesse +20 / Repli / symbole de rareté + K + numéro ;
   - phrase d'ambiance et crédit d'illustrateur.
   - Toutes ces données viennent de `src/data/fiches-combat.json` et des données de la carte. Ne rien inventer : si un champ n'existe pas, ne pas l'afficher.
4. **Cartes ♦ à ♦♦♦♦** : l'illustration est dans une fenêtre (top 54, hauteur 172, marges 10), avec des crochets aux coins. Le fond porte un motif hishi (♦) ou asanoha (♦♦ et plus) avec du grain.
   - ♦ : cadre graphite brossé.
   - ♦♦ : acier ; filet, gemme et contour de la fenêtre à la couleur de l'élément.
   - ♦♦♦ : holo « cosmos » animé sur l'illustration (champ d'étoiles irrégulier, PAS de grille de points) et étincelles ; plaque et bannière argent.
   - ♦♦♦♦ : cadre argent guilloché, stries holo et holo craquelé sur toute la carte, médaillon arc-en-ciel.
5. **Cartes ★ à ♛ — pleine illustration** :
   - l'image occupe toute la carte ;
   - il n'y a ni plaque de nom ni bannière, et aucun panneau opaque ;
   - le texte est posé directement sur l'image, avec un voile sombre en haut et en bas (`voile`) ;
   - le bloc texte commence à 268 sur 448.
   - ★ Pleine illustration : sobre. Aucun holo ni étincelle sur l'image ; cadre holo pastel fixe.
   - ★★ Illustration alternative : holo craquelé bien visible (opacité 0,6), film arc-en-ciel léger, cadre holo vif animé, médaillon arc-en-ciel, quelques étincelles.
   - ★★★ Immersive animée : tout est animé (cosmos, craquelé, deux couches d'étincelles, particules qui montent, reflet qui passe dans la bande du cadre, halo). Au survol, l'image s'agrandit et glisse derrière le cadre (`.profond`).
   - ♛ Couronne : comme ★★★, mais tout en or : cadre or guilloché, teinte or sur l'image, motif asanoha gravé, gemme rubis, textes or clair, halo doré.
6. **Toutes les cartes** : au survol, inclinaison 3D et un éclat qui passe (`.carte:hover`, `.eclat`).
   - Respecter `prefers-reduced-motion`.
   - Les effets ne doivent jamais passer au-dessus du texte au point de le rendre illisible.
   - Rien ne doit déborder du cadre.
7. **Performance** :
   - générer chaque SVG data-URI une seule fois (cache par élément et par rareté), pas à chaque rendu ;
   - dans une grille de collection avec beaucoup de cartes, ne lancer les animations que pour les cartes visibles et survolées ;
   - en petite taille, garder les effets et masquer les textes d'effet trop petits.
8. Le décor généré (`scene`) sert seulement de repli pour les cartes sans image.
9. **Vérification** : `npm run build` et les tests passent. Fais une capture de la collection, de l'ouverture d'un booster et d'une carte de chaque rareté, compare avec la maquette, corrige les écarts. Puis commit.
