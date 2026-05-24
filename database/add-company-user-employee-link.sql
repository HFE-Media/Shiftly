alter table public.company_users
add column if not exists employee_id text null;

alter table public.company_users
drop constraint if exists company_users_role_check;

alter table public.company_users
add constraint company_users_role_check
check (role in ('owner', 'admin', 'supervisor', 'employee', 'viewer'));

alter table public.company_users
drop constraint if exists company_users_company_id_employee_id_fkey;

alter table public.company_users
add constraint company_users_company_id_employee_id_fkey
foreign key (company_id, employee_id)
references public.employees(company_id, employee_id)
on update cascade
on delete set null;

create index if not exists company_users_company_employee_idx
on public.company_users(company_id, employee_id);

-- Read-only employee self-service policies.
-- Keep existing owner/admin/supervisor policies in place; these add a narrow path
-- for employee users to read their own employee row and clock events.
drop policy if exists "employees can view own employee record" on public.employees;
create policy "employees can view own employee record"
on public.employees for select
to authenticated
using (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = employees.company_id
      and cu.employee_id = employees.employee_id
      and cu.user_id = auth.uid()
      and cu.active = true
  )
);

drop policy if exists "employees can view own clock events" on public.clock_events;
create policy "employees can view own clock events"
on public.clock_events for select
to authenticated
using (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = clock_events.company_id
      and cu.employee_id = clock_events.employee_id
      and cu.user_id = auth.uid()
      and cu.active = true
  )
);
