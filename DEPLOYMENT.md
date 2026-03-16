# aime Tempo – Deployment (GitHub + Vercel + Supabase)

This app is built for **web-only** deployment: you configure everything in **Vercel Project Settings** and **Supabase Dashboard**. No `.env.local` or local machine is required for production.

---

## 1. Vercel environment variables

In **Vercel** → your project → **Settings** → **Environment Variables**, add:

| Name | Value | Notes |
|------|--------|------|
| `VITE_SUPABASE_URL` | `https://YOUR_PROJECT_REF.supabase.co` | From Supabase → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Your anon/public key | From Supabase → Settings → API. **Do not commit this.** |

- Apply to **Production** (and Preview if you use preview deploys).
- The repo only has `.env.example` with empty placeholders; real values live only in Vercel.

---

## 2. Supabase: run migrations

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project (e.g. `ulbrpzgjtrloycsjcdur`).
2. Go to **SQL Editor**.
3. Run the migrations in order:
   - **First:** contents of `supabase/migrations/0001_init_schema.sql`
   - **Second:** contents of `supabase/migrations/0002_rls_policies.sql`

This creates tables (`profiles`, `projects`, `time_logs`, `time_corrections`, `pending_projects`, `work_notifications`) and RLS policies.

---

## 3. Create the first supervisor (Supabase Auth + profile)

1. **Create Auth user**  
   Supabase Dashboard → **Authentication** → **Users** → **Add user** → **Create new user**.  
   Set **Email** and **Password**; note the user’s **UUID** (or copy it from the list after creation).

2. **Create profile row**  
   Supabase Dashboard → **Table Editor** → **profiles** → **Insert row**, or run in **SQL Editor**:

   ```sql
   insert into public.profiles (id, full_name, role, hourly_rate, language)
   values (
     'PASTE_THE_AUTH_USER_UUID_HERE',
     'Maria Supervisor',
     'supervisor',
     45,
     'en'
   )
   on conflict (id) do update
   set full_name = excluded.full_name,
       role = excluded.role,
       hourly_rate = excluded.hourly_rate,
       language = excluded.language;
   ```

   Replace `PASTE_THE_AUTH_USER_UUID_HERE` with the UUID from step 1.

3. **Sign in**  
   In the deployed app, sign in with that email and password. You should be redirected to the supervisor dashboard.

---

## 4. Adding painters

- **Option A:** Create users in Supabase **Authentication** → **Users** (email + password), then add a row in **profiles** with the same `id` (UUID), `full_name`, `role = 'painter'`, `hourly_rate`, and `language`.
- **Option B:** Use the SQL helper in `supabase/seed/0001_bootstrap_supervisor.sql` as a template (replace the UUID) for additional users.

The app does **not** store passwords; auth is handled entirely by Supabase Auth.

---

## 5. Deploy on Vercel (GitHub)

1. Connect your GitHub repo to Vercel (if not already).
2. Set the two env vars above in Vercel.
3. Deploy (push to main or trigger a deploy from Vercel).

Build command: `npm run build` (or `vite build`). Output: `dist/`. No extra build settings are required.

---

## 6. Summary checklist

- [ ] `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set in Vercel (no secrets in repo).
- [ ] `0001_init_schema.sql` and `0002_rls_policies.sql` run in Supabase SQL Editor.
- [ ] First supervisor created in Auth and a matching row in `profiles`.
- [ ] Deploy from GitHub to Vercel; confirm login and role redirect work.

---

## Notes

- **`.env.example`** is committed with placeholder keys only; real values are in Vercel.
- **Row Level Security (RLS)** is enabled on all tables; policies are in `0002_rls_policies.sql`.
- **Team (profiles):** New team members are created in Supabase Auth and given a `profiles` row; the in-app “Add team member” flow explains this and does not create Auth users from the client.
