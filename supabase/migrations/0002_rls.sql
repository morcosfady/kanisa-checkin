-- Row Level Security: least privilege.
-- Kiosk has NO direct table access. It talks to server routes that use the
-- service role after verifying the kiosk device token.

alter table profiles enable row level security;
alter table settings enable row level security;
alter table families enable row level security;
alter table classes enable row level security;
alter table members enable row level security;
alter table face_embeddings enable row level security;
alter table service_templates enable row level security;
alter table services enable row level security;
alter table kiosk_devices enable row level security;
alter table attendance enable row level security;
alter table pastoral_notes enable row level security;
alter table followups enable row level security;
alter table audit_log enable row level security;

-- profiles: see yourself; super admin manages all
create policy profiles_self on profiles for select using (id = auth.uid() or is_super_admin());
create policy profiles_admin on profiles for all using (is_super_admin()) with check (is_super_admin());

-- settings: staff read, super admin write
create policy settings_read on settings for select using (is_staff());
create policy settings_write on settings for update using (is_super_admin());

-- staff-wide tables
create policy families_staff on families for all using (is_staff()) with check (is_staff());
create policy members_staff on members for all using (is_staff()) with check (is_staff());
create policy services_staff on services for all using (is_staff()) with check (is_staff());
create policy templates_staff on service_templates for all using (is_super_admin()) with check (is_super_admin());
create policy classes_read on classes for select using (is_staff());
create policy classes_admin on classes for all using (is_super_admin()) with check (is_super_admin());

-- embeddings: staff may insert (enrollment) and delete, nobody reads vectors from the client
create policy emb_insert on face_embeddings for insert with check (is_staff());
create policy emb_delete on face_embeddings for delete using (is_staff());

-- attendance: super admin all; servants only for members in a class they serve
create policy att_admin on attendance for all using (is_super_admin()) with check (is_super_admin());
create policy att_servant_read on attendance for select using (
  exists (select 1 from members m join classes c on c.id = m.class_id
          where m.id = attendance.member_id and auth.uid() = any (c.servant_ids))
);
create policy att_servant_insert on attendance for insert with check (is_staff() and method = 'manual');

-- pastoral notes: Abouna only
create policy notes_admin on pastoral_notes for all using (is_super_admin()) with check (is_super_admin());

-- followups: super admin all; servant sees what is assigned to them
create policy fu_admin on followups for all using (is_super_admin()) with check (is_super_admin());
create policy fu_servant on followups for select using (assigned_to = auth.uid());
create policy fu_servant_update on followups for update using (assigned_to = auth.uid());

-- kiosk devices and audit log: super admin only (audit insert goes via functions/service role)
create policy kiosk_admin on kiosk_devices for all using (is_super_admin()) with check (is_super_admin());
create policy audit_read on audit_log for select using (is_super_admin());
create policy audit_insert on audit_log for insert with check (is_staff() and actor_id = auth.uid());

-- lock down the matching function and purge to server-side use
revoke execute on function match_face(vector, real) from public, anon, authenticated;
revoke execute on function purge_stale_embeddings() from public, anon, authenticated;
