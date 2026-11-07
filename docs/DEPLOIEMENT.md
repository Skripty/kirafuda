# Mise en ligne de Kirafuda (Cloudflare Pages)

Le jeu est un site statique : `npm run build` produit le dossier `dist/`, que Cloudflare Pages héberge gratuitement.
Chaque `git push` sur GitHub reconstruit et republie le site automatiquement.

L'admin (`/admin.html`) n'est **jamais** en ligne : il ne fonctionne qu'en local, avec `npm run dev`.
Le site publié ne contient que le jeu (`index.html`, `assets/`, `cartes/`, `logo/`, `_headers`).

## 1. Une seule fois : créer le dépôt GitHub

1. Sur github.com : **New repository**, nom `kirafuda`, **Private** (ou public, au choix), sans README ni .gitignore (le projet a déjà les siens).
2. Dans le dossier du projet :

   ```sh
   git init
   git add .
   git commit -m "Première version"
   git branch -M main
   git remote add origin https://github.com/<ton-compte>/kirafuda.git
   git push -u origin main
   ```

3. Vérifie sur GitHub que `node_modules/`, `dist/`, `sauvegardes-admin/` et `originaux-images/` **ne sont pas** dans le dépôt (le `.gitignore` les exclut).

## 2. Une seule fois : relier le dépôt à Cloudflare Pages

1. Crée un compte gratuit sur dash.cloudflare.com.
2. **Workers & Pages** → **Create** → onglet **Pages** → **Connect to Git** → autorise GitHub et choisis le dépôt `kirafuda`.
3. Réglages de build :

   | Réglage | Valeur |
   | --- | --- |
   | Framework preset | None (ou Vite) |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Root directory | *(vide)* |
   | Version de Node | lue dans le fichier `.node-version` (22). Sinon, ajoute la variable d'environnement `NODE_VERSION` = `22`. |

4. **Save and Deploy**. Après une à deux minutes, le site est en ligne à l'adresse `https://kirafuda.pages.dev` (ou proche).
5. Facultatif : **Custom domains** pour un nom de domaine à toi.

Le build lance aussi `tsc --noEmit` : si le typage échoue, le déploiement est refusé et l'ancienne version reste en ligne.

## 3. Le cycle de mise à jour

```
admin en local (npm run dev)  →  npm run images  →  tests  →  git push  →  site mis à jour
```

1. **Modifier en local** : `npm run dev`, puis `http://localhost:5173/admin.html`.
   - Onglet **Images** : images des cartes, cadrage, élément, attaques (écrit dans `public/cartes/` et `src/data/`).
   - Onglet **Popularité** : publier la popularité de la semaine (écrit `src/data/popularite.json`).
2. **Préparer les images** : `npm run images`.
   - Réduit les images trop lourdes (hauteur max 1400 px, WebP qualité 85, 2 Mo au plus pour une image fixe, 5 Mo au plus pour une animation, qui ne se charge qu'à l'affichage de la carte).
   - Convertit les animations GIF en WebP animé.
   - Range les originaux dans `originaux-images/`, qui n'est pas envoyé sur GitHub : garde-le sur ton disque.
   - Signale les cartes de la vague 1 sans image.
   - `npm run images -- --refaire lan-137` refait les images d'une carte depuis ses originaux de `originaux-images/` (ex. après un changement de limite).
   - `npm run images -- --verifier` contrôle sans rien modifier.
   - Il faut Chrome ou Edge installé. S'il n'est pas trouvé, donne son chemin dans la variable `CHROME`.
3. **Vérifier** : `npm run typecheck` et `npm test` (un test refuse une image fixe de plus de 2 Mo, une animation de plus de 5 Mo ou un GIF), puis `npm run build` et `npm run preview` pour voir le site comme en ligne.
4. **Publier** :

   ```sh
   git add .
   git commit -m "Popularité de la semaine 2026-S47"
   git push
   ```

   Cloudflare reconstruit le site. Suis le déploiement dans **Workers & Pages → kirafuda → Deployments**. Un déploiement raté ne remplace pas la version en ligne, et **Rollback** remet une version précédente en un clic.

## Sauvegardes des joueurs

- La sauvegarde reste dans le navigateur du joueur (`localStorage`) : un nouveau déploiement ne l'efface pas.
- Au chargement, une sauvegarde d'une version plus ancienne est migrée automatiquement vers la version actuelle (`src/core/sauvegarde.ts`, `MIGRATIONS`).
- Toute évolution du format de sauvegarde doit donc ajouter une migration et son test.
- Ne supprime jamais une carte et ne change jamais son id : une sauvegarde qui la contient serait refusée.
- Le `localStorage` est lié à l'adresse du site. Une partie faite sur `localhost` ne se retrouve pas sur `kirafuda.pages.dev`, et changer de domaine fait repartir les joueurs de zéro.
- Pour passer une partie d'une adresse à l'autre : **Exporter** dans l'écran Sauvegarde, puis **Importer** sur l'autre site.

## Cache

`public/_headers` règle le cache de Cloudflare et des navigateurs :

- `index.html` : jamais en cache. Une nouvelle version est vue au prochain chargement de la page.
- `assets/*` : fichiers JS et CSS dont le nom contient une empreinte. Ils sont en cache un an.
- `cartes/*` : en cache un an. Le jeu demande chaque image avec `?v=<empreinte>`, l'empreinte de tout `public/cartes` calculée au build. Une image modifiée change donc l'adresse au déploiement suivant, et les joueurs la rechargent.
- `logo/*` : une semaine.

Les images se chargent à la demande, au moment où une carte s'affiche. Exception : les cartes du booster qu'on vient d'ouvrir sont préchargées pendant l'animation d'ouverture.
