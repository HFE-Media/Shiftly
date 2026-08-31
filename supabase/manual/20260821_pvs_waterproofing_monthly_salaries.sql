-- Convert the 19 confirmed PVS Waterproofing employees from hourly rates to
-- the fixed monthly salaries supplied in the accountant's 31 July 2026 report.
-- No identity, employment-date, attendance, or YTD fields are changed here.

begin;

create temporary table pvs_waterproofing_monthly_salary_seed (
  employee_id text primary key,
  expected_name text not null,
  monthly_salary numeric(14,2) not null check (monthly_salary > 0)
) on commit drop;

insert into pvs_waterproofing_monthly_salary_seed (
  employee_id,
  expected_name,
  monthly_salary
) values
  ('PVSW001', 'Tiyani Ntshani',       20414.85),
  ('PVSW002', 'Eddy Maluleke',         9044.48),
  ('PVSW003', 'William Mutshono',      9400.16),
  ('PVSW004', 'Jaime Cumaio',         11056.16),
  ('PVSW005', 'Custodio Licula',       8758.79),
  ('PVSW006', 'Marcos Tivane',         9400.16),
  ('PVSW007', 'Jose Muchanga',         9564.33),
  ('PVSW008', 'Jaime Tivane',         10249.69),
  ('PVSW009', 'Jabulani Mathebula',   10425.13),
  ('PVSW010', 'Solomon Khoza',        10653.80),
  ('PVSW011', 'Samson Ndlovu',        10425.09),
  ('PVSW012', 'Sabelo Masuku',         7880.45),
  ('PVSW013', 'Thulani Hakata',        7880.45),
  ('PVSW014', 'Thulane Khangela',      7880.45),
  ('PVSW015', 'Edward Tibane',         7880.45),
  ('PVSW016', 'Yonela Matoko',         7880.45),
  ('PVSW017', 'Stephanus Jonker',      7516.62),
  ('PVSW018', 'Selby Tshabangu',       7880.45),
  ('PVSW019', 'Christo Odendaal',     20414.85);

do $$
declare
  v_company_id constant uuid :=
    '276c7308-8944-41de-bf48-f32ddfec4933'::uuid;
  v_seed_count integer;
  v_match_count integer;
begin
  if not exists (
    select 1
    from public.companies
    where id = v_company_id
      and name = 'PVS Waterproofing'
  ) then
    raise exception 'PVS Waterproofing company record was not found';
  end if;

  select count(*) into v_seed_count
  from pvs_waterproofing_monthly_salary_seed;

  select count(*) into v_match_count
  from pvs_waterproofing_monthly_salary_seed seed
  join public.employees employee
    on employee.company_id = v_company_id
   and employee.employee_id = seed.employee_id
   and employee.full_name = seed.expected_name
   and employee.active = true;

  if v_seed_count <> 19 or v_match_count <> v_seed_count then
    raise exception
      'Expected 19 active PVS Waterproofing employees, but matched % of %',
      v_match_count,
      v_seed_count;
  end if;
end;
$$;

update public.employees employee
set rate = seed.monthly_salary,
    pay_type = 'monthly',
    pay_cycle = 'monthly'
from pvs_waterproofing_monthly_salary_seed seed
where employee.company_id =
      '276c7308-8944-41de-bf48-f32ddfec4933'::uuid
  and employee.employee_id = seed.employee_id
  and employee.full_name = seed.expected_name
  and employee.active = true;

do $$
declare
  v_updated_count integer;
begin
  select count(*) into v_updated_count
  from pvs_waterproofing_monthly_salary_seed seed
  join public.employees employee
    on employee.company_id =
       '276c7308-8944-41de-bf48-f32ddfec4933'::uuid
   and employee.employee_id = seed.employee_id
   and employee.full_name = seed.expected_name
   and employee.rate = seed.monthly_salary
   and employee.pay_type = 'monthly'
   and employee.pay_cycle = 'monthly'
   and employee.active = true;

  if v_updated_count <> 19 then
    raise exception
      'PVS Waterproofing monthly salary validation failed: % of 19 matched',
      v_updated_count;
  end if;
end;
$$;

commit;

select
  employee_id,
  full_name,
  rate as monthly_salary,
  pay_type,
  pay_cycle,
  active
from public.employees
where company_id = '276c7308-8944-41de-bf48-f32ddfec4933'::uuid
  and employee_id in (
    'PVSW001', 'PVSW002', 'PVSW003', 'PVSW004', 'PVSW005',
    'PVSW006', 'PVSW007', 'PVSW008', 'PVSW009', 'PVSW010',
    'PVSW011', 'PVSW012', 'PVSW013', 'PVSW014', 'PVSW015',
    'PVSW016', 'PVSW017', 'PVSW018', 'PVSW019'
  )
order by employee_id;
