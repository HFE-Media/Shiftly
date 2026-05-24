-- Shiftly: align employees with the original schema, company-scoped.
-- Original:
--   employee_id text primary key
--   full_name text not null
--   active boolean not null default true
--
-- Multi-company version:
--   primary key (company_id, employee_id)

alter table public.employees
add column if not exists company_id uuid references public.companies(id) on delete cascade;

alter table public.employees
add column if not exists full_name text;

alter table public.employees
add column if not exists active boolean not null default true;

-- Normalize existing data before constraints.
update public.employees
set employee_id = upper(trim(employee_id))
where employee_id is not null;

update public.employees
set full_name = coalesce(nullif(full_name, ''), 'Unnamed Employee')
where full_name is null or full_name = '';

alter table public.employees
alter column employee_id set not null;

alter table public.employees
alter column full_name set not null;

alter table public.employees
alter column active set not null;

-- Replace global employee primary key with company-scoped primary key.
-- If foreign keys depend on the old key, drop or update those FKs first.
alter table public.clock_events
drop constraint if exists clock_events_company_id_employee_id_fkey;

alter table public.time_entries
drop constraint if exists time_entries_employee_id_fkey;

alter table public.employees
drop constraint if exists employees_pkey;

alter table public.employees
add constraint employees_pkey primary key (company_id, employee_id);

alter table public.clock_events
add constraint clock_events_company_id_employee_id_fkey
foreign key (company_id, employee_id)
references public.employees(company_id, employee_id);

create index if not exists employees_company_id_idx
on public.employees(company_id);

alter table public.employees enable row level security;

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

select company_id, employee_id, full_name, active
from public.employees
order by company_id, employee_id;
