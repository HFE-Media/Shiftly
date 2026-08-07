-- Company-specific manual deductions for TR Electrical Solutions and Services.
-- Existing deduction records and other companies are not changed.

alter table public.company_deduction_types
  add column if not exists editor_visible boolean not null default false;

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
  deduction.name,
  'manual',
  0,
  true,
  deduction.sort_order,
  true,
  now()
from public.companies company
cross join (
  values
    ('SBF', 110),
    ('Council Levy', 120),
    ('CBL', 130),
    ('Provident', 140)
) as deduction(name, sort_order)
where company.id = 'f50d8e62-3006-462e-b2a9-b1cf7c500394'::uuid
on conflict (company_id, name)
do update set
  company_name = excluded.company_name,
  calculation_type = 'manual',
  active = true,
  sort_order = excluded.sort_order,
  editor_visible = true,
  updated_at = now();

do $$
begin
  if (
    select count(*)
    from public.company_deduction_types
    where company_id = 'f50d8e62-3006-462e-b2a9-b1cf7c500394'::uuid
      and name in ('SBF', 'Council Levy', 'CBL', 'Provident')
      and active = true
      and editor_visible = true
  ) <> 4 then
    raise exception 'TR Electrical Solutions and Services was not found or its deduction types could not be configured';
  end if;
end;
$$;
