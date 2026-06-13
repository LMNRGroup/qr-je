alter table public.users add column if not exists username text;
alter table public.users add column if not exists timezone text;
alter table public.users add column if not exists language text;
alter table public.users add column if not exists theme text;
alter table public.users add column if not exists username_changed_at timestamptz;

create unique index if not exists users_username_idx on public.users (username);

create table if not exists public.scans (
  id text primary key,
  url_id text not null,
  url_random text not null,
  user_id uuid not null,
  ip text,
  user_agent text,
  scanned_at timestamptz not null default now()
);

create index if not exists scans_url_idx on public.scans (url_id, url_random);
create index if not exists scans_user_idx on public.scans (user_id);
