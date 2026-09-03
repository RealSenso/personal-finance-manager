-- ==============================================================================
-- PERSONAL FINANCE MANAGER - SUPABASE POSTGRES SCHEMA
-- Envelope Budgeting & Savings Goals with Row Level Security (RLS)
-- ==============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES / APP SETTINGS
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  allowed_email text,
  monthly_stipend numeric(12,2) default 12400.00,
  monthly_extra numeric(12,2) default 10000.00,
  currency_symbol text default '₹',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can manage their own profile"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 2. BUCKETS (Recurring envelopes & accumulating savings goals)
create table if not exists public.buckets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('recurring', 'savings_goal')),
  planned_monthly numeric(12,2) not null default 0.00,
  target_amount numeric(12,2) default null, -- relevant for savings_goal
  current_balance numeric(12,2) not null default 0.00, -- accumulated for savings_goal
  color text default '#10b981',
  icon text default 'wallet',
  category text default 'general',
  notes text,
  is_archived boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_buckets_user on public.buckets(user_id);
alter table public.buckets enable row level security;

create policy "Users can manage their own buckets"
  on public.buckets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. TRANSACTIONS (Expenses & Savings deposits)
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bucket_id uuid references public.buckets(id) on delete set null,
  amount numeric(12,2) not null,
  type text not null default 'expense' check (type in ('expense', 'savings_deposit', 'income')),
  date date not null default current_date,
  note text,
  merchant text,
  source text default 'manual' check (source in ('manual', 'csv_import')),
  created_at timestamptz default now()
);

create index if not exists idx_transactions_user on public.transactions(user_id);
create index if not exists idx_transactions_date on public.transactions(date);
create index if not exists idx_transactions_bucket on public.transactions(bucket_id);
alter table public.transactions enable row level security;

create policy "Users can manage their own transactions"
  on public.transactions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4. KEYWORD RULES (For automatic CSV bank statement categorization)
create table if not exists public.keyword_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  keyword text not null,
  bucket_id uuid not null references public.buckets(id) on delete cascade,
  priority int default 0,
  created_at timestamptz default now()
);

create index if not exists idx_keyword_rules_user on public.keyword_rules(user_id);
alter table public.keyword_rules enable row level security;

create policy "Users can manage their own keyword rules"
  on public.keyword_rules for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 5. MONTHLY SNAPSHOTS (Archived historical audits)
create table if not exists public.monthly_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month text not null, -- format: 'YYYY-MM'
  total_income numeric(12,2) not null default 0.00,
  total_planned numeric(12,2) not null default 0.00,
  total_spent numeric(12,2) not null default 0.00,
  total_saved numeric(12,2) not null default 0.00,
  unallocated numeric(12,2) not null default 0.00,
  bucket_breakdown jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  constraint unique_user_month unique (user_id, month)
);

create index if not exists idx_snapshots_user on public.monthly_snapshots(user_id);
alter table public.monthly_snapshots enable row level security;

create policy "Users can manage their own snapshots"
  on public.monthly_snapshots for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 6. AUTOMATIC PROFILE INITIALIZATION ON SIGNUP
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
