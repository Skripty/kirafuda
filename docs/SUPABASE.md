# Comptes et sauvegarde en ligne : ce qu'il faut créer (Supabase + Discord)

Ce guide liste ce que tu dois créer **toi-même**, une seule fois, avant que le code des comptes soit écrit (tâche 23).
Tout est gratuit. Compte environ 20 minutes.

À la fin, tu auras :

- un projet Supabase (base de données + connexion des joueurs) ;
- une application Discord (le bouton « Se connecter avec Discord ») ;
- deux variables, `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`, dans un fichier `.env` local et dans Cloudflare Pages.

> **Règle de sécurité.** Le jeu ne contient que la clé **publique** (`anon` ou `publishable`). Elle est faite pour être visible dans le navigateur : ce sont les règles de la base (Row Level Security, écrites à l'étape 2) qui protègent les données.
> Ne copie **jamais** dans le projet, dans `.env` ou dans Cloudflare : la clé `service_role` (ou `secret`, `sb_secret_…`), le mot de passe de la base, ni le *Client Secret* Discord (il va seulement dans Supabase).

Dans la suite, remplace :

- `<ref>` par l'identifiant de ton projet Supabase (ex. `abcdefghijklmnop`, visible dans l'adresse `https://<ref>.supabase.co`) ;
- `kirafuda.pages.dev` par l'adresse réelle de ton site Cloudflare Pages (voir `docs/DEPLOIEMENT.md`).

---

## 1. Créer le projet Supabase

1. Va sur **supabase.com** → *Start your project* → connecte-toi (avec GitHub, c'est le plus simple).
2. **New project** :
   - *Organization* : la tienne (offre **Free**) ;
   - *Project name* : `kirafuda` ;
   - *Database password* : clique *Generate a password* et **range-le dans ton gestionnaire de mots de passe**. Le jeu n'en a pas besoin, mais tu en auras besoin pour administrer la base ;
   - *Region* : **West EU (Paris)** si elle est proposée, sinon **Central EU (Frankfurt)** (au plus près des joueurs).
3. *Create new project*, puis attends 1 à 2 minutes que le projet soit prêt.

> Offre gratuite : un projet sans aucune activité pendant 7 jours est mis **en pause**. Il se réveille d'un clic dans le tableau de bord, sans perte de données. Avec des joueurs actifs, ça n'arrive pas.

## 2. Relever l'adresse et la clé publique

Dans le projet : **Project Settings** (roue dentée) → **API Keys** (ou **Data API** / **API**, selon la version du tableau de bord).

| À relever | Où | Va dans |
| --- | --- | --- |
| **Project URL** : `https://<ref>.supabase.co` | *Data API* (ou en haut de la page *API*) | `VITE_SUPABASE_URL` |
| **Clé publique** : `anon` `public` (commence par `eyJ…`) **ou** `publishable` (commence par `sb_publishable_…`) | *API Keys* (onglet *Legacy API keys* pour `anon`) | `VITE_SUPABASE_ANON_KEY` |

Les deux formes de clé publique conviennent. N'utilise jamais la ligne `service_role` / `secret`.

## 3. Créer l'application Discord

1. Va sur **discord.com/developers/applications** (connecte-toi avec ton compte Discord).
2. **New Application** → nom `Kirafuda` → accepte les conditions → *Create*.
3. Facultatif, onglet **General Information** : icône (le logo `public/logo/kirafuda-icone.svg` exporté en PNG), description. C'est ce que les joueurs voient sur l'écran d'autorisation Discord.
4. Onglet **OAuth2** :
   - copie le **Client ID** ;
   - **Client Secret** → *Reset Secret* → copie-le tout de suite (Discord ne le réaffiche plus). Il ira **uniquement** dans Supabase, à l'étape 4 ;
   - **Redirects** → *Add Redirect* → colle exactement :

     ```
     https://<ref>.supabase.co/auth/v1/callback
     ```

     (c'est Supabase qui reçoit la réponse de Discord, jamais le jeu directement) ;
   - *Save Changes*.

Aucun bot n'est nécessaire : ne touche pas à l'onglet *Bot*.

## 4. Activer la connexion Discord dans Supabase

1. Dans Supabase : **Authentication** → **Sign In / Providers** (ou *Providers*) → **Discord**.
2. Active *Enable Sign in with Discord*.
3. Colle le **Client ID** et le **Client Secret** de Discord (étape 3).
4. Vérifie que la *Callback URL* affichée par Supabase est **identique** à celle ajoutée dans Discord (`https://<ref>.supabase.co/auth/v1/callback`).
5. *Save*.

## 5. Adresses de redirection (local et site en ligne)

Après la connexion Discord, Supabase renvoie le joueur vers le jeu. Il refuse toute adresse qui n'est pas dans cette liste.

**Authentication** → **URL Configuration** :

- **Site URL** (adresse par défaut) :

  ```
  https://kirafuda.pages.dev
  ```

- **Redirect URLs** → *Add URL*, une par ligne :

  ```
  http://localhost:5173/**
  http://localhost:4173/**
  https://kirafuda.pages.dev/**
  https://*.kirafuda.pages.dev/**
  ```

  Dans l'ordre : `npm run dev`, `npm run preview`, le site en ligne, les déploiements d'aperçu de Cloudflare (une adresse par branche ou par commit). Si tu ajoutes plus tard un nom de domaine à toi, ajoute aussi `https://ton-domaine.fr/**` et mets-le en *Site URL*.

- *Save*.

Laisse le reste de *Authentication* par défaut (pas de connexion par e-mail nécessaire : seul Discord est utilisé).

## 6. Le fichier `.env` local

À la racine du projet, crée un fichier **`.env`** (copie de `.env.example`) :

```sh
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<ta clé publique anon ou sb_publishable_…>
```

- Ce fichier est ignoré par git (`.gitignore`) : il n'ira pas sur GitHub.
- Redémarre `npm run dev` après l'avoir créé ou modifié (Vite ne lit `.env` qu'au démarrage).
- Le préfixe `VITE_` est obligatoire : c'est lui qui rend la variable visible dans le jeu. Ne donne jamais ce préfixe à une valeur secrète.

## 7. Les variables dans Cloudflare Pages

Le site en ligne est construit par Cloudflare, qui ne voit pas ton `.env` : il faut lui donner les deux mêmes variables.

1. **dash.cloudflare.com** → **Workers & Pages** → projet `kirafuda` → **Settings** → **Variables and Secrets** (ou *Environment variables*).
2. Pour **Production**, puis pour **Preview** : *Add* →
   - `VITE_SUPABASE_URL` = `https://<ref>.supabase.co` (type *Text*) ;
   - `VITE_SUPABASE_ANON_KEY` = ta clé publique (type *Text* ; elle est publique de toute façon, elle finit dans le code du site).
3. *Save*.
4. Les variables ne sont lues **qu'au build** : relance un déploiement (*Deployments* → *Retry deployment* sur le dernier, ou un nouveau `git push`).

---

## Récapitulatif à cocher

- [ ] Projet Supabase `kirafuda` créé (offre Free, région Europe), mot de passe de la base rangé à part.
- [ ] Project URL et clé publique (`anon` ou `sb_publishable_…`) relevées.
- [ ] Application Discord `Kirafuda` : Client ID, Client Secret, redirection `https://<ref>.supabase.co/auth/v1/callback`.
- [ ] Supabase → Discord activé avec le Client ID et le Client Secret.
- [ ] Supabase → URL Configuration : Site URL + les 4 Redirect URLs.
- [ ] `.env` local créé avec `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`.
- [ ] Cloudflare Pages : les deux variables en Production et en Preview, puis un nouveau déploiement.

Tu n'as pas besoin de donner tes clés à qui que ce soit : le code les lit dans `.env`.

---

## 8. Créer les tables (une fois, puis à chaque nouveau fichier de migration)

Les tables et leurs règles d'accès sont dans `supabase/migrations/` (SQL versionné, un fichier par évolution, dans l'ordre des noms).

