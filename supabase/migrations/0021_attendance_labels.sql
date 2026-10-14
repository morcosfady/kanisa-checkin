-- Attendance sheet: labels, label history, and the data function behind /attendance.
-- Everything is limited to the church being managed (can_manage_church).

alter table settings add column if not exists followup_misses int not null default 3;
create index if not exists services_church_date on services (church_id, date);
create index if not exists members_church on members (church_id);

create table if not exists labels (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references churches on delete cascade,
  key text,
  name_en text not null,
  name_ar text not null default '',
  emoji text not null default '',
  color text not null default '#5B6275',
  description text not null default '',
  is_system boolean not null default false,
  is_auto boolean not null default false,
  excuses boolean not null default false,        -- member is excused from follow-up and absent counts while it is active
  hides_member boolean not null default false,   -- member is left out of the stats (moved away)
  default_days int,                               -- label expires by itself after this many days
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_by uuid references profiles on delete set null,
  created_at timestamptz not null default now()
);
create unique index if not exists labels_church_key on labels (church_id, key) where key is not null;

create table if not exists member_labels (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references churches on delete cascade,
  member_id uuid not null references members on delete cascade,
  label_id uuid not null references labels on delete cascade,
  added_by uuid references profiles on delete set null, -- null = added by the system
  added_at timestamptz not null default now(),
  note text,
  until date,
  snooze_until date,
  removed_at timestamptz,
  removed_by uuid references profiles on delete set null
);
create index if not exists member_labels_member on member_labels (member_id) where removed_at is null;
create index if not exists member_labels_church on member_labels (church_id, label_id);

