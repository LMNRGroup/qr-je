-- Supabase tables for QR Code Studio

create table if not exists public.urls (
  id text primary key,
  random text not null,
  user_id uuid not null,
  target_url text not null,
  options jsonb,
  kind text,
  created_at timestamptz not null default now()
);

create index if not exists urls_user_id_idx on public.urls (user_id);

create table if not exists public.vcards (
  id uuid primary key,
  user_id uuid not null,
  slug text not null,
  public_url text not null,
  short_id text not null,
  short_random text not null,
  data jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists vcards_user_id_idx on public.vcards (user_id);
create unique index if not exists vcards_user_slug_idx on public.vcards (user_id, slug);
