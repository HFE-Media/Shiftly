-- Void two verified pre-authoritative PVS Construction demo artifacts without
-- rewriting immutable payroll rows or weakening payroll-wide safeguards.
begin;

create table public.payroll_legacy_period_voids (
  company_id uuid not null references public.companies(id),
  employee_id text not null,
  tax_year_start date not null,
  period_id uuid not null,
  reason text not null check (length(btrim(reason)) >= 20),
  authority text not null check (length(btrim(authority)) >= 20),
  original_snapshot jsonb not null,
  recorded_by text not null default current_user,
  recorded_at timestamptz not null default now(),
  primary key (company_id, period_id),
  foreign key (company_id, employee_id, tax_year_start, period_id)
    references public.employee_payroll_period_totals(company_id, employee_id, tax_year_start, id)
);
create index payroll_legacy_period_voids_employee_year
  on public.payroll_legacy_period_voids(company_id, employee_id, tax_year_start);
alter table public.payroll_legacy_period_voids enable row level security;
revoke all on public.payroll_legacy_period_voids from public, anon, authenticated;

-- This is deliberately not a browser RPC. It can only record a legacy row
-- which predates authoritative payroll runs and lacks the newer UIF snapshot.
create function public.payroll_validate_legacy_period_void() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$
declare p public.employee_payroll_period_totals;
begin
  perform public.payroll_lock(new.company_id);
  select * into p
  from public.employee_payroll_period_totals
  where company_id=new.company_id and employee_id=new.employee_id
    and tax_year_start=new.tax_year_start and id=new.period_id;
  if not found then raise exception 'Legacy payroll row not found'; end if;
  if p.run_id is not null or p.document_row is not null
     or p.paye_enabled is not null or p.uif_enabled is not null
     or p.employee_uif is not null or p.employer_uif is not null
     or p.uif_liable_remuneration is not null then
    raise exception 'Only a pre-authoritative legacy payroll row with incomplete UIF may be voided';
  end if;
  new.original_snapshot:=to_jsonb(p);
  new.recorded_by:=current_user;
  return new;
end $$;
revoke all on function public.payroll_validate_legacy_period_void() from public,anon,authenticated;
create trigger payroll_legacy_void_lock before insert or update or delete on public.payroll_legacy_period_voids
  for each row execute function public.payroll_input_lock();
create trigger payroll_legacy_void_validate before insert on public.payroll_legacy_period_voids
  for each row execute function public.payroll_validate_legacy_period_void();
create trigger payroll_legacy_voids_immutable before update or delete on public.payroll_legacy_period_voids
  for each row execute function public.payroll_immutable();

-- Fail closed unless production still matches the exact inspected legacy state.
do $$
declare c constant uuid:='58f6d52b-fc34-4976-8330-c661008942ce';
begin
  if (select name from public.companies where id=c) is distinct from 'PVS Construction' then
    raise exception 'Expected PVS Construction company identity does not match';
  end if;
  if not exists (
    select 1 from public.employee_payroll_period_totals p
    where p.company_id=c and p.id='c2254d6d-ee97-45d6-9b64-4d144df8b037'::uuid
      and p.employee_id='PVSC001' and p.tax_year_start='2026-03-01'::date
      and p.period_start='2026-09-01'::date and p.period_end='2026-09-15'::date and p.period_number=7
      and p.gross_remuneration=6022.91 and p.retirement_fund_contributions=0 and p.paye_deducted=0
      and p.finalized_at='2026-09-15T11:37:51.908+02:00'::timestamptz
      and p.run_id is null and p.document_row is null and p.paye_enabled is null and p.uif_enabled is null
      and p.employee_uif is null and p.employer_uif is null and p.uif_liable_remuneration is null
  ) then raise exception 'PVSC001 demo artifact differs from the inspected legacy state'; end if;
  if not exists (
    select 1 from public.employee_payroll_period_totals p
    where p.company_id=c and p.id='a34325c5-e1e9-41f1-87a6-44c80ec1e1bc'::uuid
      and p.employee_id='PVSC006' and p.tax_year_start='2026-03-01'::date
      and p.period_start='2026-09-01'::date and p.period_end='2026-09-15'::date and p.period_number=7
      and p.gross_remuneration=23093.85 and p.retirement_fund_contributions=0 and p.paye_deducted=2314.64
      and p.finalized_at='2026-09-15T19:06:26.361+02:00'::timestamptz
      and p.run_id is null and p.document_row is null and p.paye_enabled is null and p.uif_enabled is null
      and p.employee_uif is null and p.employer_uif is null and p.uif_liable_remuneration is null
  ) then raise exception 'PVSC006 demo artifact differs from the inspected legacy state'; end if;
  if exists (
    select 1 from public.payroll_runs
    where company_id=c and period_start='2026-09-01'::date and period_end='2026-09-15'::date
  ) then raise exception 'An authoritative PVS Construction payroll run now exists for the demo period'; end if;
