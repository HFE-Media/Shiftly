-- PVS payroll takeover balances at 31 July 2026.
-- These balances seed cumulative PAYE for the first Shiftly payroll ending 25 August 2026.

alter table public.employee_payroll_ytd_opening_balances
  add column if not exists uif_combined numeric(14,2) not null default 0
    check (uif_combined >= 0),
  add column if not exists sdl_contributions numeric(14,2) not null default 0
    check (sdl_contributions >= 0),
  add column if not exists source_note text;

create temporary table pvs_ytd_import (
  company_id uuid not null,
  employee_id text not null,
  expected_name text not null,
  gross_remuneration numeric(14,2) not null,
  paye_deducted numeric(14,2) not null,
  uif_combined numeric(14,2) not null,
  sdl_contributions numeric(14,2) not null,
  primary key (company_id, employee_id)
) on commit drop;

insert into pvs_ytd_import
  (company_id, employee_id, expected_name, gross_remuneration, paye_deducted, uif_combined, sdl_contributions)
values
  ('58f6d52b-fc34-4976-8330-c661008942ce', 'PVSC001', 'Sibusiso Ndawule', 29364.59, 0.00, 593.12, 296.61),
  ('58f6d52b-fc34-4976-8330-c661008942ce', 'PVSC002', 'Eddy Xongwana', 35549.48, 0.00, 711.02, 355.49),
  ('58f6d52b-fc34-4976-8330-c661008942ce', 'PVSC003', 'Mahlatse Bodibana', 30610.36, 0.00, 612.18, 306.09),
  ('58f6d52b-fc34-4976-8330-c661008942ce', 'PVSC004', 'Agostinho Muandule', 29384.45, 0.00, 593.62, 296.81),
  ('58f6d52b-fc34-4976-8330-c661008942ce', 'PVSC005', 'Shamilo Hlongwane', 21747.37, 0.00, 499.94, 249.97),
  ('58f6d52b-fc34-4976-8330-c661008942ce', 'PVSC006', 'Abram Ramodike', 113044.21, 16846.00, 1771.20, 1239.73),
  ('58f6d52b-fc34-4976-8330-c661008942ce', 'PVSC007', 'Zandile Manana', 41728.13, 933.00, 926.18, 463.09),
  ('58f6d52b-fc34-4976-8330-c661008942ce', 'PVSC008', 'Sipho Zikalala', 29649.27, 0.00, 598.98, 299.49),
  ('58f6d52b-fc34-4976-8330-c661008942ce', 'PVSC009', 'Solomon Zitha', 30418.22, 0.00, 614.50, 307.25),
  ('58f6d52b-fc34-4976-8330-c661008942ce', 'PVSC010', 'Nickwell Shikwambana', 40526.93, 2652.00, 810.56, 405.27),
  ('58f6d52b-fc34-4976-8330-c661008942ce', 'PVSC011', 'Themba Khoza', 37438.35, 57.00, 797.90, 378.95),
  ('58f6d52b-fc34-4976-8330-c661008942ce', 'PVSC012', 'Mandla Mabuza', 56098.29, 2931.00, 1115.54, 572.71),
  ('58f6d52b-fc34-4976-8330-c661008942ce', 'PVSC013', 'Lucky Mofokeng', 31165.16, 0.00, 629.58, 314.80),
  ('58f6d52b-fc34-4976-8330-c661008942ce', 'PVSC014', 'Emmanuel Gumede', 30725.48, 0.00, 614.48, 307.25),
  ('58f6d52b-fc34-4976-8330-c661008942ce', 'PVSC015', 'Corrie De Bruin', 94560.50, 11104.00, 1771.20, 1005.80),
  ('58f6d52b-fc34-4976-8330-c661008942ce', 'PVSC016', 'Vumile Nkala', 18923.34, 0.00, 378.46, 189.23),
  ('58f6d52b-fc34-4976-8330-c661008942ce', 'PVSC017', 'Mamello Lepote', 18573.04, 0.00, 371.48, 192.73),
  ('58f6d52b-fc34-4976-8330-c661008942ce', 'PVSC018', 'Mpho Mosikidi', 16812.58, 0.00, 339.64, 169.82),
  ('58f6d52b-fc34-4976-8330-c661008942ce', 'PVSC019', 'Shadrack Mokoena', 16812.58, 0.00, 339.64, 169.82),
  ('58f6d52b-fc34-4976-8330-c661008942ce', 'PVSC020', 'Mzwakhe Mazibuko', 16122.42, 0.00, 322.44, 164.22),
  ('58f6d52b-fc34-4976-8330-c661008942ce', 'PVSC021', 'Sibusiso Kambule', 16812.58, 0.00, 339.64, 169.82),
  ('58f6d52b-fc34-4976-8330-c661008942ce', 'PVSC022', 'Hezekiel Khosa', 31850.94, 0.00, 637.02, 318.51),
  ('58f6d52b-fc34-4976-8330-c661008942ce', 'PVSC023', 'Thabiso Mabuza', 30475.77, 0.00, 615.64, 307.82),
  ('58f6d52b-fc34-4976-8330-c661008942ce', 'PVSC024', 'Siyabonga Mthethwa', 32161.77, 51.00, 650.76, 325.38),
  ('58f6d52b-fc34-4976-8330-c661008942ce', 'PVSC025', 'Mzwakhe Manhicani', 29318.00, 0.00, 600.80, 300.40),
  ('58f6d52b-fc34-4976-8330-c661008942ce', 'PVSC026', 'Vasco Nhabomba', 113149.55, 13964.00, 1771.20, 1131.50),
  ('58f6d52b-fc34-4976-8330-c661008942ce', 'PVSC027', 'Sakhile Duze', 29219.58, 0.00, 621.80, 243.15),
  ('58f6d52b-fc34-4976-8330-c661008942ce', 'PVSC028', 'Sunnyboy Mabuza', 32162.99, 0.00, 649.40, 324.20),
  ('58f6d52b-fc34-4976-8330-c661008942ce', 'PVSC029', 'Katlego Mokwena', 13213.28, 0.00, 266.94, 133.47),
  ('58f6d52b-fc34-4976-8330-c661008942ce', 'PVSC030', 'Ronald Manaka', 13213.28, 0.00, 266.94, 133.47),
  ('58f6d52b-fc34-4976-8330-c661008942ce', 'PVSC031', 'Paul Vilakazi', 13746.86, 0.00, 283.78, 141.89),
  ('58f6d52b-fc34-4976-8330-c661008942ce', 'PVSC032', 'Lopes Macuacua', 86316.43, 8369.00, 1608.48, 863.16),
  ('58f6d52b-fc34-4976-8330-c661008942ce', 'PVSC033', 'Sibusiso Mbokazi', 42191.52, 1200.00, 876.60, 438.30),
  ('58f6d52b-fc34-4976-8330-c661008942ce', 'PVSC034', 'Amos Ndubana', 50373.66, 2199.00, 1062.08, 531.04),
  ('58f6d52b-fc34-4976-8330-c661008942ce', 'PVSC035', 'Salvador Mate', 54467.66, 3055.00, 1162.08, 581.04),
  ('58f6d52b-fc34-4976-8330-c661008942ce', 'PVSC036', 'Jeremias Senda', 50373.66, 2199.00, 1062.08, 531.04),
  ('58f6d52b-fc34-4976-8330-c661008942ce', 'PVSC037', 'Leonard van Seventer', 61956.79, 3605.00, 1229.16, 619.57),
  ('58f6d52b-fc34-4976-8330-c661008942ce', 'PVSC038', 'Mfundo Cele', 49949.01, 2096.00, 1051.42, 525.71),
  ('58f6d52b-fc34-4976-8330-c661008942ce', 'PVSC044', 'Judith Mabasa', 151298.48, 23897.00, 1771.20, 10512.98),
  ('276c7308-8944-41de-bf48-f32ddfec4933', 'PVSW001', 'Tiyani Ntshani', 98490.37, 14024.00, 1771.20, 1088.37),
  ('276c7308-8944-41de-bf48-f32ddfec4933', 'PVSW002', 'Eddy Maluleke', 44412.34, 823.00, 913.84, 456.92),
  ('276c7308-8944-41de-bf48-f32ddfec4933', 'PVSW003', 'William Mutshono', 44768.02, 914.00, 922.86, 461.43),
  ('276c7308-8944-41de-bf48-f32ddfec4933', 'PVSW004', 'Jaime Cumaio', 48283.20, 2445.00, 1025.50, 512.75),
  ('276c7308-8944-41de-bf48-f32ddfec4933', 'PVSW005', 'Custodio Licula', 36716.82, 300.00, 747.82, 373.91),
  ('276c7308-8944-41de-bf48-f32ddfec4933', 'PVSW006', 'Marcos Tivane', 43297.42, 827.00, 514.46, 822.67),
  ('276c7308-8944-41de-bf48-f32ddfec4933', 'PVSW007', 'Jose Muchanga', 44066.69, 971.00, 909.86, 454.93),
  ('276c7308-8944-41de-bf48-f32ddfec4933', 'PVSW008', 'Jaime Tivane', 47275.10, 1555.00, 986.46, 493.23),
  ('276c7308-8944-41de-bf48-f32ddfec4933', 'PVSW009', 'Jabulani Mathebula', 48773.46, 1823.00, 1022.16, 151.08),
  ('276c7308-8944-41de-bf48-f32ddfec4933', 'PVSW010', 'Solomon Khoza', 49935.27, 1555.00, 2678.84, 525.20),
  ('276c7308-8944-41de-bf48-f32ddfec4933', 'PVSW011', 'Samson Ndlovu', 45950.92, 1766.00, 963.98, 481.99),
  ('276c7308-8944-41de-bf48-f32ddfec4933', 'PVSW012', 'Sabelo Masuku', 28317.02, 0.00, 572.06, 286.03),
  ('276c7308-8944-41de-bf48-f32ddfec4933', 'PVSW013', 'Thulani Hakata', 37554.71, 0.00, 758.68, 379.34),
  ('276c7308-8944-41de-bf48-f32ddfec4933', 'PVSW014', 'Thulane Khangela', 17118.14, 0.00, 345.82, 172.91),
  ('276c7308-8944-41de-bf48-f32ddfec4933', 'PVSW015', 'Edward Tibane', 15385.64, 155.41, 310.82, 155.41),
  ('276c7308-8944-41de-bf48-f32ddfec4933', 'PVSW016', 'Yonela Matoko', 28316.97, 0.00, 572.06, 286.03),
  ('276c7308-8944-41de-bf48-f32ddfec4933', 'PVSW017', 'Stephanus Jonker', 29186.73, 0.00, 589.64, 294.82),
  ('276c7308-8944-41de-bf48-f32ddfec4933', 'PVSW018', 'Selby Tshabangu', 15385.64, 0.00, 155.41, 310.82),
  ('276c7308-8944-41de-bf48-f32ddfec4933', 'PVSW019', 'Christo Odendaal', 98892.49, 14024.00, 1062.72, 936.25);

