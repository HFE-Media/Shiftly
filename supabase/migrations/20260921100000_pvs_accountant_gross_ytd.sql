-- Authoritative PVS cumulative gross targets through 31 August 2026.
-- Extends the existing append-only YTD event kind to support gross; no history is rewritten.
begin;

do $$
declare definition text;
begin
  select pg_get_constraintdef(oid) into definition from pg_constraint
  where conrelid='public.payroll_financial_events'::regclass and conname='payroll_financial_events_check1';
  if regexp_replace(coalesce(definition,''),'[[:space:]]','','g') <>
     regexp_replace('CHECK ((((kind = ''ytd_adjustment''::text) AND (value_type = ANY (ARRAY[''paye''::text, ''uif''::text])) AND (period_id IS NULL) AND (corrected_snapshot IS NULL)) OR ((kind = ''period_correction''::text) AND (period_id IS NOT NULL) AND (corrected_snapshot IS NOT NULL))))','[[:space:]]','','g') then
    raise exception 'Unexpected payroll financial-event kind constraint';
  end if;
end $$;

alter table public.payroll_financial_events drop constraint payroll_financial_events_check1;
alter table public.payroll_financial_events add constraint payroll_financial_events_check1 check (
  (kind='ytd_adjustment' and value_type in ('paye','uif','gross') and period_id is null and corrected_snapshot is null)
  or (kind='period_correction' and period_id is not null and corrected_snapshot is not null)
);

create temporary table pvs_accountant_gross_targets (
  company_id uuid not null,
  employee_id text not null,
  employee_name text not null,
  expected_before numeric(14,2) not null check(expected_before>=0),
  target_gross numeric(14,2) not null check(target_gross>=0),
  adjustment numeric(14,2) not null,
  request_id uuid,
  primary key(company_id,employee_id),
  check(adjustment=target_gross-expected_before)
) on commit drop;