1. Supabase → **SQL Editor** → **New query**.
2. Ouvre `supabase/migrations/20261107000000_comptes_et_sauvegardes.sql`, copie **tout** son contenu, colle-le, puis **Run**.
   Le résultat attendu est « Success. No rows returned ».
3. Vérifie dans **Table Editor** : deux tables, `profils` et `sauvegardes`. Chacune doit porter la mention **RLS enabled**, et leurs règles sont visibles dans **Authentication → Policies**.

Un fichier de migration ne s'exécute qu'une fois : le relancer donne une erreur « already exists », sans danger.

Ce que créent les tables :

| Table | Contenu | Qui peut lire | Qui peut écrire |
| --- | --- | --- | --- |
| `profils` | id du joueur, pseudo unique (3 à 20 caractères, sans tenir compte des majuscules), date de création | tout le monde (pour les classements) | le joueur, son propre profil seulement |
| `sauvegardes` | id du joueur, sauvegarde complète (JSON), version, date de mise à jour (posée par le serveur) | le joueur, la sienne seulement | le joueur, la sienne seulement |

## 9. Vérifier

1. `npm run dev` → `http://localhost:5173/` : le bouton **Se connecter** apparaît dans la barre du haut (et dans Paramètres).
2. Clique dessus : Discord demande l'autorisation, puis tu reviens sur le jeu, connecté. Au premier login, choisis ton pseudo.
3. Supabase → **Table Editor → sauvegardes** : une ligne apparaît (ta sauvegarde), mise à jour après chaque action dans le jeu.
4. Sur le téléphone (site en ligne), connecte-toi avec le même compte Discord : ta collection est là.

Si Supabase affiche `Unsupported provider: provider is not enabled`, l'étape 4 n'est pas enregistrée : Discord doit être activé (interrupteur *Enable*) avec le Client ID et le Client Secret, puis **Save**.
