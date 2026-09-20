-- Authoritative accountant PAYE and employee-UIF targets through 31 August 2026.
-- Append-only ledger correction: no payroll period, opening balance, employee,
-- payroll run, legacy UIF or demo-void row is rewritten.
begin;

create temporary table pvs_accountant_ytd_targets (
  company_id uuid not null,
  employee_id text not null,
  paye_target numeric(14,2) not null check (paye_target >= 0),
  uif_target numeric(14,2) not null check (uif_target >= 0),
  request_id uuid,
  primary key (company_id, employee_id)
) on commit drop;

insert into pvs_accountant_ytd_targets(company_id,employee_id,paye_target,uif_target) values
  ('276c7308-8944-41de-bf48-f32ddfec4933','PVSW001',17057.00,1062.72),
  ('276c7308-8944-41de-bf48-f32ddfec4933','PVSW002',1098.00,554.65),
  ('276c7308-8944-41de-bf48-f32ddfec4933','PVSW003',1189.00,559.16),
  ('276c7308-8944-41de-bf48-f32ddfec4933','PVSW004',287.00,122.10),
  ('276c7308-8944-41de-bf48-f32ddfec4933','PVSW005',429.00,463.69),
  ('276c7308-8944-41de-bf48-f32ddfec4933','PVSW006',1102.00,354.96),
  ('276c7308-8944-41de-bf48-f32ddfec4933','PVSW007',1282.00,554.68),
  ('276c7308-8944-41de-bf48-f32ddfec4933','PVSW008',2012.00,601.38),
  ('276c7308-8944-41de-bf48-f32ddfec4933','PVSW009',2334.00,621.55),
  ('276c7308-8944-41de-bf48-f32ddfec4933','PVSW010',2103.00,1452.82),
  ('276c7308-8944-41de-bf48-f32ddfec4933','PVSW011',2277.00,592.46),
  ('276c7308-8944-41de-bf48-f32ddfec4933','PVSW012',0.00,365.63),
  ('276c7308-8944-41de-bf48-f32ddfec4933','PVSW013',0.00,458.94),
  ('276c7308-8944-41de-bf48-f32ddfec4933','PVSW014',0.00,252.51),
  ('276c7308-8944-41de-bf48-f32ddfec4933','PVSW015',155.41,235.01),
  ('276c7308-8944-41de-bf48-f32ddfec4933','PVSW016',0.00,365.63),
  ('276c7308-8944-41de-bf48-f32ddfec4933','PVSW017',0.00,374.42),
  ('276c7308-8944-41de-bf48-f32ddfec4933','PVSW018',0.00,157.31),
  ('276c7308-8944-41de-bf48-f32ddfec4933','PVSW019',17057.00,708.48),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC001',0.00,370.04),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC002',257.00,452.46),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC003',0.00,373.22),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC004',0.00,361.86),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC005',0.00,323.45),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC006',20507.00,1062.72),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC007',1262.00,566.46),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC008',0.00,372.97),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC009',0.00,372.30),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC010',4067.00,565.94),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC011',114.00,485.00),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC012',3697.00,682.49),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC013',0.00,379.84),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC014',0.00,371.19),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC015',13587.00,1062.72),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC016',0.00,264.23),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC017',0.00,262.76),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC018',0.00,236.67),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC019',0.00,242.99),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC020',0.00,234.39),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC021',0.00,245.25),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC022',0.00,385.64),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC023',0.00,370.60),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC024',51.00,386.22),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC025',0.00,361.24),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC026',18410.00,1062.72),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC027',0.00,376.35),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC028',0.00,390.15),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC029',0.00,198.92),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC030',0.00,198.92),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC031',0.00,207.34),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC032',10491.00,981.36),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC033',1529.00,539.31),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC034',2528.00,632.05),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC035',3384.00,682.05),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC036',2528.00,632.05),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC037',4884.00,767.40),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC038',2880.00,651.38),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC044',28971.00,1062.72);

update pvs_accountant_ytd_targets
set request_id=md5('shiftly:pvs-accountant-ytd:2026-08-31:'||company_id::text||':'||employee_id)::uuid;
alter table pvs_accountant_ytd_targets alter column request_id set not null;
create unique index on pvs_accountant_ytd_targets(company_id,request_id);

