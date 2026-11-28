-- Run once in Supabase SQL Editor to shorten already-saved homepage copy.
update public.homepage_translations set
 title = case lang when 'hy' then 'Զարդեր՝ Ձեր ոճի համար' when 'ru' then 'Украшения для вашего стиля' when 'en' then 'Jewellery for your style' else title end,
 body = case lang when 'hy' then 'Արծաթյա զարդերի նրբաճաշակ ընտրանի՝ ամեն օրվա և հատուկ պահերի համար։' when 'ru' then 'Изысканные серебряные украшения на каждый день и для особых моментов.' when 'en' then 'Refined silver pieces for everyday wear and special moments.' else body end,
 button_label = case lang when 'hy' then 'Դիտել տեսականին' when 'ru' then 'Смотреть коллекцию' when 'en' then 'Explore the collection' else button_label end
where section_key = 'hero' and lang in ('hy','ru','en');
