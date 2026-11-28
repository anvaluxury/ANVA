# ANVA LUXURY — motion layer

New files: `src/styles/motion.css`, `src/lib/motion.ts`, `src/components/{Splash,PageTransition,Loaders}.tsx`.
Edited (class names / small wrappers only, no data logic): `main.tsx`, `SiteChrome.tsx`, `ProductModal.tsx`, `Grid.tsx`, `Home.tsx`, `AuthPage.tsx`, `Account.tsx`, `admin/Admin.tsx`.
Supabase, auth, routes, env, admin logic and the database are untouched.

| Reference video | Where it lives on the site |
|---|---|
| Loader styles | Splash (shape morph + progress ring, real logo), product-grid / featured / dialog skeletons, typing dots on admin waits |
| Button styles | press-down edge + spring release, cursor "liquid light", ripple, glow pulse on hero/banner CTA, jelly bounce (hearts, order icons, thumbs), load→success morph (newsletter, login) |
| Transition styles | circle reveal between pages; modal sheet (mobile) / zoom from the tapped card (desktop) for product dialog |
| Toggle styles | liquid fill (`.switch`), icon morph ×→✓ (`.chk`), checkbox + spark burst (`.check`), segmented spring pill (language, login/register) |
| Glass menu | liquid-glass pill gliding under header links; staggered mobile menu |
| Input fields | focus glow + icon shift, error shake |

Respects `prefers-reduced-motion` (splash, disc, pill, ripples, reveals are all skipped). Hover lighting is desktop-only (`hover:hover and pointer:fine`).
Not implemented: expand-morph button (+ → pill), floating labels, pull-to-refresh, day/night & lamp switches (no matching feature on the site).

## Noir theme (from the grayscale palette reference)
`src/styles/theme-noir.css` (imported last): palette #0B0B0B · #1A1A1A · #333333 · #6B6B6B · #D9D9D9 · #FFFFFF.
Scoped to `.site` and `.auth`, so the admin panel stays light. Effects from the reference: soft white light blooms drifting on the near-black
background, layered capsule shapes (login art panel), glass nav / buttons, gradient headings. Product image trays stay silver so any photo blends in.
Glow colour is a variable: `--g1`, `--g2`, `--mo-glow`, `--mo-purple` in `motion.css` — change those four to bring any accent colour back.
Muted text uses #9A9A9A instead of #6B6B6B for readability.

## Phone layout (`mobile.css`, `components/MobileDock.tsx`)
Floating glass dock replaces the burger menu on phones: tap, or slide a finger along it — the glass pill follows the finger, stretches with speed,
snaps to the nearest section on release and scrolls there smoothly; on the homepage it also follows the scroll position.
Also: swipeable snap carousel for collections, 2-column product grid, bottom-sheet product dialog with a grab handle, 16px inputs (no iOS zoom),
44px+ tap targets, safe-area padding.
