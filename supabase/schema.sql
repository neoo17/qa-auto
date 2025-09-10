-- Run this in Supabase SQL editor

-- Profiles table (optional)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text default 'QA',
  created_at timestamptz default now()
);

-- Test runs
create table if not exists public.test_runs (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade,
  url text,
  result text check (result in ('finished','failed')),
  errors_count int default 0,
  started_at timestamptz default now(),
  ended_at timestamptz default now(),
  created_at timestamptz default now()
);
alter table public.test_runs enable row level security;
create policy allow_user_read on public.test_runs for select using (auth.uid() = user_id);
create policy allow_user_insert on public.test_runs for insert with check (auth.uid() = user_id);

-- Bugs (optional capture)
create table if not exists public.bugs (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade,
  title text,
  description text,
  url text,
  created_at timestamptz default now()
);
alter table public.bugs enable row level security;
create policy allow_user_read_bugs on public.bugs for select using (auth.uid() = user_id);
create policy allow_user_insert_bugs on public.bugs for insert with check (auth.uid() = user_id);

-- Count tests RPC
create or replace function public.count_user_tests(uid uuid)
returns bigint language sql stable as $$
  select count(*) from public.test_runs where user_id = uid;
$$;

-- Leaderboard RPC (top users by tests)
create or replace function public.leaderboard(lim int default 20)
returns table(user_id uuid, tests_count bigint, full_name text, email text) language sql stable as $$
  with agg as (
    select user_id, count(*) as tests_count from public.test_runs group by 1 order by 2 desc limit lim
  )
  select a.user_id, a.tests_count,
         p.full_name,
         u.email
  from agg a
  left join public.profiles p on p.id = a.user_id
  left join auth.users u on u.id = a.user_id
  order by a.tests_count desc;
$$;

