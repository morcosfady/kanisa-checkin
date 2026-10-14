-- An admin can grant admin access to a specific email address.
--   email already has an account  -> becomes admin right away
--   email has no account yet      -> saved as an invite; whoever signs up with that email is approved as admin automatically

create table if not exists admin_invites (
  email text primary key,
  invited_by uuid,
  created_at timestamptz not null default now()
);
alter table admin_invites enable row level security;
drop policy if exists invites_admin on admin_invites;
create policy invites_admin on admin_invites for all using (is_super_admin()) with check (is_super_admin());

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  first_user boolean := not exists (select 1 from profiles);
  invited boolean := exists (select 1 from admin_invites where lower(email) = lower(new.email));
begin
  insert into profiles (id, full_name, email, role, approved)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email,
    case when first_user or invited then 'super_admin'::app_role else 'member'::app_role end,
    first_user or invited
  );
  if invited then
    delete from admin_invites where lower(email) = lower(new.email);
    insert into audit_log (actor_id, action, target) values (new.id, 'admin_invite_used', new.email);
  end if;
  return new;
end $$;

create or replace function grant_admin(p_email text) returns json
language plpgsql security definer set search_path = public as $$
declare
  e text := lower(trim(coalesce(p_email, '')));
  pid uuid;
begin
  if not is_super_admin() then raise exception 'not allowed'; end if;
  if e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Enter a valid email address'; end if;

  select id into pid from profiles where lower(email) = e;
  if pid is not null then
    update profiles set role = 'super_admin', approved = true, declined_at = null where id = pid;
    insert into audit_log (actor_id, action, target) values (auth.uid(), 'admin_granted', e);
    return json_build_object('status', 'promoted', 'email', e);
  end if;

  insert into admin_invites (email, invited_by) values (e, auth.uid()) on conflict (email) do nothing;
  insert into audit_log (actor_id, action, target) values (auth.uid(), 'admin_invited', e);
  return json_build_object('status', 'invited', 'email', e);
end $$;

create or replace function revoke_admin(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_super_admin() then raise exception 'not allowed'; end if;
  if p_user = auth.uid() then raise exception 'You cannot remove your own admin access'; end if;
  if (select count(*) from profiles where role = 'super_admin' and approved) <= 1 then
    raise exception 'There must be at least one admin';
  end if;
  update profiles set role = 'member' where id = p_user and role = 'super_admin';
  insert into audit_log (actor_id, action, target) values (auth.uid(), 'admin_revoked', p_user::text);
end $$;

revoke execute on function grant_admin(text), revoke_admin(uuid) from public, anon;
grant execute on function grant_admin(text), revoke_admin(uuid) to authenticated;