end $$;

insert into public.payroll_legacy_period_voids(company_id,employee_id,tax_year_start,period_id,reason,authority,original_snapshot)
values
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC001','2026-03-01','c2254d6d-ee97-45d6-9b64-4d144df8b037',
   'Client-meeting demo artifact created by the legacy payslip-generation side effect; no PVS Construction September payroll was authorised or finalised.',
   'Business correction authorised by the Shiftly owner on 2026-09-20 for the two exact inspected PVS Construction rows.', '{}'::jsonb),
  ('58f6d52b-fc34-4976-8330-c661008942ce','PVSC006','2026-03-01','a34325c5-e1e9-41f1-87a6-44c80ec1e1bc',
   'Client-meeting demo artifact created by the legacy payslip-generation side effect; no PVS Construction September payroll was authorised or finalised.',
   'Business correction authorised by the Shiftly owner on 2026-09-20 for the two exact inspected PVS Construction rows.', '{}'::jsonb);

-- Preserve revision values for every unaffected company. Only a company with a
-- void ledger entry gains an additional revision component.
create or replace function public.payroll_revision(c uuid) returns text
language sql stable security definer set search_path=pg_catalog,public as $$
 select md5((jsonb_build_array(
   (select to_jsonb(co) from public.companies co where id=c),
   (select to_jsonb(r) from public.company_payroll_rules r where company_id=c),
   (select jsonb_agg(to_jsonb(e) order by employee_id) from public.employees e where company_id=c),
   (select jsonb_agg(to_jsonb(o) order by id) from public.employee_payroll_ytd_opening_balances o where company_id=c),
   (select jsonb_agg(to_jsonb(p) order by id) from public.employee_payroll_period_totals p where company_id=c),
   (select jsonb_agg(to_jsonb(a) order by id) from public.payroll_financial_events a where company_id=c),
   (select jsonb_agg(to_jsonb(d) order by id) from public.payroll_deductions d where company_id=c),
   (select jsonb_agg(to_jsonb(d) order by id) from public.company_deduction_types d where company_id=c),
   (select jsonb_agg(to_jsonb(a) order by id) from public.payroll_adjustments a where company_id=c),
   (select jsonb_agg(to_jsonb(l) order by id) from public.company_payroll_levy_periods l where company_id=c),
   (select jsonb_agg(to_jsonb(t) order by entry_id) from public.clock_events t where company_id=c)
 ) || case when exists(select 1 from public.payroll_legacy_period_voids v where v.company_id=c)
      then jsonb_build_array((select jsonb_agg(to_jsonb(v) order by period_id) from public.payroll_legacy_period_voids v where v.company_id=c))
      else '[]'::jsonb end)::text)
$$;

