## Echo-Analyze Supabase Setup

Run the SQL files in `supabase/sql` in this order:

1. `001_profiles.sql`
2. `002_user_events.sql`
3. `003_analysis_runs.sql`
4. `004_rls.sql`
5. `005_admin_metrics.sql`
6. `006_seed_admin_example.sql`

Project settings to configure in Supabase:

1. Enable Email auth under `Authentication -> Providers`.
2. Add your local and deployed URLs under `Authentication -> URL Configuration`.
3. Copy the project URL and anon key for the frontend env vars.
4. Copy the project URL, anon key, and service role key for the backend env vars.

Required env vars:

- Frontend:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- Backend:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

Notes:

- CAS PDFs, parsed CAS payloads, holdings, and analysis output are intentionally not stored in Supabase.
- `auth.users` will still store the user email because Supabase Auth requires it for email/password login.
- `profiles`, `user_events`, and `analysis_runs` store only operational metadata for access control and admin reporting.