do $$
declare bad text;
begin
  perform public.payroll_lock('276c7308-8944-41de-bf48-f32ddfec4933'::uuid);
  perform public.payroll_lock('58f6d52b-fc34-4976-8330-c661008942ce'::uuid);

  if (select name from public.companies where id='276c7308-8944-41de-bf48-f32ddfec4933'::uuid) is distinct from 'PVS Waterproofing'
     or (select name from public.companies where id='58f6d52b-fc34-4976-8330-c661008942ce'::uuid) is distinct from 'PVS Construction' then
    raise exception 'PVS company identity does not match the approved mapping';
  end if;
  if (select count(*) from pvs_accountant_ytd_targets)<>58
     or (select count(*) from pvs_accountant_ytd_targets where company_id='276c7308-8944-41de-bf48-f32ddfec4933')<>19
     or (select count(*) from pvs_accountant_ytd_targets where company_id='58f6d52b-fc34-4976-8330-c661008942ce')<>39 then
    raise exception 'PVS accountant target set must be exactly 19 Waterproofing and 39 Construction employees';
  end if;
  if exists(select 1 from pvs_accountant_ytd_targets where employee_id in ('PVSC039','PVSC040','PVSC041','PVSC042','PVSC043')) then
    raise exception 'Unconfirmed Construction employees must not be targeted';
  end if;
  select string_agg(t.employee_id,',' order by t.employee_id) into bad
  from pvs_accountant_ytd_targets t
  left join public.employees e on e.company_id=t.company_id and e.employee_id=t.employee_id
  where e.employee_id is null;
  if bad is not null then raise exception 'Target employee/company mapping missing: %',bad; end if;
  select string_agg(distinct t.employee_id,',' order by t.employee_id) into bad
  from pvs_accountant_ytd_targets t join public.employees e on e.employee_id=t.employee_id and e.company_id<>t.company_id;
  if bad is not null then raise exception 'Target employee ID also maps to another company: %',bad; end if;
  if exists(select 1 from public.company_payroll_rules r where r.company_id in
      ('276c7308-8944-41de-bf48-f32ddfec4933'::uuid,'58f6d52b-fc34-4976-8330-c661008942ce'::uuid)
      and (not r.calculate_paye or not r.calculate_uif))
     or (select count(*) from public.company_payroll_rules where company_id in
      ('276c7308-8944-41de-bf48-f32ddfec4933'::uuid,'58f6d52b-fc34-4976-8330-c661008942ce'::uuid))<>2 then
    raise exception 'PVS PAYE/UIF settings are not enabled as expected';
  end if;
  if exists(select 1 from pvs_accountant_ytd_targets t where not exists(
    select 1 from public.company_users u where u.company_id=t.company_id and u.active and u.role='owner')) then
    raise exception 'An active PVS company owner is required for the audited actor field';
  end if;
  if exists(select 1 from pvs_accountant_ytd_targets t join public.employee_payroll_ytd_opening_balances o
      on o.company_id=t.company_id and o.employee_id=t.employee_id and o.tax_year_start='2026-03-01'::date
      where o.as_of_date>'2026-08-31'::date) then
    raise exception 'A target employee has a later opening balance';
  end if;
  if exists(select 1 from pvs_accountant_ytd_targets t join public.employee_payroll_period_totals p
      on p.company_id=t.company_id and p.employee_id=t.employee_id and p.tax_year_start='2026-03-01'::date
      where p.period_start<='2026-08-31'::date and p.period_end>'2026-08-31'::date
        and not exists(select 1 from public.payroll_legacy_period_voids v where v.company_id=p.company_id and v.period_id=p.id)) then
    raise exception 'The accountant cutoff falls inside authoritative payroll history';
  end if;
  if exists(select 1 from pvs_accountant_ytd_targets t join public.payroll_financial_events a
      on a.company_id=t.company_id and a.employee_id=t.employee_id and a.tax_year_start='2026-03-01'::date
      where a.value_type in ('paye','uif') and a.ytd_as_at>'2026-08-31'::date
        and a.id<>'f7ec46bb-26e2-4f64-adc6-e0ff96916349'::uuid) then
    raise exception 'A later accountant YTD target already exists';
  end if;
  if not exists(select 1 from public.payroll_financial_events a
      where a.id='f7ec46bb-26e2-4f64-adc6-e0ff96916349'::uuid
        and a.company_id='58f6d52b-fc34-4976-8330-c661008942ce'::uuid and a.employee_id='PVSC001'
        and a.tax_year_start='2026-03-01'::date and a.request_id='6718ff1e-9ea8-4d41-96d7-5b20c6da32ca'::uuid
        and a.kind='ytd_adjustment' and a.value_type='uif' and a.previous_value=0 and a.target_value=370.04
        and a.delta=370.04 and a.applies_after='2026-09-19'::date and a.ytd_as_at='2026-09-19'::date
        and a.reason='') then
    raise exception 'The existing PVSC001 later UIF target changed';
  end if;
  if (select count(*) from public.payroll_legacy_period_voids where company_id='58f6d52b-fc34-4976-8330-c661008942ce'::uuid)<>2
     or exists(select 1 from public.payroll_legacy_period_voids where company_id='58f6d52b-fc34-4976-8330-c661008942ce'::uuid
       and period_id not in ('c2254d6d-ee97-45d6-9b64-4d144df8b037'::uuid,'a34325c5-e1e9-41f1-87a6-44c80ec1e1bc'::uuid)) then
    raise exception 'The approved PVS Construction demo-void state changed';
  end if;
  if exists(
    select 1 from pvs_accountant_ytd_targets t
    left join public.payroll_financial_events a on a.company_id=t.company_id and a.request_id=t.request_id
    group by t.company_id,t.employee_id,t.request_id having count(a.id) not in (0,2)
  ) then raise exception 'A prior accountant correction is incomplete'; end if;
  if exists(select 1 from pvs_accountant_ytd_targets t join public.payroll_financial_events a
      on a.company_id=t.company_id and a.request_id=t.request_id
      where a.employee_id<>t.employee_id or a.tax_year_start<>'2026-03-01'::date or a.kind<>'ytd_adjustment'
        or a.value_type not in ('paye','uif') or a.applies_after<>'2026-08-31'::date or a.ytd_as_at<>'2026-08-31'::date
        or a.target_value<>case a.value_type when 'paye' then t.paye_target else t.uif_target end
        or a.reason<>'PVS accountant YTD correction through 31 August 2026') then
    raise exception 'A deterministic accountant correction request already exists with different data';
  end if;
