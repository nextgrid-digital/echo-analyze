create table if not exists public.analysis_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null check (status in ('started', 'succeeded', 'failed')),
  file_kind text check (file_kind in ('pdf', 'json', 'unknown')),
  file_size_bytes integer,
  had_password boolean not null default false,
  duration_ms integer,
  error_code text,
  created_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz
);

create index if not exists idx_analysis_runs_user_id_created_at
  on public.analysis_runs (user_id, created_at desc);

create index if not exists idx_analysis_runs_created_at
  on public.analysis_runs (created_at desc);

create index if not exists idx_analysis_runs_status_created_at
  on public.analysis_runs (status, created_at desc);
