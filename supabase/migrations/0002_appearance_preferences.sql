-- Keep ordinary profile edits working, but make billing entitlements server-owned.
create function public.protect_profile_plan()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      if new.plan is distinct from 'FREE'::public.subscription_plan then
        raise exception 'Profile plan is managed by the server' using errcode = '42501';
      end if;
    elsif new.plan is distinct from old.plan then
      raise exception 'Profile plan is managed by the server' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.protect_profile_plan() from public, anon, authenticated;

create trigger profiles_protect_plan
before insert or update on public.profiles
for each row execute function public.protect_profile_plan();

-- A separate table preserves the existing user_preferences settings and schema.
create table public.appearance_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme_id text not null default 'deep-ocean'
    check (theme_id in ('deep-ocean', 'mediterranean-light', 'sunset', 'graphite-marine', 'abyss', 'dynamic-weather')),
  dynamic_weather_theme_enabled boolean not null default false,
  ambient_effect_intensity text not null default 'standard'
    check (ambient_effect_intensity in ('off', 'reduced', 'standard')),
  appearance_mode text not null default 'system'
    check (appearance_mode in ('system', 'dark', 'light')),
  reduced_motion boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger appearance_preferences_updated_at
before update on public.appearance_preferences
for each row execute function public.set_updated_at();

alter table public.appearance_preferences enable row level security;

revoke all on table public.appearance_preferences from public, anon, authenticated;
grant select, insert, update, delete on table public.appearance_preferences to authenticated;
grant all on table public.appearance_preferences to service_role;

create policy "appearance preferences owner read"
on public.appearance_preferences for select to authenticated
using (user_id = (select auth.uid()));

create policy "appearance preferences owner insert"
on public.appearance_preferences for insert to authenticated
with check (
  user_id = (select auth.uid())
  and (
    (theme_id = 'deep-ocean' and not dynamic_weather_theme_enabled)
    or exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid()) and profiles.plan in ('PRO', 'CAPTAIN')
    )
  )
);

create policy "appearance preferences owner update"
on public.appearance_preferences for update to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and (
    (theme_id = 'deep-ocean' and not dynamic_weather_theme_enabled)
    or exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid()) and profiles.plan in ('PRO', 'CAPTAIN')
    )
  )
);

create policy "appearance preferences owner delete"
on public.appearance_preferences for delete to authenticated
using (user_id = (select auth.uid()));
