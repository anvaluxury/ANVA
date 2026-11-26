# ANVA LUXURY — Silver Edition

## Run
```
npm install          # also copies the ffmpeg core to public/ffmpeg (postinstall) for the video trimmer
npm run dev          # or: npm run build
```
Environment variables are unchanged and still read from your existing `.env.local`
(`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, optional `VITE_SITE_URL`, `VITE_TRANSLATE_EMAIL`). No secrets are in the code.

## Required database step (one time, additive)
Run `supabase/migrations/005_site_config_and_profile_fields.sql` in Supabase → SQL Editor.
It only **adds** `site_config_versions` (draft + published history, RLS: visitors read published rows only, drafts/writes need `can_edit_content()`, published history is immutable) and updates `handle_new_user()` so the phone typed at registration is stored in `profiles.phone`. Nothing is dropped or altered; RLS stays on.
Until it is applied the public site works exactly as before (defaults) and the editor shows an instruction instead of failing.

## What is new
- Silver design system (`src/styles/silver*.css`), Cormorant Garamond + Noto Serif/Sans Armenian + Inter (hy / ru / en).
- Homepage, catalog, product dialog, login/registration, customer account, admin shell — redesigned; real mobile layouts (burger left, logo centre, icons right; 2-column categories/products).
- Hero: no blur, no "Scroll" text, text position (9 positions) + size/colour/width per device, separate desktop/mobile slides, image/video support, neutral placeholder when empty.
- Categories: image fills the card, per-category position/zoom/card width, columns/aspect/radius/overlay per device.
- Registration: first name, last name, phone, email, password; validation, Enter → next field / submit, show/hide password, loading, success state with "continue to store", always-visible "Back to home".
- **Visual editor** (Admin → Visual editor): live iframe of the real site, desktop/mobile preview, click a section to edit, ~60 controls with per-device values, texts (hy/ru/en) for hero/about/banner, draft save, publish (requires both views checked + confirmation), version history (load an old version into the draft), open preview in a new window.
- **Image editor**: crop (ratios/custom), zoom, drag, rotate, output size; always saves a NEW file, original untouched. Used for hero/about/banner/login images and category images.
- **Video trimmer**: start/end sliders, preview of the trimmed part, writes a NEW MP4 (H.264/AAC) with ffmpeg.wasm to `hero-media`, original kept.

## Not verified / limits (please read)
- Vite itself could not run in my sandbox (the bundled `node_modules` is Windows-only, no network). I verified with `tsc --noEmit` (0 errors) and a full esbuild bundle + headless Chromium with a mocked Supabase. Please run `npm run build` once on your machine.
- Nothing was tested against your real Supabase project (login, real storage upload, RLS, migration execution).
- ffmpeg.wasm encoding was **not** run (package not installable here). The exact ffmpeg arguments were verified natively and produce a valid trimmed MP4; the in-browser engine, its loading from `/ffmpeg/`, and encode time on large files are untested. Large 4K clips may be slow/heavy in the browser.
- Preview playback of MP4 was verified with WebM (headless Chromium has no H.264).
- Removing an image/slide in the editor only removes its use; the file stays in storage (so the live site never breaks). There is no unused-file cleanup yet.
- Product photo upload (Products tab) still uses the old direct uploader (no crop tool); texts in Homepage tab remain live-immediate (the visual editor's texts are draft/publish and override them once published).

## Decisions you should know about
- There is no cart/orders table in this project (ordering is Instagram/TikTok/phone), so there is nothing order-related to preserve or show; no fake orders were added.
- `/` now redirects to the Armenian homepage; the old "choose desktop/mobile" welcome screen was removed because the site is truly responsive now.
- Registration no longer asks to repeat the password (show/hide replaces it).
- Removed dead code that nothing imported: `CountrySelect`, `ContactLine`, `HeroSlider`, admin `HeroSlides` (the `hero_slides` table from migration 004 is untouched). The original failed `tsc` because of `HeroSlides`; it now passes.
- Old CSS files were replaced by the three Silver files; `vite.config.ts` gained `optimizeDeps.exclude` for ffmpeg.
