# ANVA LUXURY — Phase 1 (assets, design foundation, login/registration)
1. `cp .env.example .env` and fill VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (Supabase → Project Settings → API; anon key only).
2. Supabase SQL editor: run `001_core_auth_roles.sql`, `002_store_schema.sql`, `003_security_audit_notifications.sql`.
3. `npm install && npm run dev` → open http://localhost:5173/hy (login: /hy/login)
4. Google login: Supabase → Authentication → Providers → Google (otherwise the page shows an honest "not configured" message).
5. First Super Admin: register on the site with anvaluxury@mail.ru, confirm the email, then run `supabase/migrations/900_assign_first_super_admin.sql`.
Assets: `public/assets/processed` (55 WebP, green removed), map in `src/assets/index.ts`, inventory in `docs/asset-inventory.json`.
Admin panel: /hy/admin (needs a role in public.user_roles). Tabs: Dashboard, Products, Categories, Homepage, Settings.
Public routes: /hy|ru|en, /:lang/c/:slug, /:lang/p/:id (product modal), /:lang/favorites.
SEO/admin: see docs/FINAL_REPORT.md (deploy `admin-users` and `sitemap` Edge Functions, set VITE_SITE_URL, edit public/robots.txt). Asset table: docs/asset-inventory.md.
