-- Three ways to check in:
--   1) face scan at the kiosk        -> kiosk_face_check_in()
--   2) scan the kiosk QR with phone   -> check_in_qr(token)   (token rotates every minute)
--   3) type the 3-digit event code    -> check_in_code(code)  (code shown only on the kiosk / to admins)
-- The code lives in service_codes (admins only), never in services, so members cannot read it.

-- 1) event codes
create table if not exists service_codes (
  service_id uuid primary key references services on delete cascade,
  code text not null
);
alter table service_codes enable row level security;
drop policy if exists codes_staff on service_codes;
create policy codes_staff on service_codes for select using (is_staff());

create table if not exists code_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  service_id uuid,
  ok boolean not null default false,
  at timestamptz not null default now()
);
alter table code_attempts enable row level security; -- no policies: only security definer functions touch it

alter table settings add column if not exists qr_secret text;
update settings set qr_secret = encode(gen_random_bytes(16), 'hex') where qr_secret is null;
update settings set match_threshold = 0.82;

create or replace function new_checkin_code() returns text
language sql volatile set search_path = public, extensions as
$$ select lpad(((get_byte(b, 0) * 256 + get_byte(b, 1)) % 1000)::text, 3, '0') from (select gen_random_bytes(2) as b) x $$;

create or replace function trg_service_code() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  insert into service_codes (service_id, code) values (new.id, new_checkin_code()) on conflict do nothing;
  return new;
end $$;
drop trigger if exists services_code on services;
create trigger services_code after insert on services for each row execute function trg_service_code();
insert into service_codes (service_id, code) select id, new_checkin_code() from services on conflict do nothing;

-- 2) keep the raw service lookup internal; clients get a safe wrapper
drop function if exists check_in_self();
alter function open_service() rename to _open_service;
revoke execute on function _open_service() from public, anon, authenticated;

create or replace function open_service() returns json
language plpgsql security definer set search_path = public, extensions as $$
declare s services; c text;
begin
  s := _open_service();
  if s.id is null then return null; end if;
  if is_staff() then select code into c from service_codes where service_id = s.id; end if;
  return json_build_object('id', s.id, 'name_en', s.name_en, 'date', s.date, 'start_time', s.start_time, 'end_time', s.end_time, 'code', c);
end $$;

-- 3) QR token: HMAC of service + minute bucket (valid about 2-3 minutes, so it has to be scanned at the kiosk)
create or replace function qr_token(p_service uuid, p_bucket bigint) returns text
language sql stable security definer set search_path = public, extensions as
$$ select substr(encode(hmac((p_service::text || ':' || p_bucket::text)::bytea, (select qr_secret from settings limit 1)::bytea, 'sha256'), 'hex'), 1, 20) $$;
revoke execute on function qr_token(uuid, bigint) from public, anon, authenticated;

-- shared writer: one check-in per member per service
create or replace function _record_checkin(p_member uuid, p_service services, p_method checkin_method, p_conf real) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare
  existing timestamptz;
  grace int;
  late int;
  fname text;
  now_local timestamp := (now() at time zone 'America/Chicago');
begin
  select first_name into fname from members where id = p_member;
  select checked_in_at into existing from attendance where member_id = p_member and service_id = p_service.id;
  if existing is not null then
    return json_build_object('ok', true, 'already', true, 'first_name', fname, 'service', p_service.name_en, 'at', existing);
  end if;
  select late_after_minutes into grace from settings limit 1;
  late := greatest(0, floor(extract(epoch from (now_local - (p_service.date + p_service.start_time))) / 60)::int - coalesce(grace, 10));
  insert into attendance (member_id, service_id, method, confidence_score, late_minutes)
  values (p_member, p_service.id, p_method, p_conf, late);
  update members set last_seen_at = now() where id = p_member;
  return json_build_object('ok', true, 'already', false, 'first_name', fname, 'service', p_service.name_en, 'at', now(), 'late', late);
end $$;
revoke execute on function _record_checkin(uuid, services, checkin_method, real) from public, anon, authenticated;

