insert into public.disciplines (code, label) values
  ('SURFCASTING', 'Surfcasting'),
  ('SHORE_SPINNING', 'Spinning da costa'),
  ('BOAT', 'Barca'),
  ('SPEARFISHING', 'Pesca subacquea')
on conflict (code) do update set label = excluded.label;

insert into public.techniques (code, discipline_code, label) values
  ('STANDARD_SURFCASTING', 'SURFCASTING', 'Standard surfcasting'),
  ('BEACH_LEDGERING', 'SURFCASTING', 'Beach ledgering'),
  ('SHORE_SPINNING', 'SHORE_SPINNING', 'Shore spinning'),
  ('ROCK_SPINNING', 'SHORE_SPINNING', 'Rock spinning'),
  ('EGING', 'SHORE_SPINNING', 'Eging'),
  ('DRIFTING', 'BOAT', 'Drifting'),
  ('TROLLING', 'BOAT', 'Trolling'),
  ('LIVE_BAIT', 'BOAT', 'Live bait'),
  ('VERTICAL_JIGGING', 'BOAT', 'Vertical jigging'),
  ('SLOW_PITCH', 'BOAT', 'Slow pitch'),
  ('BOTTOM_FISHING', 'BOAT', 'Bottom fishing'),
  ('SPEAR_AMBUSH', 'SPEARFISHING', 'Aspetto'),
  ('SPEAR_STALKING', 'SPEARFISHING', 'Agguato'),
  ('SPEAR_CAVE', 'SPEARFISHING', 'Tana'),
  ('SPEAR_DROP', 'SPEARFISHING', 'Caduta')
on conflict (code) do update set label = excluded.label;

insert into public.species (code, common_name, scientific_name) values
  ('SPIGOLA', 'Spigola', 'Dicentrarchus labrax'),
  ('ORATA', 'Orata', 'Sparus aurata'),
  ('DENTICE', 'Dentice', 'Dentex dentex'),
  ('RICCIOLA', 'Ricciola', 'Seriola dumerili'),
  ('TONNO_ROSSO', 'Tonno rosso', 'Thunnus thynnus'),
  ('PALAMITA', 'Palamita', 'Sarda sarda'),
  ('LAMPUGA', 'Lampuga', 'Coryphaena hippurus'),
  ('SERRA', 'Serra', 'Pomatomus saltatrix'),
  ('BARRACUDA_MEDITERRANEO', 'Barracuda mediterraneo', 'Sphyraena viridensis'),
  ('LECCIA_AMIA', 'Leccia amia', 'Lichia amia'),
  ('SARAGO', 'Sarago', 'Diplodus sargus'),
  ('CERNIA', 'Cernia', 'Epinephelus marginatus'),
  ('CEFALO', 'Cefalo', 'Mugil cephalus'),
  ('SEPPIA', 'Seppia', 'Sepia officinalis'),
  ('CALAMARO', 'Calamaro', 'Loligo vulgaris')
on conflict (code) do update set common_name = excluded.common_name, scientific_name = excluded.scientific_name;

insert into public.score_profiles (discipline_code, technique_code, version, active, valid_from, weights) values
  ('SHORE_SPINNING', 'SHORE_SPINNING', 'rules-v1', true, '2026-09-09T00:00:00Z',
   '{"waveHeight":0.95,"swellHeight":0.85,"windSpeed":0.8,"sst":0.85,"current":0.85,"pressure":0.45,"pressureTrend":0.75,"daylight":1.25,"season":0.75,"depth":0.25,"tideProxy":0.35}'),
  ('SURFCASTING', 'STANDARD_SURFCASTING', 'rules-v1', true, '2026-09-09T00:00:00Z',
   '{"waveHeight":1.25,"swellHeight":1,"windSpeed":0.9,"sst":0.75,"current":0.6,"pressure":0.6,"pressureTrend":0.7,"daylight":0.7,"season":0.7,"depth":0.15,"tideProxy":0.55}'),
  ('BOAT', 'DRIFTING', 'rules-v1', true, '2026-09-09T00:00:00Z',
   '{"waveHeight":1,"swellHeight":0.9,"windSpeed":1.1,"sst":0.85,"current":1,"pressure":0.55,"pressureTrend":0.55,"daylight":0.45,"season":0.9,"depth":0.85,"tideProxy":0.3}'),
  ('SPEARFISHING', 'SPEAR_AMBUSH', 'rules-v1', true, '2026-09-09T00:00:00Z',
   '{"waveHeight":1.2,"swellHeight":1.1,"windSpeed":0.85,"sst":0.8,"current":1,"pressure":0.35,"pressureTrend":0.4,"daylight":0.75,"season":0.7,"depth":0.8,"tideProxy":0.2}');

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data
) values (
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'demo@fishing-intelligence.local',
  crypt('DemoPassword123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"display_name":"Demo angler"}'
) on conflict (id) do nothing;

insert into public.profiles (id, display_name, home_location, onboarding_completed)
values (
  '00000000-0000-0000-0000-000000000101',
  'Demo angler',
  st_setsrid(st_makepoint(10.8813, 42.7639), 4326),
  true
) on conflict (id) do update set display_name = excluded.display_name;

insert into public.spots (id, user_id, name, location, discipline_code, notes) values
  ('00000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000101','Scogliera nord',st_setsrid(st_makepoint(10.865,42.769),4326),'SHORE_SPINNING','Demo privato'),
  ('00000000-0000-0000-0000-000000000202','00000000-0000-0000-0000-000000000101','Canale sabbioso',st_setsrid(st_makepoint(10.89,42.757),4326),'SURFCASTING','Demo privato')
on conflict (id) do update set name = excluded.name;
