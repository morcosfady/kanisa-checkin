-- Fake demo members (no real people). Safe to delete later: delete from members where email like '%@example.com';
with f as (
  insert into families (family_name) values ('Anba'), ('Demo'), ('Example'), ('Fake'), ('Mock'), ('Sample'), ('Test') returning id, family_name
)
insert into members (first_name, last_name, gender, is_deacon, status, phone, email, family_id, biometric_consent, consent_signed_at, consent_signed_by, is_minor, date_of_birth)
select v.first, v.last, v.gender, v.deacon, v.status::member_status, v.phone, v.email, f.id, v.consent,
       case when v.consent then now() end,
       case when v.consent then v.first || ' ' || v.last end,
       v.dob::date > (current_date - interval '18 years'),
       v.dob::date
from (values
('Mina','Demo','male',true,'active','(555) 0101-1037','mina.demo@example.com','Demo',true,'1967-02-11'),
('Mariam','Sample','female',false,'active','(555) 0102-1074','mariam.sample@example.com','Demo',true,'1974-03-12'),
('Bishoy','Test','male',false,'active','(555) 0103-1111','bishoy.test@example.com','Demo',false,'1981-04-13'),
('Verena','Example','female',false,'active','(555) 0104-1148','verena.example@example.com','Sample',true,'2016-05-14'),
('Kyrillos','Fake','male',true,'visitor','(555) 0105-1185','kyrillos.fake@example.com','Sample',false,'1995-06-15'),
('Marina','Mock','female',false,'active','(555) 0106-1222','marina.mock@example.com','Sample',true,'2002-07-16'),
('Antonios','Sample','male',true,'active','(555) 0107-1259','antonios.sample@example.com','Test',true,'1964-08-17'),
('Sandra','Demo','female',false,'active','(555) 0108-1296','sandra.demo@example.com','Test',true,'2015-09-18'),
('Marcos','Mock','male',false,'active','(555) 0109-1333','marcos.mock@example.com','Test',false,'1978-01-10'),
('Christina','Test','female',false,'active','(555) 0110-1370','christina.test@example.com','Example',true,'1985-02-11'),
('Youssef','Example','male',false,'active','(555) 0111-1407','youssef.example@example.com','Example',true,'1992-03-12'),
('Nermeen','Fake','female',false,'active','(555) 0112-1444','nermeen.fake@example.com','Example',true,'2014-04-13'),
('Pavly','Demo','male',true,'active','(555) 0113-1481','pavly.demo@example.com','Mock',true,'1961-05-14'),
('Hannah','Sample','female',false,'active','(555) 0114-1518','hannah.sample@example.com','Mock',false,'1968-06-15'),
('Beshoy','Sample','male',false,'inactive','(555) 0115-1555','beshoy.sample@example.com','Mock',true,'1975-07-16'),
('Mira','Example','female',false,'active','(555) 0116-1592','mira.example@example.com','Fake',true,'2013-08-17'),
('Samuel','Test','male',true,'active','(555) 0117-1629','samuel.test@example.com','Fake',true,'1989-09-18'),
('Rita','Mock','female',false,'visitor','(555) 0118-1666','rita.mock@example.com','Fake',false,'1996-01-10'),
('Abanoub','Fake','male',false,'active','(555) 0119-1703','abanoub.fake@example.com','Anba',true,'2003-02-11'),
('Sherry','Demo','female',false,'active','(555) 0120-1740','sherry.demo@example.com','Anba',true,'2012-03-12')
) as v(first, last, gender, deacon, status, phone, email, family, consent, dob)
join f on f.family_name = v.family;
