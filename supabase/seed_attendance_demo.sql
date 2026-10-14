-- FAKE demo data for the Attendance sheet. Run in the Supabase SQL editor. Safe to run again.
-- Church: St. Philopateer. 12 weeks of Liturgy (Sun), Vespers (Sat), Bible Study (Wed) and ~60 made-up members.
-- Real people are never touched: only members without a login (user_id is null) are moved to this church.

select setseed(0.42);

do $$
declare
  c uuid; d date; svc uuid; i int; mid uuid; persona text; pr numeric; late int; s record;
  firsts_m text[] := array['Mina','Mark','Peter','Samuel','Antonios','Pavly','Marcos','Kyrillos','Youssef','Abanoub','Bishoy','Shenouda','Karas','David','Andrew','George','Fady','Ramy','Moussa','Daniel'];
  firsts_f text[] := array['Marina','Mary','Sandra','Verena','Mariam','Christina','Nermeen','Hannah','Rebecca','Sara','Monica','Irene','Demiana','Martha','Sophia','Yostina','Veronica','Nancy','Lydia','Katrina'];
  lasts text[] := array['Demo','Sample','Example','Test','Mock','Fake','Guirguis','Tadros','Habib','Nashed','Samaan','Wassef'];
  fam uuid; female boolean; ln text; lit_dates date[]; away_from date; away_to date; mult numeric;
begin
  select id into c from churches where name like 'St. Philopateer%';
  -- act as the super admin so the label helper accepts us
  perform set_config('request.jwt.claim.sub', (select id::text from profiles where role = 'super_admin'), true);
  perform ensure_labels(c);

  -- fake members that already exist (no login) move into this church
  update members set church_id = c where user_id is null and church_id is distinct from c and email like '%@example.com';

  -- services for the last 12 weeks
  for d in select generate_series(current_date - 84, current_date, interval '1 day')::date loop
    if extract(dow from d) = 0 then
      insert into services (name_en, name_ar, type, date, start_time, church_id) select 'Divine Liturgy', 'Divine Liturgy', 'mass', d, '08:00', c
        where not exists (select 1 from services where church_id = c and date = d and name_en = 'Divine Liturgy');
    elsif extract(dow from d) = 6 then
      insert into services (name_en, name_ar, type, date, start_time, church_id) select 'Vespers', 'Vespers', 'vespers', d, '18:00', c
        where not exists (select 1 from services where church_id = c and date = d and name_en = 'Vespers');
    elsif extract(dow from d) = 3 then
      insert into services (name_en, name_ar, type, date, start_time, church_id) select 'Bible Study', 'Bible Study', 'bible_study', d, '19:00', c
        where not exists (select 1 from services where church_id = c and date = d and name_en = 'Bible Study');
    end if;
  end loop;
  select array_agg(date order by date) into lit_dates from services where church_id = c and name_en = 'Divine Liturgy' and date <= current_date and date >= current_date - 84;

  -- fresh fake members each run
  delete from members where email like 'demo.%@example.com';
  for i in 1..60 loop
    female := i % 2 = 0;
    ln := lasts[1 + (i * 7) % 12];
    persona := case when i % 25 in (0, 1, 2, 3, 4, 5) then 'faithful' when i % 25 < 14 then 'regular' when i % 25 < 19 then 'occasional' when i % 25 < 22 then 'rare' when i % 25 = 22 then 'absent' when i % 25 = 23 then 'returned' else 'new' end;
    select id into fam from families where family_name = ln || ' family ' || (1 + i / 3);
    if fam is null then insert into families (family_name) values (ln || ' family ' || (1 + i / 3)) returning id into fam; end if;
    insert into members (first_name, last_name, gender, date_of_birth, email, family_id, church_id, status, is_deacon, is_minor)
      values (case when female then firsts_f[1 + (i / 2) % 20] else firsts_m[1 + (i / 2) % 20] end, ln, case when female then 'female' else 'male' end,
              (date '1975-01-01' + ((i * 397) % 12000)), 'demo.' || i || '@example.com', fam, c, 'active', not female and i % 4 = 1, false)
      returning id into mid;
    update members set created_at = case when persona = 'new' then now() - interval '21 days' else now() - interval '400 days' end where id = mid;
    pr := case persona when 'faithful' then 0.97 when 'regular' then 0.82 when 'occasional' then 0.5 when 'rare' then 0.18 when 'absent' then 0 when 'returned' then 0.9 else 0.85 end;
    away_from := lit_dates[greatest(1, array_length(lit_dates, 1) - 4)];
    away_to := lit_dates[array_length(lit_dates, 1)];
    for s in select id, date, name_en, start_time from services where church_id = c and date <= current_date and date >= current_date - 84 loop
      if persona = 'new' and s.date < current_date - 21 then continue; end if;
      mult := case s.name_en when 'Divine Liturgy' then 1 when 'Vespers' then 0.85 else 0.8 end;
      if persona = 'returned' and s.date >= away_from and s.date < away_to then continue; end if;
      if random() < pr * mult then
        late := case when random() < (case when persona = 'regular' then 0.35 else 0.12 end) then 1 + floor(random() * 25)::int else 0 end;
        insert into attendance (member_id, service_id, method, late_minutes, checked_in_at)
          values (mid, s.id, 'manual', late, ((s.date + s.start_time)::timestamp at time zone 'America/Chicago') + make_interval(mins => late + floor(random() * 5)::int))
          on conflict do nothing;
      end if;
    end loop;
    if persona = 'returned' then insert into member_labels (church_id, member_id, label_id, until, added_at) select c, mid, id, current_date + 12, now() - interval '2 days' from labels where church_id = c and key = 'returned'; end if;
    -- a few labels already applied
    if i = 8 then insert into member_labels (church_id, member_id, label_id, until, note) select c, mid, id, current_date + 30, 'Back in November' from labels where church_id = c and key = 'traveling'; end if;
    if i = 14 then insert into member_labels (church_id, member_id, label_id, until) select c, mid, id, current_date + 10 from labels where church_id = c and key = 'sick'; end if;
    if i = 21 then insert into member_labels (church_id, member_id, label_id) select c, mid, id from labels where church_id = c and key = 'prayer'; end if;
    if i = 23 then insert into member_labels (church_id, member_id, label_id) select c, mid, id from labels where church_id = c and key = 'called'; end if;
    if i = 34 then insert into member_labels (church_id, member_id, label_id) select c, mid, id from labels where church_id = c and key = 'ride'; end if;
  end loop;
end $$;
