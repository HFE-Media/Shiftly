-- Period-specific NBCEI levy automation for TR Electrical Solutions and Services.
-- Existing employees, payroll deductions, and historical payroll periods are not changed.

alter table public.employees
  add column if not exists nbcei_designation_code text null;

alter table public.employees
  drop constraint if exists employees_nbcei_designation_code_check;

alter table public.employees
  add constraint employees_nbcei_designation_code_check
  check (
    nbcei_designation_code is null
    or nbcei_designation_code in ('43', '44', '48', '49', 'none')
  );

create table if not exists public.company_payroll_levy_periods (
  id uuid not null default gen_random_uuid(),
  company_id uuid not null,
  period_start date not null,
  period_end date not null,
  levy_scheme text not null default 'nbcei',
  levy_weeks smallint not null,
  rate_version text not null,
  employee_designations jsonb not null default '{}'::jsonb,
  created_by uuid null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint company_payroll_levy_periods_pkey primary key (id),
  constraint company_payroll_levy_periods_company_id_fkey
    foreign key (company_id) references public.companies(id) on delete cascade,
  constraint company_payroll_levy_periods_created_by_fkey
    foreign key (created_by) references auth.users(id),
  constraint company_payroll_levy_periods_period_check
    check (period_end >= period_start),
  constraint company_payroll_levy_periods_weeks_check
    check (levy_weeks in (4, 5)),
  constraint company_payroll_levy_periods_designations_check
    check (jsonb_typeof(employee_designations) = 'object'),
  constraint company_payroll_levy_periods_unique_period
    unique (company_id, period_start, period_end, levy_scheme)
);

create index if not exists company_payroll_levy_periods_company_period_idx
on public.company_payroll_levy_periods (company_id, period_start, period_end);

alter table public.company_payroll_levy_periods enable row level security;

drop policy if exists "company users can view payroll levy periods"
on public.company_payroll_levy_periods;

create policy "company users can view payroll levy periods"
on public.company_payroll_levy_periods for select
to authenticated
using (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = company_payroll_levy_periods.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
  )
);

drop policy if exists "company admins can manage payroll levy periods"
on public.company_payroll_levy_periods;

create policy "company admins can manage payroll levy periods"
on public.company_payroll_levy_periods for all
to authenticated
using (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = company_payroll_levy_periods.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = company_payroll_levy_periods.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.role in ('owner', 'admin')
  )
);

do $$
begin
  if not exists (
    select 1
    from public.companies
    where id = 'f50d8e62-3006-462e-b2a9-b1cf7c500394'::uuid
  ) then
    raise exception 'TR Electrical Solutions and Services was not found';
  end if;
end;
$$;
