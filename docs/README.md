# Kirafuda

Jeu de collection de cartes de personnages d'anime, dans le navigateur. Projet personnel, gratuit et non commercial.

## Démarrer

```bash
npm install
npm run dev        # lance le jeu sur http://localhost:5173
npm test           # tests
npm run typecheck  # vérification TypeScript
```

## Ce que contient ce dossier

| Élément | Contenu |
| --- | --- |
| `AGENTS.md` | Règles pour Codex (à lire avant toute tâche) |
| `docs/GDD-resume.md` | Règles du jeu nécessaires à la version 1 |
| `docs/TACHES.md` | Les 20 tâches de la version 1, dans l'ordre, avec le texte à donner à Codex |
| `docs/reference/atelier-des-cartes.html` | Rendu de référence des cartes et des finitions |
| `src/data/extension-lancement.json` | Les 100 personnages (série, rang, élément, PV, attaques) et les 140 cartes |
| `src/data/booster-lancement.json` | Tables de tirage du booster |
| `src/data/attaques.json` | Les 180 attaques par élément |
| `src/core/types.ts`, `src/core/regles.ts` | Modèle de données et règles fixes |
| `public/logo/` | Logo, icône et emblème |

## Images des cartes

Une image par carte, dans `public/cartes/<id-carte>/` :

- `illustration.webp` pour toutes les raretés sauf ★★ et ★★★ ;
- `perso.webp` + `fond.webp` pour les cartes ★★ (alternative) et ★★★ (immersive).

Exemple : `public/cartes/lan-041/illustration.webp` pour la carte de base de Sung Jin-Woo, `public/cartes/lan-137/perso.webp` pour sa ★★★. Les identifiants sont dans `src/data/extension-lancement.json` (`cartes`). Le plus simple : la page d'admin (`npm run dev` puis `/admin.html`).
