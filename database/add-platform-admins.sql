-- Shiftly SaaS: platform admins.
--
-- Platform admins are your internal SaaS owners.
-- They can see/manage all companies and company-linked records.
-- Normal company users still only see their own company data through the
-- existing company_users policies.

create table if not exists public.platform_admins (
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  constraint platform_admins_pkey primary key (user_id)
) tablespace pg_default;

create index if not exists platform_admins_email_idx
on public.platform_admins using btree (email)
tablespace pg_default;

alter table public.platform_admins enable row level security;

create or replace function public.is_platform_admin(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = p_user_id
      and pa.active = true
  );
$$;

create or replace function public.can_access_company(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_platform_admin(auth.uid())
    or exists (
      select 1
      from public.company_users cu
      where cu.company_id = p_company_id
        and cu.user_id = auth.uid()
        and cu.active = true
    );
$$;

create or replace function public.can_manage_company(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_platform_admin(auth.uid())
    or exists (
      select 1
      from public.company_users cu
      where cu.company_id = p_company_id
        and cu.user_id = auth.uid()
        and cu.active = true
        and cu.role in ('owner', 'admin')
    );
$$;

grant execute on function public.is_platform_admin(uuid) to authenticated;
grant execute on function public.can_access_company(uuid) to authenticated;
grant execute on function public.can_manage_company(uuid) to authenticated;

drop policy if exists "platform admins can view platform admins" on public.platform_admins;
create policy "platform admins can view platform admins"
on public.platform_admins for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_platform_admin(auth.uid())
);

drop policy if exists "platform admins can manage platform admins" on public.platform_admins;
create policy "platform admins can manage platform admins"
on public.platform_admins for all
to authenticated
using (public.is_platform_admin(auth.uid()))
with check (public.is_platform_admin(auth.uid()));

-- Add platform-owner visibility/management on top of existing company policies.

drop policy if exists "platform admins can manage companies" on public.companies;
create policy "platform admins can manage companies"
on public.companies for all
to authenticated
using (public.is_platform_admin(auth.uid()))
with check (public.is_platform_admin(auth.uid()));

drop policy if exists "platform admins can view company users" on public.company_users;
create policy "platform admins can view company users"
on public.company_users for select
to authenticated
using (public.is_platform_admin(auth.uid()));

drop policy if exists "platform admins can manage company users" on public.company_users;
create policy "platform admins can manage company users"
on public.company_users for all
to authenticated
using (public.is_platform_admin(auth.uid()))
with check (public.is_platform_admin(auth.uid()));

drop policy if exists "platform admins can manage admins" on public.admins;
create policy "platform admins can manage admins"
on public.admins for all
to authenticated
using (public.is_platform_admin(auth.uid()))
with check (public.is_platform_admin(auth.uid()));

drop policy if exists "platform admins can manage supervisors" on public.supervisors;
create policy "platform admins can manage supervisors"
on public.supervisors for all
to authenticated
using (public.is_platform_admin(auth.uid()))
with check (public.is_platform_admin(auth.uid()));

drop policy if exists "platform admins can manage employees" on public.employees;
create policy "platform admins can manage employees"
on public.employees for all
to authenticated
using (public.is_platform_admin(auth.uid()))
with check (public.is_platform_admin(auth.uid()));

drop policy if exists "platform admins can manage sites" on public.sites;
create policy "platform admins can manage sites"
on public.sites for all
to authenticated
using (public.is_platform_admin(auth.uid()))
with check (public.is_platform_admin(auth.uid()));

drop policy if exists "platform admins can view clock events" on public.clock_events;
create policy "platform admins can view clock events"
on public.clock_events for select
to authenticated
using (public.is_platform_admin(auth.uid()));

-- First platform admin bootstrap.
-- Replace the UUID/email/name below with your own Auth user details, then run it.
--
-- insert into public.platform_admins (user_id, email, full_name, active)
-- values (
--   'PASTE_YOUR_AUTH_USER_ID_HERE',
--   'your-email@example.com',
--   'Your Name',
--   true
-- )
-- on conflict (user_id)
-- do update set
--   email = excluded.email,
--   full_name = excluded.full_name,
--   active = excluded.active;

select
  user_id,
  email,
  full_name,
  active,
  created_at
from public.platform_admins
order by created_at desc;
