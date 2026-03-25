revoke execute on function public.admin_overview_metrics() from public, anon, authenticated;
revoke execute on function public.admin_user_rollup(integer) from public, anon, authenticated;
revoke execute on function public.admin_recent_runs(integer) from public, anon, authenticated;
revoke execute on function public.admin_recent_user_events(integer) from public, anon, authenticated;

grant execute on function public.admin_overview_metrics() to service_role;
grant execute on function public.admin_user_rollup(integer) to service_role;
grant execute on function public.admin_recent_runs(integer) to service_role;
grant execute on function public.admin_recent_user_events(integer) to service_role;
