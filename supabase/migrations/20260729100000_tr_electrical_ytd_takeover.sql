-- TR Electrical Sage-to-Shiftly PAYE takeover as at 31 July 2026.
-- Opening balances are captured once; finalized Shiftly payroll periods carry YTD forward.

create table if not exists public.employee_payroll_ytd_opening_balances (
  id uuid not null default gen_random_uuid(),
  company_id uuid not null,
  employee_id text not null,
  tax_year_start date not null,
  as_of_date date not null,
  completed_periods smallint not null,
  gross_remuneration numeric(14,2) not null default 0,
  retirement_fund_contributions numeric(14,2) not null default 0,
  paye_deducted numeric(14,2) not null default 0,
  created_by uuid null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint employee_payroll_ytd_opening_balances_pkey primary key (id),
  constraint employee_payroll_ytd_opening_balances_company_id_fkey
    foreign key (company_id) references public.companies(id) on delete cascade,
  constraint employee_payroll_ytd_opening_balances_created_by_fkey
    foreign key (created_by) references auth.users(id),
  constraint employee_payroll_ytd_opening_balances_period_check
    check (completed_periods between 0 and 52),
  constraint employee_payroll_ytd_opening_balances_amounts_check
    check (
      gross_remuneration >= 0
      and retirement_fund_contributions >= 0
      and paye_deducted >= 0
    ),
  constraint employee_payroll_ytd_opening_balances_unique
    unique (company_id, employee_id, tax_year_start)
);

create index if not exists employee_payroll_ytd_opening_company_year_idx
on public.employee_payroll_ytd_opening_balances (company_id, tax_year_start, employee_id);

alter table public.employee_payroll_ytd_opening_balances enable row level security;

drop policy if exists "company users can view payroll ytd opening balances"
on public.employee_payroll_ytd_opening_balances;

create policy "company users can view payroll ytd opening balances"
on public.employee_payroll_ytd_opening_balances for select
to authenticated
using (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = employee_payroll_ytd_opening_balances.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
  )
);

drop policy if exists "company admins can manage payroll ytd opening balances"
on public.employee_payroll_ytd_opening_balances;

create policy "company admins can manage payroll ytd opening balances"
on public.employee_payroll_ytd_opening_balances for all
to authenticated
using (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = employee_payroll_ytd_opening_balances.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = employee_payroll_ytd_opening_balances.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.role in ('owner', 'admin')
  )
);

create table if not exists public.employee_payroll_period_totals (
  id uuid not null default gen_random_uuid(),
  company_id uuid not null,
  employee_id text not null,
  tax_year_start date not null,
  period_start date not null,
  period_end date not null,
  period_number smallint not null,
  gross_remuneration numeric(14,2) not null default 0,
  retirement_fund_contributions numeric(14,2) not null default 0,
  paye_deducted numeric(14,2) not null default 0,
  finalized_by uuid null,
  finalized_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint employee_payroll_period_totals_pkey primary key (id),
  constraint employee_payroll_period_totals_company_id_fkey
    foreign key (company_id) references public.companies(id) on delete cascade,
  constraint employee_payroll_period_totals_finalized_by_fkey
    foreign key (finalized_by) references auth.users(id),
  constraint employee_payroll_period_totals_date_check
    check (period_end >= period_start),
  constraint employee_payroll_period_totals_period_check
    check (period_number between 1 and 52),
  constraint employee_payroll_period_totals_amounts_check
    check (
      gross_remuneration >= 0
      and retirement_fund_contributions >= 0
      and paye_deducted >= 0
    ),
  constraint employee_payroll_period_totals_unique
    unique (company_id, employee_id, period_start, period_end)
);

create index if not exists employee_payroll_period_totals_company_year_idx
on public.employee_payroll_period_totals (company_id, tax_year_start, period_start, employee_id);

alter table public.employee_payroll_period_totals enable row level security;

drop policy if exists "company users can view payroll period totals"
on public.employee_payroll_period_totals;

create policy "company users can view payroll period totals"
on public.employee_payroll_period_totals for select
to authenticated
using (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = employee_payroll_period_totals.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
  )
);

drop policy if exists "company admins can manage payroll period totals"
on public.employee_payroll_period_totals;

