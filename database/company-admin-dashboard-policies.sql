-- Shiftly: company admin dashboard write access.
-- Lets company owners/admins manage their own setup records while keeping tenants scoped.

alter table public.employees enable row level security;
alter table public.supervisors enable row level security;
alter table public.sites enable row level security;

drop policy if exists "company admins can manage company employees" on public.employees;
create policy "company admins can manage company employees"
on public.employees for all
to authenticated
using (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = employees.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = employees.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.role in ('owner', 'admin')
  )
);

drop policy if exists "company admins can manage company supervisors" on public.supervisors;
create policy "company admins can manage company supervisors"
on public.supervisors for all
to authenticated
using (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = supervisors.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = supervisors.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.role in ('owner', 'admin')
  )
);

drop policy if exists "company admins can manage company sites" on public.sites;
create policy "company admins can manage company sites"
on public.sites for all
to authenticated
using (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = sites.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = sites.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.role in ('owner', 'admin')
  )
);
