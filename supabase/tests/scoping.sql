-- Church scoping test. Run in the Supabase SQL editor. It rolls back at the end (raises on purpose to show the report).
create temp table if not exists lg(i serial, t text);
grant all on lg to public;
grant all on sequence lg_i_seq to public;
do $$
declare
  a uuid := gen_random_uuid(); sup uuid;
  ca uuid; cb uuid; ma uuid := gen_random_uuid(); mb uuid := gen_random_uuid();
  sa uuid := gen_random_uuid(); sb uuid := gen_random_uuid();
  n int; rep text;
begin
  select id into sup from profiles where role = 'super_admin';
  select id into ca from churches where name like 'St. Philopateer%';
  select id into cb from churches where name like 'St. Marina%';
  insert into auth.users (id, email, aud, role, raw_user_meta_data, instance_id)
    values (a, 'scopeA@example.com', 'authenticated', 'authenticated', '{}', '00000000-0000-0000-0000-000000000000');
  update profiles set role = 'admin', approved = true, church_id = ca where id = a;
  insert into members (id, first_name, last_name, gender, church_id) values (ma, 'Scope', 'InA', 'male', ca), (mb, 'Scope', 'InB', 'male', cb);
  insert into services (id, name_en, name_ar, type, date, start_time, church_id) values (sa, 'T', 'T', 'mass', current_date, '08:00', ca), (sb, 'T', 'T', 'mass', current_date, '08:00', cb);
  insert into attendance (member_id, service_id, method) values (ma, sa, 'manual'), (mb, sb, 'manual');

  perform set_config('request.jwt.claim.sub', a::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;

  select count(*) into n from members where first_name = 'Scope';
  insert into lg(t) values ('1 admin of church A sees ' || n || ' scope members (want 1)');
  select count(*) into n from members where id = mb;
  insert into lg(t) values ('2 admin A sees church B member: ' || n || ' (want 0)');
  select count(*) into n from attendance where member_id = mb;
  insert into lg(t) values ('3 admin A sees church B attendance: ' || n || ' (want 0)');
  select count(*) into n from attendance where member_id = ma;
  insert into lg(t) values ('4 admin A sees own attendance: ' || n || ' (want 1)');
  begin
    insert into members (first_name, last_name, gender, church_id) values ('Bad', 'Insert', 'male', cb);
    insert into lg(t) values ('5 admin A inserted into church B: ALLOWED (bad)');
  exception when others then
    insert into lg(t) values ('5 admin A cannot add a member to church B: blocked');
  end;
  update members set last_name = 'Hacked' where id = mb;
  get diagnostics n = row_count;
  insert into lg(t) values ('6 admin A edited church B member rows: ' || n || ' (want 0)');

  reset role;
  select string_agg(t, E'\n' order by i) into rep from lg;
  raise exception E'SCOPING TEST (rolled back)\n%', rep;
end $$;
