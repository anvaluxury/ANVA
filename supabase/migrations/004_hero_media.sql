-- ANVA 004: hero animation/video managed from Admin → Homepage. Run after 003.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) values
 ('hero-media','hero-media',true,52428800,'{video/mp4,video/webm,image/jpeg,image/png,image/webp}')
on conflict (id) do update set public=true, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;
create policy "public read hero media" on storage.objects for select using (bucket_id='hero-media');
create policy "hero media uploads" on storage.objects for all
  using (bucket_id='hero-media' and public.can_edit_content()) with check (bucket_id='hero-media' and public.can_edit_content());
insert into public.site_settings (key,value) values ('hero_media','{"slides":[],"autoplay":true,"interval":6,"overlay":45}') on conflict (key) do nothing;
