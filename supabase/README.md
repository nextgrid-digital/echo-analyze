# Supabase Setup

This folder contains Supabase-side setup for the Echo Analyze auth/admin integration.
Application runtime code stays in `app/Code/supabase_auth.py` and `frontend/src/lib/supabase.ts`.

## What This Supports

- Email/password Supabase Auth sign-in and sign-up.
- Google sign-in through Supabase OAuth.
- A `public.profiles` mirror for usernames from `auth.users.raw_user_meta_data.username`.
- Admin detection through Supabase app metadata, using `role = "admin"` by default.
- RLS policies that let users read/update their own profile and admins read profiles.

The app does not store CAS files, parsed CAS reports, or uploaded filenames. Admin analytics show usernames only.

## Apply The Migration

With Supabase CLI:

```powershell
supabase db push
```

Or copy the SQL from `migrations/20260526000000_auth_profiles_and_admin.sql` into the Supabase SQL editor.

## Enable Google Sign-In

1. In Google Cloud Console, create or select a project.
2. Configure the OAuth consent screen.
3. Create an OAuth Client ID for a web application.
4. Add this Authorized redirect URI:

   ```text
   https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
   ```

5. In Supabase Dashboard, open Authentication > Providers > Google.
6. Enable Google and paste the Google Client ID and Client Secret.
7. In Supabase Authentication > URL Configuration, set:
   - Site URL: your deployed frontend URL, such as `https://your-domain.com`
   - Redirect URLs: local and deployed app origins, such as `http://localhost:5173`, `http://localhost:8000`, and your production URL

The frontend calls `signInWithOAuth({ provider: "google" })` and redirects back to the current app origin.

## Make A User Admin

After the user exists in Supabase Auth, run the helper in:

```text
supabase/admin/set_admin_claim.sql
```

Replace `admin@example.com` with the admin user's email before running it. The backend also supports env allowlists:

- `SUPABASE_ADMIN_USER_IDS`
- `SUPABASE_ADMIN_EMAILS`

## Required Env

Backend:

```text
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ADMIN_ROLE=admin
```

Frontend:

```text
APP_SUPABASE_URL=
APP_SUPABASE_ANON_KEY=
APP_SUPABASE_ADMIN_ROLE=admin
```

Never put `SUPABASE_SERVICE_ROLE_KEY` in frontend env files.
