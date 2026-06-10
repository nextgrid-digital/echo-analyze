-- Grant admin + unlimited CAS analysis for a dev account.
-- Replace the email below, then run in the Supabase SQL editor.

-- Step A: admin JWT claim (app_metadata.role = admin)
update auth.users
set raw_app_meta_data =
    coalesce(raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object('role', 'admin')
where lower(email) = lower('abin@nextgrid.digital');

-- Step B: unlimited reports (subscription_status active)
update public.profiles
set
  subscription_status = 'active',
  cas_reports_used = 0,
  cas_report_limit = 1,
  subscription_updated_at = timezone('utc', now()),
  updated_at = timezone('utc', now())
where id = (
  select id from auth.users where lower(email) = lower('abin@nextgrid.digital')
);

-- Verify
select u.email, u.raw_app_meta_data, p.subscription_status, p.cas_reports_used, p.cas_report_limit
from auth.users u
left join public.profiles p on p.id = u.id
where lower(u.email) = lower('abin@nextgrid.digital');
