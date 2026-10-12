# Kanisa Check-in: structure and decisions

## Folder structure
```
src/
  app/
    [locale]/                 # ar (default, RTL) / en via next-intl
      (admin)/                # auth-protected dashboard
        dashboard/ members/ services/ attendance/ reports/
        followups/ settings/ (Phase 2: sunday-school, birthdays, visitors)
      kiosk/                  # full-screen check-in, PWA
      privacy/                # public privacy page
      login/
    api/
      kiosk/{match,checkin,search}/   # verify device token, then service role
      reports/{xlsx,pdf}/
      cron/{purge,services}/          # retention + recurring services
  components/                 # ui (shadcn), kiosk, members, charts
  lib/
    supabase/{client,server,admin}.ts
    face/{human,quality,liveness}.ts  # browser-only
    attendance/{late,dedupe,eftekad}.ts  # pure, unit tested
    i18n/  notify/ (provider interface)
  messages/{ar,en}.json
supabase/migrations  supabase/seed
tests/{unit,e2e}   docs/
```

## Decisions
- Embeddings: `@vladmandic/human` faceres, 1024-dim, cosine distance, pgvector HNSW.
- Matching runs in a server route (service role) so the kiosk never reads vectors or member data. Only the welcome name is returned.
- Kiosk auth: per-device token, stored hashed in `kiosk_devices`; revoke by setting `revoked_at`.
- Duplicate check-ins blocked by `unique (member_id, service_id)`.
- Late minutes computed from service start in America/Chicago.
- Consent withdrawal and retention purge are SQL functions that also write `audit_log`.
- Unmatched face: no photo stored; kiosk offers name search, QR, or visitor registration.
- No kiosk table access via RLS at all.

## Build order
Phase 0 schema + scaffold (done) → auth/i18n/layout → members + consent + enrollment → kiosk → dashboard → reports → seed + tests → Phase 2.
