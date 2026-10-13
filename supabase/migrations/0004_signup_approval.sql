-- Anyone can sign up, but has no access until a Super Admin approves them.
alter table profiles add column approved boolean not null default false;
alter table profiles add column email text;
alter table profiles add column declined_at timestamptz;

-- existing super admins stay approved
update profiles set approved = true where role = 'super_admin';
update profiles p set email = u.email from auth.users u where u.id = p.id;

-- staff = approved profiles only
create or replace function is_staff() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from profiles where id = auth.uid() and approved) $$;

create or replace function is_super_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from profiles where id = auth.uid() and approved and role = 'super_admin') $$;

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare first_user boolean := not exists (select 1 from profiles);
begin
  insert into profiles (id, full_name, email, role, approved)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email,
    case when first_user then 'super_admin'::app_role else 'servant'::app_role end,
    first_user
  );
  return new;
end $$;
