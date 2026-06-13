-- Supabase tables for QR Code Studio

create table if not exists public.urls (
  id text primary key,
  random text not null,
  user_id uuid not null,
  target_url text not null,
  name text,
  options jsonb,
  kind text,
  created_at timestamptz not null default now()
);

create index if not exists urls_user_id_idx on public.urls (user_id);

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

alter table public.users add column if not exists username text;
alter table public.users add column if not exists timezone text;
alter table public.users add column if not exists language text;
alter table public.users add column if not exists theme text;
alter table public.users add column if not exists username_changed_at timestamptz;
create unique index if not exists users_username_idx on public.users (username);

create table if not exists public.billing_records (
  user_id text primary key references public.users(id) on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text,
  billing_plan text not null default 'free',
  billing_status text,
  billing_price_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists billing_records_stripe_customer_idx
  on public.billing_records (stripe_customer_id);
create index if not exists billing_records_subscription_idx
  on public.billing_records (stripe_subscription_id);