do $$
declare
  bad_rows text;
begin
  if (select count(*) from pvs_ytd_import) <> 58 then
    raise exception 'PVS YTD import must contain exactly 58 employees';
  end if;

  if (select count(*) from pvs_ytd_import where company_id = '58f6d52b-fc34-4976-8330-c661008942ce') <> 39
     or (select count(*) from pvs_ytd_import where company_id = '276c7308-8944-41de-bf48-f32ddfec4933') <> 19 then
    raise exception 'PVS YTD company split must be 39 Construction and 19 Waterproofing';
  end if;

  select string_agg(seed.employee_id || ' (' || seed.expected_name || ')', ', ' order by seed.employee_id)
    into bad_rows
  from pvs_ytd_import seed
  left join public.employees employee
    on employee.company_id = seed.company_id
   and employee.employee_id = seed.employee_id
   and lower(trim(employee.full_name)) = lower(trim(seed.expected_name))
   and employee.active = true
  where employee.employee_id is null;

  if bad_rows is not null then
    raise exception 'PVS YTD import stopped; employee ID/name mismatch: %', bad_rows;
  end if;
end;
$$;

insert into public.employee_payroll_ytd_opening_balances (
  company_id,
  employee_id,
  tax_year_start,
  as_of_date,
  completed_periods,
  gross_remuneration,
  retirement_fund_contributions,
  paye_deducted,
  uif_combined,
  sdl_contributions,
  source_note,
  updated_at
)
select
  company_id,
  employee_id,
  '2026-03-01'::date,
  '2026-07-31'::date,
  5,
  gross_remuneration,
  0,
  paye_deducted,
  uif_combined,
  sdl_contributions,
  'PVS accountant YTD schedule through 31 July 2026; UIF value is employee plus employer UIF',
  now()