insert into pvs_accountant_gross_targets(company_id,employee_id,employee_name,target_gross,expected_before,adjustment) values
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC001','Sibusiso Ndawule',36712.27,35387.50,1324.77),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC002','Eddy Xongwana',45244.39,43422.49,1821.90),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC003','Mahlatse Bodibana',37323.58,36826.01,497.57),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC004','Agostinho Muandule',35889.62,35824.46,65.16),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC005','Shamilo Hlongwane',29095.06,29021.58,73.48),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC006','Abram Ramodike',139087.65,134574.01,4513.64),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC007','Zandile Manana',52065.22,51763.81,301.41),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC008','Sipho Zikalala',36996.95,36089.27,907.68),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC009','Solomon Zitha',36923.39,37494.76,-571.37),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC010','Nickwell Shikwambana',56592.80,48604.37,7988.43),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC011','Themba Khoza',46042.85,45899.80,143.05),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC012','Mandla Mabuza',68570.02,67352.46,1217.56),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC013','Lucky Mofokeng',37670.33,37904.72,-234.39),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC014','Emmanuel Gumede',37119.03,32799.12,4319.91),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC015','Corrie De Bruin',116082.50,114430.62,1651.88),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC016','Vumile Nkala',26423.34,26348.34,75.00),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC018','Mpho Mosikidi',23497.18,24190.38,-693.20),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC019','Shadrack Mokoena',24129.46,24204.90,-75.44),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC020','Mzwakhe Mazibuko',23439.30,23500.22,-60.92),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC021','Sibusiso Kambule',24355.30,24811.49,-456.19),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC022','Hezekiel Khosa',38564.17,38496.97,67.20),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC023','Thabiso Mabuza',36754.20,36906.64,-152.44),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC024','Siyabonga Mthethwa',38245.52,38601.77,-356.25),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC025','Mzwakhe Manhicani',35401.75,35758.01,-356.26),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC026','Vasco Nhabomba',142265.86,135097.08,7168.78),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC027','Sakhile Duze',35764.23,36543.90,-779.67),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC028','Sunnyboy Mabuza',38707.64,39487.31,-779.67),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC029','Katlego Mokwena',19757.93,20255.89,-497.96),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC030','Ronald Manaka',19757.93,20255.89,-497.96),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC031','Paul Vilakazi',20291.51,20789.47,-497.96),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC032','Lopes Macuacua',106338.58,103139.74,3198.84),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC033','Sibusiso Mbokazi',52292.52,54213.12,-1920.60),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC034','Amos Ndubana',60474.66,62395.26,-1920.60),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC035','Salvador Mate',64568.66,67388.67,-2820.01),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC036','Jeremias Senda',60474.66,62395.26,-1920.60),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC037','Leonard van Seventer',77238.48,74779.40,2459.08),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC038','Mfundo Cele',62516.00,61875.89,640.11),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC044','Judith Mabasa',182756.60,151298.48,31458.12),
  ('276c7308-8944-41de-bf48-f32ddfec4933','PVSW001','Tiyani Ntshani',122115.34,98490.37,23624.97),
  ('276c7308-8944-41de-bf48-f32ddfec4933','PVSW002','Eddy Maluleke',54185.23,44412.34,9772.89),
  ('276c7308-8944-41de-bf48-f32ddfec4933','PVSW003','William Mutshono',54540.91,44768.02,9772.89),
  ('276c7308-8944-41de-bf48-f32ddfec4933','PVSW004','Jaime Cumaio',11800.90,48283.20,-36482.30),
  ('276c7308-8944-41de-bf48-f32ddfec4933','PVSW005','Custodio Licula',45694.39,36716.82,8977.57),
  ('276c7308-8944-41de-bf48-f32ddfec4933','PVSW006','Marcos Tivane',53070.31,43297.42,9772.89),
  ('276c7308-8944-41de-bf48-f32ddfec4933','PVSW007','Jose Muchanga',54041.77,44066.69,9975.08),
  ('276c7308-8944-41de-bf48-f32ddfec4933','PVSW008','Jaime Tivane',58089.94,47275.10,10814.84),
  ('276c7308-8944-41de-bf48-f32ddfec4933','PVSW009','Jabulani Mathebula',59820.06,48773.46,11046.60),
  ('276c7308-8944-41de-bf48-f32ddfec4933','PVSW010','Solomon Khoza',61275.16,49935.27,11339.89),
  ('276c7308-8944-41de-bf48-f32ddfec4933','PVSW011','Samson Ndlovu',56997.48,45950.92,11046.56),
  ('276c7308-8944-41de-bf48-f32ddfec4933','PVSW012','Sabelo Masuku',36277.07,28317.02,7960.05),
  ('276c7308-8944-41de-bf48-f32ddfec4933','PVSW013','Thulani Hakata',45514.76,37554.71,7960.05),
  ('276c7308-8944-41de-bf48-f32ddfec4933','PVSW014','Thulane Khangela',25078.19,17118.14,7960.05),
  ('276c7308-8944-41de-bf48-f32ddfec4933','PVSW015','Edward Tibane',23345.69,15385.64,7960.05),
  ('276c7308-8944-41de-bf48-f32ddfec4933','PVSW016','Yonela Matoko',36277.02,28316.97,7960.05),
  ('276c7308-8944-41de-bf48-f32ddfec4933','PVSW017','Stephanus Jonker',37146.78,29186.73,7960.05),
  ('276c7308-8944-41de-bf48-f32ddfec4933','PVSW018','Selby Tshabangu',25158.53,15385.64,9772.89),
  ('276c7308-8944-41de-bf48-f32ddfec4933','PVSW019','Christo Odendaal',122517.46,98892.49,23624.97);

update pvs_accountant_gross_targets
set request_id=md5('shiftly:pvs-accountant-gross-ytd:2026-08-31:'||company_id::text||':'||employee_id)::uuid;
alter table pvs_accountant_gross_targets alter column request_id set not null;
create unique index on pvs_accountant_gross_targets(company_id,request_id);

