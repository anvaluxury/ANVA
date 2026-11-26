-- ANVA 004: homepage hero slider (images are uploaded from Admin -> Slider into the existing 'homepage-images' bucket). Run after 002/003.
create table if not exists public.hero_slides (
  id uuid primary key default gen_random_uuid(),
  sort_order int not null default 0,
  is_active boolean not null default true,
  image_path text,
  link text,
  data jsonb not null default '{}',   -- {"hy":{"title","body","button"},"ru":{...},"en":{...}}
  created_at timestamptz default now()
);
alter table public.hero_slides enable row level security;
drop policy if exists "read hero slides" on public.hero_slides;
drop policy if exists "edit hero slides" on public.hero_slides;
create policy "read hero slides" on public.hero_slides for select using (is_active or public.can_edit_content());
create policy "edit hero slides" on public.hero_slides for all using (public.can_edit_content()) with check (public.can_edit_content());
