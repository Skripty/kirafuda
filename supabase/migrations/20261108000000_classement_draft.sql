-- Tâche 24 : classement hebdomadaire du draft.
-- À exécuter une fois dans Supabase → SQL Editor, après 20261107000000_comptes_et_sauvegardes.sql.
-- Lecture : tout le monde (pseudo, score, cartes). Écriture : uniquement par les fonctions serveur
-- « soumettre-draft » et « reclamer-draft » (clé service_role, fournie par Supabase aux fonctions, jamais au jeu).

-- ---------- Équipes de la semaine ----------
create table public.drafts (
  utilisateur uuid not null references public.profils (id) on delete cascade,
  semaine text not null,
  -- Les 5 cartes (ids) et leurs indices dans les 15 cartes de la semaine, recalculées par le serveur.
  cartes text[] not null,
  choix smallint[] not null,
  score integer not null,
  -- Détail des points (catégorie, libellé, points), recalculé par le serveur.
  detail jsonb not null default '[]'::jsonb,
  -- Participation déjà reçue sur l'appareil (draft joué sans compte), déduite de la récompense.
  deja_recu smallint not null default 0,
  -- Date de la dernière équipe différente : à score égal, la première arrivée passe devant.
  soumis_le timestamptz not null default now(),
  primary key (utilisateur, semaine),
  constraint drafts_semaine check (semaine ~ '^[0-9]{4}-S[0-9]{2}$'),
  constraint drafts_cinq_cartes check (cardinality(cartes) = 5 and cardinality(choix) = 5),
  constraint drafts_detail check (jsonb_typeof(detail) = 'array'),
  constraint drafts_deja_recu check (deja_recu >= 0)
);

create index drafts_classement on public.drafts (semaine, score desc, soumis_le);

alter table public.drafts enable row level security;

create policy "Équipes lisibles par tous"
  on public.drafts for select
  to anon, authenticated
  using (true);

-- Aucune règle d'insertion, de modification ni de suppression : les joueurs ne peuvent pas écrire.
revoke all on public.drafts from anon, authenticated;
grant select (utilisateur, semaine, cartes, choix, score, detail, soumis_le) on public.drafts to anon, authenticated;

-- ---------- Classement (rang calculé) ----------
-- Rang dans la semaine : score décroissant, puis première équipe arrivée. Les droits sont ceux du lecteur.
create view public.classement_draft
  with (security_invoker = true)
as
select
  d.semaine,
  (row_number() over (partition by d.semaine order by d.score desc, d.soumis_le, d.utilisateur))::integer as rang,
  d.utilisateur,
  p.pseudo,
  d.score,
  d.cartes,
  d.detail,
  d.soumis_le
from public.drafts d
join public.profils p on p.id = d.utilisateur;

grant select on public.classement_draft to anon, authenticated;

-- ---------- Récompenses de fin de semaine (réclamées une seule fois) ----------
create table public.recompenses_draft (
  utilisateur uuid not null references auth.users (id) on delete cascade,
  semaine text not null,
  rang integer not null,
  sceaux integer not null,
  reclame_le timestamptz not null default now(),
  primary key (utilisateur, semaine),
  constraint recompenses_draft_rang check (rang >= 1),
  constraint recompenses_draft_sceaux check (sceaux >= 0)
);

alter table public.recompenses_draft enable row level security;

create policy "Lire ses propres récompenses"
  on public.recompenses_draft for select
  to authenticated
  using ((select auth.uid()) = utilisateur);

revoke all on public.recompenses_draft from anon, authenticated;
grant select on public.recompenses_draft to authenticated;
