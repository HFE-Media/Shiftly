-- Convert the 43 confirmed PVS Construction employees from hourly rates
-- to the fixed monthly salaries supplied in the accountant's 31 July 2026
-- report or confirmed by the owner. PVSC039 through PVSC043 invoice the
-- company separately and are therefore monthly employees with a zero salary.
-- PVSC014 is intentionally excluded until its salary is confirmed.
-- No identity, employment-date, attendance, or YTD fields are changed here.

begin;

create temporary table pvs_construction_monthly_salary_seed (
  employee_id text primary key,
  expected_name text not null,
  monthly_salary numeric(14,2) not null check (monthly_salary >= 0)
) on commit drop;

insert into pvs_construction_monthly_salary_seed (
  employee_id,
  expected_name,
  monthly_salary
) values
  ('PVSC001', 'Sibusiso Ndawule',       6022.91),
  ('PVSC002', 'Eddy Xongwana',          7317.57),
  ('PVSC003', 'Mahlatse Bodibana',      6215.65),
  ('PVSC004', 'Agostinho Muandule',     6440.01),
  ('PVSC005', 'Shamilo Hlongwane',      7274.21),
  ('PVSC006', 'Abram Ramodike',        21529.80),
  ('PVSC007', 'Zandile Manana',        10035.68),
  ('PVSC008', 'Sipho Zikalala',         6440.00),
  ('PVSC009', 'Solomon Zitha',          7076.54),
  ('PVSC010', 'Nickwell Shikwambana',   8077.44),
  ('PVSC011', 'Themba Khoza',           8461.45),
  ('PVSC012', 'Mandla Mabuza',         11254.17),
  ('PVSC013', 'Lucky Mofokeng',         6739.56),
  ('PVSC015', 'Corrie De Bruin',       19870.12),
  ('PVSC016', 'Vumile Nkala',           7425.00),
  ('PVSC017', 'Mamello Lepote',         8170.00),
  ('PVSC018', 'Mpho Mosikidi',          7377.80),
  ('PVSC019', 'Shadrack Mokoena',       7392.32),
  ('PVSC020', 'Mzwakhe Mazibuko',       7377.80),
  ('PVSC021', 'Sibusiso Kambule',       7392.32),
  ('PVSC022', 'Hezekiel Khosa',         6646.03),
  ('PVSC023', 'Thabiso Mabuza',         6430.87),
  ('PVSC024', 'Siyabonga Mthethwa',     6440.00),
  ('PVSC025', 'Mzwakhe Manhicani',      6440.01),
  ('PVSC026', 'Vasco Nhabomba',        20283.15),
  ('PVSC027', 'Sakhile Duze',           7324.32),
  ('PVSC028', 'Sunnyboy Mabuza',        7324.32),
  ('PVSC029', 'Katlego Mokwena',        7042.61),
  ('PVSC030', 'Ronald Manaka',          7042.61),
  ('PVSC031', 'Paul Vilakazi',          7042.61),
  ('PVSC032', 'Lopes Macuacua',        16823.31),
  ('PVSC033', 'Sibusiso Mbokazi',      12021.60),
  ('PVSC034', 'Amos Ndubana',          12021.60),
  ('PVSC035', 'Salvador Mate',         12921.01),
  ('PVSC036', 'Jeremias Senda',        12021.60),
  ('PVSC037', 'Leonard van Seventer',  12822.61),
  ('PVSC038', 'Mfundo Cele',           11085.44),
  ('PVSC039', 'Leon Johannes Grundlingh',   0.00),
  ('PVSC040', 'Dennis Botha',                0.00),
  ('PVSC041', 'Sérgio Ndimande',             0.00),
  ('PVSC042', 'Christiaan Holsthauzen',       0.00),
  ('PVSC043', 'Riaan Legge',                  0.00),
  ('PVSC044', 'Judith Mabasa',         26207.00);

do $$
declare
  v_company_id constant uuid :=
    '58f6d52b-fc34-4976-8330-c661008942ce'::uuid;
  v_seed_count integer;
  v_match_count integer;
begin
  if not exists (
    select 1
    from public.companies
    where id = v_company_id
      and name = 'PVS Construction'
  ) then
    raise exception 'PVS Construction company record was not found';
  end if;

  select count(*) into v_seed_count
  from pvs_construction_monthly_salary_seed;

  select count(*) into v_match_count
  from pvs_construction_monthly_salary_seed seed
  join public.employees employee
    on employee.company_id = v_company_id
   and employee.employee_id = seed.employee_id
   and employee.full_name = seed.expected_name
   and employee.active = true;

  if v_seed_count <> 43 or v_match_count <> v_seed_count then
    raise exception
      'Expected 43 active PVS Construction employees, but matched % of %',
      v_match_count,
      v_seed_count;
  end if;
end;
$$;

update public.employees employee
set rate = seed.monthly_salary,
    pay_type = 'monthly',
    pay_cycle = 'monthly'
from pvs_construction_monthly_salary_seed seed
where employee.company_id =
      '58f6d52b-fc34-4976-8330-c661008942ce'::uuid
  and employee.employee_id = seed.employee_id
  and employee.full_name = seed.expected_name
  and employee.active = true;

do $$
declare
  v_updated_count integer;
begin
  select count(*) into v_updated_count
  from pvs_construction_monthly_salary_seed seed
  join public.employees employee
    on employee.company_id =
       '58f6d52b-fc34-4976-8330-c661008942ce'::uuid
   and employee.employee_id = seed.employee_id
   and employee.full_name = seed.expected_name
   and employee.rate = seed.monthly_salary
   and employee.pay_type = 'monthly'
   and employee.pay_cycle = 'monthly'
   and employee.active = true;

  if v_updated_count <> 43 then
    raise exception
      'PVS Construction monthly salary validation failed: % of 43 matched',
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
where company_id = '58f6d52b-fc34-4976-8330-c661008942ce'::uuid
  and employee_id in (
    'PVSC001', 'PVSC002', 'PVSC003', 'PVSC004', 'PVSC005',
    'PVSC006', 'PVSC007', 'PVSC008', 'PVSC009', 'PVSC010',
    'PVSC011', 'PVSC012', 'PVSC013', 'PVSC015', 'PVSC016',
    'PVSC017', 'PVSC018', 'PVSC019', 'PVSC020', 'PVSC021',
    'PVSC022', 'PVSC023', 'PVSC024', 'PVSC025', 'PVSC026',
    'PVSC027', 'PVSC028', 'PVSC029', 'PVSC030', 'PVSC031',
    'PVSC032', 'PVSC033', 'PVSC034', 'PVSC035', 'PVSC036',
    'PVSC037', 'PVSC038', 'PVSC039', 'PVSC040', 'PVSC041',
    'PVSC042', 'PVSC043', 'PVSC044'
  )
order by employee_id;
