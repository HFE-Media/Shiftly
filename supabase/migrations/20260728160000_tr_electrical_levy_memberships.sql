-- Employee-specific SBF and SAEWA membership for TR Electrical.
-- Existing TR employees retain the previous automatic SBF behaviour until edited.

alter table public.employees
  add column if not exists sbf_member boolean null,
  add column if not exists saewa_member boolean null;

update public.employees
set
  sbf_member = coalesce(sbf_member, true),
  saewa_member = coalesce(saewa_member, false)
where company_id = 'f50d8e62-3006-462e-b2a9-b1cf7c500394'::uuid
  and nbcei_designation_code is not null
  and nbcei_designation_code <> 'none';

update public.employees
set
  sbf_member = false,
  saewa_member = false
where company_id = 'f50d8e62-3006-462e-b2a9-b1cf7c500394'::uuid
  and nbcei_designation_code = 'none';

alter table public.company_payroll_levy_periods
  add column if not exists employee_levy_memberships jsonb not null default '{}'::jsonb;

alter table public.company_payroll_levy_periods
  drop constraint if exists company_payroll_levy_periods_memberships_check;

alter table public.company_payroll_levy_periods
  add constraint company_payroll_levy_periods_memberships_check
  check (jsonb_typeof(employee_levy_memberships) = 'object');

insert into public.company_deduction_types (
  company_id,
  company_name,
  name,
  calculation_type,
  default_amount,
  active,
  sort_order,
  editor_visible,
  updated_at
)
select
  company.id,
  company.name,
  'SAEWA',
  'manual',
  0,
  true,
  115,
  true,
  now()
from public.companies company
where company.id = 'f50d8e62-3006-462e-b2a9-b1cf7c500394'::uuid
on conflict (company_id, name)
do update set
  company_name = excluded.company_name,
  calculation_type = 'manual',
  active = true,
  sort_order = excluded.sort_order,
  editor_visible = true,
  updated_at = now();