create or replace function public.payroll_ytd_value(c uuid,e text,y date,cutoff date) returns jsonb
language sql stable security definer set search_path=pg_catalog,public as $$
 with o as (select * from public.employee_payroll_ytd_opening_balances
   where company_id=c and employee_id=e and tax_year_start=y and as_of_date<cutoff),
 p as (select * from public.employee_payroll_period_totals p
   where p.company_id=c and p.employee_id=e and p.tax_year_start=y and p.period_end<cutoff
     and p.period_end>coalesce((select as_of_date from o),y-1)
     and not exists(select 1 from public.payroll_legacy_period_voids v where v.company_id=p.company_id and v.period_id=p.id)),
 a as (select * from public.payroll_financial_events
   where company_id=c and employee_id=e and tax_year_start=y and applies_after<cutoff)
 select jsonb_build_object(
   'employee_id',e,'has_opening',exists(select 1 from o),'as_of_date',(select as_of_date from o),
   'completed_periods',coalesce((select completed_periods from o),0),'finalized_periods',(select count(*) from p),
   'gross',coalesce((select gross_remuneration from o),0)+coalesce((select sum(gross_remuneration) from p),0)+coalesce((select sum(delta) from a where value_type='gross'),0),
   'retirement',coalesce((select retirement_fund_contributions from o),0)+coalesce((select sum(retirement_fund_contributions) from p),0)+coalesce((select sum(delta) from a where value_type='retirement'),0),
   'paye',coalesce((select paye_deducted from o),0)+coalesce((select sum(paye_deducted) from p where paye_enabled is distinct from false),0)+coalesce((select sum(delta) from a where value_type='paye'),0),
   'uif',coalesce((select employee_uif from o),0)+coalesce((select sum(employee_uif) from p where uif_enabled is distinct from false),0)+coalesce((select sum(delta) from a where value_type='uif'),0),
   'uif_opening_supplied',exists(select 1 from o where employee_uif is not null),
   'paye_supplied',exists(select 1 from o) or exists(select 1 from a where value_type='paye') or exists(select 1 from p where paye_enabled is not false),
   'uif_supplied',exists(select 1 from o where employee_uif is not null) or exists(select 1 from a where value_type='uif') or exists(select 1 from p where employee_uif is not null and uif_enabled is not false),
   'adjustment_cutoff',greatest(y-1,coalesce((select as_of_date from o),y-1),coalesce((select max(period_end) from p),y-1)))
$$;

create or replace function public.get_payroll_history(c uuid,s date,t date) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare result jsonb;
begin
  perform public.payroll_require_manager(c);
  if s is null or t is null or s>t then raise exception 'Invalid payroll dates'; end if;
  select jsonb_build_object('revision',public.payroll_revision(c),
    'employees',(select coalesce(jsonb_agg(public.payroll_ytd_value(c,e.employee_id,public.payroll_tax_year(t),s)),'[]') from public.employees e where e.company_id=c),
    'run',(select to_jsonb(r)-'request_payload' from public.payroll_runs r where company_id=c and period_start=s and period_end=t order by finalised_at desc limit 1),
    'periods',(select coalesce(jsonb_agg(to_jsonb(p) order by employee_id),'[]') from public.employee_payroll_period_totals p
      where p.company_id=c and p.period_start=s and p.period_end=t and p.run_id is not null
        and not exists(select 1 from public.payroll_legacy_period_voids v where v.company_id=p.company_id and v.period_id=p.id))) into result;
  return result;
end $$;

create or replace function public.get_own_payroll_snapshot(c uuid,s date,t date) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare e text; result jsonb;
begin
  select u.employee_id into e from public.company_users u join public.companies co on co.id=u.company_id
    where u.company_id=c and u.user_id=auth.uid() and u.active and co.status='active';
  if e is null or e='' then raise exception 'Active linked employee access required' using errcode='42501'; end if;
  if not exists(select 1 from public.company_payroll_rules where company_id=c and payroll_history_enabled
    and (c<>'f50d8e62-3006-462e-b2a9-b1cf7c500394'::uuid or payroll_tr_parity_verified)) then raise exception 'Payroll history is not activated for this company'; end if;
  select jsonb_build_object('document_row',p.document_row,'company',r.company_snapshot,'rules',r.rules_snapshot)
    into result from public.employee_payroll_period_totals p join public.payroll_runs r on r.company_id=p.company_id and r.id=p.run_id
    where p.company_id=c and p.employee_id=e and p.period_start=s and p.period_end=t
      and not exists(select 1 from public.payroll_legacy_period_voids v where v.company_id=p.company_id and v.period_id=p.id);
  return result;
end $$;