from pvs_ytd_import
on conflict (company_id, employee_id, tax_year_start) do update set
  as_of_date = excluded.as_of_date,
  completed_periods = excluded.completed_periods,
  gross_remuneration = excluded.gross_remuneration,
  retirement_fund_contributions = excluded.retirement_fund_contributions,
  paye_deducted = excluded.paye_deducted,
  uif_combined = excluded.uif_combined,
  sdl_contributions = excluded.sdl_contributions,
  source_note = excluded.source_note,
  updated_at = now();

do $$
declare
  imported_count integer;
  imported_gross numeric(14,2);
  imported_paye numeric(14,2);
begin
  select count(*), sum(opening.gross_remuneration), sum(opening.paye_deducted)
    into imported_count, imported_gross, imported_paye
  from public.employee_payroll_ytd_opening_balances opening
  join pvs_ytd_import seed
    on seed.company_id = opening.company_id
   and seed.employee_id = opening.employee_id
  where opening.tax_year_start = '2026-03-01'
    and opening.as_of_date = '2026-07-31';

  if imported_count <> 58 or imported_gross <> 2463633.51 or imported_paye <> 136340.41 then
    raise exception 'PVS YTD validation failed: rows %, gross %, PAYE %', imported_count, imported_gross, imported_paye;
  end if;
end;
$$;

select
  case opening.company_id
    when '276c7308-8944-41de-bf48-f32ddfec4933' then 'PVS Waterproofing'
    when '58f6d52b-fc34-4976-8330-c661008942ce' then 'PVS Construction'
  end as company,
  count(*) as employees,
  sum(opening.gross_remuneration) as ytd_gross,
  sum(opening.paye_deducted) as ytd_paye,
  sum(opening.uif_combined) as ytd_uif_combined,
  sum(opening.sdl_contributions) as ytd_sdl
from public.employee_payroll_ytd_opening_balances opening
join pvs_ytd_import seed
  on seed.company_id = opening.company_id
 and seed.employee_id = opening.employee_id
where opening.tax_year_start = '2026-03-01'
  and opening.as_of_date = '2026-07-31'
group by opening.company_id
order by company;
