-- Two kinds of users:
--   admin (super_admin, optionally servant): sees everything, approves requests
--   member (regular user): creates own profile, checks in, sees ONLY own history

alter table members add column if not exists user_id uuid unique references profiles(id) on delete set null;

-- new sign-ups are regular members (first user ever is still the admin)
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare first_user boolean := not exists (select 1 from profiles);
begin
  insert into profiles (id, full_name, email, role, approved)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email,
    case when first_user then 'super_admin'::app_role else 'member'::app_role end,
    first_user
  );
  return new;
end $$;

update profiles set role = 'member' where role = 'servant' and not approved;

-- staff = approved admins/servants only; regular members are NOT staff
create or replace function is_staff() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from profiles where id = auth.uid() and approved and role in ('super_admin', 'servant')) $$;

create or replace function is_approved_user() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from profiles where id = auth.uid() and approved) $$;

-- regular members may read only their own rows
create policy members_own_read on members for select using (user_id = auth.uid());
create policy att_own_read on attendance for select using (
  exists (select 1 from members m where m.id = attendance.member_id and m.user_id = auth.uid())
);
create policy families_own_read on families for select using (
  exists (select 1 from members m where m.family_id = families.id and m.user_id = auth.uid())
);
-- they need to see which service is open
create policy services_read_approved on services for select using (is_approved_user());

-- create or update my own profile (family found or created by name)
create or replace function upsert_my_profile(
  p_first text, p_last text, p_gender text, p_dob date, p_phone text, p_email text,
  p_family text, p_consent boolean, p_signed_by text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  fid uuid;
  mid uuid;
  had_consent boolean;
begin
  if not is_approved_user() then raise exception 'not allowed'; end if;
  if coalesce(trim(p_first), '') = '' or coalesce(trim(p_last), '') = '' then raise exception 'name required'; end if;
  if p_consent and coalesce(trim(p_signed_by), '') = '' then raise exception 'signature required'; end if;

  if coalesce(trim(p_family), '') <> '' then
    select id into fid from families where lower(family_name) = lower(trim(p_family)) limit 1;
    if fid is null then insert into families (family_name) values (trim(p_family)) returning id into fid; end if;
  end if;

  select id, biometric_consent into mid, had_consent from members where user_id = uid;
  if mid is null then
    insert into members (user_id, first_name, last_name, gender, date_of_birth, phone, email, family_id, is_minor,
                         biometric_consent, consent_signed_at, consent_signed_by)
    values (uid, trim(p_first), trim(p_last), p_gender, p_dob, nullif(trim(p_phone), ''), nullif(trim(p_email), ''), fid,
            coalesce(p_dob > (current_date - interval '18 years'), false),
            p_consent, case when p_consent then now() end, case when p_consent then trim(p_signed_by) end)
    returning id into mid;
    insert into audit_log (actor_id, action, target) values (uid, 'profile_created', mid::text);
  else
    update members set first_name = trim(p_first), last_name = trim(p_last), gender = p_gender, date_of_birth = p_dob,
      phone = nullif(trim(p_phone), ''), email = nullif(trim(p_email), ''), family_id = fid,
      is_minor = coalesce(p_dob > (current_date - interval '18 years'), false),
      biometric_consent = p_consent,
      consent_signed_at = case when p_consent and not had_consent then now() else consent_signed_at end,
      consent_signed_by = case when p_consent and not had_consent then trim(p_signed_by) else consent_signed_by end
    where id = mid;
    if had_consent and not p_consent then
      delete from face_embeddings where member_id = mid;
      update members set has_face = false where id = mid;
      insert into audit_log (actor_id, action, target) values (uid, 'consent_withdrawn', mid::text);
    end if;
    insert into audit_log (actor_id, action, target) values (uid, 'profile_updated', mid::text);
  end if;
  if p_consent and not coalesce(had_consent, false) then
    insert into audit_log (actor_id, action, target) values (uid, 'consent_signed', mid::text);
  end if;
  return mid;
end $$;

-- check myself in to the open service (no double check-in)
create or replace function check_in_self() returns json
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  mid uuid;
  svc services%rowtype;
  grace int;
  late int;
  existing timestamptz;
  now_local timestamp := (now() at time zone 'America/Chicago');
begin
  if not is_approved_user() then raise exception 'not allowed'; end if;
  select id into mid from members where user_id = uid;
  if mid is null then raise exception 'Create your profile first'; end if;

  select * into svc from services where is_active order by date desc, start_time desc limit 1;
  if svc.id is null then raise exception 'No service is open right now'; end if;

  select checked_in_at into existing from attendance where member_id = mid and service_id = svc.id;
  if existing is not null then
    return json_build_object('already', true, 'service', svc.name_en, 'at', existing);
  end if;

  select late_after_minutes into grace from settings limit 1;
  late := greatest(0, floor(extract(epoch from (now_local - (svc.date + svc.start_time))) / 60)::int - coalesce(grace, 10));
  insert into attendance (member_id, service_id, method, late_minutes) values (mid, svc.id, 'self', late);
  update members set last_seen_at = now() where id = mid;
  return json_build_object('already', false, 'service', svc.name_en, 'at', now(), 'late', late);
end $$;

grant execute on function upsert_my_profile(text, text, text, date, text, text, text, boolean, text) to authenticated;
grant execute on function check_in_self() to authenticated;
