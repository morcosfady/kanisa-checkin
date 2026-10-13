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
