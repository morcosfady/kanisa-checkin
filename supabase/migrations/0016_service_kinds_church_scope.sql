-- Admins belong to ONE church and manage services (kinds and weekly events) only for that church.
alter table profiles add column if not exists church_id uuid references churches on delete set null;
alter table admin_invites add column if not exists church_id uuid references churches on delete set null;

create or replace function my_church() returns uuid
language sql stable security definer set search_path = public as
$$ select church_id from profiles where id = auth.uid() $$;

-- the list of services a church offers (admins add and remove their own)
create table if not exists service_kinds (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references churches on delete cascade,
  name text not null,
  type service_type not null default 'other',
  unique (church_id, name)
);
alter table service_kinds enable row level security;
drop policy if exists kinds_own_church on service_kinds;
create policy kinds_own_church on service_kinds for all
  using (is_super_admin() and church_id = my_church())
  with check (is_super_admin() and church_id = my_church());

-- weekly events: only the admin's own church
drop policy if exists templates_staff on service_templates;
drop policy if exists templates_own_church on service_templates;
create policy templates_own_church on service_templates for all
  using (is_super_admin() and church_id = my_church())
  with check (is_super_admin() and church_id = my_church());

-- services: staff can read all (check-in needs it), but only change their own church's
drop policy if exists services_staff on services;
drop policy if exists services_staff_read on services;
drop policy if exists services_staff_write on services;
create policy services_staff_read on services for select using (is_staff());
create policy services_staff_write on services for all
  using (is_staff() and church_id = my_church())
  with check (is_staff() and church_id = my_church());

create or replace function seed_service_kinds(p_church uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into service_kinds (church_id, name, type) values
    (p_church, 'Divine Liturgy', 'mass'),
    (p_church, 'Vespers', 'vespers'),
    (p_church, 'Bible Study', 'bible_study'),
    (p_church, 'Sunday School', 'sunday_school'),
    (p_church, 'Choir', 'other'),
    (p_church, 'Theater Activity', 'other'),
    (p_church, 'High School Meeting', 'other'),
    (p_church, 'Family Meeting (Arabic)', 'other'),
    (p_church, 'Family Meeting (English)', 'other'),
    (p_church, 'Men Meeting', 'other'),
    (p_church, 'Women Meeting', 'other'),
    (p_church, 'Youth Meeting (Arabic)', 'other'),
    (p_church, 'Youth Meeting (English)', 'other')
  on conflict (church_id, name) do nothing;
end $$;
revoke execute on function seed_service_kinds(uuid) from public, anon, authenticated;

-- one-time: an admin chooses the church they serve (later admins get it from the admin who adds them)
create or replace function set_my_church(p_church uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_super_admin() then raise exception 'not allowed'; end if;
  if (select church_id from profiles where id = auth.uid()) is not null then raise exception 'Your church is already set'; end if;
  if not exists (select 1 from churches where id = p_church) then raise exception 'Unknown church'; end if;
  update profiles set church_id = p_church where id = auth.uid();
  -- events and services created before churches existed now belong to this church
  update service_templates set church_id = p_church where church_id is null;
  update services set church_id = p_church where church_id is null;
  perform seed_service_kinds(p_church);
  insert into audit_log (actor_id, action, target) values (auth.uid(), 'church_set', p_church::text);
end $$;

-- new accounts that match an admin invite get that church
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  first_user boolean := not exists (select 1 from profiles);
  inv admin_invites;
begin
  select * into inv from admin_invites where lower(email) = lower(new.email);
  insert into profiles (id, full_name, email, role, approved, church_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email,
    case when first_user or inv.email is not null then 'super_admin'::app_role else 'member'::app_role end,
    first_user or inv.email is not null,
    inv.church_id
  );
  if inv.email is not null then
    delete from admin_invites where lower(email) = lower(new.email);
    insert into audit_log (actor_id, action, target) values (new.id, 'admin_invite_used', new.email);
  end if;
  return new;
end $$;

-- granting admin now says WHICH church; an admin can only add admins for their own church
drop function if exists grant_admin(text);
create or replace function grant_admin(p_email text, p_church uuid default null) returns json
language plpgsql security definer set search_path = public as $$
declare
  e text := lower(trim(coalesce(p_email, '')));
  pid uuid;
  mine uuid := my_church();
  ch uuid := coalesce(p_church, my_church());
  theirs uuid;
begin
  if not is_super_admin() then raise exception 'not allowed'; end if;
  if e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Enter a valid email address'; end if;
  if ch is null then raise exception 'Choose your own church first'; end if;
  if mine is null or ch <> mine then raise exception 'You can only add admins for your own church'; end if;

  select id, church_id into pid, theirs from profiles where lower(email) = e;
  if pid is not null then
    if theirs is not null and theirs <> ch then raise exception 'That person already manages another church'; end if;
    update profiles set role = 'super_admin', approved = true, declined_at = null, church_id = ch where id = pid;
    insert into audit_log (actor_id, action, target) values (auth.uid(), 'admin_granted', e);
    return json_build_object('status', 'promoted', 'email', e);
  end if;

  insert into admin_invites (email, invited_by, church_id) values (e, auth.uid(), ch)
    on conflict (email) do update set church_id = excluded.church_id;
  insert into audit_log (actor_id, action, target) values (auth.uid(), 'admin_invited', e);
  return json_build_object('status', 'invited', 'email', e);
end $$;

create or replace function revoke_admin(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_super_admin() then raise exception 'not allowed'; end if;
  if p_user = auth.uid() then raise exception 'You cannot remove your own admin access'; end if;
  if not exists (select 1 from profiles where id = p_user and role = 'super_admin' and church_id is not distinct from my_church()) then
    raise exception 'You can only remove admins of your own church';
  end if;
  if (select count(*) from profiles where role = 'super_admin' and approved and church_id is not distinct from my_church()) <= 1 then
    raise exception 'There must be at least one admin';
  end if;
  update profiles set role = 'member' where id = p_user and role = 'super_admin';
  insert into audit_log (actor_id, action, target) values (auth.uid(), 'admin_revoked', p_user::text);
end $$;

revoke execute on function my_church(), set_my_church(uuid), grant_admin(text, uuid), revoke_admin(uuid) from public, anon;
grant execute on function my_church(), set_my_church(uuid), grant_admin(text, uuid), revoke_admin(uuid) to authenticated;
