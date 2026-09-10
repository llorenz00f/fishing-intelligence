create extension if not exists "pgcrypto";
create extension if not exists "postgis";

create type public.discipline_code as enum ('SURFCASTING', 'SHORE_SPINNING', 'BOAT', 'SPEARFISHING');
create type public.subscription_plan as enum ('FREE', 'PRO', 'CAPTAIN');
create type public.session_outcome as enum ('NONE', 'STRIKES', 'CATCHES');
create type public.session_event_type as enum ('STRIKE', 'CATCH', 'SPOT_CHANGE', 'NOTE', 'PHOTO');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  home_location geometry(Point, 4326),
  timezone text not null default 'Europe/Rome',
  locale text not null default 'it',
  preferred_units jsonb not null default '{"system":"metric","wind":"knots","temperature":"celsius"}',
  onboarding_completed boolean not null default false,
  plan public.subscription_plan not null default 'FREE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  default_location geometry(Point, 4326),
  default_discipline public.discipline_code,
  default_species text,
  settings jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

create table public.disciplines (
  code public.discipline_code primary key,
  label text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.techniques (
  code text primary key,
  discipline_code public.discipline_code not null references public.disciplines(code),
  label text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.species (
  code text primary key,
  common_name text not null,
  scientific_name text,
  region text not null default 'MEDITERRANEAN',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.user_disciplines (
  user_id uuid not null references auth.users(id) on delete cascade,
  discipline_code public.discipline_code not null references public.disciplines(code),
  created_at timestamptz not null default now(),
  primary key (user_id, discipline_code)
);

create table public.user_species (
  user_id uuid not null references auth.users(id) on delete cascade,
  species_code text not null references public.species(code),
  created_at timestamptz not null default now(),
  primary key (user_id, species_code)
);

create table public.spots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  location geometry(Point, 4326) not null,
  discipline_code public.discipline_code references public.disciplines(code),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  discipline_code public.discipline_code not null references public.disciplines(code),
  technique_code text not null references public.techniques(code),
  target_species_code text references public.species(code),
  start_time timestamptz not null,
  end_time timestamptz,
  start_location geometry(Point, 4326) not null,
  end_location geometry(Point, 4326),
  primary_spot_id uuid references public.spots(id) on delete set null,
  notes text,
  outcome public.session_outcome not null default 'NONE',
  rating int check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.session_events (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null,
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type public.session_event_type not null,
  occurred_at timestamptz not null,
  location geometry(Point, 4326),
  note text,
  photo_url text,
  created_at timestamptz not null default now(),
  unique(user_id, client_id)
);

create table public.catches (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  species_code text not null references public.species(code),
  caught_at timestamptz not null,
  location geometry(Point, 4326),
  estimated_weight_kg numeric(8, 2),
  measured_weight_kg numeric(8, 2),
  length_cm numeric(8, 2),
  bait_or_lure text,
  depth_m numeric(8, 2),
  released boolean not null default false,
  notes text,
  photo_url text,
  created_at timestamptz not null default now()
);

create table public.environment_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete cascade,
  timestamp timestamptz not null,
  location geometry(Point, 4326) not null,
  weather jsonb not null default '{}',
  marine jsonb not null default '{}',
  astronomical jsonb not null default '{}',
  derived jsonb not null default '{}',
  provider text not null,
  fetched_at timestamptz not null,
  missing_fields text[] not null default '{}',
  data_coverage int not null check (data_coverage between 0 and 100),
  created_at timestamptz not null default now()
);

create table public.forecast_cache (
  id uuid primary key default gen_random_uuid(),
  cache_key text not null unique,
  location geometry(Point, 4326) not null,
  forecast_start timestamptz not null,
  forecast_end timestamptz not null,
  provider text not null,
  payload jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.score_profiles (
  id uuid primary key default gen_random_uuid(),
  discipline_code public.discipline_code not null references public.disciplines(code),
  technique_code text not null references public.techniques(code),
  species_code text references public.species(code),
  version text not null,
  active boolean not null default true,
  valid_from timestamptz not null,
  weights jsonb not null,
  created_at timestamptz not null default now()
);

create table public.score_results (
  id uuid primary key default gen_random_uuid(),
  location geometry(Point, 4326) not null,
  timestamp timestamptz not null,
  user_id uuid references auth.users(id) on delete cascade,
  discipline_code public.discipline_code not null,
  technique_code text not null,
  species_code text,
  base_score int not null check (base_score between 0 and 100),
  personal_score int check (personal_score between 0 and 100),
  final_score int not null check (final_score between 0 and 100),
  confidence int not null check (confidence between 0 and 100),
  breakdown jsonb not null,
  model_version text not null,
  created_at timestamptz not null default now()
);

create table public.user_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  insight_type text not null,
  title text not null,
  body text not null,
  sample_size int not null default 0,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan public.subscription_plan not null default 'FREE',
  stripe_customer_id text,
  stripe_subscription_id text,
  status text not null default 'development',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

create table public.alert_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  spot_id uuid references public.spots(id) on delete cascade,
  species_code text references public.species(code),
  technique_code text references public.techniques(code),
  min_score int not null check (min_score between 0 and 100),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index spots_location_gix on public.spots using gist(location);
create index sessions_start_location_gix on public.sessions using gist(start_location);
create index catches_location_gix on public.catches using gist(location);
create index environment_snapshots_location_gix on public.environment_snapshots using gist(location);
create index score_results_location_gix on public.score_results using gist(location);
create index forecast_cache_expires_at_idx on public.forecast_cache(expires_at);

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger user_preferences_updated_at before update on public.user_preferences for each row execute function public.set_updated_at();
create trigger spots_updated_at before update on public.spots for each row execute function public.set_updated_at();
create trigger sessions_updated_at before update on public.sessions for each row execute function public.set_updated_at();
create trigger subscriptions_updated_at before update on public.subscriptions for each row execute function public.set_updated_at();
create trigger alert_rules_updated_at before update on public.alert_rules for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.user_disciplines enable row level security;
alter table public.user_species enable row level security;
alter table public.spots enable row level security;
alter table public.sessions enable row level security;
alter table public.session_events enable row level security;
alter table public.catches enable row level security;
alter table public.environment_snapshots enable row level security;
alter table public.score_results enable row level security;
alter table public.user_insights enable row level security;
alter table public.subscriptions enable row level security;
alter table public.alert_rules enable row level security;

create policy "profiles owner select" on public.profiles for select using (id = auth.uid());
create policy "profiles owner insert" on public.profiles for insert with check (id = auth.uid());
create policy "profiles owner update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy "preferences owner all" on public.user_preferences for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "user disciplines owner all" on public.user_disciplines for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "user species owner all" on public.user_species for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "spots owner all" on public.spots for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "sessions owner all" on public.sessions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "events owner all" on public.session_events for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "catches owner all" on public.catches for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "snapshots owner all" on public.environment_snapshots for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "scores owner select" on public.score_results for select using (user_id is null or user_id = auth.uid());
create policy "scores owner insert" on public.score_results for insert with check (user_id is null or user_id = auth.uid());
create policy "insights owner all" on public.user_insights for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "subscriptions owner select" on public.subscriptions for select using (user_id = auth.uid());
create policy "alerts owner all" on public.alert_rules for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.disciplines enable row level security;
alter table public.techniques enable row level security;
alter table public.species enable row level security;
alter table public.score_profiles enable row level security;
alter table public.forecast_cache enable row level security;

create policy "reference disciplines readable" on public.disciplines for select using (true);
create policy "reference techniques readable" on public.techniques for select using (true);
create policy "reference species readable" on public.species for select using (true);
create policy "active score profiles readable" on public.score_profiles for select using (active = true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('catch-photos', 'catch-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "catch photos owner read" on storage.objects for select
using (bucket_id = 'catch-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "catch photos owner insert" on storage.objects for insert
with check (bucket_id = 'catch-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "catch photos owner update" on storage.objects for update
using (bucket_id = 'catch-photos' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'catch-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "catch photos owner delete" on storage.objects for delete
using (bucket_id = 'catch-photos' and (storage.foldername(name))[1] = auth.uid()::text);
