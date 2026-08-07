-- Payroll adjustments for company-scoped payroll runs.
-- Run this once in Supabase SQL Editor.

create table if not exists public.payroll_adjustments (
  id uuid not null default gen_random_uuid(),
  company_id uuid not null,
  company_name text not null,
  employee_id text not null,
  employee_name text not null,
  adjustment_type text not null,
  description text not null,
  hours numeric(10, 2) not null default 0,
  amount numeric(12, 2) not null default 0,
  period_start date not null,
  period_end date not null,
  active boolean not null default true,
  created_by uuid null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint payroll_adjustments_pkey primary key (id),
  constraint payroll_adjustments_company_id_fkey foreign key (company_id) references public.companies(id) on delete cascade,
  constraint payroll_adjustments_employee_fkey foreign key (company_id, employee_id) references public.employees(company_id, employee_id),
  constraint payroll_adjustments_created_by_fkey foreign key (created_by) references auth.users(id),
  constraint payroll_adjustments_type_check check (
    adjustment_type = any (
      array[
        'paid_leave'::text,
        'allowance'::text,
        'bonus'::text,
        'manual_normal_hours'::text,
        'manual_ot1'::text,
        'manual_ot2'::text
      ]
    )
  ),
  constraint payroll_adjustments_hours_check check (hours >= 0),
  constraint payroll_adjustments_amount_check check (amount >= 0),
  constraint payroll_adjustments_period_check check (period_end >= period_start)
);

alter table public.payroll_adjustments
drop constraint if exists payroll_adjustments_type_check;

alter table public.payroll_adjustments
add constraint payroll_adjustments_type_check check (
  adjustment_type = any (
    array[
      'paid_leave'::text,
      'allowance'::text,
      'bonus'::text,
      'manual_normal_hours'::text,
      'manual_ot1'::text,
      'manual_ot2'::text
    ]
  )
);

create index if not exists payroll_adjustments_company_period_employee_idx
on public.payroll_adjustments using btree (company_id, period_start, period_end, employee_id);

create index if not exists payroll_adjustments_company_name_idx
on public.payroll_adjustments using btree (company_name);

drop trigger if exists set_payroll_adjustments_company_name on public.payroll_adjustments;
create trigger set_payroll_adjustments_company_name
before insert or update of company_id on public.payroll_adjustments
for each row execute function public.set_company_name_from_company_id();

alter table public.payroll_adjustments enable row level security;

drop policy if exists "company users can view relevant payroll adjustments" on public.payroll_adjustments;
create policy "company users can view relevant payroll adjustments"
on public.payroll_adjustments for select
to authenticated
using (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = payroll_adjustments.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.role in ('owner', 'admin')
  )
  or exists (
    select 1
    from public.company_users cu
    where cu.company_id = payroll_adjustments.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.employee_id = payroll_adjustments.employee_id
  )
);

drop policy if exists "company admins can manage payroll adjustments" on public.payroll_adjustments;
create policy "company admins can manage payroll adjustments"
on public.payroll_adjustments for all
to authenticated
using (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = payroll_adjustments.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = payroll_adjustments.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.role in ('owner', 'admin')
  )
);
