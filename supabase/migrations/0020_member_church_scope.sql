-- Members, their attendance, notes and follow-ups are limited to the church an admin manages.
-- The super admin passes (the app filters to the church they are managing right now).

create or replace function can_see_member(m uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select is_staff() and (
    is_super_admin()
    or exists (select 1 from members x where x.id = m and x.church_id is not null and x.church_id = my_church())
  )
$$;

drop policy if exists members_staff on members;
create policy members_staff on members for all
  using (is_staff() and (is_super_admin() or church_id = my_church()))
  with check (is_staff() and (is_super_admin() or church_id = my_church()));

drop policy if exists att_admin on attendance;
create policy att_admin on attendance for all
  using (is_admin() and (is_super_admin() or exists (select 1 from services s where s.id = service_id and s.church_id = my_church())))
  with check (is_admin() and (is_super_admin() or exists (select 1 from services s where s.id = service_id and s.church_id = my_church())));

drop policy if exists notes_admin on pastoral_notes;
create policy notes_admin on pastoral_notes for all
  using (is_admin() and can_see_member(member_id)) with check (is_admin() and can_see_member(member_id));

drop policy if exists fu_admin on followups;
create policy fu_admin on followups for all
  using (is_admin() and can_see_member(member_id)) with check (is_admin() and can_see_member(member_id));

revoke execute on function can_see_member(uuid) from public, anon;
grant execute on function can_see_member(uuid) to authenticated;
