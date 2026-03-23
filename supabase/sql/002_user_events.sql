create table if not exists public.user_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  event_type text not null check (event_type in ('signed_up', 'signed_in')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_user_events_user_id_created_at
  on public.user_events (user_id, created_at desc);

create index if not exists idx_user_events_created_at
  on public.user_events (created_at desc);

create or replace function public.log_signup_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_events (user_id, event_type, metadata)
  values (
    new.id,
    'signed_up',
    jsonb_build_object('source', 'supabase_auth')
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_signup_logged on auth.users;

create trigger on_auth_user_signup_logged
after insert on auth.users
for each row execute procedure public.log_signup_event();
