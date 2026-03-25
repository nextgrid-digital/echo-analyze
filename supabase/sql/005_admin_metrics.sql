create or replace function public.admin_overview_metrics()
returns table (
  total_users bigint,
  admin_users bigint,
  active_users_30d bigint,
  total_sign_ins_30d bigint,
  total_analysis_runs bigint,
  successful_analysis_runs bigint,
  failed_analysis_runs bigint,
  average_duration_ms numeric,
  p50_duration_ms numeric,
  p95_duration_ms numeric
)
language sql
security definer
set search_path = public
as $$
  with duration_stats as (
    select
      avg(duration_ms)::numeric(12, 2) as average_duration_ms,
      percentile_cont(0.5) within group (order by duration_ms)::numeric(12, 2) as p50_duration_ms,
      percentile_cont(0.95) within group (order by duration_ms)::numeric(12, 2) as p95_duration_ms
    from public.analysis_runs
    where status = 'succeeded'
      and duration_ms is not null
  ),
  active_users as (
    select count(distinct user_id) as active_users_30d
    from (
      select user_id
      from public.analysis_runs
      where created_at >= timezone('utc', now()) - interval '30 days'
      union
      select user_id
      from public.user_events
      where created_at >= timezone('utc', now()) - interval '30 days'
    ) active_user_ids
  )
  select
    (select count(*) from public.profiles) as total_users,
    (select count(*) from public.profiles where role = 'admin') as admin_users,
    (select active_users_30d from active_users) as active_users_30d,
    (
      select count(*)
      from public.user_events
      where event_type = 'signed_in'
        and created_at >= timezone('utc', now()) - interval '30 days'
    ) as total_sign_ins_30d,
    (select count(*) from public.analysis_runs) as total_analysis_runs,
    (select count(*) from public.analysis_runs where status = 'succeeded') as successful_analysis_runs,
    (select count(*) from public.analysis_runs where status = 'failed') as failed_analysis_runs,
    duration_stats.average_duration_ms,
    duration_stats.p50_duration_ms,
    duration_stats.p95_duration_ms
  from duration_stats;
$$;

create or replace function public.admin_user_rollup(limit_count integer default 50)
returns table (
  user_id uuid,
  role text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  analysis_runs bigint,
  successful_runs bigint,
  failed_runs bigint,
  average_duration_ms numeric,
  last_run_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    p.id as user_id,
    p.role,
    p.created_at,
    p.last_sign_in_at,
    count(ar.id) as analysis_runs,
    count(*) filter (where ar.status = 'succeeded') as successful_runs,
    count(*) filter (where ar.status = 'failed') as failed_runs,
    avg(ar.duration_ms)::numeric(12, 2) as average_duration_ms,
    max(ar.created_at) as last_run_at
  from public.profiles p
  left join public.analysis_runs ar on ar.user_id = p.id
  group by p.id, p.role, p.created_at, p.last_sign_in_at
  order by coalesce(max(ar.created_at), p.created_at) desc
  limit greatest(limit_count, 1);
$$;

create or replace function public.admin_recent_runs(limit_count integer default 20)
returns table (
  id uuid,
  user_id uuid,
  status text,
  file_kind text,
  file_size_bytes integer,
  had_password boolean,
  duration_ms integer,
  error_code text,
  created_at timestamptz,
  completed_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    ar.id,
    ar.user_id,
    ar.status,
    ar.file_kind,
    ar.file_size_bytes,
    ar.had_password,
    ar.duration_ms,
    ar.error_code,
    ar.created_at,
    ar.completed_at
  from public.analysis_runs ar
  order by ar.created_at desc
  limit greatest(limit_count, 1);
$$;

create or replace function public.admin_recent_user_events(limit_count integer default 20)
returns table (
  id uuid,
  user_id uuid,
  event_type text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    ue.id,
    ue.user_id,
    ue.event_type,
    ue.created_at
  from public.user_events ue
  order by ue.created_at desc
  limit greatest(limit_count, 1);
$$;

revoke execute on function public.admin_overview_metrics() from public, anon, authenticated;
revoke execute on function public.admin_user_rollup(integer) from public, anon, authenticated;
revoke execute on function public.admin_recent_runs(integer) from public, anon, authenticated;
revoke execute on function public.admin_recent_user_events(integer) from public, anon, authenticated;

grant execute on function public.admin_overview_metrics() to service_role;
grant execute on function public.admin_user_rollup(integer) to service_role;
grant execute on function public.admin_recent_runs(integer) to service_role;
grant execute on function public.admin_recent_user_events(integer) to service_role;
