-- ANVA 002: store schema, RLS, storage. Run after 001.
create type public.product_status as enum ('available','made_to_order','sold_out');
create or replace function public.can_edit_catalog() returns boolean language sql stable security definer set search_path=public as
$$ select public.has_role('super_admin') or public.has_role('product_manager') $$;
create or replace function public.can_edit_content() returns boolean language sql stable security definer set search_path=public as
$$ select public.has_role('super_admin') or public.has_role('content_manager') $$;

create table public.categories (id uuid primary key default gen_random_uuid(), slug text unique not null, image_path text,
  sort_order int not null default 0, is_active boolean not null default true, created_at timestamptz default now());
create table public.category_translations (category_id uuid references public.categories on delete cascade, lang text check (lang in ('hy','ru','en')), name text not null, primary key (category_id, lang));

create table public.products (id uuid primary key default gen_random_uuid(), sku text unique, category_id uuid references public.categories on delete set null,
  price_amd numeric(14,2) not null check (price_amd >= 0), old_price_amd numeric(14,2), discount_percent numeric(5,2) default 0 check (discount_percent between 0 and 100),
  material text, purity text, weight_g numeric(8,2), status public.product_status not null default 'available',
  is_featured boolean not null default false, is_new boolean not null default false, is_active boolean not null default true,
  sort_order int not null default 0, created_at timestamptz default now(), updated_at timestamptz default now());
create unique index one_featured on public.products ((is_featured)) where is_featured;
create index on public.products (category_id, is_active, sort_order);
create table public.product_translations (product_id uuid references public.products on delete cascade, lang text check (lang in ('hy','ru','en')), name text not null, description text, primary key (product_id, lang));
create table public.product_images (id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products on delete cascade, path text not null, sort_order int default 0, is_main boolean default false);
create index on public.product_images (product_id, sort_order);

create table public.site_settings (key text primary key, value jsonb not null default '{}', updated_at timestamptz default now());
create table public.homepage_sections (key text primary key, is_active boolean default true, sort_order int default 0, image_path text, link text, data jsonb default '{}');
create table public.homepage_translations (section_key text references public.homepage_sections on delete cascade, lang text check (lang in ('hy','ru','en')), title text, body text, button_label text, primary key (section_key, lang));

create table public.favorites (user_id uuid references auth.users on delete cascade, product_id uuid references public.products on delete cascade, created_at timestamptz default now(), primary key (user_id, product_id));
create table public.reviews (id uuid primary key default gen_random_uuid(), product_id uuid references public.products on delete cascade, user_id uuid references auth.users on delete cascade,
  rating int not null check (rating between 1 and 5), body text check (char_length(body) <= 2000), status text not null default 'pending' check (status in ('pending','published','rejected')),
  created_at timestamptz default now(), unique (product_id, user_id));
create table public.promotions (id uuid primary key default gen_random_uuid(), name text, percent numeric(5,2) check (percent between 0 and 100), promo_price_amd numeric(14,2),
  product_id uuid references public.products on delete cascade, category_id uuid references public.categories on delete cascade,
  starts_at timestamptz not null, ends_at timestamptz not null check (ends_at > starts_at), is_active boolean default true);
create table public.exchange_rates (currency text primary key, rate_per_amd numeric(18,8) not null, fetched_at timestamptz not null default now());
create table public.analytics_events (id bigint generated always as identity primary key, event text not null, session_id text, lang text, country text,
  product_id uuid, category_id uuid, meta jsonb, created_at timestamptz default now());
create index on public.analytics_events (event, created_at);
create table public.newsletter_subscribers (id uuid primary key default gen_random_uuid(), email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'), created_at timestamptz default now());
create unique index on public.newsletter_subscribers (lower(email));
create table public.admin_notifications (id uuid primary key default gen_random_uuid(), kind text, message text, is_read boolean default false, created_at timestamptz default now());
create table public.audit_logs (id bigint generated always as identity primary key, actor uuid, action text not null, entity text, entity_id text, details jsonb, created_at timestamptz default now());

do $$ declare t text; begin foreach t in array array['categories','category_translations','products','product_translations','product_images','site_settings','homepage_sections','homepage_translations','favorites','reviews','promotions','exchange_rates','analytics_events','newsletter_subscribers','admin_notifications','audit_logs'] loop
  execute format('alter table public.%I enable row level security', t); end loop; end $$;

-- public read of live content
create policy "read categories" on public.categories for select using (is_active or public.can_edit_catalog());
create policy "read cat tr" on public.category_translations for select using (true);
create policy "read products" on public.products for select using (is_active or public.can_edit_catalog());
create policy "read prod tr" on public.product_translations for select using (true);
create policy "read prod img" on public.product_images for select using (true);
create policy "read settings" on public.site_settings for select using (true);
create policy "read sections" on public.homepage_sections for select using (is_active or public.can_edit_content());
create policy "read sec tr" on public.homepage_translations for select using (true);
create policy "read promos" on public.promotions for select using (is_active and now() between starts_at and ends_at or public.can_edit_catalog());
create policy "read rates" on public.exchange_rates for select using (true);
create policy "read published reviews" on public.reviews for select using (status='published' or user_id=auth.uid() or public.has_role('super_admin'));
-- editing
create policy "edit cat" on public.categories for all using (public.can_edit_catalog()) with check (public.can_edit_catalog());
create policy "edit cat tr" on public.category_translations for all using (public.can_edit_catalog()) with check (public.can_edit_catalog());
create policy "edit prod" on public.products for all using (public.can_edit_catalog()) with check (public.can_edit_catalog());
create policy "edit prod tr" on public.product_translations for all using (public.can_edit_catalog()) with check (public.can_edit_catalog());
create policy "edit prod img" on public.product_images for all using (public.can_edit_catalog()) with check (public.can_edit_catalog());
create policy "edit settings" on public.site_settings for all using (public.can_edit_content()) with check (public.can_edit_content());
create policy "edit sections" on public.homepage_sections for all using (public.can_edit_content()) with check (public.can_edit_content());
create policy "edit sec tr" on public.homepage_translations for all using (public.can_edit_content()) with check (public.can_edit_content());
create policy "edit promos" on public.promotions for all using (public.can_edit_catalog()) with check (public.can_edit_catalog());
create policy "own favorites" on public.favorites for all using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "write own review" on public.reviews for insert with check (user_id=auth.uid() and status='pending');
create policy "edit own review" on public.reviews for update using (user_id=auth.uid()) with check (user_id=auth.uid() and status='pending');
create policy "moderate reviews" on public.reviews for update using (public.has_role('super_admin')) with check (true);
create policy "delete reviews" on public.reviews for delete using (user_id=auth.uid() or public.has_role('super_admin'));
create policy "track events" on public.analytics_events for insert with check (event in ('page_view','product_view','category_view','favorite_add','favorite_remove','order_instagram_click','order_tiktok_click','order_phone_click','search','newsletter_subscribe'));
create policy "analysts read events" on public.analytics_events for select using (public.has_role('super_admin') or public.has_role('analyst'));
create policy "subscribe" on public.newsletter_subscribers for insert with check (true);
create policy "admins read subs" on public.newsletter_subscribers for select using (public.has_role('super_admin'));
create policy "admins notifications" on public.admin_notifications for all using (public.is_admin()) with check (public.is_admin());
create policy "super admin reads audit" on public.audit_logs for select using (public.has_role('super_admin'));
-- exchange_rates and audit_logs are written only server-side (service role / Edge Function).

-- storage
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) values
 ('product-images','product-images',true,5242880,'{image/jpeg,image/png,image/webp}'),
 ('category-images','category-images',true,5242880,'{image/jpeg,image/png,image/webp}'),
 ('homepage-images','homepage-images',true,8388608,'{image/jpeg,image/png,image/webp}'),
 ('brand-assets','brand-assets',true,5242880,'{image/jpeg,image/png,image/webp,image/svg+xml}')
