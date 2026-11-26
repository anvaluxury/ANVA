# ANVA update

1. Run `supabase/migrations/004_hero_slides.sql` in Supabase -> SQL Editor (creates the `hero_slides` table + RLS).
2. Delete `src/components/CountrySelect.tsx` (no longer used).
3. `npm run build` (type-check) then `npm run dev`.
4. Admin -> Slider: add slides, upload/replace/delete images, reorder, hide, delete.
.env.local / Supabase settings are unchanged.
