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

## Two access levels: admin and regular user
- Roles: super_admin (Abouna, sees everything), servant (staff, unused in UI), member (regular user). New sign-ups are members; the first user ever is the admin. Admin chooses Regular user or Admin when approving on /approvals.
- DB (migrations 0007a enums, 0007b portal; both run in Supabase): profiles.role member, attendance method self, members.user_id, is_staff() now excludes members, policies so members read only their own member row, own attendance, own family, and services. RPCs: upsert_my_profile (find or create family by name, create or update own member row, consent and audit log), check_in_self (open service, no duplicates, late minutes). fady.ashraaf@gmail.com was switched to member for testing.
- Regular user pages (src/app/[locale]/(member)): /check-in (I am here button), /profile (create/edit own profile + optional face consent), /history (own check-ins only, even for admins). Member menu shows Check in, My profile, My history; they cannot open admin pages (admin layout redirects to /check-in). /home redirects by role after sign in.
- Admin Today is now real: starts/ends a service (services row, is_active), shows check-ins with how each person checked in (kiosk face, self, QR, manual), manual check-in for people not here yet, expected/late stats. Demo mode keeps the fake live feed.
- Tested: tsc, lint (0 errors), demo-mode browser test of check-in, profile, history, Today (0 console errors), DB verification of functions and roles.
- NOT tested: the regular-user flow against real Supabase with a real member login (needs a sign-in as fady.ashraaf@gmail.com), start service + self check-in + admin feed end to end, approve with role select.
- Open: face enrollment, real kiosk matching (kiosk page still demo), reports, email approver (Apps Script mailer under heavenlyvisions25), seed attendance history.