create or replace function public.payroll_uif_month(c uuid,e text,t date) returns jsonb
language sql stable security definer set search_path=pg_catalog,public as $$
  select jsonb_build_object('employee_id',e,
    'ambiguous',coalesce(bool_or(p.uif_enabled is distinct from false and
      (p.employee_uif is null or p.employer_uif is null or p.uif_liable_remuneration is null)),false),
    'liable',coalesce(sum(p.uif_liable_remuneration) filter(where p.uif_enabled is distinct from false),0),
    'employee',coalesce(sum(p.employee_uif) filter(where p.uif_enabled is distinct from false),0),
    'employer',coalesce(sum(p.employer_uif) filter(where p.uif_enabled is distinct from false),0))
  from public.employee_payroll_period_totals p
  where p.company_id=c and p.employee_id=e
    and p.period_end>=date_trunc('month',t)::date
    and p.period_end<(date_trunc('month',t)+interval '1 month')::date
    and not exists(select 1 from public.payroll_legacy_period_voids v where v.company_id=p.company_id and v.period_id=p.id)
$$;

create or replace function public.save_employee_with_ytd(c uuid,e text,is_new boolean,details jsonb,targets jsonb,expected_revision text,request uuid) returns void
language plpgsql security definer set search_path=pg_catalog,public as $$
declare y date:=public.payroll_tax_year((now() at time zone 'Africa/Johannesburg')::date); ctx jsonb; k text; v numeric; old numeric; rules public.company_payroll_rules; cutoff date;
begin
  perform public.payroll_require_manager(c); perform public.payroll_lock(c);
  perform public.payroll_require_manager(c);
  if expected_revision is distinct from public.payroll_revision(c) then raise exception 'Employee or payroll changed. Reopen the employee before saving.' using errcode='40001'; end if;
  if request is null or targets is null or details is null or e is null or length(trim(e))=0 then raise exception 'Missing employee edit'; end if;
  if exists(select 1 from public.payroll_financial_events where company_id=c and request_id=request) then raise exception 'Employee edit already recorded; refresh'; end if;
  if (details->>'employee_id') is distinct from e or (details->>'company_id')::uuid is distinct from c then raise exception 'Employee/company mismatch'; end if;
  select * into rules from public.company_payroll_rules where company_id=c;
  if targets ? 'paye' or targets ? 'uif' then
    if coalesce(targets->>'as_at','') !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Explicit YTD as at date required'; end if;
    cutoff:=(targets->>'as_at')::date;
    if public.payroll_tax_year(cutoff)<>y then raise exception 'YTD as at must belong to the applicable tax year'; end if;
    if exists(select 1 from public.employee_payroll_ytd_opening_balances where company_id=c and employee_id=e and tax_year_start=y and as_of_date>cutoff) then
      raise exception 'YTD cutoff precedes the existing opening balance';
    end if;
    if exists(select 1 from public.employee_payroll_period_totals p
      where p.company_id=c and p.employee_id=e and p.tax_year_start=y and p.period_start<=cutoff and p.period_end>cutoff
        and not exists(select 1 from public.payroll_legacy_period_voids x where x.company_id=p.company_id and x.period_id=p.id)) then
      raise exception 'YTD cutoff falls inside a finalised payroll period; select a period boundary';
    end if;
    if exists(select 1 from public.payroll_financial_events where company_id=c and employee_id=e and tax_year_start=y
      and ytd_as_at>cutoff and targets ? value_type) then
      raise exception 'A later accountant YTD cutoff already exists; correct that cutoff instead';
    end if;
    ctx:=public.payroll_ytd_value(c,e,y,cutoff+1);
  end if;
  if is_new then
    insert into public.employees(company_id,employee_id,full_name) values(c,e,details->>'full_name');
  elsif not exists(select 1 from public.employees where company_id=c and employee_id=e) then raise exception 'Employee not found'; end if;
  if length(trim(coalesce(details->>'full_name','')))=0 then raise exception 'Employee name required'; end if;
  update public.employees set full_name=details->>'full_name',id_number=nullif(details->>'id_number',''),
    employment_date=(details->>'employment_date')::date,pay_type=details->>'pay_type',pay_cycle=details->>'pay_cycle',
    rate=(details->>'rate')::numeric,active=(details->>'active')::boolean,
    nbcei_designation_code=details->>'nbcei_designation_code',
    sbf_member=coalesce((details->>'sbf_member')::boolean,sbf_member),saewa_member=coalesce((details->>'saewa_member')::boolean,saewa_member)
    where company_id=c and employee_id=e;
  foreach k in array array['paye','uif'] loop
    if not targets ? k then continue; end if;
    if (k='paye' and not rules.calculate_paye) or (k='uif' and not rules.calculate_uif) then raise exception 'YTD setting is disabled'; end if;
    if targets->>k !~ '^\d{1,12}(\.\d{1,2})?$' then raise exception 'Invalid YTD amount'; end if;
    v:=(targets->>k)::numeric; old:=(ctx->>k)::numeric;
    insert into public.payroll_financial_events(company_id,employee_id,tax_year_start,request_id,kind,value_type,previous_value,target_value,delta,applies_after,ytd_as_at,reason,actor)
      values(c,e,y,request,'ytd_adjustment',k,old,v,v-old,cutoff,cutoff,coalesce(targets->>'reason',''),auth.uid());
  end loop;
