-- Report quota and Razorpay subscription state.
-- CAS files, parsed reports, and uploaded filenames are not stored here.

alter table public.profiles
    add column if not exists cas_report_limit integer not null default 1,
    add column if not exists cas_reports_used integer not null default 0,
    add column if not exists subscription_status text not null default 'free',
    add column if not exists razorpay_customer_id text,
    add column if not exists razorpay_subscription_id text,
    add column if not exists razorpay_subscription_current_end timestamptz,
    add column if not exists subscribed_at timestamptz,
    add column if not exists subscription_updated_at timestamptz;

alter table public.profiles
    drop constraint if exists profiles_cas_report_limit_nonnegative,
    add constraint profiles_cas_report_limit_nonnegative check (cas_report_limit >= 0);

alter table public.profiles
    drop constraint if exists profiles_cas_reports_used_nonnegative,
    add constraint profiles_cas_reports_used_nonnegative check (cas_reports_used >= 0);

alter table public.profiles
    drop constraint if exists profiles_subscription_status_valid,
    add constraint profiles_subscription_status_valid check (
        subscription_status in (
            'free',
            'created',
            'authenticated',
            'active',
            'pending',
            'halted',
            'cancelled',
            'completed',
            'expired',
            'paused'
        )
    );

create unique index if not exists profiles_razorpay_subscription_id_unique
on public.profiles (razorpay_subscription_id)
where razorpay_subscription_id is not null;

create table if not exists public.razorpay_webhook_events (
    event_id text primary key,
    event_name text not null,
    processed_at timestamptz not null default timezone('utc', now())
);

alter table public.razorpay_webhook_events enable row level security;

drop policy if exists "Admins can read Razorpay webhook events" on public.razorpay_webhook_events;

create policy "Admins can read Razorpay webhook events"
on public.razorpay_webhook_events
for select
to authenticated
using (public.echo_is_admin());

create or replace function public.echo_profile_has_unlimited_reports(raw_status text)
returns boolean
language sql
immutable
as $$
    select coalesce(raw_status, '') in ('authenticated', 'active')
$$;

create or replace function public.echo_get_access_status(target_user_id uuid)
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
begin
    insert into public.profiles (id, username)
    values (target_user_id, public.echo_clean_username(null, target_user_id))
    on conflict (id) do nothing;

    return query
    select
        public.echo_profile_has_unlimited_reports(p.subscription_status)
            or greatest(p.cas_report_limit - p.cas_reports_used, 0) > 0 as can_analyze,
        public.echo_profile_has_unlimited_reports(p.subscription_status) as has_unlimited_reports,
        p.cas_report_limit,
        p.cas_reports_used,
        greatest(p.cas_report_limit - p.cas_reports_used, 0) as remaining_free_reports,
        p.subscription_status,
        p.razorpay_subscription_id,
        p.razorpay_subscription_current_end as current_period_end
    from public.profiles p
    where p.id = target_user_id;
end;
$$;

