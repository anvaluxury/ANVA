# ANVA LUXURY — Final report (honest status)

## What was NOT done / not verified
- **Nothing was executed**: the build environment had no internet, so `npm install`, `npm run build`, lint and all runtime tests were NOT run. A syntax-only TypeScript pass found no syntax errors, but type errors may appear on first build.
- **No visual comparison** against the 3 reference screenshots was performed (site never rendered). Layout follows the references but pixel fidelity is unverified; expect a round of CSS corrections.
- Auth, RLS, storage, 2FA, Edge Functions, currency API and Google login are implemented but **untested against a live Supabase project**.
- Not implemented: Instagram/TikTok message prefill (platforms don't allow it), homepage draft/preview-before-publish, server-side rendering (SEO relies on client-rendered meta; Googlebot renders JS, a prerender service would be stronger), rate limiting beyond review limits, exchange rates stored server-side in `exchange_rates` (client caches in localStorage instead), 360° real 3D model (360° = rotate through uploaded photos), admin UI fully translated is partial for rare messages.

## 1 Architecture
React 18 + TypeScript + Vite + React Router; Supabase (Auth, Postgres+RLS, Storage, Edge Functions). Routes: `/:lang` (hy|ru|en), `/:lang/p/:id`, `/:lang/c/:slug`, `/:lang/favorites`, `/:lang/login`, `/:lang/account`, `/:lang/admin/:tab`.
## 2 Pages
Home, category grid, favorites, product modal (+shareable URL), login/register, account, admin (dashboard, products, categories, promotions, reviews, analytics, homepage, notifications+audit, administrators+login history, settings).
## 3 Assets
All 55 processed: see `docs/asset-inventory.md` (27 chroma-keyed, 27 already transparent, 1 opaque background). No green residue measured; edges checked visually on 8 samples only.
## 4 Database & migrations (run in order)
`001_core_auth_roles.sql`, `002_store_schema.sql`, `003_security_audit_notifications.sql`, then (after first registration) `900_assign_first_super_admin.sql`.
## 5 Storage
Buckets: product-images, category-images, homepage-images, brand-assets (public read; write only by roles; JPG/PNG/WebP, 5–8 MB).
## 6 Admin security
Roles super_admin / product_manager / content_manager / analyst enforced in RLS; TOTP 2FA via Supabase MFA, enforced in RLS once enabled (AAL2); audit log by DB triggers; admin creation only via Edge Function `admin-users` (service role key stays server-side); login history written by the same function.
## 7 Languages / currency
hy/ru/en dictionaries (`src/i18n`), DB translations for products, categories, homepage. Base AMD; display RUB/USD/EUR via open.er-api.com (cached 6 h, last valid rate on failure, AMD shown if none). If that API lacks AMD, swap the URL in `src/lib/currency.tsx`.
## 8 SEO
Per-page title/description/OG/canonical/hreflang (client-side), Organization/WebSite/Product/BreadcrumbList JSON-LD, robots.txt, sitemap Edge Function, noindex on admin/account/login/favorites.
## 9 Commands
```
cp .env.example .env     # fill VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, optional VITE_SITE_URL
npm install && npm run build && npm run dev
supabase functions deploy admin-users
supabase functions deploy sitemap --no-verify-jwt
supabase secrets set SITE_URL=https://your-domain
```
Then edit `public/robots.txt` Sitemap line.
## 10 Manual QA checklist (not yet run)
1 register 2 login 3 reset password 4 Google (needs provider) 5 non-admin blocked from /admin 6 create product 7 multi-image upload 8 edit 9 delete 10 create category 11 category image 12 assign product 13 edit homepage 14 switch language 15 choose country 16 currency conversion 17 favorites persist after logout/login 18 review → moderate → publish 19 analytics rows appear 20 promotion start/end 21 newsletter + duplicate 22 role permissions 23 enable 2FA, re-login 24 view-source meta/JSON-LD 25 phone/tablet widths 26 no cart anywhere 27 all 55 assets present 28 no green edges 29 no broken images 30 no dead buttons.
