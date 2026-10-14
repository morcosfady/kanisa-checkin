-- Admins only see other admins of their church. Only the super admin sees the super admin row.
create or replace function list_admins() returns json
language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(json_build_object('id', p.id, 'name', p.full_name, 'email', p.email, 'role', p.role, 'church', c.name) order by p.role desc, p.full_name), '[]'::json)
  from profiles p left join churches c on c.id = p.church_id
  where p.approved and is_admin()
    and (
      is_super_admin() and p.role in ('admin', 'super_admin')
      or (p.role = 'admin' and p.church_id = my_church())
    )
$$;