create or replace function public.echo_consume_report_credit(target_user_id uuid)
returns table (
    allowed boolean,
    credit_consumed boolean,
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
    profile_row public.profiles%rowtype;
    unlimited boolean;
begin
    insert into public.profiles (id, username)
    values (target_user_id, public.echo_clean_username(null, target_user_id))
    on conflict (id) do nothing;

    select *
    into profile_row
    from public.profiles
    where id = target_user_id
    for update;

    unlimited := public.echo_profile_has_unlimited_reports(profile_row.subscription_status);

    if unlimited then
        return query
        select
            true,
            false,
            true,
            true,
            profile_row.cas_report_limit,
            profile_row.cas_reports_used,
            greatest(profile_row.cas_report_limit - profile_row.cas_reports_used, 0),
            profile_row.subscription_status,
            profile_row.razorpay_subscription_id,
            profile_row.razorpay_subscription_current_end;
        return;
    end if;

    if profile_row.cas_reports_used < profile_row.cas_report_limit then
        update public.profiles as p
        set
            cas_reports_used = p.cas_reports_used + 1,
            updated_at = timezone('utc', now())
        where p.id = target_user_id
        returning *
        into profile_row;

        return query
        select
            true,
            true,
            public.echo_profile_has_unlimited_reports(profile_row.subscription_status)
                or greatest(profile_row.cas_report_limit - profile_row.cas_reports_used, 0) > 0,
            public.echo_profile_has_unlimited_reports(profile_row.subscription_status),
            profile_row.cas_report_limit,
            profile_row.cas_reports_used,
            greatest(profile_row.cas_report_limit - profile_row.cas_reports_used, 0),
            profile_row.subscription_status,
            profile_row.razorpay_subscription_id,
            profile_row.razorpay_subscription_current_end;
        return;
    end if;

    return query
    select
        false,
        false,
        false,
        false,
        profile_row.cas_report_limit,
        profile_row.cas_reports_used,
        0,
        profile_row.subscription_status,
        profile_row.razorpay_subscription_id,
        profile_row.razorpay_subscription_current_end;
end;
$$;

create or replace function public.echo_refund_report_credit(target_user_id uuid)
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
    profile_row public.profiles%rowtype;
begin
    update public.profiles as p
    set
        cas_reports_used = greatest(p.cas_reports_used - 1, 0),
        updated_at = timezone('utc', now())
    where p.id = target_user_id
    returning *
    into profile_row;

    if not found then
        return query
        select *
        from public.echo_get_access_status(target_user_id);
        return;
    end if;

    return query
    select
        public.echo_profile_has_unlimited_reports(profile_row.subscription_status)
            or greatest(profile_row.cas_report_limit - profile_row.cas_reports_used, 0) > 0,
        public.echo_profile_has_unlimited_reports(profile_row.subscription_status),
        profile_row.cas_report_limit,
        profile_row.cas_reports_used,
        greatest(profile_row.cas_report_limit - profile_row.cas_reports_used, 0),
        profile_row.subscription_status,
        profile_row.razorpay_subscription_id,
        profile_row.razorpay_subscription_current_end;
end;
$$;

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

create or replace function public.echo_claim_razorpay_webhook_event(event_id text, event_name text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
    if coalesce(trim(event_id), '') = '' then
        return true;
    end if;

    insert into public.razorpay_webhook_events (event_id, event_name)
    values (event_id, coalesce(nullif(event_name, ''), 'unknown'))
    on conflict (event_id) do nothing;

    return found;
end;
$$;

-- Browser-authenticated users must not be able to edit quota or billing state
-- directly through PostgREST. They can update only their display username.
revoke update on table public.profiles from anon, authenticated;
grant update (username) on table public.profiles to authenticated;

-- These security-definer RPCs are backend-only. Leaving EXECUTE on PUBLIC would
-- let signed-in users call them directly from the Supabase JS client.
revoke execute on function public.echo_get_access_status(uuid) from public, anon, authenticated;
revoke execute on function public.echo_consume_report_credit(uuid) from public, anon, authenticated;
revoke execute on function public.echo_refund_report_credit(uuid) from public, anon, authenticated;
revoke execute on function public.echo_apply_razorpay_subscription_event(uuid, text, text, text, timestamptz) from public, anon, authenticated;
revoke execute on function public.echo_has_razorpay_webhook_event(text) from public, anon, authenticated;
revoke execute on function public.echo_claim_razorpay_webhook_event(text, text) from public, anon, authenticated;

grant execute on function public.echo_get_access_status(uuid) to service_role;
grant execute on function public.echo_consume_report_credit(uuid) to service_role;
grant execute on function public.echo_refund_report_credit(uuid) to service_role;
grant execute on function public.echo_apply_razorpay_subscription_event(uuid, text, text, text, timestamptz) to service_role;
grant execute on function public.echo_has_razorpay_webhook_event(text) to service_role;
grant execute on function public.echo_claim_razorpay_webhook_event(text, text) to service_role;
