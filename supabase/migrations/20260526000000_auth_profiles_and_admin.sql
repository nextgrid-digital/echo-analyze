-- Echo Analyze Supabase auth/profile setup.
-- CAS files, parsed CAS reports, and uploaded filenames are intentionally not stored here.

create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    username text not null,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles enable row level security;

create or replace function public.echo_is_admin()
returns boolean
language sql
stable
as $$
    select
        lower(coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '')) = 'admin'
        or lower(coalesce(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false')) in ('true', '1', 'yes')
$$;

create or replace function public.echo_clean_username(raw_username text, user_id uuid)
returns text
language plpgsql
immutable
as $$
declare
    cleaned text;
begin
    cleaned := trim(coalesce(raw_username, ''));
    cleaned := regexp_replace(cleaned, '[\r\n\t]+', ' ', 'g');
    cleaned := regexp_replace(cleaned, '\s+', ' ', 'g');
    cleaned := regexp_replace(
        cleaned,
        '(^|[^A-Za-z0-9_])[A-Za-z0-9][A-Za-z0-9_.+%-]*@[A-Za-z0-9.-]+\.[A-Za-z]{2,}([^A-Za-z0-9_]|$)',
        '\1[redacted-email]\2',
        'gi'
    );

    if cleaned = '' then
        cleaned := 'user_' || left(replace(user_id::text, '-', ''), 8);
    end if;

    return left(cleaned, 80);
end;
$$;

create or replace function public.echo_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at := timezone('utc', now());
    return new;
end;
$$;

create or replace function public.echo_normalize_profile_username()
returns trigger
language plpgsql
as $$
begin
    new.username := public.echo_clean_username(new.username, new.id);
    return new;
end;
$$;

drop trigger if exists echo_profiles_normalize_username on public.profiles;

create trigger echo_profiles_normalize_username
before insert or update on public.profiles
for each row
execute function public.echo_normalize_profile_username();

drop trigger if exists echo_profiles_touch_updated_at on public.profiles;

create trigger echo_profiles_touch_updated_at
before update on public.profiles
for each row
execute function public.echo_touch_updated_at();

create or replace function public.echo_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id, username)
    values (
        new.id,
        public.echo_clean_username(new.raw_user_meta_data ->> 'username', new.id)
    )
    on conflict (id) do update
    set username = excluded.username;

    return new;
end;
$$;

drop trigger if exists echo_on_auth_user_created on auth.users;

create trigger echo_on_auth_user_created
after insert on auth.users
for each row
execute function public.echo_handle_new_user();

drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Admins can read profiles" on public.profiles;

create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "Admins can read profiles"
on public.profiles
for select
to authenticated
using (public.echo_is_admin());