-- way 3: 3-digit code (5 wrong tries per person per event, then locked for 10 minutes)
create or replace function check_in_code(p_code text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare
  uid uuid := auth.uid();
  mid uuid;
  svc services;
  real_code text;
  fails int;
  done json;
begin
  if not is_approved_user() then raise exception 'not allowed'; end if;
  select id into mid from members where user_id = uid;
  if mid is null then raise exception 'Create your profile first'; end if;
  svc := _open_service();
  if svc.id is null then raise exception 'No service is open right now'; end if;

  if exists (select 1 from attendance where member_id = mid and service_id = svc.id) then
    return _record_checkin(mid, svc, 'self', null);
  end if;

  select count(*) into fails from code_attempts
   where user_id = uid and service_id = svc.id and not ok and at > now() - interval '10 minutes';
  if fails >= 5 then return json_build_object('ok', false, 'error', 'locked'); end if;

  select code into real_code from service_codes where service_id = svc.id;
  if p_code is null or trim(p_code) is distinct from real_code then
    insert into code_attempts (user_id, service_id, ok) values (uid, svc.id, false);
    return json_build_object('ok', false, 'error', 'wrong_code', 'attempts_left', greatest(0, 4 - fails));
  end if;

  done := _record_checkin(mid, svc, 'self', null);
  insert into code_attempts (user_id, service_id, ok) values (uid, svc.id, true);
  return done;
end $$;

-- way 2: QR token from the kiosk
create or replace function check_in_qr(p_token text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare
  uid uuid := auth.uid();
  mid uuid;
  svc services;
  bucket bigint := floor(extract(epoch from now()) / 60)::bigint;
  fails int;
begin
  if not is_approved_user() then raise exception 'not allowed'; end if;
  select id into mid from members where user_id = uid;
  if mid is null then raise exception 'Create your profile first'; end if;
  svc := _open_service();
  if svc.id is null then raise exception 'No service is open right now'; end if;

  if exists (select 1 from attendance where member_id = mid and service_id = svc.id) then
    return _record_checkin(mid, svc, 'qr', null);
  end if;

  select count(*) into fails from code_attempts
   where user_id = uid and service_id = svc.id and not ok and at > now() - interval '10 minutes';
  if fails >= 5 then return json_build_object('ok', false, 'error', 'locked'); end if;

  if p_token is null or p_token not in (qr_token(svc.id, bucket), qr_token(svc.id, bucket - 1), qr_token(svc.id, bucket - 2)) then
    insert into code_attempts (user_id, service_id, ok) values (uid, svc.id, false);
    return json_build_object('ok', false, 'error', 'bad_token');
  end if;

  return _record_checkin(mid, svc, 'qr', null);
end $$;

-- kiosk screen data: only admins/staff signed in on the tablet can call this
create or replace function kiosk_info() returns json
language plpgsql security definer set search_path = public, extensions as $$
declare
  svc services;
  bucket bigint := floor(extract(epoch from now()) / 60)::bigint;
  c text;
begin
  if not is_staff() then raise exception 'not allowed'; end if;
  svc := _open_service();
  if svc.id is null then return json_build_object('open', false); end if;
  select code into c from service_codes where service_id = svc.id;
  return json_build_object(
    'open', true, 'name', svc.name_en, 'date', svc.date, 'start_time', svc.start_time, 'end_time', svc.end_time,
    'code', c, 'token', qr_token(svc.id, bucket)
  );
end $$;

-- way 1: face scan at the kiosk (returns only a first name; ambiguous matches are rejected)
create or replace function kiosk_face_check_in(p_embedding vector(1024)) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare
  svc services;
  thr real;
  best_id uuid;
  best real;
  second real;
begin
  if not is_staff() then raise exception 'not allowed'; end if;
  svc := _open_service();
  if svc.id is null then return json_build_object('ok', false, 'error', 'no_service'); end if;
  select coalesce(match_threshold, 0.82) into thr from settings limit 1;

  with r as (
    select e.member_id, max(1 - (e.embedding <=> p_embedding)) as sim
      from face_embeddings e join members m on m.id = e.member_id
     where m.biometric_consent and m.status <> 'inactive'
     group by e.member_id
  )
  select (select member_id from r order by sim desc limit 1),
         (select sim from r order by sim desc limit 1),
         (select sim from r order by sim desc offset 1 limit 1)
    into best_id, best, second;

  if best_id is null or best < thr then return json_build_object('ok', false, 'error', 'no_match'); end if;
  if second is not null and best - second < 0.03 then return json_build_object('ok', false, 'error', 'ambiguous'); end if;
  return _record_checkin(best_id, svc, 'face', best);
end $$;

-- face enrollment (3 to 5 templates). Needs the person's consent. Old templates are replaced.
create or replace function _enroll(p_member uuid, p_emb jsonb) returns int
language plpgsql security definer set search_path = public, extensions as $$
declare n int;
begin
  if p_emb is null or jsonb_typeof(p_emb) <> 'array' then raise exception 'embeddings required'; end if;
  n := jsonb_array_length(p_emb);
  if n < 1 or n > 5 then raise exception 'send between 1 and 5 face templates'; end if;
  if not exists (select 1 from members where id = p_member and biometric_consent) then
    raise exception 'Face consent is required before enrolling';
  end if;
  delete from face_embeddings where member_id = p_member;
  insert into face_embeddings (member_id, embedding)
    select p_member, (e::text)::vector from jsonb_array_elements(p_emb) as e;
  update members set has_face = true where id = p_member;
  insert into audit_log (actor_id, action, target) values (auth.uid(), 'face_enrolled', p_member::text);
  return n;
end $$;
revoke execute on function _enroll(uuid, jsonb) from public, anon, authenticated;

create or replace function enroll_face(p_member uuid, p_emb jsonb) returns int
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not is_staff() then raise exception 'not allowed'; end if;
  return _enroll(p_member, p_emb);
end $$;

create or replace function enroll_my_face(p_emb jsonb) returns int
language plpgsql security definer set search_path = public, extensions as $$
declare mid uuid;
begin
  if not is_approved_user() then raise exception 'not allowed'; end if;
  select id into mid from members where user_id = auth.uid();
  if mid is null then raise exception 'Create your profile first'; end if;
  return _enroll(mid, p_emb);
end $$;

-- withdrawing consent also clears the enrolled flag
create or replace function withdraw_consent(p_member uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'not allowed'; end if;
  delete from face_embeddings where member_id = p_member;
  update members set biometric_consent = false, has_face = false where id = p_member;
  insert into audit_log (actor_id, action, target) values (auth.uid(), 'withdraw_consent', p_member::text);
end $$;

-- who may call what
revoke execute on function open_service(), check_in_code(text), check_in_qr(text), kiosk_info(),
  kiosk_face_check_in(vector), enroll_face(uuid, jsonb), enroll_my_face(jsonb) from public, anon;
grant execute on function open_service(), check_in_code(text), check_in_qr(text), kiosk_info(),
  kiosk_face_check_in(vector), enroll_face(uuid, jsonb), enroll_my_face(jsonb) to authenticated;
