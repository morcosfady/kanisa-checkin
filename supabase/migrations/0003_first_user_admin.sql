-- First user created in Supabase Auth becomes Super Admin (Abouna); later users are servants.
-- Turn OFF public sign-ups in Supabase Auth settings; add users from the dashboard.
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    case when exists (select 1 from profiles) then 'servant'::app_role else 'super_admin'::app_role end
  );
  return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user();
