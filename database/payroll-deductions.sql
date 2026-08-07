-- Payroll deductions for company-scoped payroll runs.
-- Run this once in Supabase SQL Editor.

create table if not exists public.company_deduction_types (
  id uuid not null default gen_random_uuid(),
  company_id uuid not null,
  company_name text not null,
  name text not null,
  calculation_type text not null default 'manual',
  default_amount numeric(12, 2) not null default 0,
  active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint company_deduction_types_pkey primary key (id),
  constraint company_deduction_types_company_id_fkey foreign key (company_id) references public.companies(id) on delete cascade,
  constraint company_deduction_types_unique_name unique (company_id, name),
  constraint company_deduction_types_amount_check check (default_amount >= 0),
  constraint company_deduction_types_calculation_check check (calculation_type = any (array['manual'::text, 'fixed'::text]))
);

create table if not exists public.payroll_deductions (
  id uuid not null default gen_random_uuid(),
  company_id uuid not null,
  company_name text not null,
  employee_id text not null,
  employee_name text not null,
  deduction_type_id uuid null,
  description text not null,
  amount numeric(12, 2) not null,
  period_start date not null,
  period_end date not null,
  active boolean not null default true,
  created_by uuid null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint payroll_deductions_pkey primary key (id),
  constraint payroll_deductions_company_id_fkey foreign key (company_id) references public.companies(id) on delete cascade,
  constraint payroll_deductions_employee_fkey foreign key (company_id, employee_id) references public.employees(company_id, employee_id),
  constraint payroll_deductions_type_fkey foreign key (deduction_type_id) references public.company_deduction_types(id) on delete set null,
  constraint payroll_deductions_created_by_fkey foreign key (created_by) references auth.users(id),
  constraint payroll_deductions_amount_check check (amount >= 0),
  constraint payroll_deductions_period_check check (period_end >= period_start)
);

create index if not exists company_deduction_types_company_active_idx
on public.company_deduction_types using btree (company_id, active, sort_order);

create index if not exists company_deduction_types_company_name_idx
on public.company_deduction_types using btree (company_name);

create index if not exists payroll_deductions_company_period_employee_idx
on public.payroll_deductions using btree (company_id, period_start, period_end, employee_id);

create index if not exists payroll_deductions_company_name_idx
on public.payroll_deductions using btree (company_name);

drop trigger if exists set_company_deduction_types_company_name on public.company_deduction_types;
create trigger set_company_deduction_types_company_name
before insert or update of company_id on public.company_deduction_types
for each row execute function public.set_company_name_from_company_id();

drop trigger if exists set_payroll_deductions_company_name on public.payroll_deductions;
create trigger set_payroll_deductions_company_name
before insert or update of company_id on public.payroll_deductions
for each row execute function public.set_company_name_from_company_id();

insert into public.company_deduction_types (company_id, company_name, name, calculation_type, default_amount, sort_order)
select c.id, c.name, x.name, 'manual', 0, x.sort_order
from public.companies c
cross join (
  values
    ('Tax', 10),
    ('UIF', 20),
    ('Loan', 30),
    ('Tools/PPE', 40),
    ('Fine', 50),
    ('Leave Pay', 60),
    ('Other', 100)
) as x(name, sort_order)
on conflict (company_id, name)
do update set
  company_name = excluded.company_name,
  sort_order = excluded.sort_order,
  active = true;

alter table public.company_deduction_types enable row level security;
alter table public.payroll_deductions enable row level security;

drop policy if exists "company admins can view deduction types" on public.company_deduction_types;
create policy "company admins can view deduction types"
on public.company_deduction_types for select
to authenticated
using (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = company_deduction_types.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
  )
);

drop policy if exists "company admins can manage deduction types" on public.company_deduction_types;
create policy "company admins can manage deduction types"
on public.company_deduction_types for all
to authenticated
using (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = company_deduction_types.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = company_deduction_types.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.role in ('owner', 'admin')
  )
);

drop policy if exists "company users can view relevant payroll deductions" on public.payroll_deductions;
create policy "company users can view relevant payroll deductions"
on public.payroll_deductions for select
to authenticated
using (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = payroll_deductions.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.role in ('owner', 'admin')
  )
  or exists (
    select 1
    from public.company_users cu
    where cu.company_id = payroll_deductions.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.employee_id = payroll_deductions.employee_id
  )
);

drop policy if exists "company admins can manage payroll deductions" on public.payroll_deductions;
create policy "company admins can manage payroll deductions"
on public.payroll_deductions for all
to authenticated
using (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = payroll_deductions.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = payroll_deductions.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.role in ('owner', 'admin')
  )
);
