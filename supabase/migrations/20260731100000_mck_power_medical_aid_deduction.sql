-- MCK Power employee-level Medical Aid payroll deduction.
-- No other company deduction types are changed.

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
  'Medical Aid',
  'manual',
  0,
  true,
  150,
  true,
  now()
from public.companies company
where company.id = '4ca8c47f-3959-468b-bd8a-734f38874623'::uuid
  and company.name = 'MCK Power'
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
    where company_id = '4ca8c47f-3959-468b-bd8a-734f38874623'::uuid
      and name = 'Medical Aid'
      and calculation_type = 'manual'
      and active = true
      and editor_visible = true
  ) <> 1 then
    raise exception 'MCK Power was not found or Medical Aid could not be configured';
  end if;
end;
$$;
