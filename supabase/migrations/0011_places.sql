-- Cities and Coptic Orthodox churches (DFW first; more of the USA can be added later)
create table if not exists cities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  state text not null default 'TX',
  unique (name, state)
);
create table if not exists churches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city_id uuid references cities on delete set null,
  unique (name, city_id)
);
alter table cities enable row level security;
alter table churches enable row level security;
drop policy if exists cities_read on cities;
drop policy if exists cities_admin on cities;
drop policy if exists churches_read on churches;
drop policy if exists churches_admin on churches;
create policy cities_read on cities for select using (is_approved_user());
create policy cities_admin on cities for all using (is_super_admin()) with check (is_super_admin());
create policy churches_read on churches for select using (is_approved_user());
create policy churches_admin on churches for all using (is_super_admin()) with check (is_super_admin());

alter table members add column if not exists address text;
alter table members add column if not exists city_id uuid references cities on delete set null;
alter table members add column if not exists city_other text;
alter table members add column if not exists church_id uuid references churches on delete set null;
alter table members add column if not exists church_other text;

insert into cities (name) values
  ('Addison'),
  ('Allen'),
  ('Anna'),
  ('Argyle'),
  ('Arlington'),
  ('Azle'),
  ('Balch Springs'),
  ('Bedford'),
  ('Benbrook'),
  ('Burleson'),
  ('Carrollton'),
  ('Cedar Hill'),
  ('Celina'),
  ('Colleyville'),
  ('Coppell'),
  ('Crowley'),
  ('Dallas'),
  ('Denton'),
  ('DeSoto'),
  ('Duncanville'),
  ('Euless'),
  ('Everman'),
  ('Fairview'),
  ('Farmers Branch'),
  ('Flower Mound'),
  ('Forest Hill'),
  ('Forney'),
  ('Fort Worth'),
  ('Frisco'),
  ('Garland'),
  ('Glenn Heights'),
  ('Grand Prairie'),
  ('Grapevine'),
  ('Haltom City'),
  ('Haslet'),
  ('Highland Park'),
  ('Highland Village'),
  ('Hurst'),
  ('Hutchins'),
  ('Irving'),
  ('Keller'),
  ('Kennedale'),
  ('Lake Dallas'),
  ('Lancaster'),
  ('Lewisville'),
  ('Little Elm'),
  ('Lucas'),
  ('Mansfield'),
  ('McKinney'),
  ('Mesquite'),
  ('Midlothian'),
  ('Murphy'),
  ('North Richland Hills'),
  ('Parker'),
  ('Plano'),
  ('Princeton'),
  ('Prosper'),
  ('Red Oak'),
  ('Richardson'),
  ('Richland Hills'),
  ('River Oaks'),
  ('Roanoke'),
  ('Rockwall'),
  ('Rowlett'),
  ('Royse City'),
  ('Sachse'),
  ('Saginaw'),
  ('Seagoville'),
  ('Southlake'),
  ('Sunnyvale'),
  ('The Colony'),
  ('Trophy Club'),
  ('University Park'),
  ('Watauga'),
  ('Waxahachie'),
  ('Weatherford'),
  ('Westlake'),
  ('Wylie')
on conflict (name, state) do nothing;

insert into churches (name, city_id)
select v.name, c.id
from (values
  ('St. Abanoub Coptic Orthodox Church', 'Euless'),
  ('St. George Coptic Orthodox Church', 'Arlington'),
  ('St. Marina Coptic Orthodox Church', 'Lewisville'),
  ('St. Mark Coptic Orthodox Church', 'Prosper'),
  ('St. Mary Coptic Orthodox Church', 'Colleyville'),
  ('St. Meena Coptic Orthodox Church', 'Fort Worth'),
  ('St. Philopateer Coptic Orthodox Church', 'Richardson')
) as v(name, city)
join cities c on c.name = v.city and c.state = 'TX'
on conflict (name, city_id) do nothing;

-- profile save now needs address, city and church too (face consent stays optional)
drop function if exists upsert_my_profile(text, text, text, date, text, text, text, boolean, text);
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
  if not is_approved_user() then raise exception 'not allowed'; end if;
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
                         address, city_id, city_other, church_id, church_other,
                         biometric_consent, consent_signed_at, consent_signed_by)
    values (uid, trim(p_first), trim(p_last), p_gender, p_dob, trim(p_phone), trim(p_email), fid,
            p_dob > (current_date - interval '18 years'),
            trim(p_address), p_city_id, case when p_city_id is null then co end, p_church_id, case when p_church_id is null then ho end,
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

revoke execute on function upsert_my_profile(text, text, text, date, text, text, text, text, uuid, text, uuid, text, boolean, text) from public, anon;
grant execute on function upsert_my_profile(text, text, text, date, text, text, text, text, uuid, text, uuid, text, boolean, text) to authenticated;
