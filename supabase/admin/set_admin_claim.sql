-- Run this in the Supabase SQL editor after replacing the email.
-- It grants admin access for this app by setting app_metadata.role = "admin".

update auth.users
set raw_app_meta_data =
    coalesce(raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object('role', 'admin')
where lower(email) = lower('admin@example.com');

-- Optional check:
select id, email, raw_app_meta_data
from auth.users
where lower(email) = lower('admin@example.com');