do $$
declare bad text;
begin
  perform public.payroll_lock('276c7308-8944-41de-bf48-f32ddfec4933'::uuid);
  perform public.payroll_lock('58f6d52b-fc34-4976-8330-c661008942ce'::uuid);
  if (select name from public.companies where id='276c7308-8944-41de-bf48-f32ddfec4933'::uuid) is distinct from 'PVS Waterproofing'
     or (select name from public.companies where id='58f6d52b-fc34-4976-8330-c661008942ce'::uuid) is distinct from 'PVS Construction' then
    raise exception 'PVS company identity does not match the approved mapping';
  end if;
  if (select count(*) from pvs_accountant_gross_targets)<>57
     or (select count(*) from pvs_accountant_gross_targets where company_id='276c7308-8944-41de-bf48-f32ddfec4933')<>19
     or (select count(*) from pvs_accountant_gross_targets where company_id='58f6d52b-fc34-4976-8330-c661008942ce')<>38 then
    raise exception 'Gross target set must be exactly 19 Waterproofing and 38 Construction employees';
  end if;
  if exists(select 1 from pvs_accountant_gross_targets where employee_id in ('PVSC017','PVSC039','PVSC040','PVSC041','PVSC042','PVSC043')) then
    raise exception 'An excluded Construction employee is present in the gross target set';
  end if;
  select string_agg(t.employee_id,',' order by t.employee_id) into bad
  from pvs_accountant_gross_targets t left join public.employees e
    on e.company_id=t.company_id and e.employee_id=t.employee_id
      and lower(trim(e.full_name))=lower(trim(t.employee_name))
  where e.employee_id is null;
  if bad is not null then raise exception 'Gross target employee/company/name mismatch: %',bad; end if;
  if exists(select 1 from pvs_accountant_gross_targets t where not exists(
    select 1 from public.company_users u where u.company_id=t.company_id and u.active and u.role='owner')) then
    raise exception 'An active PVS company owner is required for the audited actor field';
  end if;
  if (select count(*) from public.payroll_legacy_period_voids where company_id='58f6d52b-fc34-4976-8330-c661008942ce'::uuid)<>2
     or exists(select 1 from public.payroll_legacy_period_voids where company_id='58f6d52b-fc34-4976-8330-c661008942ce'::uuid
       and period_id not in ('c2254d6d-ee97-45d6-9b64-4d144df8b037'::uuid,'a34325c5-e1e9-41f1-87a6-44c80ec1e1bc'::uuid)) then
    raise exception 'The approved PVS Construction demo-void state changed';
  end if;
end $$;

create temporary table pvs_accountant_gross_before on commit drop as
select t.*,
  public.payroll_ytd_value(t.company_id,t.employee_id,'2026-03-01'::date,'2026-09-01'::date) as ytd_before
from pvs_accountant_gross_targets t;

do $$
declare existing_count integer; bad text;
begin
  select count(*) into existing_count from public.payroll_financial_events a
    join pvs_accountant_gross_targets t on t.company_id=a.company_id and t.request_id=a.request_id;
  if existing_count not in (0,57) then raise exception 'A prior gross correction is incomplete'; end if;
  if existing_count=0 then
    select string_agg(employee_id,',' order by employee_id) into bad from pvs_accountant_gross_before
    where round((ytd_before->>'gross')::numeric,2) is distinct from expected_before;
    if bad is not null then raise exception 'Effective gross changed since reconciliation: %',bad; end if;
  else
    if exists(select 1 from pvs_accountant_gross_before
      where round((ytd_before->>'gross')::numeric,2) is distinct from target_gross) then
      raise exception 'Existing deterministic gross corrections do not produce their targets';
    end if;
  end if;
  if exists(select 1 from pvs_accountant_gross_targets t join public.payroll_financial_events a
      on a.company_id=t.company_id and a.request_id=t.request_id
      where a.employee_id<>t.employee_id or a.tax_year_start<>'2026-03-01'::date or a.kind<>'ytd_adjustment'
        or a.value_type<>'gross' or a.previous_value<>t.expected_before or a.target_value<>t.target_gross
        or a.delta<>t.adjustment or a.applies_after<>'2026-08-31'::date or a.ytd_as_at<>'2026-08-31'::date
        or a.period_id is not null or a.corrected_snapshot is not null
        or a.reason<>'PVS accountant gross YTD correction through 31 August 2026') then
    raise exception 'A deterministic gross correction request exists with different data';
  end if;
