-- ANVA LUXURY: professionally edited homepage copy (HY / RU / EN).
-- Run once in Supabase SQL Editor. Existing media, links and section settings are preserved.

insert into public.homepage_sections (key, is_active, sort_order, link)
values ('hero', true, 1, '#collections'), ('banner', true, 3, '#collections')
on conflict (key) do update set is_active = excluded.is_active;

insert into public.homepage_translations (section_key, lang, title, body, button_label) values
('hero','hy','Զարդեր, որոնք ամբողջացնում են Ձեր ոճը','Բացահայտեք ANVA LUXURY-ի արծաթյա զարդերի և նրբաճաշակ աքսեսուարների ընտրանին։ Գտեք այն դետալը, որը կհամապատասխանի Ձեր ոճին՝ ամեն օրվա և հատուկ առիթների համար։','Բացահայտել տեսականին'),
('hero','ru','Украшения, которые подчёркивают ваш стиль','Откройте для себя подборку серебряных украшений и изысканных аксессуаров ANVA LUXURY. Найдите деталь, которая дополнит ваш образ каждый день и в особенные моменты.','Смотреть коллекцию'),
('hero','en','Jewellery that completes your style','Discover the ANVA LUXURY selection of silver jewellery and refined accessories. Find the piece that complements your style, for everyday moments and special occasions.','Explore the collection'),
('banner','hy','Ձեր ոճին արժանի ընտրություն','Յուրաքանչյուր զարդ իր փոքրիկ պատմությունն ունի։ Ընտրեք այն, որը կարտահայտի Ձեր անհատականությունն ու կդառնա սիրելի դետալը։','Դիտել զարդերը'),
('banner','ru','Выбор, достойный вашего стиля','У каждого украшения своя история. Выберите то, которое подчеркнёт вашу индивидуальность и станет любимой деталью образа.','Смотреть украшения'),
('banner','en','A choice that reflects your style','Every piece has its own story. Choose the one that expresses your individuality and becomes a favourite detail of your look.','Discover the jewellery')
on conflict (section_key, lang) do update set
 title = excluded.title, body = excluded.body, button_label = excluded.button_label;
