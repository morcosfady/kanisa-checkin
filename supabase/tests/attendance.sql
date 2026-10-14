-- Attendance sheet + labels test. Needs the demo seed (seed_attendance_demo.sql). Rolls back at the end.
create temp table if not exists lg(i serial, t text);
grant all on lg to public;
grant all on sequence lg_i_seq to public;
do $$
declare
  sup uuid; ca uuid; cb uuid; b uuid := gen_random_uuid();
  j json; n int; m1 uuid; m2 uuid; lab uuid; fu uuid; rep text; ok boolean;
begin
  select id into sup from profiles where role = 'super_admin';
  select id into ca from churches where name like 'St. Philopateer%';
  select id into cb from churches where name like 'St. Marina%';
  insert into auth.users (id, email, aud, role, raw_user_meta_data, instance_id)
    values (b, 'attB@example.com', 'authenticated', 'authenticated', '{}', '00000000-0000-0000-0000-000000000000');
  update profiles set role = 'admin', approved = true, church_id = cb where id = b;
  perform ensure_labels(cb);

  -- ---- as the super admin, managing church A
  perform set_config('request.jwt.claim.sub', sup::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', sup, 'role', 'authenticated')::text, true);
  set local role authenticated;

  perform sync_auto_labels(ca);
  j := get_attendance_data(ca, current_date - 84, current_date);
  insert into lg(t) values ('1 data function returns members/services/present/labels: ' || json_array_length(j->'members') || '/' || json_array_length(j->'services') || '/' || json_array_length(j->'present') || '/' || json_array_length(j->'labels') || ' (want 80+/39/1000+/14)');
  select count(*) into n from member_labels ml join labels l on l.id = ml.label_id where l.key = 'followup' and ml.removed_at is null and ml.church_id = ca;
  insert into lg(t) values ('2 auto follow-up labels after sync: ' || n || ' (want about 3-6)');
  select count(*) into n from member_labels ml join labels l on l.id = ml.label_id where l.key = 'returned' and ml.removed_at is null and ml.church_id = ca;
  insert into lg(t) values ('3 returned labels: ' || n);

  select id into m1 from members where church_id = ca and email like 'demo.%' order by email limit 1;
  select id into m2 from members where church_id = ca and email like 'demo.%' order by email desc limit 1;
  select id into lab from labels where church_id = ca and key = 'called';
  insert into lg(t) values ('4 bulk add Called to 2: ' || label_members(array[m1, m2], lab, 'test note') || ' (want 2)');
  insert into lg(t) values ('5 adding again adds 0: ' || label_members(array[m1, m2], lab) || ' (want 0)');
  perform unlabel_member(m1, lab);
  select count(*) into n from member_labels where member_id = m1 and label_id = lab and removed_at is null;
  insert into lg(t) values ('6 after remove active rows: ' || n || ' (want 0)');
  select count(*) into n from label_events where member_id in (m1, m2) and label_id = lab;
  insert into lg(t) values ('7 events logged (added x2, removed x1): ' || n || ' (want 3)');
  select id into fu from labels where church_id = ca and key = 'followup';
  perform snooze_followup(m2, 14);
  select count(*) into n from member_labels where member_id = m2 and label_id = fu and snooze_until = current_date + 14;
  insert into lg(t) values ('8 snooze set: ' || n || ' (want 1)');
  insert into lg(t) values ('9 history rows via function: ' || json_array_length(member_label_history(m2)) || ' (want 3+)');

  -- ---- as an admin of church B (Marina)
  perform set_config('request.jwt.claim.sub', b::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  begin
    perform get_attendance_data(ca, current_date - 84, current_date);
    insert into lg(t) values ('10 B reads church A data: ALLOWED (bad)');
  exception when others then insert into lg(t) values ('10 B cannot read church A attendance data: blocked');
  end;
  select count(*) into n from labels where church_id = ca;
  insert into lg(t) values ('11 B sees church A labels: ' || n || ' (want 0)');
  select count(*) into n from member_labels where church_id = ca;
  insert into lg(t) values ('12 B sees church A member_labels: ' || n || ' (want 0)');
  select count(*) into n from label_events where church_id = ca;
  insert into lg(t) values ('13 B sees church A label_events: ' || n || ' (want 0)');
  select count(*) into n from members where church_id = ca;
  insert into lg(t) values ('14 B sees church A members: ' || n || ' (want 0)');
  begin
    perform label_members(array[m2], lab);
    insert into lg(t) values ('15 B labels a church A member: ALLOWED (bad)');
  exception when others then insert into lg(t) values ('15 B cannot label a church A member: blocked');
  end;
  begin
    insert into labels (church_id, name_en) values (ca, 'Sneaky');
    insert into lg(t) values ('16 B inserts a label into church A: ALLOWED (bad)');
  exception when others then insert into lg(t) values ('16 B cannot add labels to church A: blocked');
  end;
  begin
    perform sync_auto_labels(ca);
    insert into lg(t) values ('17 B runs auto labels for church A: ALLOWED (bad)');
  exception when others then insert into lg(t) values ('17 B cannot run auto labels for church A: blocked');
  end;

  reset role;
  select string_agg(t, E'\n' order by i) into rep from lg;
  raise exception E'ATTENDANCE TEST (rolled back)\n%', rep;
end $$;
