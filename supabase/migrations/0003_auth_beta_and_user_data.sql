alter table public.profiles
  add column role text not null default 'user' check (role in ('user', 'admin')),
  add column is_beta_tester boolean not null default false,
  add column home_coordinates jsonb;

alter table public.profiles add constraint profile_name_length check (length(display_name) between 1 and 80);
alter table public.profiles add constraint profile_coordinates_valid check (
  home_coordinates is null or (
    jsonb_typeof(home_coordinates) = 'object'
    and home_coordinates ?& array['latitude', 'longitude', 'label']
    and (home_coordinates->>'latitude')::double precision between -90 and 90
    and (home_coordinates->>'longitude')::double precision between -180 and 180
    and length(home_coordinates->>'label') between 1 and 100
  )
);

update public.profiles
set home_coordinates = jsonb_build_object(
  'latitude', public.st_y(home_location),
  'longitude', public.st_x(home_location),
  'label', 'Area salvata'
)
where home_location is not null and home_coordinates is null;

-- Roles and beta membership are immutable through the user-facing API, including direct PostgREST requests.
create or replace function public.protect_profile_plan()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      raise exception 'Profiles are created by Auth' using errcode = '42501';
    end if;
    if new.id is distinct from old.id or new.role is distinct from old.role
      or new.is_beta_tester is distinct from old.is_beta_tester then
      raise exception 'Account permissions are managed by the server' using errcode = '42501';
    end if;
    if new.plan is distinct from old.plan and not (old.role = 'admin' or old.is_beta_tester) then
      raise exception 'Test plan is not available for this account' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop policy "profiles owner insert" on public.profiles;
revoke all on public.profiles from anon, authenticated;
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;

create function public.create_account_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, display_name, role, is_beta_tester, plan)
  values (new.id, coalesce(nullif(left(trim(new.raw_user_meta_data->>'display_name'), 80), ''), 'Pescatore'),
    'user', case when new.raw_user_meta_data->>'is_beta_tester' = 'true' then true else false end, 'FREE');
  return new;
end;
$$;
revoke all on function public.create_account_profile() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.create_account_profile();

-- Existing accounts receive a profile only, never generated fishing data or metadata-based privileges.
insert into public.profiles(id, display_name)
select id, coalesce(nullif(left(trim(raw_user_meta_data->>'display_name'), 80), ''), 'Pescatore')
from auth.users on conflict (id) do nothing;

create function public.clamp_appearance_on_downgrade()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.plan = 'FREE' and new.plan is distinct from old.plan then
    update public.appearance_preferences set theme_id = 'deep-ocean', dynamic_weather_theme_enabled = false
    where user_id = new.id;
  end if;
  return new;
end;
$$;
revoke all on function public.clamp_appearance_on_downgrade() from public, anon, authenticated;
create trigger profile_plan_appearance after update of plan on public.profiles
for each row execute function public.clamp_appearance_on_downgrade();

