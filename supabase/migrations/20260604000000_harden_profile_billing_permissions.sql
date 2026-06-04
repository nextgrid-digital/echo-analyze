-- Defense-in-depth hardening for profile billing state and backend-only RPCs.
-- Apply this even if the earlier auth/billing migrations have already run.

revoke update on table public.profiles from anon, authenticated;
grant update (username) on table public.profiles to authenticated;

revoke execute on function public.echo_get_access_status(uuid) from public, anon, authenticated;
revoke execute on function public.echo_consume_report_credit(uuid) from public, anon, authenticated;
revoke execute on function public.echo_refund_report_credit(uuid) from public, anon, authenticated;
revoke execute on function public.echo_apply_razorpay_subscription_event(uuid, text, text, text, timestamptz) from public, anon, authenticated;
revoke execute on function public.echo_claim_razorpay_webhook_event(text, text) from public, anon, authenticated;

grant execute on function public.echo_get_access_status(uuid) to service_role;
grant execute on function public.echo_consume_report_credit(uuid) to service_role;
grant execute on function public.echo_refund_report_credit(uuid) to service_role;
grant execute on function public.echo_apply_razorpay_subscription_event(uuid, text, text, text, timestamptz) to service_role;
grant execute on function public.echo_claim_razorpay_webhook_event(text, text) to service_role;