end $$;

create temporary table pvs_accountant_ytd_before on commit drop as
select t.*,
  (public.payroll_ytd_value(t.company_id,t.employee_id,'2026-03-01'::date,'2026-09-01'::date)->>'paye')::numeric(14,2) as paye_before,
  (public.payroll_ytd_value(t.company_id,t.employee_id,'2026-03-01'::date,'2026-09-01'::date)->>'uif')::numeric(14,2) as uif_before
from pvs_accountant_ytd_targets t;

insert into public.payroll_financial_events(
  company_id,employee_id,tax_year_start,request_id,kind,value_type,
  previous_value,target_value,delta,applies_after,ytd_as_at,reason,actor
)
select b.company_id,b.employee_id,'2026-03-01'::date,b.request_id,'ytd_adjustment',x.value_type,
  x.previous_value,x.target_value,x.target_value-x.previous_value,
  '2026-08-31'::date,'2026-08-31'::date,
  'PVS accountant YTD correction through 31 August 2026',
  (select u.user_id from public.company_users u where u.company_id=b.company_id and u.active and u.role='owner'
    order by u.user_id limit 1)
from pvs_accountant_ytd_before b
cross join lateral (values
  ('paye'::text,b.paye_before,b.paye_target),
  ('uif'::text,b.uif_before,b.uif_target)
) x(value_type,previous_value,target_value)
where not exists(select 1 from public.payroll_financial_events a where a.company_id=b.company_id and a.request_id=b.request_id);

-- PVSC001 already has an audited absolute UIF target of R370.04 at 19 September.
-- Preserve that later balance after inserting the backdated 31 August target.
insert into public.payroll_financial_events(
  company_id,employee_id,tax_year_start,request_id,kind,value_type,
  previous_value,target_value,delta,applies_after,ytd_as_at,reason,actor
)
select '58f6d52b-fc34-4976-8330-c661008942ce'::uuid,'PVSC001','2026-03-01'::date,
  md5('shiftly:pvs-accountant-ytd:preserve:2026-09-19:58f6d52b-fc34-4976-8330-c661008942ce:PVSC001:uif')::uuid,
  'ytd_adjustment','uif',x.previous_value,370.04,370.04-x.previous_value,
  '2026-09-19'::date,'2026-09-19'::date,
  'Preserve existing PVSC001 UIF YTD target after backdated PVS accountant correction',
  (select u.user_id from public.company_users u
    where u.company_id='58f6d52b-fc34-4976-8330-c661008942ce'::uuid and u.active and u.role='owner'
    order by u.user_id limit 1)
