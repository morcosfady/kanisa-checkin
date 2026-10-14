-- Weekly events: service_templates (weekday, start, end) open check-in automatically.
-- open_service() returns the service that is open right now (manual or scheduled), creating today's row from a template when its time window starts.

create or replace function open_service() returns services
language plpgsql security definer set search_path = public as $$
declare
  now_local timestamp := (now() at time zone 'America/Chicago');
  d date := now_local::date;
  t time := now_local::time;
  s services%rowtype;
  tpl service_templates%rowtype;
begin
  if not is_approved_user() then raise exception 'not allowed'; end if;

  -- 1) a service an admin started (or an earlier scheduled one) that has not ended or expired
  select * into s from services
   where is_active and (date + coalesce(end_time, start_time + interval '6 hours')) > now_local
   order by date desc, start_time desc limit 1;
  if s.id is not null then return s; end if;

  -- 2) a weekly event whose window is happening now
  select * into tpl from service_templates
   where active and weekday = extract(dow from d)::int
     and t >= start_time and t < coalesce(end_time, start_time + interval '3 hours')
   order by start_time limit 1;
  if tpl.id is null then return null; end if;

  select * into s from services where template_id = tpl.id and date = d;
  if s.id is null then
    insert into services (template_id, name_ar, name_en, type, date, start_time, end_time, is_active)
    values (tpl.id, tpl.name_ar, tpl.name_en, tpl.type, d, tpl.start_time, tpl.end_time, true)
    returning * into s;
    return s;
  end if;
  if s.is_active then return s; end if;
  return null; -- an admin ended today's event
end $$;

create or replace function check_in_self() returns json
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  mid uuid;
  svc services;
  grace int;
  late int;
  existing timestamptz;
  now_local timestamp := (now() at time zone 'America/Chicago');
begin
  if not is_approved_user() then raise exception 'not allowed'; end if;
  select id into mid from members where user_id = uid;
  if mid is null then raise exception 'Create your profile first'; end if;

  svc := open_service();
  if svc.id is null then raise exception 'No service is open right now'; end if;

  select checked_in_at into existing from attendance where member_id = mid and service_id = svc.id;
  if existing is not null then
    return json_build_object('already', true, 'service', svc.name_en, 'at', existing);
  end if;

  select late_after_minutes into grace from settings limit 1;
  late := greatest(0, floor(extract(epoch from (now_local - (svc.date + svc.start_time))) / 60)::int - coalesce(grace, 10));
  insert into attendance (member_id, service_id, method, late_minutes) values (mid, svc.id, 'self', late);
  update members set last_seen_at = now() where id = mid;
  return json_build_object('already', false, 'service', svc.name_en, 'at', now(), 'late', late);
end $$;

grant execute on function open_service() to authenticated;

-- starter event: Sunday Liturgy, every Sunday 8 AM to 12 PM (edit or delete on the Weekly events page)
insert into service_templates (name_ar, name_en, type, weekday, start_time, end_time, active)
select 'Divine Liturgy', 'Divine Liturgy', 'mass', 0, '08:00', '12:00', true
where not exists (select 1 from service_templates where weekday = 0 and type = 'mass');