end $$;

create or replace function public.finalise_payroll(c uuid,request uuid,payload jsonb) returns uuid
language plpgsql security definer set search_path=pg_catalog,public as $$
declare existing public.payroll_runs; run uuid; s date; t date; y date; rules public.company_payroll_rules;
  r jsonb; e public.employees; n integer; ctx jsonb; pn integer; paye numeric; uif numeric; retirement numeric; gross numeric;
begin
  perform public.payroll_require_manager(c);
  perform public.payroll_lock(c);
  perform public.payroll_require_manager(c);
  select * into existing from public.payroll_runs where company_id=c and request_id=request;
  if found then
    if existing.request_payload<>payload then raise exception 'Request ID already used for different payroll'; end if;
    return existing.id;
  end if;
  if request is null or payload is null then raise exception 'Missing finalisation request'; end if;
  s:=(payload->>'start')::date; t:=(payload->>'end')::date; y:=public.payroll_tax_year(t);
  if s is null or t is null or t<s then raise exception 'Invalid payroll dates'; end if;
  if public.payroll_tax_year(s)<>y then raise exception 'A payroll spanning two tax years cannot currently be finalised. Choose a period within a single tax year.'; end if;
  if payload->>'version' is distinct from 'payroll-snapshot-1' then raise exception 'Unsupported payroll snapshot version'; end if;
  if payload->>'revision' is distinct from public.payroll_revision(c) then raise exception 'Payroll inputs or history changed. Run Payroll again.' using errcode='40001'; end if;
  select * into rules from public.company_payroll_rules where company_id=c;
  if jsonb_typeof(payload->'rows') is distinct from 'array' then raise exception 'Payroll employees required'; end if;
  n:=jsonb_array_length(payload->'rows');
  if n<1 or n>5000 or n<>(select count(distinct x->>'employee_id') from jsonb_array_elements(payload->'rows') x) then raise exception 'Invalid or duplicate employees'; end if;
  if n<>(select count(*) from public.employees where company_id=c and active is distinct from false) then raise exception 'Finalise the entire active employee payroll run'; end if;
  if payload->'rules' is null or (payload->'rules'->>'calculate_paye')::boolean is distinct from rules.calculate_paye
    or (payload->'rules'->>'calculate_uif')::boolean is distinct from rules.calculate_uif then raise exception 'Payroll settings changed'; end if;
  if coalesce(payload->'company'->>'logo_url','')<>'' and
    coalesce(payload->'company'->>'logo_url','') !~ '^data:image/(png|jpeg|webp);base64,' then raise exception 'A frozen company logo is required'; end if;
  if (payload->'company'->>'id')::uuid is distinct from c then raise exception 'Company snapshot mismatch'; end if;
  if payload->'company'->>'name' is distinct from (select name from public.companies where id=c) then raise exception 'Company name changed. Reload the company before finalising.'; end if;
  insert into public.payroll_runs(company_id,request_id,period_start,period_end,tax_year_start,employee_count,
    snapshot_version,request_payload,source_revision,company_snapshot,rules_snapshot,levy_snapshot,finalised_by)
    values(c,request,s,t,y,n,payload->>'version',payload,payload->>'revision',payload->'company',payload->'rules',payload->'levy',auth.uid()) returning id into run;
  for r in select * from jsonb_array_elements(payload->'rows') loop
    select * into e from public.employees where company_id=c and employee_id=r->>'employee_id';
    if not found then raise exception 'Employee does not belong to this company'; end if;
    if e.active is false then raise exception 'Inactive employee in payroll run'; end if;
    if exists(select 1 from public.employee_payroll_period_totals p
      where p.company_id=c and p.employee_id=e.employee_id and p.period_start<=t and p.period_end>=s
        and not exists(select 1 from public.payroll_legacy_period_voids v where v.company_id=p.company_id and v.period_id=p.id)) then
      raise exception 'Duplicate or overlapping finalised payroll for employee %',e.employee_id;
    end if;
    ctx:=public.payroll_ytd_value(c,e.employee_id,y,s);
    pn:=1+(ctx->>'completed_periods')::int+(ctx->>'finalized_periods')::int;
    if c='f50d8e62-3006-462e-b2a9-b1cf7c500394'::uuid and e.pay_cycle='monthly' and (ctx->>'has_opening')::boolean and
      (coalesce((r->'document_row'->>'rate')::numeric,0)>0 or (r->>'gross_remuneration')::numeric>0) and
      pn-1 <> ((extract(year from t)-extract(year from y))*12+extract(month from t)-3)::int then
      raise exception 'TR cumulative PAYE completed-period continuity mismatch';
    end if;
    if pn>52 then raise exception 'This payroll exceeds the supported completed-period count'; end if;
    if jsonb_typeof(r->'document_row') is distinct from 'object' or r->'document_row'->>'employee_id' is distinct from e.employee_id then raise exception 'Employee snapshot mismatch'; end if;
    if jsonb_typeof(r->'document_row'->'deductions') is distinct from 'array' then raise exception 'Snapshot deductions required'; end if;
    if exists(select 1 from jsonb_array_elements(r->'document_row'->'deductions') d
      where jsonb_typeof(d->'amount') is distinct from 'number' or (d->>'amount')::numeric<0 or (d->>'amount')::numeric>=1e12
      or d->>'active'='false') then raise exception 'Invalid snapshot deduction'; end if;
    foreach gross in array array[(r->>'gross_remuneration')::numeric,(r->>'paye_deducted')::numeric,(r->>'employee_uif')::numeric,(r->>'retirement_fund_contributions')::numeric] loop
      if gross is null or gross<0 or gross>=1e12 or gross<>round(gross,2) then raise exception 'Invalid financial amount'; end if;
    end loop;
    gross:=(r->>'gross_remuneration')::numeric; paye:=(r->>'paye_deducted')::numeric;
    uif:=(r->>'employee_uif')::numeric; retirement:=(r->>'retirement_fund_contributions')::numeric;
    if retirement is distinct from (select round(coalesce(sum((d->>'amount')::numeric),0),2) from jsonb_array_elements(r->'document_row'->'deductions') d where lower(d->>'description')='provident') then raise exception 'Retirement snapshot mismatch'; end if;
    if gross is distinct from round((r->'document_row'->>'gross')::numeric,2) then raise exception 'Snapshot gross differs from payroll total'; end if;
    if (not rules.calculate_paye and paye<>0) or (not rules.calculate_uif and uif<>0) then raise exception 'Disabled statutory contribution'; end if;
    if rules.calculate_paye and paye is distinct from (select round(coalesce(sum((d->>'amount')::numeric),0),2) from jsonb_array_elements(r->'document_row'->'deductions') d where lower(d->>'description')='tax') then raise exception 'PAYE snapshot mismatch'; end if;
    if rules.calculate_uif and uif is distinct from (select round(coalesce(sum((d->>'amount')::numeric),0),2) from jsonb_array_elements(r->'document_row'->'deductions') d where lower(d->>'description')='uif') then raise exception 'UIF snapshot mismatch'; end if;
    insert into public.employee_payroll_period_totals(company_id,employee_id,tax_year_start,period_start,period_end,period_number,gross_remuneration,retirement_fund_contributions,paye_deducted,employee_uif,paye_enabled,uif_enabled,run_id,document_row,finalized_by)
      values(c,e.employee_id,y,s,t,pn,gross,retirement,paye,uif,rules.calculate_paye,rules.calculate_uif,run,r->'document_row',auth.uid());
  end loop;
  return run;
end $$;

commit;