end $$;

insert into public.payroll_financial_events(
  company_id,employee_id,tax_year_start,request_id,kind,value_type,
  previous_value,target_value,delta,applies_after,ytd_as_at,reason,actor
)
select t.company_id,t.employee_id,'2026-03-01'::date,t.request_id,'ytd_adjustment','gross',
  t.expected_before,t.target_gross,t.adjustment,'2026-08-31'::date,'2026-08-31'::date,
  'PVS accountant gross YTD correction through 31 August 2026',
  (select u.user_id from public.company_users u where u.company_id=t.company_id and u.active and u.role='owner'
    order by u.user_id limit 1)
from pvs_accountant_gross_targets t
where not exists(select 1 from public.payroll_financial_events a
  where a.company_id=t.company_id and a.request_id=t.request_id);

do $$
declare bad text;
begin
  if (select count(*) from public.payroll_financial_events a join pvs_accountant_gross_targets t
      on t.company_id=a.company_id and t.request_id=a.request_id)<>57 then
    raise exception 'Expected exactly 57 audited gross correction events';
  end if;
  select string_agg(t.employee_id,',' order by t.employee_id) into bad
  from pvs_accountant_gross_before t
  cross join lateral (select public.payroll_ytd_value(
    t.company_id,t.employee_id,'2026-03-01'::date,'2026-09-01'::date) as value) after
  where round((after.value->>'gross')::numeric,2) is distinct from t.target_gross
     or round((after.value->>'paye')::numeric,2) is distinct from round((t.ytd_before->>'paye')::numeric,2)
     or round((after.value->>'uif')::numeric,2) is distinct from round((t.ytd_before->>'uif')::numeric,2);
  if bad is not null then raise exception 'Post-correction gross/PAYE/UIF verification failed: %',bad; end if;
  if exists(select 1 from public.payroll_financial_events a
    where a.reason='PVS accountant gross YTD correction through 31 August 2026'
      and (a.company_id not in ('276c7308-8944-41de-bf48-f32ddfec4933'::uuid,'58f6d52b-fc34-4976-8330-c661008942ce'::uuid)
        or a.employee_id in ('PVSC017','PVSC039','PVSC040','PVSC041','PVSC042','PVSC043')
        or a.kind<>'ytd_adjustment' or a.value_type<>'gross' or a.tax_year_start<>'2026-03-01'::date
        or a.applies_after<>'2026-08-31'::date or a.ytd_as_at<>'2026-08-31'::date)) then
    raise exception 'Gross correction escaped the approved scope';
  end if;
  if (select count(*) from public.payroll_legacy_period_voids where company_id='58f6d52b-fc34-4976-8330-c661008942ce'::uuid)<>2
     or exists(select 1 from public.payroll_legacy_period_voids where company_id='58f6d52b-fc34-4976-8330-c661008942ce'::uuid
       and period_id not in ('c2254d6d-ee97-45d6-9b64-4d144df8b037'::uuid,'a34325c5-e1e9-41f1-87a6-44c80ec1e1bc'::uuid)) then
    raise exception 'PVS demo voids changed during gross correction';
  end if;
end $$;

select case company_id
    when '276c7308-8944-41de-bf48-f32ddfec4933'::uuid then 'PVS Waterproofing'
    when '58f6d52b-fc34-4976-8330-c661008942ce'::uuid then 'PVS Construction' end company,
  count(*) employees,sum(expected_before) gross_before,sum(adjustment) adjustment,sum(target_gross) gross_after
from pvs_accountant_gross_targets group by company_id order by company;

commit;
