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

create table if not exists public.billing_customers (
  id uuid primary key,
  user_id varchar(255) unique not null,
  stripe_customer_id varchar(255) unique not null,
  created_at timestamptz not null default now()
);

create table if not exists public.billing_subscription_records (
  id uuid primary key,
  customer_id uuid references public.billing_customers(id),
  stripe_subscription_id varchar(255),
  stripe_price_id varchar(255),
  tier_key varchar(50),
  status varchar(50),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists billing_subscription_records_customer_id_idx
  on public.billing_subscription_records (customer_id);

create table if not exists public.billing_stripe_event_records (
  id uuid primary key,
  stripe_event_id varchar(255) unique,
  type varchar(255),
  customer_id uuid,
  raw_payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists billing_stripe_event_records_customer_id_idx
  on public.billing_stripe_event_records (customer_id);

create table if not exists public.billing_subscription_cache (
  customer_id uuid primary key references public.billing_customers(id),
  stripe_subscription_id varchar(255),
  status varchar(50),
  tier_key varchar(50),
  stripe_price_id varchar(255),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean,
  payment_method_brand varchar(50),
  payment_method_last4 varchar(4),
  updated_at timestamptz not null default now()
);
