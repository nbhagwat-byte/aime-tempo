-- Bootstrap script for first supervisor profile.
-- Steps:
-- 1) In Supabase Dashboard → Authentication → Users, create a user with email/password.
-- 2) Copy the new user's UUID.
-- 3) Paste it below and run this script.

-- Replace with auth user UUID:
-- select '00000000-0000-0000-0000-000000000000'::uuid as supervisor_id;

-- Example:
-- insert into public.profiles (id, full_name, role, hourly_rate, language)
-- values ('00000000-0000-0000-0000-000000000000', 'Maria Supervisor', 'supervisor', 45, 'en')
-- on conflict (id) do update
-- set full_name = excluded.full_name,
--     role = excluded.role,
--     hourly_rate = excluded.hourly_rate,
--     language = excluded.language;

