# Kirafuda

Jeu de collection de cartes de personnages d'anime, dans le navigateur. Projet personnel, gratuit et non commercial.

## Démarrer

```bash
npm install
npm run dev        # lance le jeu sur http://localhost:5173
npm test           # tests
npm run typecheck  # vérification TypeScript
npm run fiches               # recopie src/data/fiches-combat.json dans les extensions (après un rééquilibrage)
npm run deployer-fonctions  # régénère et déploie les fonctions serveur du classement (docs/SUPABASE.md, section 10)
```

## Ce que contient ce dossier

| Élément | Contenu |
| --- | --- |
| `AGENTS.md` | Règles pour Codex (à lire avant toute tâche) |
| `docs/GDD-resume.md` | Règles du jeu nécessaires à la version 1 |
| `docs/TACHES.md` | Les 14 tâches de la version 1, dans l'ordre, avec le texte à donner à Codex |
| `docs/DEPLOIEMENT.md` | Mise en ligne sur Cloudflare Pages et cycle de mise à jour (admin en local → `git push`) |
| `docs/SUPABASE.md` | Comptes en ligne : projet Supabase, connexion Discord, adresses de redirection, variables `.env` et Cloudflare |
| `docs/reference/atelier-des-cartes.html` | Rendu de référence des cartes et des finitions |
| `src/data/extension-lancement.json` | Les 100 personnages (série, rang, élément, PV, attaques) et les 140 cartes (une rareté fixe chacune) |
| `src/data/booster-lancement.json` | Tables de tirage du booster |
| `src/data/fiches-combat.json` | Fiches de combat des personnages (type, PV, Repli, talent, attaques), recopiées dans les extensions par `npm run fiches` |
| `src/core/types.ts`, `src/core/regles.ts` | Modèle de données et règles fixes |
| `public/logo/` | Logo, icône et emblème |

## Images des cartes

Une image par carte (140 cartes : 100 de base, 40 secrètes), dans `public/cartes/<id-carte>/` :

- `illustration.webp`, pour toutes les raretés (★★ et ★★★ comprises) ;
- en plus pour les ★★★ (immersives) : `animation.webp`, une animation (WebP animé ; l'admin et `npm run images` convertissent les GIF) affichée en priorité (l'image fixe sert en mode animations réduites).

Exemple : `public/cartes/lan-041/illustration.webp`. Une carte secrète sans image reprend celle de la carte de base du même personnage. Le plus simple : la page d’admin, `npm run dev` puis http://localhost:5173/admin.html.