create function public.update_own_profile(changes jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  if exists (select 1 from jsonb_object_keys(changes) k where k not in
    ('displayName','homeLocation','onboardingCompleted','preferredUnits','disciplines','species')) then
    raise exception 'Invalid profile fields' using errcode = '42501';
  end if;
  update public.profiles set
    display_name = case when changes ? 'displayName' then trim(changes->>'displayName') else display_name end,
    home_coordinates = case when changes ? 'homeLocation' then nullif(changes->'homeLocation', 'null'::jsonb) else home_coordinates end,
    onboarding_completed = case when changes ? 'onboardingCompleted' then (changes->>'onboardingCompleted')::boolean else onboarding_completed end,
    preferred_units = case when changes ? 'preferredUnits' then changes->'preferredUnits' else preferred_units end
  where id = auth.uid();
  if changes ? 'disciplines' then
    delete from public.user_disciplines where user_id = auth.uid();
    insert into public.user_disciplines(user_id, discipline_code)
    select auth.uid(), value::public.discipline_code from jsonb_array_elements_text(changes->'disciplines') on conflict do nothing;
  end if;
  if changes ? 'species' then
    delete from public.user_species where user_id = auth.uid();
    insert into public.user_species(user_id, species_code)
    select auth.uid(), value from jsonb_array_elements_text(changes->'species') on conflict do nothing;
  end if;
end;
$$;
revoke all on function public.update_own_profile(jsonb) from public, anon;
grant execute on function public.update_own_profile(jsonb) to authenticated;

alter table public.spots add column latitude double precision generated always as (public.st_y(location)) stored,
  add column longitude double precision generated always as (public.st_x(location)) stored;
alter table public.sessions add column primary_spot_name text,
  add column latitude double precision generated always as (public.st_y(start_location)) stored,
  add column longitude double precision generated always as (public.st_x(start_location)) stored;
alter table public.catches alter column species_code drop not null;
alter table public.catches add column event_id uuid unique references public.session_events(id) on delete cascade;

-- Composite ownership constraints prevent attaching a private record to another user's parent.
alter table public.spots add constraint spots_id_owner_unique unique(id, user_id);
alter table public.sessions add constraint sessions_id_owner_unique unique(id, user_id);
alter table public.session_events add constraint events_id_owner_unique unique(id, user_id);
alter table public.sessions add constraint sessions_owned_spot foreign key(primary_spot_id,user_id) references public.spots(id,user_id);
alter table public.session_events add constraint events_owned_session foreign key(session_id,user_id) references public.sessions(id,user_id);
alter table public.catches add constraint catches_owned_session foreign key(session_id,user_id) references public.sessions(id,user_id);
alter table public.catches add constraint catches_owned_event foreign key(event_id,user_id) references public.session_events(id,user_id);
alter table public.environment_snapshots add constraint snapshots_owned_session foreign key(session_id,user_id) references public.sessions(id,user_id);
alter table public.alert_rules add constraint alerts_owned_spot foreign key(spot_id,user_id) references public.spots(id,user_id);

create function public.enforce_spot_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare current_plan public.subscription_plan;
begin
  if current_user in ('anon') then raise exception 'Sign in required' using errcode = '42501'; end if;
  -- Lock the profile to serialize concurrent inserts and plan changes.
  select plan into current_plan from public.profiles where id = new.user_id for update;
  if current_plan = 'FREE' and (select count(*) from public.spots where user_id = new.user_id) >= 5 then
    raise exception 'FREE_SPOT_LIMIT' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_spot_limit() from public, anon, authenticated;
create trigger spots_plan_limit before insert on public.spots for each row execute function public.enforce_spot_limit();

create function public.record_session_events(events jsonb)
returns integer language plpgsql security invoker set search_path = '' as $$
declare item jsonb; saved_id uuid; accepted integer := 0; parent public.sessions;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  if jsonb_typeof(events) <> 'array' or jsonb_array_length(events) > 50 then raise exception 'Invalid events'; end if;
  for item in select value from jsonb_array_elements(events) loop
    saved_id := null;
    select * into parent from public.sessions where id = (item->>'sessionId')::uuid and user_id = auth.uid() for update;
    if not found then raise exception 'Session not available' using errcode = '42501'; end if;
    if (item->>'timestamp')::timestamptz < parent.start_time
      or (parent.end_time is not null and (item->>'timestamp')::timestamptz > parent.end_time) then raise exception 'Event outside session'; end if;
    insert into public.session_events(client_id,session_id,user_id,event_type,occurred_at,note)
    values ((item->>'clientId')::uuid,parent.id,auth.uid(),(item->>'type')::public.session_event_type,
      (item->>'timestamp')::timestamptz,left(item->>'note',2000))
    on conflict(user_id,client_id) do nothing returning id into saved_id;
    if saved_id is not null then
      if item->>'type' = 'CATCH' then
        insert into public.catches(session_id,user_id,caught_at,event_id)
        values(parent.id,auth.uid(),(item->>'timestamp')::timestamptz,saved_id);
        update public.sessions set outcome = 'CATCHES' where id = parent.id;
      elsif item->>'type' = 'STRIKE' then
        update public.sessions set outcome = 'STRIKES' where id = parent.id and outcome = 'NONE';
      elsif item->>'type' = 'SPOT_CHANGE' then
        update public.sessions set primary_spot_name = left(item->>'note',100) where id = parent.id;
      end if;
    elsif not exists(select 1 from public.session_events where user_id=auth.uid() and client_id=(item->>'clientId')::uuid and session_id=parent.id) then
      raise exception 'Event identity conflict' using errcode = '42501';
    end if;
    accepted := accepted + 1;
  end loop;
  return accepted;
end;
$$;
revoke all on function public.record_session_events(jsonb) from public, anon;
grant execute on function public.record_session_events(jsonb) to authenticated;

-- User data is never public. Reference catalog policies from 0001 are intentionally preserved.
revoke all on public.spots, public.sessions, public.session_events, public.catches,
  public.user_preferences, public.user_disciplines, public.user_species, public.environment_snapshots,
  public.user_insights, public.alert_rules from anon;
grant select,insert,update,delete on public.spots, public.sessions, public.session_events, public.catches,
  public.user_preferences, public.user_disciplines, public.user_species, public.environment_snapshots,
  public.user_insights, public.alert_rules to authenticated;
