-- aime Tempo - Supabase schema + RLS (migration 0001)
-- This migration creates the production tables and enables Row Level Security.
-- Apply in Supabase SQL Editor (or CLI migrations) for project `ulbrpzgjtrloycsjcdur`.

begin;

-- Extensions used for uuid generation (available by default on Supabase)
create extension if not exists "pgcrypto";

-- Helper: keep updated_at current
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- PROFILES (ties app identity + role to auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null check (role in ('painter','supervisor')),
  hourly_rate numeric not null default 0,
  language text not null default 'en' check (language in ('en','es')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- PROJECTS
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  latitude numeric,
  longitude numeric,
  radius numeric not null default 100,
  active boolean not null default true,
  is_pending boolean not null default false,
  notes text,
  project_status text not null default 'in_progress' check (project_status in ('in_progress','complete')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_projects_updated_at on public.projects;
create trigger trg_projects_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

-- TIME LOGS
create table if not exists public.time_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete restrict,
  check_in timestamptz not null,
  check_out timestamptz,
  latitude numeric,
  longitude numeric,
  accuracy numeric,
  status text not null check (status in ('active','completed','pending_correction','pending_review')),
  sync_status text not null check (sync_status in ('synced','pending')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_time_logs_user_id on public.time_logs(user_id);
create index if not exists idx_time_logs_project_id on public.time_logs(project_id);
create index if not exists idx_time_logs_check_in on public.time_logs(check_in);

drop trigger if exists trg_time_logs_updated_at on public.time_logs;
create trigger trg_time_logs_updated_at
before update on public.time_logs
for each row execute function public.set_updated_at();

-- TIME CORRECTIONS
create table if not exists public.time_corrections (
  id uuid primary key default gen_random_uuid(),
  time_log_id uuid not null references public.time_logs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  requested_time timestamptz not null,
  original_time timestamptz not null,
  type text not null check (type in ('check_in','check_out')),
  reason text not null,
  status text not null check (status in ('pending','approved','denied')),
  created_at timestamptz not null default now(),
  denial_reason text
);

create index if not exists idx_time_corrections_status on public.time_corrections(status);
create index if not exists idx_time_corrections_time_log_id on public.time_corrections(time_log_id);

-- PENDING PROJECTS (requests from painters)
create table if not exists public.pending_projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  radius numeric not null default 100,
  status text not null check (status in ('pending','approved','denied')),
  requested_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_pending_projects_status on public.pending_projects(status);

-- WORK NOTIFICATIONS
create table if not exists public.work_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  dismissed boolean not null default false,
  timestamp timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_work_notifications_user_id on public.work_notifications(user_id);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.time_logs enable row level security;
alter table public.time_corrections enable row level security;
alter table public.pending_projects enable row level security;
alter table public.work_notifications enable row level security;

commit;

