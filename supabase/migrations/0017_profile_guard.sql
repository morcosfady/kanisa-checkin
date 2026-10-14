-- Roles and churches can only change through the controlled functions (grant_admin, revoke_admin, set_my_church),
-- never by editing the profiles table directly from the app.
create or replace function trg_profiles_guard() returns trigger
language plpgsql as $$
begin
  if (new.role is distinct from old.role or new.church_id is distinct from old.church_id)
     and current_user in ('authenticated', 'anon') then
    raise exception 'Change admin access from the Admin access section';
  end if;
  return new;
end $$;
drop trigger if exists profiles_guard on profiles;
create trigger profiles_guard before update on profiles for each row execute function trg_profiles_guard();
