-- Three kinds of users:
--   member       regular user, no approval needed
--   admin        priest / church admin, approved by an admin of that church or the super admin, manages ONE church
--   super_admin  only one person (enforced below), can manage every church

-- who counts as what
create or replace function is_staff() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from profiles where id = auth.uid() and approved and role in ('super_admin', 'admin', 'servant')) $$;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from profiles where id = auth.uid() and approved and role in ('super_admin', 'admin')) $$;

create or replace function is_super_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from profiles where id = auth.uid() and approved and role = 'super_admin') $$;

-- super admin may manage any church; an admin only their own
create or replace function can_manage_church(c uuid) returns boolean
language sql stable security definer set search_path = public as
$$ select is_super_admin() or (is_admin() and c is not null and c = my_church()) $$;

-- exactly one super admin
create unique index if not exists one_super_admin on profiles ((true)) where role = 'super_admin';

-- admin requests live on the profile
alter table profiles add column if not exists admin_request_church uuid references churches on delete set null;
alter table profiles add column if not exists admin_requested_at timestamptz;

-- regular users are never "pending"
update profiles set approved = true where approved = false;

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
    case when first_user then 'super_admin'::app_role when inv.email is not null then 'admin'::app_role else 'member'::app_role end,
    true,
    inv.church_id
  );
  if inv.email is not null then
    delete from admin_invites where lower(email) = lower(new.email);
    insert into audit_log (actor_id, action, target) values (new.id, 'admin_invite_used', new.email);
  end if;
  return new;
end $$;

-- policies that mean "any admin" (not just the super admin)
drop policy if exists settings_write on settings;
create policy settings_write on settings for update using (is_admin());
drop policy if exists classes_admin on classes;
create policy classes_admin on classes for all using (is_admin()) with check (is_admin());
drop policy if exists att_admin on attendance;
create policy att_admin on attendance for all using (is_admin()) with check (is_admin());
drop policy if exists notes_admin on pastoral_notes;
create policy notes_admin on pastoral_notes for all using (is_admin()) with check (is_admin());
drop policy if exists fu_admin on followups;
create policy fu_admin on followups for all using (is_admin()) with check (is_admin());
drop policy if exists kiosk_admin on kiosk_devices;
create policy kiosk_admin on kiosk_devices for all using (is_admin()) with check (is_admin());

-- church-scoped things
drop policy if exists invites_admin on admin_invites;
create policy invites_admin on admin_invites for all using (can_manage_church(church_id)) with check (can_manage_church(church_id));
drop policy if exists kinds_own_church on service_kinds;
create policy kinds_own_church on service_kinds for all using (can_manage_church(church_id)) with check (can_manage_church(church_id));
drop policy if exists templates_own_church on service_templates;
create policy templates_own_church on service_templates for all using (can_manage_church(church_id)) with check (can_manage_church(church_id));
drop policy if exists services_staff_write on services;
create policy services_staff_write on services for all
  using (is_staff() and can_manage_church(church_id))
  with check (is_staff() and can_manage_church(church_id));

-- an admin chooses their church ONCE; the super admin can switch to any church at any time
create or replace function set_my_church(p_church uuid) returns void
language plpgsql security definer set search_path = public as $$
declare cur uuid;
begin
  if not is_admin() then raise exception 'not allowed'; end if;
  select church_id into cur from profiles where id = auth.uid();
  if cur is not null and not is_super_admin() then raise exception 'Your church is already set'; end if;
  if not exists (select 1 from churches where id = p_church) then raise exception 'Unknown church'; end if;
  update profiles set church_id = p_church where id = auth.uid();
  if cur is null then
    update service_templates set church_id = p_church where church_id is null;
    update services set church_id = p_church where church_id is null;
  end if;
  if not exists (select 1 from service_kinds where church_id = p_church) then perform seed_service_kinds(p_church); end if;
  insert into audit_log (actor_id, action, target) values (auth.uid(), case when cur is null then 'church_set' else 'church_switched' end, p_church::text);
end $$;

