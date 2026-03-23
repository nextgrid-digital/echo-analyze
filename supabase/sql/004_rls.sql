create or replace function public.is_admin(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = check_user_id
      and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.user_events enable row level security;
alter table public.analysis_runs enable row level security;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists "user_events_select_own_or_admin" on public.user_events;
create policy "user_events_select_own_or_admin"
on public.user_events
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "analysis_runs_select_own_or_admin" on public.analysis_runs;
create policy "analysis_runs_select_own_or_admin"
on public.analysis_runs
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());
