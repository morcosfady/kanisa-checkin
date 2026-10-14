-- Each service (and each weekly event) belongs to a church, so a person's history can show where they attended.
alter table services add column if not exists church_id uuid references churches on delete set null;
alter table service_templates add column if not exists church_id uuid references churches on delete set null;

-- services created from a weekly event inherit its church
create or replace function _open_service() returns services
language plpgsql security definer set search_path = public as $$
declare
  now_local timestamp := (now() at time zone 'America/Chicago');
  d date := now_local::date;
  t time := now_local::time;
  s services%rowtype;
  tpl service_templates%rowtype;
begin
  if not is_approved_user() then raise exception 'not allowed'; end if;

  select * into s from services
   where is_active and (date + coalesce(end_time, start_time + interval '6 hours')) > now_local
   order by date desc, start_time desc limit 1;
  if s.id is not null then return s; end if;

  select * into tpl from service_templates
   where active and weekday = extract(dow from d)::int
     and t >= start_time and t < coalesce(end_time, start_time + interval '3 hours')
   order by start_time limit 1;
  if tpl.id is null then return null; end if;

  select * into s from services where template_id = tpl.id and date = d;
  if s.id is null then
    insert into services (template_id, name_ar, name_en, type, date, start_time, end_time, is_active, church_id)
    values (tpl.id, tpl.name_ar, tpl.name_en, tpl.type, d, tpl.start_time, tpl.end_time, true, tpl.church_id)
    returning * into s;
    return s;
  end if;
  if s.is_active then return s; end if;
  return null;
end $$;
