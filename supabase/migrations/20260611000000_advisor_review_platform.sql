-- Advisor Review Platform: snapshots, share links, meeting briefs, review history.

alter table public.advisor_clients
    add column if not exists next_review_date date,
    add column if not exists last_review_at timestamptz;

create table if not exists public.review_snapshots (
    id uuid primary key default gen_random_uuid(),
    advisor_id uuid not null references auth.users(id) on delete cascade,
    client_pan text not null,
    analysis_json jsonb not null,
    client_payload_json jsonb not null default '{}'::jsonb,
    investment_events_json jsonb not null default '[]'::jsonb,
    source text not null default 'cas_upload'
        check (source in ('cas_upload', 'prepare_review', 'share_review')),
    created_at timestamptz not null default timezone('utc', now())
);

create index if not exists review_snapshots_advisor_pan_idx
    on public.review_snapshots (advisor_id, client_pan, created_at desc);

create table if not exists public.review_links (
    id uuid primary key default gen_random_uuid(),
    advisor_id uuid not null references auth.users(id) on delete cascade,
    client_pan text not null,
    share_id text not null,
    snapshot_id uuid not null references public.review_snapshots(id) on delete cascade,
    created_at timestamptz not null default timezone('utc', now()),
    expires_at timestamptz not null,
    is_active boolean not null default true,
    constraint review_links_share_id_unique unique (share_id)
);

create index if not exists review_links_advisor_pan_idx
    on public.review_links (advisor_id, client_pan, created_at desc);

create table if not exists public.meeting_briefs (
    id uuid primary key default gen_random_uuid(),
    advisor_id uuid not null references auth.users(id) on delete cascade,
    client_pan text not null,
    snapshot_id uuid not null references public.review_snapshots(id) on delete cascade,
    brief_json jsonb not null default '{}'::jsonb,
    whatsapp_draft text not null default '',
    email_draft text not null default '',
    created_at timestamptz not null default timezone('utc', now())
);

create index if not exists meeting_briefs_advisor_pan_idx
    on public.meeting_briefs (advisor_id, client_pan, created_at desc);

create table if not exists public.client_review_events (
    id uuid primary key default gen_random_uuid(),
    advisor_id uuid not null references auth.users(id) on delete cascade,
    client_pan text not null,
    review_date timestamptz not null default timezone('utc', now()),
    notes text not null default '',
    meeting_brief_id uuid references public.meeting_briefs(id) on delete set null,
    review_link_id uuid references public.review_links(id) on delete set null,
    snapshot_id uuid not null references public.review_snapshots(id) on delete cascade,
    next_review_date date,
    created_at timestamptz not null default timezone('utc', now())
);

create index if not exists client_review_events_advisor_pan_idx
    on public.client_review_events (advisor_id, client_pan, review_date desc);

alter table public.review_snapshots enable row level security;
alter table public.review_links enable row level security;
alter table public.meeting_briefs enable row level security;
alter table public.client_review_events enable row level security;

-- review_snapshots
drop policy if exists "Users can read own review snapshots" on public.review_snapshots;
drop policy if exists "Users can insert own review snapshots" on public.review_snapshots;
drop policy if exists "Users can delete own review snapshots" on public.review_snapshots;

create policy "Users can read own review snapshots"
on public.review_snapshots for select to authenticated
using (advisor_id = auth.uid());

create policy "Users can insert own review snapshots"
on public.review_snapshots for insert to authenticated
with check (advisor_id = auth.uid());

create policy "Users can delete own review snapshots"
on public.review_snapshots for delete to authenticated
using (advisor_id = auth.uid());

-- review_links
drop policy if exists "Users can read own review links" on public.review_links;
drop policy if exists "Users can insert own review links" on public.review_links;
drop policy if exists "Users can update own review links" on public.review_links;
drop policy if exists "Users can delete own review links" on public.review_links;

create policy "Users can read own review links"
on public.review_links for select to authenticated
using (advisor_id = auth.uid());

create policy "Users can insert own review links"
on public.review_links for insert to authenticated
with check (advisor_id = auth.uid());

create policy "Users can update own review links"
on public.review_links for update to authenticated
using (advisor_id = auth.uid())
with check (advisor_id = auth.uid());

create policy "Users can delete own review links"
on public.review_links for delete to authenticated
using (advisor_id = auth.uid());

-- meeting_briefs
drop policy if exists "Users can read own meeting briefs" on public.meeting_briefs;
drop policy if exists "Users can insert own meeting briefs" on public.meeting_briefs;
drop policy if exists "Users can delete own meeting briefs" on public.meeting_briefs;

create policy "Users can read own meeting briefs"
on public.meeting_briefs for select to authenticated
using (advisor_id = auth.uid());

create policy "Users can insert own meeting briefs"
on public.meeting_briefs for insert to authenticated
with check (advisor_id = auth.uid());

create policy "Users can delete own meeting briefs"
on public.meeting_briefs for delete to authenticated
using (advisor_id = auth.uid());

-- client_review_events
drop policy if exists "Users can read own client review events" on public.client_review_events;
drop policy if exists "Users can insert own client review events" on public.client_review_events;
drop policy if exists "Users can update own client review events" on public.client_review_events;
drop policy if exists "Users can delete own client review events" on public.client_review_events;

create policy "Users can read own client review events"
on public.client_review_events for select to authenticated
using (advisor_id = auth.uid());

create policy "Users can insert own client review events"
on public.client_review_events for insert to authenticated
with check (advisor_id = auth.uid());

create policy "Users can update own client review events"
on public.client_review_events for update to authenticated
using (advisor_id = auth.uid())
with check (advisor_id = auth.uid());

create policy "Users can delete own client review events"
on public.client_review_events for delete to authenticated
using (advisor_id = auth.uid());
