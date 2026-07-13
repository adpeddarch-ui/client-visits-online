create extension if not exists pgcrypto;

create table if not exists public.team_members (
  id text primary key,
  name text not null,
  role text default '',
  email text default '',
  phone text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  company_name text not null unique,
  status text not null default 'new',
  owner_id text references public.team_members(id),
  source text default '',
  address text default '',
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  name text not null,
  position text default '',
  phone text default '',
  email text default '',
  line_id text default '',
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  date date not null,
  start_time time not null,
  end_time time not null,
  client text not null,
  owner_id text not null references public.team_members(id),
  participant_ids text[] not null default '{}',
  type text not null default 'first visit',
  location text default '',
  status text not null default 'planned',
  reminder integer not null default 60,
  contact text default '',
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client, date, start_time)
);

create table if not exists public.followups (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  visit_id uuid references public.visits(id) on delete set null,
  owner_id text references public.team_members(id),
  due_date date,
  title text not null,
  status text not null default 'open',
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.team_members (id, name, role, email)
values
  ('m1', 'Member 1', 'Team Lead', 'member1@example.com'),
  ('m2', 'Member 2', 'Sales', 'member2@example.com'),
  ('m3', 'Member 3', 'Sales', 'member3@example.com'),
  ('m4', 'Member 4', 'Sales Support', 'member4@example.com'),
  ('m5', 'Member 5', 'Coordinator', 'member5@example.com'),
  ('m6', 'Member 6', 'After Sales', 'member6@example.com')
on conflict (id) do update set
  name = excluded.name,
  role = excluded.role,
  email = excluded.email,
  updated_at = now();

insert into public.customers (company_name, status, owner_id, notes)
values
  ('Sample Company A', 'following', 'm1', 'Sample customer'),
  ('Sample Company B', 'quoted', 'm3', 'Sample customer'),
  ('Sample Company C', 'presentation', 'm4', 'Sample customer')
on conflict (company_name) do nothing;

insert into public.visits (
  date,
  start_time,
  end_time,
  client,
  owner_id,
  participant_ids,
  type,
  location,
  status,
  reminder,
  contact,
  notes
)
values
  ('2026-07-15', '09:30', '10:30', 'Sample Company A', 'm1', array['m2'], 'first visit', 'Customer office', 'confirmed', 60, 'Mr. Somchai / 08x-xxx-xxxx', 'Prepare service introduction'),
  ('2026-07-16', '13:00', '14:00', 'Sample Company B', 'm3', array['m1'], 'follow up', 'Google Meet', 'pending', 30, 'sales@example.com', 'Send quotation before meeting'),
  ('2026-07-18', '10:00', '11:30', 'Sample Company C', 'm4', array['m5'], 'presentation', 'Customer office', 'planned', 120, 'Khun Wipa', 'Check decision makers')
on conflict (client, date, start_time) do nothing;

alter table public.team_members enable row level security;
alter table public.customers enable row level security;
alter table public.contacts enable row level security;
alter table public.visits enable row level security;
alter table public.followups enable row level security;

drop policy if exists "public read team members" on public.team_members;
drop policy if exists "public manage customers" on public.customers;
drop policy if exists "public manage contacts" on public.contacts;
drop policy if exists "public manage visits" on public.visits;
drop policy if exists "public manage followups" on public.followups;

create policy "public read team members"
on public.team_members for select
to anon
using (true);

create policy "public manage customers"
on public.customers for all
to anon
using (true)
with check (true);

create policy "public manage contacts"
on public.contacts for all
to anon
using (true)
with check (true);

create policy "public manage visits"
on public.visits for all
to anon
using (true)
with check (true);

create policy "public manage followups"
on public.followups for all
to anon
using (true)
with check (true);