from (select (public.payroll_ytd_value(
    '58f6d52b-fc34-4976-8330-c661008942ce'::uuid,'PVSC001','2026-03-01'::date,'2026-09-20'::date)->>'uif')::numeric(14,2) previous_value) x
where not exists(select 1 from public.payroll_financial_events a
  where a.company_id='58f6d52b-fc34-4976-8330-c661008942ce'::uuid
    and a.request_id=md5('shiftly:pvs-accountant-ytd:preserve:2026-09-19:58f6d52b-fc34-4976-8330-c661008942ce:PVSC001:uif')::uuid);

do $$
declare mismatches text;
begin
  if (select count(*) from public.payroll_financial_events a join pvs_accountant_ytd_targets t
      on t.company_id=a.company_id and t.request_id=a.request_id)<>116 then
    raise exception 'Expected exactly 116 audited PAYE/UIF correction events';
  end if;
  if not exists(select 1 from public.payroll_financial_events a
      where a.company_id='58f6d52b-fc34-4976-8330-c661008942ce'::uuid and a.employee_id='PVSC001'
        and a.request_id=md5('shiftly:pvs-accountant-ytd:preserve:2026-09-19:58f6d52b-fc34-4976-8330-c661008942ce:PVSC001:uif')::uuid
        and a.kind='ytd_adjustment' and a.value_type='uif' and a.target_value=370.04
        and a.applies_after='2026-09-19'::date and a.ytd_as_at='2026-09-19'::date
        and a.reason='Preserve existing PVSC001 UIF YTD target after backdated PVS accountant correction') then
    raise exception 'PVSC001 later UIF target preservation event is missing or different';
  end if;
  select string_agg(t.employee_id,',' order by t.employee_id) into mismatches
  from pvs_accountant_ytd_targets t
  cross join lateral (select public.payroll_ytd_value(
    t.company_id,t.employee_id,'2026-03-01'::date,'2026-09-01'::date) as value) y
  where (y.value->>'paye')::numeric(14,2) is distinct from t.paye_target
     or (y.value->>'uif')::numeric(14,2) is distinct from t.uif_target;
  if mismatches is not null then raise exception 'Post-import accountant targets do not match: %',mismatches; end if;
  if (public.payroll_ytd_value('58f6d52b-fc34-4976-8330-c661008942ce'::uuid,'PVSC001',
      '2026-03-01'::date,'2026-09-20'::date)->>'uif')::numeric(14,2) is distinct from 370.04 then
    raise exception 'PVSC001 later UIF target was not preserved';
  end if;
  if exists(select 1 from public.payroll_financial_events a
      where a.reason='PVS accountant YTD correction through 31 August 2026'
        and (a.company_id not in ('276c7308-8944-41de-bf48-f32ddfec4933'::uuid,'58f6d52b-fc34-4976-8330-c661008942ce'::uuid)
          or a.employee_id in ('PVSC039','PVSC040','PVSC041','PVSC042','PVSC043')
          or a.value_type not in ('paye','uif') or a.tax_year_start<>'2026-03-01'::date or a.ytd_as_at<>'2026-08-31'::date)) then
    raise exception 'Correction scope escaped the approved target set';
  end if;
end $$;

select case company_id
    when '276c7308-8944-41de-bf48-f32ddfec4933'::uuid then 'PVS Waterproofing'
    when '58f6d52b-fc34-4976-8330-c661008942ce'::uuid then 'PVS Construction' end as company,
  count(*) as employees,
  sum(paye_before) as paye_before,sum(paye_target-paye_before) as paye_adjustment,sum(paye_target) as paye_after,
  sum(uif_before) as uif_before,sum(uif_target-uif_before) as uif_adjustment,sum(uif_target) as uif_after
from pvs_accountant_ytd_before group by company_id order by company;

commit;