on conflict (id) do nothing;
create policy "public read media" on storage.objects for select using (bucket_id in ('product-images','category-images','homepage-images','brand-assets'));
create policy "catalog uploads" on storage.objects for all using (bucket_id in ('product-images','category-images') and public.can_edit_catalog()) with check (bucket_id in ('product-images','category-images') and public.can_edit_catalog());
create policy "content uploads" on storage.objects for all using (bucket_id in ('homepage-images','brand-assets') and public.can_edit_content()) with check (bucket_id in ('homepage-images','brand-assets') and public.can_edit_content());

-- editable starting content (no fake products)
insert into public.categories (slug,sort_order) values ('rings',1),('necklaces',2),('earrings',3),('bracelets',4),('crowns',5),('new-collection',6);
insert into public.category_translations (category_id,lang,name) select c.id,v.lang,v.name from public.categories c join (values
 ('rings','hy','Մատանիներ'),('rings','ru','Кольца'),('rings','en','Rings'),
 ('necklaces','hy','Վզնոցներ'),('necklaces','ru','Колье'),('necklaces','en','Necklaces'),
 ('earrings','hy','Ականջօղեր'),('earrings','ru','Серьги'),('earrings','en','Earrings'),
 ('bracelets','hy','Ապարանջաններ'),('bracelets','ru','Браслеты'),('bracelets','en','Bracelets'),
 ('crowns','hy','Թագեր'),('crowns','ru','Короны'),('crowns','en','Crowns'),
 ('new-collection','hy','Նոր հավաքածու'),('new-collection','ru','Новая коллекция'),('new-collection','en','New Collection')) v(slug,lang,name) on v.slug=c.slug;
insert into public.homepage_sections (key,sort_order,link) values ('hero',1,'#collections'),('about',2,'#about'),('banner',3,'#collections');
insert into public.homepage_translations (section_key,lang,title,body,button_label) values
 ('hero','hy','Ավելին, քան զարդ՝ զգացողություն','Բացահայտեք ժամանակից դուրս էլեգանտության գեղեցկությունը յուրաքանչյուր դետալում։','Դիտել հավաքածուն'),
 ('hero','ru','Больше, чем украшение — ощущение','Откройте красоту вечной элегантности в каждой детали.','Смотреть коллекцию'),
 ('hero','en','More than jewelry — a feeling','Discover the beauty of timeless elegance in every detail.','Explore Collection'),
 ('about','hy','Բրենդ՝ պատմությամբ','ANVA-ն ավելին է, քան զարդերի բրենդ։ Դա էլեգանտության, վստահության և հավերժական գեղեցկության խորհրդանիշ է։','Մեր պատմությունը'),
 ('about','ru','Бренд с историей','ANVA — это больше, чем ювелирный бренд. Это символ элегантности, уверенности и вечной красоты.','Наша история'),
 ('about','en','A Brand with a Story','ANVA is more than a jewelry brand. It''s a symbol of elegance, confidence and timeless beauty.','Our Story'),
 ('banner','hy','Նոր հավաքածու','Փայլեք յուրաքանչյուր դետալում։','Դիտել հավաքածուն'),
 ('banner','ru','Новая коллекция','Сияйте в каждой детали.','Смотреть коллекцию'),
 ('banner','en','New Collection','Shine in every detail.','Explore Collection');
insert into public.site_settings (key,value) values ('contact','{"instagram":"","tiktok":"","phone":"","facebook":"","youtube":"","pinterest":"","email":""}'),('brand','{"name":"ANVA LUXURY"}');
