-- ANVA 001: profiles, admin roles, RLS. Safe to run on an empty project.
create type public.app_role as enum ('super_admin','product_manager','content_manager','analyst');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text, phone text,
  preferred_language text not null default 'hy' check (preferred_language in ('hy','ru','en')),
  country text, created_at timestamptz not null default now()
);
create table public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  granted_by uuid references auth.users(id), created_at timestamptz not null default now(),
  primary key (user_id, role)
);
create table public.login_history (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade,
  event text not null, user_agent text, created_at timestamptz not null default now()
);

create or replace function public.has_role(_role public.app_role) returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.user_roles where user_id = auth.uid() and role = _role) $$;
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.user_roles where user_id = auth.uid()) $$;

-- profile is created automatically on signup
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone, preferred_language)
  values (new.id, new.raw_user_meta_data->>'full_name', new.phone,
          coalesce(nullif(new.raw_user_meta_data->>'preferred_language',''),'hy'));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.login_history enable row level security;

create policy "own profile read" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "own profile update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "see own roles" on public.user_roles for select using (user_id = auth.uid() or public.has_role('super_admin'));
create policy "super admin manages roles" on public.user_roles for all using (public.has_role('super_admin')) with check (public.has_role('super_admin'));
create policy "admins read login history" on public.login_history for select using (public.has_role('super_admin'));
-- no public insert policies: login_history is written only by server-side code (Edge Function, phase 3).

-- FIRST SUPER ADMIN (run once in the SQL editor AFTER that person has registered on the site):
-- insert into public.user_roles (user_id, role)
--   select id, 'super_admin' from auth.users where email = 'anvaluxury@mail.ru';