create table if not exists label_events (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references churches on delete cascade,
  member_id uuid not null references members on delete cascade,
  label_id uuid not null references labels on delete cascade,
  action text not null check (action in ('added', 'removed', 'snoozed', 'auto_added', 'auto_removed')),
  actor uuid references profiles on delete set null,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists label_events_member on label_events (member_id, created_at desc);

alter table labels enable row level security;
alter table member_labels enable row level security;
alter table label_events enable row level security;

drop policy if exists labels_church on labels;
create policy labels_church on labels for all using (can_manage_church(church_id)) with check (can_manage_church(church_id));
drop policy if exists member_labels_church on member_labels;
create policy member_labels_church on member_labels for all using (can_manage_church(church_id)) with check (can_manage_church(church_id));
drop policy if exists label_events_read on label_events;
create policy label_events_read on label_events for select using (can_manage_church(church_id));
drop policy if exists label_events_write on label_events;
create policy label_events_write on label_events for insert with check (can_manage_church(church_id));

-- default labels for a church (safe to call again)
create or replace function ensure_labels(p_church uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not can_manage_church(p_church) then raise exception 'not allowed'; end if;
  insert into labels (church_id, key, name_en, name_ar, emoji, color, description, is_system, is_auto, excuses, hides_member, default_days, sort_order)
  select p_church, v.* from (values
    ('followup',  'Follow up needed',     'يحتاج متابعة',     '🔔', '#C0392B', 'Missed several services in a row', true,  true,  false, false, null::int, 1),
    ('called',    'Called',               'تم الاتصال',       '📞', '#2F7F86', 'Someone called them',              false, false, false, false, null, 2),
    ('visited',   'Visited',              'تمت الزيارة',      '🏠', '#2E7D4F', 'Home visit done',                  false, false, false, false, null, 3),
    ('prayer',    'Needs prayer',         'يحتاج صلاة',       '🙏', '#7B4FA0', 'Abouna to remember in prayer',     false, false, false, false, null, 4),
    ('sick',      'Sick / recovering',    'مريض',             '🤒', '#B5546A', 'Temporary. Do not store medical details', false, false, true, false, 30, 5),
    ('traveling', 'Traveling',            'مسافر',            '✈️', '#3B82B6', 'Away for a while (set an end date)', false, false, true,  false, null, 6),
    ('college',   'Away at college',      'بعيد للدراسة',     '🎓', '#4F5BB5', 'Excused during the school year',   false, false, true,  false, null, 7),
    ('ride',      'Needs a ride',         'يحتاج توصيل',      '🚗', '#C08A1E', 'No transport',                     false, false, false, false, null, 8),
    ('new_member','New member',           'عضو جديد',         '🌱', '#2E7D4F', 'First 8 weeks',                    true,  true,  false, false, 56, 9),
    ('visitor',   'Visitor',              'زائر',             '👋', '#B8892E', 'Visiting',                         false, false, false, false, null, 10),
    ('returned',  'Returned',             'عاد',              '🎉', '#B8892E', 'Came back after being away',       true,  true,  false, false, 14, 11),
    ('moved',     'Moved away',           'انتقل',            '📦', '#8C93A3', 'Left out of the stats',            false, false, false, true,  null, 12),
    ('elsewhere', 'Serving elsewhere',    'يخدم في مكان آخر', '⛪', '#8C93A3', 'Serving at another church or service', false, false, false, false, null, 13),
    ('no_contact','Do not contact',       'لا تتصل',          '🚫', '#4B5563', 'Hides contact actions',            false, false, false, false, null, 14)
  ) as v(key, name_en, name_ar, emoji, color, description, is_system, is_auto, excuses, hides_member, default_days, sort_order)
  where not exists (select 1 from labels l where l.church_id = p_church and l.key = v.key);
end $$;

-- add one label to several members; returns how many were new
create or replace function label_members(p_members uuid[], p_label uuid, p_note text default null, p_until date default null) returns int
language plpgsql security definer set search_path = public as $$
declare l labels; m uuid; n int := 0; u date;
begin
  select * into l from labels where id = p_label;
  if l.id is null or not can_manage_church(l.church_id) then raise exception 'not allowed'; end if;
  u := coalesce(p_until, case when l.default_days is not null then current_date + l.default_days end);
  foreach m in array p_members loop
    if not exists (select 1 from members x where x.id = m and x.church_id = l.church_id) then continue; end if;
    if exists (select 1 from member_labels where member_id = m and label_id = p_label and removed_at is null) then continue; end if;
    insert into member_labels (church_id, member_id, label_id, added_by, note, until) values (l.church_id, m, p_label, auth.uid(), nullif(trim(coalesce(p_note, '')), ''), u);
    insert into label_events (church_id, member_id, label_id, action, actor, note) values (l.church_id, m, p_label, 'added', auth.uid(), nullif(trim(coalesce(p_note, '')), ''));
    n := n + 1;
  end loop;
  return n;
end $$;

create or replace function unlabel_member(p_member uuid, p_label uuid) returns void
language plpgsql security definer set search_path = public as $$
declare l labels;
begin
  select * into l from labels where id = p_label;
  if l.id is null or not can_manage_church(l.church_id) then raise exception 'not allowed'; end if;
  update member_labels set removed_at = now(), removed_by = auth.uid() where member_id = p_member and label_id = p_label and removed_at is null and church_id = l.church_id;
  if found then
    insert into label_events (church_id, member_id, label_id, action, actor) values (l.church_id, p_member, p_label, 'removed', auth.uid());
  end if;
end $$;

-- hide a "Follow up needed" label for a while
create or replace function snooze_followup(p_member uuid, p_days int) returns void
language plpgsql security definer set search_path = public as $$
declare l labels; c uuid;
begin
  select church_id into c from members where id = p_member;
  select * into l from labels where church_id = c and key = 'followup';
  if l.id is null or not can_manage_church(c) then raise exception 'not allowed'; end if;
  update member_labels set snooze_until = current_date + greatest(1, least(p_days, 120))
    where member_id = p_member and label_id = l.id and removed_at is null;
  if not found then
    insert into member_labels (church_id, member_id, label_id, added_by, snooze_until) values (c, p_member, l.id, auth.uid(), current_date + greatest(1, least(p_days, 120)));
  end if;
  insert into label_events (church_id, member_id, label_id, action, actor, note) values (c, p_member, l.id, 'snoozed', auth.uid(), p_days || ' days');
end $$;

-- The church's main service = the one held most often in the last 12 weeks (usually the Divine Liturgy).
-- Auto labels: follow-up after N misses in a row, "Returned" when they come back, "New member" for 8 weeks, expiry.
create or replace function sync_auto_labels(p_church uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  n int := coalesce((select followup_misses from settings limit 1), 3);
  main_name text;
  fu uuid; ret uuid; nw uuid;
  m record;
  last_ids uuid[];
  missed int;
  hit boolean;
  fu_row uuid;
begin
  if not can_manage_church(p_church) then raise exception 'not allowed'; end if;
  perform ensure_labels(p_church);
  select id into fu from labels where church_id = p_church and key = 'followup';
  select id into ret from labels where church_id = p_church and key = 'returned';
  select id into nw from labels where church_id = p_church and key = 'new_member';

  -- expire labels that reached their end date
  with ended as (
    update member_labels set removed_at = now() where church_id = p_church and removed_at is null and until is not null and until < current_date
    returning member_id, label_id
  )
  insert into label_events (church_id, member_id, label_id, action, note) select p_church, member_id, label_id, 'auto_removed', 'ended' from ended;

  select name_en into main_name from services
    where church_id = p_church and date >= current_date - 84 and date <= current_date
    group by name_en order by count(*) desc, name_en limit 1;
  if main_name is null then return; end if;

  select array_agg(id order by date desc, start_time desc) into last_ids from (
    select id, date, start_time from services
    where church_id = p_church and name_en = main_name and (date < current_date or (date = current_date and start_time <= (now() at time zone 'America/Chicago')::time))
    order by date desc, start_time desc limit n
  ) s;

  for m in
    select mm.id, mm.created_at from members mm
    where mm.church_id = p_church and mm.status <> 'inactive'
      and not exists (select 1 from member_labels ml join labels l on l.id = ml.label_id
                      where ml.member_id = mm.id and ml.removed_at is null and (l.excuses or l.hides_member) and (ml.until is null or ml.until >= current_date))
  loop
    select id into fu_row from member_labels where member_id = m.id and label_id = fu and removed_at is null limit 1;
    -- new member label for the first 8 weeks
    if nw is not null and m.created_at > now() - interval '56 days'
       and not exists (select 1 from member_labels where member_id = m.id and label_id = nw) then
      insert into member_labels (church_id, member_id, label_id, until) values (p_church, m.id, nw, (m.created_at + interval '56 days')::date);
      insert into label_events (church_id, member_id, label_id, action) values (p_church, m.id, nw, 'auto_added');
    end if;

    if last_ids is null or array_length(last_ids, 1) < n then continue; end if;
    -- they must have joined before the oldest of those services to be "missing"
    select count(*) into missed from services s
      where s.id = any (last_ids) and s.date >= m.created_at::date
        and not exists (select 1 from attendance a where a.member_id = m.id and a.service_id = s.id);
    select (count(*) = n) into hit from services s where s.id = any (last_ids) and s.date >= m.created_at::date;

    if hit and missed = n then
      if fu_row is null then
        insert into member_labels (church_id, member_id, label_id) values (p_church, m.id, fu);
        insert into label_events (church_id, member_id, label_id, action, note) values (p_church, m.id, fu, 'auto_added', n || ' missed in a row');
      end if;
    elsif fu_row is not null then
      -- came back: remove the follow-up, welcome them back for 2 weeks
      if exists (select 1 from attendance a join services s on s.id = a.service_id
                 where a.member_id = m.id and s.church_id = p_church and a.checked_in_at > (select added_at from member_labels where id = fu_row)) then
        update member_labels set removed_at = now() where id = fu_row;
        insert into label_events (church_id, member_id, label_id, action, note) values (p_church, m.id, fu, 'auto_removed', 'attended again');
        if ret is not null and not exists (select 1 from member_labels where member_id = m.id and label_id = ret and removed_at is null) then
          insert into member_labels (church_id, member_id, label_id, until) values (p_church, m.id, ret, current_date + 14);
          insert into label_events (church_id, member_id, label_id, action) values (p_church, m.id, ret, 'auto_added');
        end if;
      end if;
    end if;
  end loop;
end $$;

-- All raw data for the sheet in one call (the app does the maths, see src/lib/attendance/calc.ts)
create or replace function get_attendance_data(p_church uuid, p_from date, p_to date) returns json
language plpgsql stable security definer set search_path = public as $$
declare res json;
begin
  if not can_manage_church(p_church) then raise exception 'not allowed'; end if;
  select json_build_object(
    'services', coalesce((select json_agg(json_build_object('id', s.id, 'name', s.name_en, 'type', s.type, 'date', s.date, 'start', s.start_time) order by s.date, s.start_time)
                          from services s where s.church_id = p_church and s.date between p_from and p_to and s.date <= current_date), '[]'::json),
    'members', coalesce((select json_agg(json_build_object('id', m.id, 'first', m.first_name, 'last', m.last_name, 'family', f.family_name, 'gender', m.gender,
                          'deacon', m.is_deacon, 'status', m.status, 'joined', m.created_at::date, 'dob', m.date_of_birth) order by m.first_name, m.last_name)
                          from members m left join families f on f.id = m.family_id where m.church_id = p_church), '[]'::json),
    'present', coalesce((select json_agg(json_build_array(a.member_id, a.service_id, a.late_minutes))
                         from attendance a join services s on s.id = a.service_id
                         where s.church_id = p_church and s.date between p_from and p_to and s.date <= current_date), '[]'::json),
    'labels', coalesce((select json_agg(json_build_object('id', l.id, 'key', l.key, 'name', l.name_en, 'nameAr', l.name_ar, 'emoji', l.emoji, 'color', l.color,
                          'description', l.description, 'system', l.is_system, 'auto', l.is_auto, 'excuses', l.excuses, 'hides', l.hides_member,
                          'days', l.default_days, 'order', l.sort_order, 'active', l.is_active) order by l.sort_order, l.name_en)
                        from labels l where l.church_id = p_church), '[]'::json),
    'memberLabels', coalesce((select json_agg(json_build_object('id', ml.id, 'memberId', ml.member_id, 'labelId', ml.label_id, 'addedAt', ml.added_at, 'by', pr.full_name,
                          'note', ml.note, 'until', ml.until, 'snooze', ml.snooze_until, 'removedAt', ml.removed_at))
                        from member_labels ml left join profiles pr on pr.id = ml.added_by
                        where ml.church_id = p_church and (ml.removed_at is null or ml.removed_at::date >= p_from)), '[]'::json),
    'followupMisses', coalesce((select followup_misses from settings limit 1), 3)
  ) into res;
  return res;
end $$;

-- label history for one member (drawer)
create or replace function member_label_history(p_member uuid) returns json
language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(json_build_object('action', e.action, 'label', l.name_en, 'emoji', l.emoji, 'by', pr.full_name, 'note', e.note, 'at', e.created_at) order by e.created_at desc), '[]'::json)
  from label_events e join labels l on l.id = e.label_id left join profiles pr on pr.id = e.actor
  where e.member_id = p_member and can_see_member(p_member) and can_manage_church(e.church_id)
$$;

revoke execute on function ensure_labels(uuid), label_members(uuid[], uuid, text, date), unlabel_member(uuid, uuid), snooze_followup(uuid, int),
  sync_auto_labels(uuid), get_attendance_data(uuid, date, date), member_label_history(uuid) from public, anon;
grant execute on function ensure_labels(uuid), label_members(uuid[], uuid, text, date), unlabel_member(uuid, uuid), snooze_followup(uuid, int),
  sync_auto_labels(uuid), get_attendance_data(uuid, date, date), member_label_history(uuid) to authenticated;
