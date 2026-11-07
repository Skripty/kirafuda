-- Tâche 23 : comptes (pseudo) et sauvegarde en ligne.
-- À exécuter une fois dans Supabase → SQL Editor (ou `supabase db push` avec la CLI).
-- Row Level Security : chacun ne lit et n'écrit que ses propres lignes ; les pseudos sont lisibles par tous.

-- ---------- Profils ----------
create table public.profils (
  id uuid primary key references auth.users (id) on delete cascade,
  pseudo text not null,
  cree_le timestamptz not null default now(),
  -- 3 à 20 caractères, sans espace au début ou à la fin, sans caractère de contrôle
  -- (le jeu vérifie en plus : lettres, chiffres, espace, « _ », « - », « . »).
  constraint profils_pseudo_longueur check (char_length(pseudo) between 3 and 20),
  constraint profils_pseudo_espaces check (pseudo = btrim(pseudo)),
  constraint profils_pseudo_controle check (pseudo !~ '[[:cntrl:]]')
);

-- Pseudo unique, sans tenir compte des majuscules (« Kira » et « kira » ne peuvent pas coexister).
create unique index profils_pseudo_unique on public.profils (lower(pseudo));

alter table public.profils enable row level security;

create policy "Pseudos lisibles par tous"
  on public.profils for select
  to anon, authenticated
  using (true);

create policy "Créer son propre profil"
  on public.profils for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy "Modifier son propre profil"
  on public.profils for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

grant select on public.profils to anon, authenticated;
grant insert, update (pseudo) on public.profils to authenticated;

-- ---------- Sauvegardes ----------
create table public.sauvegardes (
  utilisateur uuid primary key references auth.users (id) on delete cascade,
  donnees jsonb not null,
  version integer not null,
  mis_a_jour_le timestamptz not null default now(),
  constraint sauvegardes_donnees_objet check (jsonb_typeof(donnees) = 'object'),
  constraint sauvegardes_version check (version between 1 and 1000),
  -- Garde-fou : une sauvegarde normale pèse quelques centaines de Ko au plus.
  constraint sauvegardes_taille check (octet_length(donnees::text) <= 5000000)
);

-- La date de mise à jour est toujours celle du serveur (jamais celle envoyée par le navigateur).
create function public.sauvegardes_dater()
  returns trigger
  language plpgsql
  set search_path = ''
as $$
begin
  new.mis_a_jour_le := now();
  return new;
end;
$$;

create trigger sauvegardes_dater
  before insert or update on public.sauvegardes
  for each row execute function public.sauvegardes_dater();

alter table public.sauvegardes enable row level security;

create policy "Lire sa propre sauvegarde"
  on public.sauvegardes for select
  to authenticated
  using ((select auth.uid()) = utilisateur);

create policy "Créer sa propre sauvegarde"
  on public.sauvegardes for insert
  to authenticated
  with check ((select auth.uid()) = utilisateur);

create policy "Modifier sa propre sauvegarde"
  on public.sauvegardes for update
  to authenticated
  using ((select auth.uid()) = utilisateur)
  with check ((select auth.uid()) = utilisateur);

create policy "Supprimer sa propre sauvegarde"
  on public.sauvegardes for delete
  to authenticated
  using ((select auth.uid()) = utilisateur);

revoke all on public.sauvegardes from anon;
grant select, insert, update, delete on public.sauvegardes to authenticated;
