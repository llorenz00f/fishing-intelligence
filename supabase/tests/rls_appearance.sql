-- Run as the database administrator after 0001 and 0002. All fixtures roll back.
begin;

create function pg_temp.assert_true(condition boolean, description text)
returns void language plpgsql security invoker as $$
begin
  if condition is distinct from true then
    raise exception 'FAIL: %', description;
  end if;
end;
$$;

create function pg_temp.assert_error(statement text, expected_code text, description text)
returns void language plpgsql security invoker as $$
begin
  begin
    execute statement;
  exception when others then
    if sqlstate <> expected_code then
      raise exception 'FAIL: % (expected %, got %: %)', description, expected_code, sqlstate, sqlerrm;
    end if;
    return;
  end;
  raise exception 'FAIL: % (statement succeeded)', description;
end;
$$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('90000000-0000-0000-0000-000000000001', 'appearance-free@example.invalid', '{"plan":"CAPTAIN"}'),
  ('90000000-0000-0000-0000-000000000002', 'appearance-pro@example.invalid', '{}'),
  ('90000000-0000-0000-0000-000000000003', 'appearance-captain@example.invalid', '{}'),
  ('90000000-0000-0000-0000-000000000004', 'appearance-new@example.invalid', '{}');

insert into public.profiles (id, display_name, plan) values
  ('90000000-0000-0000-0000-000000000001', 'Free', 'FREE'),
  ('90000000-0000-0000-0000-000000000002', 'Pro', 'PRO'),
  ('90000000-0000-0000-0000-000000000003', 'Captain', 'CAPTAIN');
insert into public.user_preferences (user_id, settings)
values ('90000000-0000-0000-0000-000000000001', '{"existingSetting":true}');

set local role authenticated;
select set_config('request.jwt.claim.sub', '90000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"90000000-0000-0000-0000-000000000001","role":"authenticated","user_metadata":{"plan":"CAPTAIN"}}', true);

update public.profiles set display_name = 'Still editable', locale = 'en', plan = 'FREE' where id = auth.uid();
select pg_temp.assert_true((select display_name = 'Still editable' and locale = 'en' from public.profiles where id = auth.uid()), 'ordinary profile updates remain available');
select pg_temp.assert_error($q$update public.profiles set plan = 'PRO' where id = auth.uid()$q$, '42501', 'owner cannot upgrade plan');
select pg_temp.assert_error($q$insert into public.profiles (id, display_name, plan) values (auth.uid(), 'Escalation', 'CAPTAIN') on conflict (id) do update set plan = excluded.plan$q$, '42501', 'upsert cannot upgrade plan');

insert into public.appearance_preferences (user_id) values (auth.uid());
select pg_temp.assert_true((select theme_id = 'deep-ocean' and not dynamic_weather_theme_enabled and ambient_effect_intensity = 'standard' and appearance_mode = 'system' and not reduced_motion from public.appearance_preferences where user_id = auth.uid()), 'default preferences match API');
update public.appearance_preferences set ambient_effect_intensity = 'off', reduced_motion = true, appearance_mode = 'light' where user_id = auth.uid();
select pg_temp.assert_true((select ambient_effect_intensity = 'off' and reduced_motion and appearance_mode = 'light' from public.appearance_preferences where user_id = auth.uid()), 'FREE supports off, reduced motion and light mode');
update public.appearance_preferences set ambient_effect_intensity = 'reduced', appearance_mode = 'dark' where user_id = auth.uid();
select pg_temp.assert_true((select ambient_effect_intensity = 'reduced' and appearance_mode = 'dark' from public.appearance_preferences where user_id = auth.uid()), 'FREE supports reduced intensity and dark mode');

select pg_temp.assert_error($q$update public.appearance_preferences set theme_id = 'sunset' where user_id = auth.uid()$q$, '42501', 'FREE cannot write a premium theme directly');
select pg_temp.assert_error($q$update public.appearance_preferences set dynamic_weather_theme_enabled = true where user_id = auth.uid()$q$, '42501', 'FREE cannot enable dynamic weather on default theme');
select pg_temp.assert_error($q$insert into public.appearance_preferences (user_id, theme_id) values (auth.uid(), 'abyss') on conflict (user_id) do update set theme_id = excluded.theme_id$q$, '42501', 'FREE cannot bypass gates using upsert');
select pg_temp.assert_error($q$update public.appearance_preferences set ambient_effect_intensity = 'high' where user_id = auth.uid()$q$, '23514', 'database validates intensity');
select pg_temp.assert_error($q$update public.appearance_preferences set appearance_mode = 'auto' where user_id = auth.uid()$q$, '23514', 'database validates mode');
select pg_temp.assert_error($q$update public.appearance_preferences set reduced_motion = null where user_id = auth.uid()$q$, '23502', 'database rejects null boolean');
select pg_temp.assert_error($q$insert into public.appearance_preferences (user_id) values ('90000000-0000-0000-0000-000000000002')$q$, '42501', 'owner cannot insert another users preferences');
select pg_temp.assert_error($q$update public.appearance_preferences set user_id = '90000000-0000-0000-0000-000000000002' where user_id = auth.uid()$q$, '42501', 'owner cannot transfer preferences');
select pg_temp.assert_true((select settings = '{"existingSetting":true}'::jsonb from public.user_preferences where user_id = auth.uid()), 'existing user_preferences settings remain intact');

