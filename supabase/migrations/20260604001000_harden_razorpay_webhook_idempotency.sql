-- Make Razorpay webhook retries safe after transient processing failures.

create or replace function public.echo_apply_razorpay_subscription_event(
    target_user_id uuid,
    new_subscription_id text,
    new_customer_id text,
    new_subscription_status text,
    new_current_period_end timestamptz
)
returns table (
    can_analyze boolean,
    has_unlimited_reports boolean,
    cas_report_limit integer,
    cas_reports_used integer,
    remaining_free_reports integer,
    subscription_status text,
    razorpay_subscription_id text,
    current_period_end timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
    resolved_user_id uuid;
begin
    resolved_user_id := target_user_id;

    if resolved_user_id is null and new_subscription_id is not null then
        select id
        into resolved_user_id
        from public.profiles
        where razorpay_subscription_id = new_subscription_id
        limit 1;
    end if;

    if resolved_user_id is null then
        return;
    end if;

    insert into public.profiles (id, username)
    values (resolved_user_id, public.echo_clean_username(null, resolved_user_id))
    on conflict (id) do nothing;

    update public.profiles
    set
        subscription_status = case
            when public.profiles.subscription_status in ('authenticated', 'active')
                and coalesce(nullif(new_subscription_status, ''), public.profiles.subscription_status) in ('created', 'pending')
                then public.profiles.subscription_status
            else coalesce(nullif(new_subscription_status, ''), public.profiles.subscription_status)
        end,
        razorpay_subscription_id = coalesce(nullif(new_subscription_id, ''), public.profiles.razorpay_subscription_id),
        razorpay_customer_id = coalesce(nullif(new_customer_id, ''), public.profiles.razorpay_customer_id),
        razorpay_subscription_current_end = case
            when public.profiles.subscription_status in ('authenticated', 'active')
                and coalesce(nullif(new_subscription_status, ''), public.profiles.subscription_status) in ('created', 'pending')
                then public.profiles.razorpay_subscription_current_end
            else coalesce(new_current_period_end, public.profiles.razorpay_subscription_current_end)
        end,
        subscribed_at = case
            when (
                case
                    when public.profiles.subscription_status in ('authenticated', 'active')
                        and coalesce(nullif(new_subscription_status, ''), public.profiles.subscription_status) in ('created', 'pending')
                        then public.profiles.subscription_status
                    else coalesce(nullif(new_subscription_status, ''), public.profiles.subscription_status)
                end
            ) in ('authenticated', 'active')
                then coalesce(public.profiles.subscribed_at, timezone('utc', now()))
            else public.profiles.subscribed_at
        end,
        subscription_updated_at = timezone('utc', now()),
        updated_at = timezone('utc', now())
    where id = resolved_user_id;

    return query
    select *
    from public.echo_get_access_status(resolved_user_id);
end;
$$;

create or replace function public.echo_has_razorpay_webhook_event(event_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    normalized_event_id text;
begin
    normalized_event_id := trim(event_id);
    if coalesce(normalized_event_id, '') = '' then
        return false;
    end if;

    return exists (
        select 1
        from public.razorpay_webhook_events
        where razorpay_webhook_events.event_id = normalized_event_id
    );
end;
$$;

revoke execute on function public.echo_apply_razorpay_subscription_event(uuid, text, text, text, timestamptz) from public, anon, authenticated;
revoke execute on function public.echo_has_razorpay_webhook_event(text) from public, anon, authenticated;
revoke execute on function public.echo_claim_razorpay_webhook_event(text, text) from public, anon, authenticated;

grant execute on function public.echo_apply_razorpay_subscription_event(uuid, text, text, text, timestamptz) to service_role;
grant execute on function public.echo_has_razorpay_webhook_event(text) to service_role;
grant execute on function public.echo_claim_razorpay_webhook_event(text, text) to service_role;
