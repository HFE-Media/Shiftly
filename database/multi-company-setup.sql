-- Shiftly multi-company setup for Supabase.
-- Run this in the Supabase SQL editor, then create Auth users and add them
-- to company_users. Backfill existing rows before enforcing NOT NULL.

create extension if not exists pgcrypto;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  plan text not null default 'premium',
  status text not null default 'active' check (status in ('active', 'paused', 'cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists public.company_users (
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'supervisor' check (role in ('owner', 'admin', 'supervisor', 'viewer')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (company_id, user_id)
);

alter table public.sites add column if not exists company_id uuid references public.companies(id);
alter table public.employees add column if not exists company_id uuid references public.companies(id);
alter table public.admins add column if not exists company_id uuid references public.companies(id);

create index if not exists sites_company_id_idx on public.sites(company_id);
create index if not exists employees_company_id_idx on public.employees(company_id);
create index if not exists admins_company_id_idx on public.admins(company_id);
create index if not exists company_users_user_id_idx on public.company_users(user_id);

alter table public.companies enable row level security;
alter table public.company_users enable row level security;
alter table public.sites enable row level security;
alter table public.employees enable row level security;
alter table public.admins enable row level security;

drop policy if exists "members can view their companies" on public.companies;
create policy "members can view their companies"
on public.companies for select
to authenticated
using (
  exists (
    select 1 from public.company_users cu
    where cu.company_id = companies.id
      and cu.user_id = auth.uid()
      and cu.active = true
  )
);

drop policy if exists "users can view own memberships" on public.company_users;
create policy "users can view own memberships"
on public.company_users for select
to authenticated
using (user_id = auth.uid() and active = true);

drop policy if exists "members can view company sites" on public.sites;
create policy "members can view company sites"
on public.sites for select
to authenticated
using (
  exists (
    select 1 from public.company_users cu
    where cu.company_id = sites.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
  )
);

drop policy if exists "admins can manage company sites" on public.sites;
create policy "admins can manage company sites"
on public.sites for all
to authenticated
using (
  exists (
    select 1 from public.company_users cu
    where cu.company_id = sites.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1 from public.company_users cu
    where cu.company_id = sites.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.role in ('owner', 'admin')
  )
);

drop policy if exists "members can view company employees" on public.employees;
create policy "members can view company employees"
on public.employees for select
to authenticated
using (
  exists (
    select 1 from public.company_users cu
    where cu.company_id = employees.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
  )
);

drop policy if exists "members can validate company admin codes" on public.admins;
create policy "members can validate company admin codes"
on public.admins for select
to authenticated
using (
  exists (
    select 1 from public.company_users cu
    where cu.company_id = admins.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
  )
);

-- Important: update your existing clock_batch RPC to accept p_company_id uuid
-- and verify all supervisor, site, employee, and insert operations match that
-- company_id. Keep the function as security definer only if it validates
-- membership with auth.uid() against company_users.

-- Example onboarding flow:
-- insert into public.companies (name, slug) values ('Acme Construction', 'acme') returning id;
-- insert into public.company_users (company_id, user_id, role) values ('COMPANY_ID', 'AUTH_USER_ID', 'owner');
-- update public.sites set company_id = 'COMPANY_ID' where company_id is null;
-- update public.employees set company_id = 'COMPANY_ID' where company_id is null;
-- update public.admins set company_id = 'COMPANY_ID' where company_id is null;