-- 1) someone asks to be an admin of a church
create or replace function request_admin(p_church uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not allowed'; end if;
  if (select role from profiles where id = auth.uid()) in ('admin', 'super_admin') then raise exception 'You are already an admin'; end if;
  if not exists (select 1 from churches where id = p_church) then raise exception 'Choose a church from the list'; end if;
  update profiles set admin_request_church = p_church, admin_requested_at = now() where id = auth.uid();
  insert into audit_log (actor_id, action, target) values (auth.uid(), 'admin_requested', p_church::text);
end $$;

create or replace function cancel_admin_request() returns void
language sql security definer set search_path = public as
$$ update profiles set admin_request_church = null, admin_requested_at = null where id = auth.uid() $$;

-- 2) an admin of that church (or the super admin) approves or declines
create or replace function approve_admin(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare c uuid;
begin
  select admin_request_church into c from profiles where id = p_user;
  if c is null then raise exception 'No admin request from this person'; end if;
  if not can_manage_church(c) then raise exception 'Only an admin of that church can approve this'; end if;
  update profiles set role = 'admin', church_id = c, approved = true, admin_request_church = null, admin_requested_at = null where id = p_user and role <> 'super_admin';
  insert into audit_log (actor_id, action, target) values (auth.uid(), 'admin_approved', p_user::text);
end $$;

create or replace function decline_admin(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare c uuid;
begin
  select admin_request_church into c from profiles where id = p_user;
  if c is null then raise exception 'No admin request from this person'; end if;
  if not can_manage_church(c) then raise exception 'Only an admin of that church can decline this'; end if;
  update profiles set admin_request_church = null, admin_requested_at = null where id = p_user;
  insert into audit_log (actor_id, action, target) values (auth.uid(), 'admin_declined', p_user::text);
end $$;

-- 3) lists for the Approvals page (scoped: admins see only their church, the super admin sees all)
create or replace function list_admin_requests() returns json
language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(json_build_object('id', p.id, 'name', p.full_name, 'email', p.email, 'church_id', p.admin_request_church, 'church', c.name, 'at', p.admin_requested_at) order by p.admin_requested_at), '[]'::json)
  from profiles p join churches c on c.id = p.admin_request_church
  where p.admin_request_church is not null and can_manage_church(p.admin_request_church)
$$;

create or replace function list_admins() returns json
language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(json_build_object('id', p.id, 'name', p.full_name, 'email', p.email, 'role', p.role, 'church', c.name) order by p.role desc, p.full_name), '[]'::json)
  from profiles p left join churches c on c.id = p.church_id
  where p.role in ('admin', 'super_admin') and p.approved and is_admin() and (is_super_admin() or p.church_id = my_church())
$$;

create or replace function list_admin_invites() returns json
language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(json_build_object('email', i.email, 'church', c.name) order by i.created_at), '[]'::json)
  from admin_invites i left join churches c on c.id = i.church_id
  where can_manage_church(i.church_id)
$$;

-- direct invite/promotion by an admin: the super admin can name any church, an admin only their own
drop function if exists grant_admin(text, uuid);
create or replace function grant_admin(p_email text, p_church uuid default null) returns json
language plpgsql security definer set search_path = public as $$
declare
  e text := lower(trim(coalesce(p_email, '')));
  pid uuid;
  prole app_role;
  theirs uuid;
  ch uuid := coalesce(p_church, my_church());
begin
  if not is_admin() then raise exception 'not allowed'; end if;
  if e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Enter a valid email address'; end if;
  if ch is null then raise exception 'Choose your own church first'; end if;
  if not can_manage_church(ch) then raise exception 'You can only add admins for your own church'; end if;

  select id, church_id, role into pid, theirs, prole from profiles where lower(email) = e;
  if pid is not null then
    if prole = 'super_admin' then raise exception 'That person is already the super admin'; end if;
    if theirs is not null and theirs <> ch then raise exception 'That person already manages another church'; end if;
    update profiles set role = 'admin', approved = true, declined_at = null, church_id = ch, admin_request_church = null, admin_requested_at = null where id = pid;
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
declare c uuid; r app_role;
begin
  if not is_admin() then raise exception 'not allowed'; end if;
  if p_user = auth.uid() then raise exception 'You cannot remove your own admin access'; end if;
  select church_id, role into c, r from profiles where id = p_user;
  if r is distinct from 'admin' then raise exception 'Only church admins can be removed here'; end if;
  if not can_manage_church(c) then raise exception 'You can only remove admins of your own church'; end if;
  update profiles set role = 'member' where id = p_user;
  insert into audit_log (actor_id, action, target) values (auth.uid(), 'admin_revoked', p_user::text);
end $$;

revoke execute on function is_admin(), can_manage_church(uuid), request_admin(uuid), cancel_admin_request(), approve_admin(uuid),
  decline_admin(uuid), list_admin_requests(), list_admins(), list_admin_invites(), grant_admin(text, uuid), revoke_admin(uuid), set_my_church(uuid)
  from public, anon;
grant execute on function is_admin(), can_manage_church(uuid), request_admin(uuid), cancel_admin_request(), approve_admin(uuid),
  decline_admin(uuid), list_admin_requests(), list_admins(), list_admin_invites(), grant_admin(text, uuid), revoke_admin(uuid), set_my_church(uuid)
  to authenticated;
