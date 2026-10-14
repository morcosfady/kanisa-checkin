-- New people create their profile right after making an account, before Abouna approves them.
-- Until approved they are 'visitor' members and cannot check in; approval flips them to 'active'.

create or replace function upsert_my_profile(
  p_first text, p_last text, p_gender text, p_dob date, p_phone text, p_email text,
  p_family text, p_address text, p_city_id uuid, p_city_other text, p_church_id uuid, p_church_other text,
  p_consent boolean, p_signed_by text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  fid uuid;
  mid uuid;
  had_consent boolean;
  co text := nullif(trim(coalesce(p_city_other, '')), '');
  ho text := nullif(trim(coalesce(p_church_other, '')), '');
begin
  if uid is null or not exists (select 1 from profiles where id = uid) then raise exception 'not allowed'; end if;
  if coalesce(trim(p_first), '') = '' or coalesce(trim(p_last), '') = '' then raise exception 'First and last name are required'; end if;
  if p_gender is null or p_gender not in ('male', 'female') then raise exception 'Gender is required'; end if;
  if p_dob is null then raise exception 'Date of birth is required'; end if;
  if coalesce(trim(p_phone), '') = '' then raise exception 'Phone is required'; end if;
  if coalesce(trim(p_email), '') = '' then raise exception 'Email is required'; end if;
  if coalesce(trim(p_family), '') = '' then raise exception 'Family name is required'; end if;
  if coalesce(trim(p_address), '') = '' then raise exception 'Address is required'; end if;
  if p_city_id is null and co is null then raise exception 'City is required'; end if;
  if p_church_id is null and ho is null then raise exception 'Church is required'; end if;
  if p_city_id is not null and not exists (select 1 from cities where id = p_city_id) then raise exception 'Unknown city'; end if;
  if p_church_id is not null and not exists (select 1 from churches where id = p_church_id) then raise exception 'Unknown church'; end if;
  if p_consent and coalesce(trim(p_signed_by), '') = '' then raise exception 'signature required'; end if;

  select id into fid from families where lower(family_name) = lower(trim(p_family)) limit 1;
  if fid is null then insert into families (family_name, address, phone) values (trim(p_family), trim(p_address), nullif(trim(p_phone), '')) returning id into fid; end if;

  select id, biometric_consent into mid, had_consent from members where user_id = uid;
  if mid is null then
    insert into members (user_id, first_name, last_name, gender, date_of_birth, phone, email, family_id, is_minor,
                         address, city_id, city_other, church_id, church_other, status,
                         biometric_consent, consent_signed_at, consent_signed_by)
    values (uid, trim(p_first), trim(p_last), p_gender, p_dob, trim(p_phone), trim(p_email), fid,
            p_dob > (current_date - interval '18 years'),
            trim(p_address), p_city_id, case when p_city_id is null then co end, p_church_id, case when p_church_id is null then ho end,
            case when is_approved_user() then 'active'::member_status else 'visitor'::member_status end,
            p_consent, case when p_consent then now() end, case when p_consent then trim(p_signed_by) end)
    returning id into mid;
    insert into audit_log (actor_id, action, target) values (uid, 'profile_created', mid::text);
  else
    update members set first_name = trim(p_first), last_name = trim(p_last), gender = p_gender, date_of_birth = p_dob,
      phone = trim(p_phone), email = trim(p_email), family_id = fid,
      is_minor = p_dob > (current_date - interval '18 years'),
      address = trim(p_address), city_id = p_city_id, city_other = case when p_city_id is null then co end,
      church_id = p_church_id, church_other = case when p_church_id is null then ho end,
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

-- when Abouna approves someone, their member record becomes active
create or replace function trg_activate_member() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.approved and not old.approved then
    update members set status = 'active' where user_id = new.id and status = 'visitor';
  end if;
  return new;
end $$;
drop trigger if exists profiles_activate_member on profiles;
create trigger profiles_activate_member after update of approved on profiles for each row execute function trg_activate_member();
