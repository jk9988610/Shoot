-- =============================================================================
-- Particle Archery (Shoot) — Bow Cloud Storage
-- 与 Card-World 共用 Supabase 项目（同一 URL / anon key）
-- =============================================================================
-- BEFORE SQL:
--   Dashboard → Storage → New bucket → Name: shoot → Public bucket ON
--
-- RUN THIS FILE in SQL Editor
-- =============================================================================

create table if not exists public.shoot_bow_works (
  id text primary key,
  title text not null default '弓身',
  author_label text not null default '',
  bow_json jsonb not null,
  kind text not null default 'draft',
  meta_path text,
  storage_path text,
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.shoot_bow_works is 'Particle Archery bow works; files in Storage bucket shoot';
comment on column public.shoot_bow_works.bow_json is 'bow-scene/v1 JSON (particle-archery/bow-scene/v1)';
comment on column public.shoot_bow_works.kind is 'draft | active | published';

create index if not exists shoot_bow_works_published_at_idx
  on public.shoot_bow_works (published_at desc);

create index if not exists shoot_bow_works_author_kind_idx
  on public.shoot_bow_works (author_label, kind);

alter table public.shoot_bow_works enable row level security;

drop policy if exists "shoot_bow_works_select" on public.shoot_bow_works;
create policy "shoot_bow_works_select"
  on public.shoot_bow_works for select using (true);

drop policy if exists "shoot_bow_works_insert" on public.shoot_bow_works;
create policy "shoot_bow_works_insert"
  on public.shoot_bow_works for insert with check (true);

drop policy if exists "shoot_bow_works_update" on public.shoot_bow_works;
create policy "shoot_bow_works_update"
  on public.shoot_bow_works for update using (true) with check (true);

drop policy if exists "shoot_bow_works_delete" on public.shoot_bow_works;
create policy "shoot_bow_works_delete"
  on public.shoot_bow_works for delete using (true);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.shoot_bow_works to anon, authenticated;

-- Storage policies for bucket shoot (run after bucket created)
drop policy if exists "shoot_storage_select" on storage.objects;
create policy "shoot_storage_select"
  on storage.objects for select
  using (bucket_id = 'shoot');

drop policy if exists "shoot_storage_insert" on storage.objects;
create policy "shoot_storage_insert"
  on storage.objects for insert
  with check (bucket_id = 'shoot');

drop policy if exists "shoot_storage_update" on storage.objects;
create policy "shoot_storage_update"
  on storage.objects for update
  using (bucket_id = 'shoot');

drop policy if exists "shoot_storage_delete" on storage.objects;
create policy "shoot_storage_delete"
  on storage.objects for delete
  using (bucket_id = 'shoot');
