create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  sleep_quality integer check (sleep_quality between 1 and 5),
  stress_level integer check (stress_level between 1 and 5),
  workload_level integer check (workload_level between 1 and 5),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.training_sessions (
  id uuid primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  difficulty text not null,
  status text not null default 'started',
  started_at timestamptz not null,
  completed_at timestamptz,
  accuracy integer,
  recovery_score integer,
  focus_stability integer,
  distraction_sensitivity integer,
  session_payload jsonb not null default '{}'::jsonb
);

create table if not exists public.task_attempts (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.training_sessions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  task_id text not null,
  task_index integer not null,
  response_value text not null,
  correct boolean not null,
  latency_ms integer not null,
  distraction_mode text not null,
  distraction_intensity integer not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.distraction_events (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.training_sessions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  task_index integer not null,
  event_type text not null,
  distraction_mode text not null,
  intensity integer not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.resilience_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  distraction_sensitivity_band text not null,
  recovery_capacity_band text not null,
  focus_stability_band text not null,
  trend_direction text not null,
  summary text not null,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles enable row level security;
alter table public.checkins enable row level security;
alter table public.training_sessions enable row level security;
alter table public.task_attempts enable row level security;
alter table public.distraction_events enable row level security;
alter table public.resilience_profiles enable row level security;

create policy "profiles_select_own"
on public.profiles for select
using (auth.uid() = id);

create policy "profiles_insert_own"
on public.profiles for insert
with check (auth.uid() = id);

create policy "checkins_manage_own"
on public.checkins for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "sessions_manage_own"
on public.training_sessions for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "attempts_manage_own"
on public.task_attempts for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "distraction_events_manage_own"
on public.distraction_events for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "profiles_summary_manage_own"
on public.resilience_profiles for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
