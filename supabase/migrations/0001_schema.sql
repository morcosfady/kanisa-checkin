-- Kanisa Check-in: core schema
create extension if not exists vector;
create extension if not exists pgcrypto;

-- enums
create type app_role as enum ('super_admin', 'servant');
create type member_status as enum ('active', 'inactive', 'visitor');
create type service_type as enum ('mass', 'vespers', 'youth_meeting', 'bible_study', 'sunday_school', 'feast', 'other');
create type checkin_method as enum ('face', 'qr', 'manual', 'family');
create type followup_status as enum ('open', 'contacted', 'done');

-- staff profile linked to Supabase Auth
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null,
  role app_role not null default 'servant',
  created_at timestamptz not null default now()
);

create table settings (
  id int primary key default 1 check (id = 1),
  church_name text not null default 'Kanisa',
  logo_url text,
  default_lang text not null default 'ar',
  match_threshold real not null default 0.6,
  cooldown_minutes int not null default 120,
  liveness_enabled boolean not null default true,
  late_after_minutes int not null default 10,
  eftekad_missed_count int not null default 3,
  retention_months int not null default 12,
  timezone text not null default 'America/Chicago'
);
insert into settings default values;

create table families (
  id uuid primary key default gen_random_uuid(),
  family_name text not null,
  address text,
  phone text,
  created_at timestamptz not null default now()
);

create table classes (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  name_en text not null,
  age_range text,
  servant_ids uuid[] not null default '{}'
);

create table members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references families on delete set null,
  first_name text not null,
  last_name text not null,
  arabic_name text,
  gender text check (gender in ('male', 'female')),
  date_of_birth date,
  phone text,
  email text,
  is_minor boolean not null default false,
  class_id uuid references classes on delete set null,
  photo_consent boolean not null default false,
  biometric_consent boolean not null default false,
  consent_signed_at timestamptz,
  consent_signed_by text,
  status member_status not null default 'active',
  notes_public text,
  qr_token text not null unique default encode(gen_random_bytes(12), 'hex'),
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);
create index on members (family_id);
create index on members (class_id);

-- N matches @vladmandic/human faceres (1024); change here if the model changes
create table face_embeddings (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members on delete cascade,
  embedding vector(1024) not null,
  quality_score real,
  created_at timestamptz not null default now()
);
create index face_embeddings_member on face_embeddings (member_id);
create index face_embeddings_vec on face_embeddings using hnsw (embedding vector_cosine_ops);

create table service_templates (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  name_en text not null,
  type service_type not null,
  weekday smallint not null check (weekday between 0 and 6), -- 0 = Sunday
  start_time time not null,
  end_time time,
  active boolean not null default true
);

create table services (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references service_templates on delete set null,
  name_ar text not null,
  name_en text not null,
  type service_type not null,
  date date not null,
  start_time time not null,
  end_time time,
  is_active boolean not null default false,
  unique (template_id, date)
);
create index on services (date);

create table kiosk_devices (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  token_hash text not null unique, -- sha256 of device token
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table attendance (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members on delete cascade,
  service_id uuid not null references services on delete cascade,
  checked_in_at timestamptz not null default now(),
  method checkin_method not null,
  device_id uuid references kiosk_devices on delete set null,
  confidence_score real,
  late_minutes int not null default 0,
  unique (member_id, service_id) -- no duplicate check-ins
);
create index on attendance (service_id);

create table pastoral_notes (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members on delete cascade,
  author_id uuid not null references profiles,
  note text not null,
  created_at timestamptz not null default now()
);

create table followups (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members on delete cascade,
  assigned_to uuid references profiles,
  reason text not null,
  status followup_status not null default 'open',
  notes text,
  created_at timestamptz not null default now()
);

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  target text,
  created_at timestamptz not null default now()
);

-- helpers
create function current_role_name() returns app_role
language sql stable security definer set search_path = public as
$$ select role from profiles where id = auth.uid() $$;

create function is_staff() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from profiles where id = auth.uid()) $$;

create function is_super_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce(current_role_name() = 'super_admin', false) $$;

-- face match: kiosk calls this through the server (service role), never directly
create function match_face(query vector(1024), threshold real)
returns table (member_id uuid, similarity real)
language sql stable as $$
  select e.member_id, (1 - (e.embedding <=> query))::real as similarity
  from face_embeddings e
  join members m on m.id = e.member_id
  where m.biometric_consent and m.status <> 'inactive'
    and (1 - (e.embedding <=> query)) >= threshold
  order by e.embedding <=> query
  limit 1
$$;

-- withdraw consent: delete embeddings immediately and log it
create function withdraw_consent(p_member uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'not allowed'; end if;
  delete from face_embeddings where member_id = p_member;
  update members set biometric_consent = false where id = p_member;
  insert into audit_log (actor_id, action, target)
    values (auth.uid(), 'withdraw_consent', p_member::text);
end $$;

-- retention purge: embeddings of members not seen for N months
create function purge_stale_embeddings() returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  with stale as (
    select m.id from members m, settings s
    where coalesce(m.last_seen_at, m.created_at) < now() - make_interval(months => s.retention_months)
  ), del as (
    delete from face_embeddings where member_id in (select id from stale) returning member_id
  )
  select count(distinct member_id) into n from del;
  insert into audit_log (action, target) values ('retention_purge', n::text);
  return n;
end $$;