## Weekly events (recurring services)
- New admin page /schedule ("Weekly events" in the menu): add, pause and delete weekly events (type, day, start, end). Uses service_templates. Starter event created: Divine Liturgy every Sunday 8:00 AM to 12:00 PM.
- DB migration 0008 (run in Supabase): open_service() returns the service open right now: first a service an admin started that has not ended or expired (6h if no end time), else a template whose weekday and time window match now (creates today's services row once, template_id+date unique). If an admin presses End service on a scheduled event it stays closed for that day. check_in_self() now uses open_service().
- Today and /check-in call open_service(); Today shows the time range; "No service is open" card links to the schedule page; manual Start service still works for one-off events.
- Tested: tsc, lint, demo-mode browser test of the schedule page (add, pause, 0 console errors), migration ran with no errors.
- NOT tested: automatic opening against real Supabase during a real Sunday window (try on a Sunday 8 AM to 12 PM Chicago time, or add a test weekly event for today covering the current time).
- Gotcha: times are America/Chicago. Services created from a template have is_active true until the window ends or an admin ends them.

## Three ways to check in (face, kiosk QR, 3-digit code) + face enrollment
- DB migration 0009 (run in Supabase): service_codes (3-digit code per service, auto-created by trigger, readable by admins only), code_attempts, settings.qr_secret, match_threshold set to 0.82. open_service() is now a safe wrapper (code only for staff); the raw _open_service() is internal. check_in_self() removed. New RPCs: check_in_code(code), check_in_qr(token), kiosk_info(), kiosk_face_check_in(embedding), enroll_face(member, embeddings), enroll_my_face(embeddings), withdraw_consent now clears has_face.
- Rules: one check-in per person per service; 5 wrong code/QR tries per person per service then locked 10 minutes; QR token = HMAC of service + minute, valid about 2-3 minutes (kiosk refreshes it); face match needs similarity >= threshold and a 0.03 lead over the next person, otherwise rejected (no_match or ambiguous); only a first name is returned to the kiosk.
- Kiosk (/kiosk, now inside the (kiosk) route group): requires a signed-in admin/servant account on the tablet (login?next=/kiosk). Shows the camera with face scanning (Human 3.3.6 in the browser, models served from /public/models, 4 faces at once, liveness from settings; open /kiosk?liveness=off if it rejects real faces), a rotating QR, and the big 3-digit code. Demo mode (no Supabase keys) simulates faces.
- Phone: /check-in has 3 digit boxes (auto-submit), /c/[token] is the QR landing page (signs in first, keeps the link via ?next=, then checks in automatically; lives outside the member group on purpose so the redirect keeps next). Admin Today shows the code and how each person checked in (face, QR, 3-digit code, manual).
- Face enrollment: admin row menu / profile drawer "Enroll face" and the regular user's profile "Set up face check-in". Needs consent first. 3 steps (straight, turn one way, turn the other), blur and pose gating, only numbers saved (1024 per template).
- next.config.ts aliases @vladmandic/human to its browser build (the default entry is the Node build and breaks the Turbopack build).
- Tested: DB test script as admin and two regular users with rollback (QR valid/bogus/duplicate, code right/wrong/lockout, code hidden from members, member blocked from admin RPCs, enrollment limits and consent rule, face match/stranger/near-duplicate/no-duplicate), PostgREST accepts a JSON number array as the vector argument (temp function, dropped), 20 unit tests, tsc, lint 0 errors, browser test with a fake camera (kiosk QR + code render, models load 200, detection loop runs, enrollment modal, code entry, QR page), live redirects (kiosk, QR login with next).
- NOT tested: a real face (no face image available; needs a person at a real camera). Threshold 0.82 is a starting guess for the faceres model; adjust settings.match_threshold after real use. Liveness (antispoof) could reject real faces on some cameras. Enrollment writes against the real database were not run from the UI (needs a login); DB function was.
- Open: Settings page for threshold and liveness, reports, approver email mailer, seed attendance, Playwright e2e files.

## Dark only + admin access by email
- Theme toggle removed; the app is dark only (html data-theme="dark" set in the layout; the light tokens still exist in globals.css but are unused).
- Approvals page now has an "Admin access" section (components/AdminAccess.tsx): enter an email to grant admin access. Existing account -> becomes admin immediately; no account yet -> saved in admin_invites and that person is approved as admin automatically when they sign up with that email (handle_new_user trigger). Lists current admins (Remove admin with confirm; cannot remove yourself; must keep one admin) and pending invites (removable).
- DB migration 0010 (run in Supabase): admin_invites, grant_admin(email), revoke_admin(user), updated handle_new_user. Audit actions: admin_granted, admin_invited, admin_invite_used, admin_revoked.
- Tested: rolled-back DB test (14 checks: member blocked, bad email, mixed-case email, promote, cannot revoke self, revoke, invite stored lowercase, real auth.users insert picks up invite and is admin+approved, invite consumed, ordinary sign-up still pending member, audit rows); demo-mode browser test (validation, add and remove invite, 0 console errors); tsc and lint clean.
- NOT tested: clicking it in the live app with a real login.

## Profile requirements, address, city and church
- Regular-user profile (/profile): every field is required except face consent: first name, last name, gender (no default), date of birth, phone, email, family name, address, city, church. Enforced in the form and again in the upsert_my_profile database function. No deacon option for users (admins still set it).
- City and Church are typeahead boxes (components/Combobox.tsx: keyboard, ARIA combobox, churches in the chosen city ranked first). Both allow "not listed: use what I typed" (stored in members.city_other / church_other).
- New tables cities (78 DFW cities) and churches (7 DFW Coptic Orthodox churches) with RLS: any approved user reads, only admins write. Source list: src/lib/places.json; migration 0011_places.sql (run in Supabase). members got address, city_id, city_other, church_id, church_other.
- Churches seeded (public sources, may be incomplete): St. Abanoub (Euless), St. George (Arlington), St. Marina (Lewisville), St. Mark (Prosper), St. Mary (Colleyville), St. Meena (Fort Worth), St. Philopateer (Richardson). To add more of the USA later: add rows to cities/churches (admins can insert from the dashboard; update places.json for demo mode).
- Admin Add/Edit member form also has optional Address/City/Church; the member drawer shows address, city and church. The 20 fake members got fake addresses, cities and churches.
- Tested: rolled-back DB test (each missing field blocked, fake city id blocked, member cannot add churches, members can read the lists, "not listed" path), browser test in demo mode (missing-fields message, city and church typeahead, keyboard pick, not-listed option, save), tsc, lint.
- NOT tested: saving from the live site with a real login.

## "Create new profile" flow
- "Request access" is now "Create new profile". Step 1 (/signup): full name, email, password; /api/signup creates the account (email to the approver is optional, needs MAILER_URL), the browser then signs in. Step 2 (/welcome): the full required profile form (MyProfileForm with onboarding) incl. address, city, church. Submit goes to /pending ("Profile sent"). Abouna approves on Approvals; then the person can check in.
- DB migration 0012 (run in Supabase): upsert_my_profile no longer requires approval (only a signed-in account); new members from unapproved accounts are status 'visitor'; trigger profiles_activate_member flips them to 'active' when approved. Unapproved people still cannot check in, use the kiosk or see other members (tested).
- Unapproved users see no menu (AppHeader). /pending redirects to /welcome if the profile form was never finished; /welcome redirects approved or already-profiled users away.
- Removed the Coptic sentence on the sign-in panel; "Come, let us worship" and the logo's Coptic line stay.
- Tested: rolled-back DB test (new account unapproved, saves profile, status visitor, blocked from check-in and kiosk, sees only own row, active after approval); demo-mode browser test of login link text, signup step 1, welcome step 2, 0 console errors; tsc, lint 0 errors.
- NOT tested: the full flow on the live site (it would create a real account in the production database; try it with a fresh email).

## Step 1 form: first and last name, confirm password
- /signup now asks First name, Last name, Email, Password, Confirm password (mismatch shows an error before anything is sent). /api/signup takes firstName and lastName and stores first_name, last_name and full_name in the auth user metadata; /welcome pre-fills the profile form with the exact first and last name typed there.
- Tested: tsc, lint, demo-mode browser test (field list, mismatch message, 0 console errors). The account creation itself was not run on the live site.

## No family, apartment, forgiving search, one person at a time
- Family removed from the UI: no Family field on the profile forms (user and admin), no Families view or sort on Members, no family subtitle, no "Simulate a family" on the kiosk, no family check-in label. DB keeps the old families table and the 'family' check-in enum value (unused) so nothing breaks; members.family_id is just no longer set.
- Kiosk checks in one person at a time: it uses the biggest face; if a second face is more than 45% of its size it shows "One person at a time, please." and checks nobody in.
- Optional Apartment / unit on both forms (members.apartment, migration 0013 run in Supabase; upsert_my_profile signature changed: p_family removed, p_apartment added). Shown in the member drawer address.
- City and Church typeahead now uses src/lib/search.ts: ignores punctuation and capitals ("st philopater" finds "St. Philopateer"), matches word starts and the city hint, tolerates one or two typos and swapped letters. 7 unit tests.
- Note: cities are DFW only (78). A city outside DFW (e.g. Tampa) correctly shows only the "not listed: use what I typed" row.
- Tested: DB check (no family needed, apartment optional, address still required), 25 unit tests, browser test in demo mode (suggestions for the exact typos, save without apartment, no family anywhere on profile, members and kiosk), tsc, lint 0 errors.

## Fix: city and church suggestions empty for new people
- Cause: cities_read / churches_read required an approved account, but new people fill in the profile before approval, so the lists loaded empty and only "not listed" showed. Migration 0014 (run in Supabase) lets any signed-in account read them; signed-out visitors still get an empty result (checked through the public API); only admins can edit.
- Tested: rolled-back DB test as a brand-new unapproved account (78 cities, 7 churches, cannot insert), public API without login returns [].
- Gotcha: when a feature moves earlier in the sign-up flow, re-check every RLS policy it reads.

## Church on each service + Church column in My history
- Migration 0015 (run in Supabase): services.church_id and service_templates.church_id; _open_service() copies the weekly event's church into the day's service. My history is now a table: Service | Church | How | Time (church shows "—" when the service has no church).
- Weekly events: the add form needs a Church (typeahead); each event card has a Church selector (amber border when empty). Today > Start service (one-off) also asks for the church. The starter Sunday Liturgy event has NO church yet: an admin must pick it on the Weekly events page, otherwise history shows "—" for those visits.
- Admin Today feed does not show church (one church per install for now).
- Demo preview: a demo_role=member cookie switches the demo build to the regular-user menu (demo mode only).
- Tested: rolled-back DB test (weekly event opens by itself, service inherits the church, history join returns the church name), browser test in demo mode (table headers, church per row, phone layout, event card selector, native required on the church box when adding an event), tsc, lint 0 errors.

## Service types per church, admins limited to their own church
- New service types (seeded per church when an admin picks their church): Divine Liturgy, Vespers, Bible Study, Sunday School, Choir, Theater Activity, High School Meeting, Family Meeting (Arabic), Family Meeting (English), Men Meeting, Women Meeting, Youth Meeting (Arabic), Youth Meeting (English). Admins add or remove types in "Services at <church>" on the Weekly events page; the old hard-coded dropdowns (Weekly events and Today > Start service) now read this list. The old single "Youth Meeting" and "Other service" are gone.
- Church scope (migrations 0016 and 0017, run in Supabase): profiles.church_id (the church an admin serves), my_church(), service_kinds, set_my_church(church) (one time; adopts existing weekly events and services with no church and seeds the types), grant_admin(email, church) / revoke_admin only within your own church, admin invites carry the church, handle_new_user applies it. RLS: service_kinds and service_templates writable/readable only by an admin of that church; services readable by staff but only written for your own church. trg_profiles_guard blocks changing role or church_id by editing profiles directly (only the functions can).
- UI: admins with no church see a "Which church do you serve?" card (ChurchGate) on Weekly events, Today (Start service) and Approvals. Approvals no longer has the "Admin" option in the dropdown; admins are added only through Admin access, and that list shows only your church's admins and invites.
- The first admin (morcos.genius@gmail.com) has NO church yet: pick it once on first visit; this adopts the starter Sunday Liturgy event.
- Tested: rolled-back DB tests (18 checks: other church admin sees and changes nothing of yours, cannot add admins or services for another church, church is one-time, kinds seeded 13, invites carry the church; 3 guard checks), browser demo test (13 options, youth split, add/remove type, duplicate blocked, add weekly event from a type, approvals), tsc, lint 0 errors, 27 unit tests.
- NOT tested: the one-time church choice and add/remove from the live site with a real login.
- Gotcha: services of other churches are still visible to staff for reading, and the kiosk/check-in opens any active service (multi-church kiosks would need church filtering later).