create policy "company admins can manage payroll period totals"
on public.employee_payroll_period_totals for all
to authenticated
using (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = employee_payroll_period_totals.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = employee_payroll_period_totals.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.role in ('owner', 'admin')
  )
);

create temporary table tr_electrical_july_ytd_seed (
  id_number text primary key,
  employee_name text not null,
  designation_code text not null,
  sbf_member boolean not null,
  saewa_member boolean not null,
  gross_remuneration numeric(14,2) not null,
  retirement_fund_contributions numeric(14,2) not null,
  paye_deducted numeric(14,2) not null
) on commit drop;

insert into tr_electrical_july_ytd_seed (
  id_number,
  employee_name,
  designation_code,
  sbf_member,
  saewa_member,
  gross_remuneration,
  retirement_fund_contributions,
  paye_deducted
)
values
  ('8504215797088', 'Bernard Moswane', '44', true, false, 82686.64, 6472.40, 6293.56),
  ('7411245699089', 'Cosmos Masuku', '44', true, true, 79120.63, 6472.40, 5651.68),
  ('8510255998080', 'David Lekgau', '48', true, false, 51638.61, 4079.46, 1135.65),
  ('8111075556081', 'Phuti Rodney Komape', '48', true, false, 53324.32, 4079.46, 1439.08),
  ('8403135712089', 'Sedzani Gravice Nkhumeleni', '44', true, true, 84737.09, 6472.40, 6662.65),
  ('7104025779086', 'Selby Nkosi', '43', true, true, 98278.65, 7374.62, 8937.73),
  ('8201165570082', 'Simphiwe Khumalo', '43', true, false, 90304.62, 7374.62, 7502.40),
  ('8409095323080', 'Sipho Mofokeng', '43', true, true, 110997.08, 7374.62, 11346.84),
  ('9301245577088', 'Siyabonga Ncube', '49', true, false, 44841.35, 3485.46, 180.81),
  ('9408046126088', 'Vuntu Sibongiseni', '49', true, false, 42416.84, 3485.46, 0.00);

do $$
declare
  unmatched_count integer;
begin
  select count(*)
  into unmatched_count
  from tr_electrical_july_ytd_seed seed
  where (
    select count(*)
    from public.employees employee
    where employee.company_id = 'f50d8e62-3006-462e-b2a9-b1cf7c500394'::uuid
      and regexp_replace(coalesce(employee.id_number, ''), '[^0-9]', '', 'g') = seed.id_number
  ) <> 1;

  if unmatched_count <> 0 then
    raise exception '% TR Electrical opening-balance employees could not be matched uniquely by ID number', unmatched_count;
  end if;
end;
$$;

update public.employees employee
set
  nbcei_designation_code = seed.designation_code,
  sbf_member = seed.sbf_member,
  saewa_member = seed.saewa_member
from tr_electrical_july_ytd_seed seed
where employee.company_id = 'f50d8e62-3006-462e-b2a9-b1cf7c500394'::uuid
  and regexp_replace(coalesce(employee.id_number, ''), '[^0-9]', '', 'g') = seed.id_number;

insert into public.employee_payroll_ytd_opening_balances (
  company_id,
  employee_id,
  tax_year_start,
  as_of_date,
  completed_periods,
  gross_remuneration,
  retirement_fund_contributions,
  paye_deducted,
  updated_at
)
select
  employee.company_id,
  employee.employee_id,
  '2026-03-01'::date,
  '2026-07-31'::date,
  5,
  seed.gross_remuneration,
  seed.retirement_fund_contributions,
  seed.paye_deducted,
  now()
from tr_electrical_july_ytd_seed seed
join public.employees employee
  on employee.company_id = 'f50d8e62-3006-462e-b2a9-b1cf7c500394'::uuid
 and regexp_replace(coalesce(employee.id_number, ''), '[^0-9]', '', 'g') = seed.id_number
on conflict (company_id, employee_id, tax_year_start)
do update set
  as_of_date = excluded.as_of_date,
  completed_periods = excluded.completed_periods,
  gross_remuneration = excluded.gross_remuneration,
  retirement_fund_contributions = excluded.retirement_fund_contributions,
  paye_deducted = excluded.paye_deducted,
  updated_at = now();
