-- Per-user advisor client book (parsed analysis JSON + notes).
-- Raw CAS files are not stored here.

create table if not exists public.advisor_clients (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    client_pan text not null,
    client_name text not null,
    email text,
    phone text,
    analysis_json jsonb not null,
    notes text not null default '',
    updated_at timestamptz not null default timezone('utc', now()),
    constraint advisor_clients_user_pan_unique unique (user_id, client_pan)
);

create index if not exists advisor_clients_user_updated_idx
    on public.advisor_clients (user_id, updated_at desc);

alter table public.advisor_clients enable row level security;

drop trigger if exists echo_advisor_clients_touch_updated_at on public.advisor_clients;

create trigger echo_advisor_clients_touch_updated_at
before update on public.advisor_clients
for each row
execute function public.echo_touch_updated_at();

drop policy if exists "Users can read own advisor clients" on public.advisor_clients;
drop policy if exists "Users can insert own advisor clients" on public.advisor_clients;
drop policy if exists "Users can update own advisor clients" on public.advisor_clients;
drop policy if exists "Users can delete own advisor clients" on public.advisor_clients;

create policy "Users can read own advisor clients"
on public.advisor_clients
for select
to authenticated
using (user_id = auth.uid());

create policy "Users can insert own advisor clients"
on public.advisor_clients
for insert
to authenticated
with check (user_id = auth.uid());

create policy "Users can update own advisor clients"
on public.advisor_clients
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can delete own advisor clients"
on public.advisor_clients
for delete
to authenticated
using (user_id = auth.uid());
