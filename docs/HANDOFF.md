# Kanisa Check-in Handoff

## Phase 0: scaffold, schema, architecture
- Created Next.js (App Router, TS, Tailwind) app in F:\kanisa-checkin (separate from Pharaoh's Bites).
- Added supabase/migrations 0001_schema.sql (tables, pgvector, match/withdraw/purge functions) and 0002_rls.sql (RLS).
- Added docs/ARCHITECTURE.md (folder structure, decisions).
- Tested: scaffold installs; `npm run lint` not yet run. SQL not yet run against a Supabase project.
- Open: shadcn, next-intl, Supabase client, auth, everything in Phase 1.
- Gotchas: embedding dim 1024 must match the face model; kiosk reads nothing directly from the DB.

## Phase 1a: foundation + demo pages
- next-intl (ar default RTL / en), Cairo + Inter, Coptic theme (red/gold/cream).
- Pages (demo data from src/lib/demo.ts): /dashboard, /members, /kiosk (demo mode, no camera), /privacy, /login (static form).
- Pure logic src/lib/attendance/logic.ts + 8 vitest tests (late minutes, duplicates, Eftekad).
- Files: next.config.ts, src/proxy.ts, src/i18n/*, src/messages/*, src/components/*, src/app/[locale]/*, tests/unit.
- Tested: vitest 8/8, tsc, eslint, next build, curl smoke of 5 routes (200, correct dir).
- NOT done: Supabase wiring/auth, registration + consent, real face camera, reports, seed, Playwright, Phase 2.
- Gotchas: next-intl plugin removed (its SWC binding fails on this Windows PC), alias set manually in next.config.ts. Next 16 uses proxy.ts, not middleware.ts. npm needs --legacy-peer-deps for vitest.

## Phase 1b: Tenhos branding + Supabase auth
- Renamed app to Tenhos. Logo.tsx (SVG gold ring + budded cross, Cinzel wordmark, Coptic line). Palette burgundy/cream/gold.
- Supabase project created (free org "Kanisa", project kanisa-checkin). Migrations 0001, 0002, 0003 run in the SQL editor.
- 0003: first auth user becomes super_admin via trigger; later users are servants.
- Login form + sign out, proxy.ts guards /dashboard, /members etc. when env keys exist; no keys = demo mode.
- .env.local holds URL + publishable key (gitignored). .env.example lists all vars.
- Tested: tsc, lint, build, protected route redirects to login (307), logo renders.
- NOT tested: real sign-in (no admin user yet).
- Open: create admin user in Supabase Auth, turn off public sign-ups, set Vercel env vars, members CRUD, consent + enrollment, real kiosk, reports, seed, Playwright, Phase 2.
- Gotchas: secret key (SUPABASE_SECRET_KEY) not set yet; needed for kiosk routes. Never commit it.

## Phase 1c: rename, English only, Vercel live, signup with approval
- Renamed Tenhos to Amoinee (Logo.tsx, messages, manifest). App is English only: routing.ts has locale "en", no URL prefix, Arabic toggle and ar.json removed.
- Deployed on Vercel: https://kanisa-checkin.vercel.app (project kanisa-checkin, team morcosfady, auto-deploys on push to master). Env vars set on Vercel: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.
- Deploy fixes: .npmrc legacy-peer-deps=true; removed Windows-only @swc/core-win32-x64-msvc (broke Linux install).
- Signup with approval: /signup form -> /api/signup (supabase signUp, no access) -> optional email to heavenlyvisions25@gmail.com via Apps Script mailer. Admin accepts or declines on /approvals. Unapproved users see /pending. Migration 0004 (approved, email, declined_at; is_staff/is_super_admin require approved). Decline sets declined_at, rows are never deleted so the first-user-is-admin rule cannot fire again.
- Supabase Auth settings changed: public sign-ups ON, Confirm email OFF. Admin user morcos.genius@gmail.com is super_admin and approved. Test request fady.ashraaf@gmail.com is a pending servant.
- Tested: tsc, lint, build, live routes (login 200, dashboard redirects to login when signed out), DB state checked by SQL.
- NOT tested: approve flow end to end, signup email (mailer not deployed).
- Open: Apps Script mailer must be created under heavenlyvisions25@gmail.com (apps-script/approval-mailer.gs), then set MAILER_URL and MAILER_TOKEN in Vercel and .env.local (token saved locally at C:\Users\fadya\.amoinee_mailer_token, never commit). Dashboard and members still use demo data. Still to build: member registration + consent, face enrollment, real kiosk check-in, reports, seed data, Playwright, Phase 2.
- Gotchas: next-intl plugin is not used (SWC native binding fails on this PC), alias set by hand in next.config.ts. Browser pane sessions for Supabase/Vercel/GitHub can expire. Browser pane is signed into morcos.genius, never send email from it.

## Phase 2: visual redesign (7 phases, all done)
- Tokens in src/app/globals.css (burgundy, gold, cream, ink; semantic success/warning/danger/info; dark mode via html[data-theme], set by an inline script from localStorage or system preference; toggle in header). Fonts: Cinzel (display), Inter, Cairo, Noto Sans Coptic via next/font. Logo.tsx has variant full|mark.
- SacredBackground.tsx: gradient, drifting cross lattice, 28 gold particles on one canvas (30fps cap, pauses when tab hidden, static for prefers-reduced-motion), haze blobs. Panel and light variants (sign in, kiosk). Headless check: about 60 fps page rate with it running; not measured on a real tablet.
- Shell: AppHeader.tsx (sticky, blur on scroll, icons, sliding gold underline, Approvals count badge, user menu with role badge, theme toggle) and a bottom tab bar on phones. Page transition in (admin)/template.tsx, skeleton in (admin)/loading.tsx, sonner toasts.
- Members: components/members/* (stat cards, search with Ctrl+K, filter chips, table/cards/families views, sort, pagination, row menu, withdraw-consent confirm, profile drawer with tabs and 52-week heatmap). Phones show cards instead of the table. Full-row colors removed.
- Today: components/today/TodayView.tsx (hero with live clock, count-up stats, live feed that adds a demo check-in every 9s, manual check-in, Recharts arrivals chart). Late badge and On time % are back because this brief asked for them (an earlier request removed them).
- Kiosk: components/kiosk/KioskScreen.tsx (camera preview via getUserMedia with fallback, gold corner brackets, scan line, success check, stacked welcome cards, 3s auto-dismiss, WebAudio chime, unknown-face card, name search, demo buttons).
- Sign in / request access use AuthLayout (split panel with "Come, let us worship"). Approvals and Privacy restyled.
- Demo data (src/lib/demo.ts) is fake and richer (24 members, 12 arrivals). Members, Today and Kiosk still read demo data, not Supabase.
- Tested: tsc, eslint (0 errors), vitest 8/8, axe WCAG A/AA on 6 pages in light and dark (0 violations), interaction smoke test (filter, drawer, kiosk, approve) with 0 console errors. Screenshots in docs/screenshots/before and /after (scripts-shots.mjs, scripts-a11y.mjs).
- Decisions: stayed English only (no AR/EN toggle, no RTL) because you removed Arabic earlier. Used own drawer/dialog components instead of shadcn. Reports nav item is hidden until a Reports page exists. Lighthouse was not run.
- Gotchas: to take screenshots build with empty NEXT_PUBLIC_SUPABASE_* (demo mode, auth skipped). Tailwind dark: variant is tied to data-theme.

## Members: real data, Add/Edit member, consent
- Members page now loads from Supabase when keys exist (src/lib/members.ts loadMembers: members + families + classes + attendance summary); demo data otherwise.
- Add member / Edit member form (components/members/MemberForm.tsx): name, gender, deacon, DOB (under 18 = minor, parent/guardian types their name to sign), phone, email, status, family (existing or new). Face consent block with typed signature and signed date. Writes members, families, and audit_log (member_created, member_updated, consent_signed, consent_withdrawn).
- Withdraw consent calls the withdraw_consent database function (deletes embeddings, logs it) from the row menu and the profile drawer.
- Migration 0006 adds members.has_face (run in Supabase, done). Face status in the list: none (no consent), pending (consent but has_face false), enrolled.
- Tested: tsc, lint (0 errors), demo-mode browser test (add with new family, validation message for missing guardian signature, new member found by search, 0 console errors).
- NOT tested: saving against the real Supabase project (needs a signed-in session; try it on the live site), edit and withdraw against real data.
- Open: face enrollment (Enroll face is still a toast), manual check-in is still a toast, attendance stats are empty until attendance exists, Today and Kiosk still use demo data.