select set_config('request.jwt.claim.sub', '90000000-0000-0000-0000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"90000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select pg_temp.assert_true((select count(*) = 0 from public.appearance_preferences), 'PRO cannot read another users preferences');
with changed as (update public.appearance_preferences set reduced_motion = false where user_id = '90000000-0000-0000-0000-000000000001' returning *)
select pg_temp.assert_true((select count(*) = 0 from changed), 'PRO cannot update another users preferences');
with deleted as (delete from public.appearance_preferences where user_id = '90000000-0000-0000-0000-000000000001' returning *)
select pg_temp.assert_true((select count(*) = 0 from deleted), 'PRO cannot delete another users preferences');

insert into public.appearance_preferences (user_id, theme_id) values (auth.uid(), 'abyss');
do $$
declare theme text;
begin
  foreach theme in array array['deep-ocean', 'mediterranean-light', 'sunset', 'graphite-marine', 'abyss', 'dynamic-weather'] loop
    update public.appearance_preferences set theme_id = theme, dynamic_weather_theme_enabled = true where user_id = auth.uid();
    perform pg_temp.assert_true((select theme_id = theme and dynamic_weather_theme_enabled from public.appearance_preferences where user_id = auth.uid()), 'PRO can persist each stable theme');
  end loop;
end;
$$;
select pg_temp.assert_error($q$update public.appearance_preferences set theme_id = 'invented-theme' where user_id = auth.uid()$q$, '23514', 'database validates theme even for paid users');
select pg_temp.assert_error($q$update public.profiles set plan = 'CAPTAIN' where id = auth.uid()$q$, '42501', 'PRO cannot self-upgrade to CAPTAIN');

select set_config('request.jwt.claim.sub', '90000000-0000-0000-0000-000000000003', true);
select set_config('request.jwt.claims', '{"sub":"90000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
insert into public.appearance_preferences (user_id, theme_id, dynamic_weather_theme_enabled, ambient_effect_intensity, reduced_motion)
values (auth.uid(), 'dynamic-weather', true, 'off', true);
select pg_temp.assert_true((select theme_id = 'dynamic-weather' and dynamic_weather_theme_enabled and reduced_motion from public.appearance_preferences where user_id = auth.uid()), 'CAPTAIN can persist premium and accessibility settings');

select set_config('request.jwt.claim.sub', '90000000-0000-0000-0000-000000000004', true);
select set_config('request.jwt.claims', '{"sub":"90000000-0000-0000-0000-000000000004","role":"authenticated"}', true);
select pg_temp.assert_error($q$insert into public.profiles (id, display_name, plan) values (auth.uid(), 'New paid', 'PRO')$q$, '42501', 'owner cannot insert a paid profile');
select pg_temp.assert_error($q$insert into public.appearance_preferences (user_id, theme_id) values (auth.uid(), 'sunset')$q$, '42501', 'missing profile does not grant paid access');
insert into public.appearance_preferences (user_id, appearance_mode, reduced_motion) values (auth.uid(), 'light', true);
insert into public.profiles (id, display_name) values (auth.uid(), 'New free');
select pg_temp.assert_true((select plan = 'FREE' from public.profiles where id = auth.uid()), 'owner can create a default FREE profile');

set local role anon;
select pg_temp.assert_error($q$select * from public.appearance_preferences$q$, '42501', 'anonymous database reads are denied');
select pg_temp.assert_error($q$insert into public.appearance_preferences (user_id) values ('90000000-0000-0000-0000-000000000001')$q$, '42501', 'anonymous database writes are denied');

-- Privileged billing operations still work. The endpoint never uses this role.
set local role service_role;
update public.profiles set plan = 'PRO' where id = '90000000-0000-0000-0000-000000000001';
select pg_temp.assert_true((select plan = 'PRO' from public.profiles where id = '90000000-0000-0000-0000-000000000001'), 'server billing can upgrade a plan');
update public.profiles set plan = 'FREE' where id = '90000000-0000-0000-0000-000000000002';

set local role authenticated;
select set_config('request.jwt.claim.sub', '90000000-0000-0000-0000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"90000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select pg_temp.assert_error($q$update public.appearance_preferences set theme_id = 'sunset' where user_id = auth.uid()$q$, '42501', 'downgraded users cannot keep writing premium settings');
insert into public.appearance_preferences (user_id, theme_id, dynamic_weather_theme_enabled, ambient_effect_intensity, appearance_mode, reduced_motion)
values (auth.uid(), 'deep-ocean', false, 'off', 'light', true)
on conflict (user_id) do update set theme_id = excluded.theme_id, dynamic_weather_theme_enabled = excluded.dynamic_weather_theme_enabled,
  ambient_effect_intensity = excluded.ambient_effect_intensity, appearance_mode = excluded.appearance_mode, reduced_motion = excluded.reduced_motion;
select pg_temp.assert_true((select theme_id = 'deep-ocean' and not dynamic_weather_theme_enabled and reduced_motion from public.appearance_preferences where user_id = auth.uid()), 'downgraded users can save the normalized FREE preferences');

rollback;
