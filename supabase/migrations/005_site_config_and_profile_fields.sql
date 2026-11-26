-- ANVA 005: draft/publish storage for the visual editor + profile phone from signup metadata.
-- Purely additive and backward compatible: no table, column, row, bucket or policy from 001-004 is dropped or altered.
-- Run in Supabase -> SQL Editor AFTER 004. Safe to re-run.

-- 1) Versioned site configuration (one editable draft + immutable published history)
create table if not exists public.site_config_versions (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('draft','published')),
  config jsonb not null default '{}'::jsonb,
  note text,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);
-- at most one draft row; many published rows (the newest published row is the live one)
create unique index if not exists one_draft_config on public.site_config_versions ((kind)) where kind = 'draft';
create index if not exists site_config_published_idx on public.site_config_versions (created_at desc) where kind = 'published';

alter table public.site_config_versions enable row level security;

drop policy if exists "read published config" on public.site_config_versions;
drop policy if exists "insert config" on public.site_config_versions;
drop policy if exists "update draft config" on public.site_config_versions;
drop policy if exists "delete draft config" on public.site_config_versions;

-- visitors can only ever see PUBLISHED rows; drafts are visible to content editors only
create policy "read published config" on public.site_config_versions for select
  using (kind = 'published' or public.can_edit_content());
create policy "insert config" on public.site_config_versions for insert
  with check (public.can_edit_content());
-- published history is immutable: only the draft row can be updated or deleted
create policy "update draft config" on public.site_config_versions for update
  using (kind = 'draft' and public.can_edit_content()) with check (kind = 'draft' and public.can_edit_content());
create policy "delete draft config" on public.site_config_versions for delete
  using (kind = 'draft' and public.can_edit_content());

drop trigger if exists audit_site_config_versions on public.site_config_versions;
create trigger audit_site_config_versions after insert or update or delete on public.site_config_versions
  for each row execute function public.audit();

-- 2) Signup now stores the phone number typed on the registration form in public.profiles.phone.
--    Same function as 001 plus a metadata fallback; existing profiles are not touched.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone, preferred_language)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'full_name',''),
             nullif(trim(coalesce(new.raw_user_meta_data->>'first_name','') || ' ' || coalesce(new.raw_user_meta_data->>'last_name','')),'')),
    coalesce(new.phone, nullif(new.raw_user_meta_data->>'phone','')),
    coalesce(nullif(new.raw_user_meta_data->>'preferred_language',''),'hy'));
  return new;
end $$;
