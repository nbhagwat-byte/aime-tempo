-- aime Tempo - RLS policies (migration 0002)
-- Notes:
-- - We use a helper function is_supervisor() to keep policies readable.
-- - Policies are intentionally "practical": supervisors can manage operational tables,
--   painters can manage only their own records.

begin;

-- Helper function: check if current user is a supervisor.
-- Security definer so it can read profiles under RLS.
create or replace function public.is_supervisor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'supervisor'
  );
$$;

-- PROFILES
drop policy if exists "profiles_self_read" on public.profiles;
create policy "profiles_self_read"
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_supervisor());

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Allow supervisors to manage profiles (team management).
drop policy if exists "profiles_supervisor_manage" on public.profiles;
create policy "profiles_supervisor_manage"
on public.profiles
for all
to authenticated
using (public.is_supervisor())
with check (public.is_supervisor());

-- PROJECTS
-- Painters can read active projects (and optionally completed ones if still active).
-- We exclude pending projects from painter visibility.
drop policy if exists "projects_painter_read" on public.projects;
create policy "projects_painter_read"
on public.projects
for select
to authenticated
using (active = true and is_pending = false);

-- Supervisors can manage all projects.
drop policy if exists "projects_supervisor_manage" on public.projects;
create policy "projects_supervisor_manage"
on public.projects
for all
to authenticated
using (public.is_supervisor())
with check (public.is_supervisor());

-- TIME LOGS
drop policy if exists "time_logs_self_read" on public.time_logs;
create policy "time_logs_self_read"
on public.time_logs
for select
to authenticated
using (user_id = auth.uid() or public.is_supervisor());

drop policy if exists "time_logs_self_insert" on public.time_logs;
create policy "time_logs_self_insert"
on public.time_logs
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "time_logs_self_update" on public.time_logs;
create policy "time_logs_self_update"
on public.time_logs
for update
to authenticated
using (user_id = auth.uid() or public.is_supervisor())
with check (user_id = auth.uid() or public.is_supervisor());

-- TIME CORRECTIONS
drop policy if exists "time_corrections_self_read" on public.time_corrections;
create policy "time_corrections_self_read"
on public.time_corrections
for select
to authenticated
using (user_id = auth.uid() or public.is_supervisor());

drop policy if exists "time_corrections_self_insert" on public.time_corrections;
create policy "time_corrections_self_insert"
on public.time_corrections
for insert
to authenticated
with check (user_id = auth.uid());

-- Supervisors update correction status/denial reason.
drop policy if exists "time_corrections_supervisor_update" on public.time_corrections;
create policy "time_corrections_supervisor_update"
on public.time_corrections
for update
to authenticated
using (public.is_supervisor())
with check (public.is_supervisor());

-- PENDING PROJECTS
drop policy if exists "pending_projects_self_read" on public.pending_projects;
create policy "pending_projects_self_read"
on public.pending_projects
for select
to authenticated
using (requested_by = auth.uid() or public.is_supervisor());

drop policy if exists "pending_projects_self_insert" on public.pending_projects;
create policy "pending_projects_self_insert"
on public.pending_projects
for insert
to authenticated
with check (requested_by = auth.uid());

drop policy if exists "pending_projects_supervisor_manage" on public.pending_projects;
create policy "pending_projects_supervisor_manage"
on public.pending_projects
for all
to authenticated
using (public.is_supervisor())
with check (public.is_supervisor());

-- WORK NOTIFICATIONS
drop policy if exists "work_notifications_self_read" on public.work_notifications;
create policy "work_notifications_self_read"
on public.work_notifications
for select
to authenticated
using (user_id = auth.uid() or public.is_supervisor());

drop policy if exists "work_notifications_self_insert" on public.work_notifications;
create policy "work_notifications_self_insert"
on public.work_notifications
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "work_notifications_self_update" on public.work_notifications;
create policy "work_notifications_self_update"
on public.work_notifications
for update
to authenticated
using (user_id = auth.uid() or public.is_supervisor())
with check (user_id = auth.uid() or public.is_supervisor());

commit;

