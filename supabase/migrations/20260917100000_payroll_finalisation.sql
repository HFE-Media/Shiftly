-- LOCAL PREPARATION ONLY. Never replay historical payroll migrations to install this.
-- Existing monetary rows are not backfilled, reinterpreted, or recalculated.
begin;

alter table public.company_payroll_rules
  add column payroll_history_enabled boolean not null default false,
  add column payroll_tr_parity_verified boolean not null default false;
alter table public.employee_payroll_ytd_opening_balances
  add column employee_uif numeric(14,2) check (employee_uif >= 0);

create table public.payroll_runs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  request_id uuid not null,
  period_start date not null,
  period_end date not null check (period_end >= period_start),
  tax_year_start date not null,
  employee_count integer not null check (employee_count > 0),
  status text not null default 'finalised' check (status = 'finalised'),
  snapshot_version text not null check (snapshot_version = 'payroll-snapshot-1'),
  request_payload jsonb not null,
  source_revision text not null,
  company_snapshot jsonb not null,
  rules_snapshot jsonb not null,
  levy_snapshot jsonb,
  finalised_by uuid not null references auth.users(id),
  finalised_at timestamptz not null default now(),
  unique(company_id, request_id), unique(company_id, id)
);
alter table public.employee_payroll_period_totals
  add column run_id uuid,
  add column employee_uif numeric(14,2) check (employee_uif >= 0),
  add column paye_enabled boolean,
  add column uif_enabled boolean,
  add column document_row jsonb,
  add constraint payroll_period_identity unique(company_id,employee_id,tax_year_start,id),
  add constraint payroll_period_run_company_fk foreign key (company_id, run_id)
    references public.payroll_runs(company_id, id),
  add constraint payroll_snapshot_complete check (run_id is null or
    (employee_uif is not null and paye_enabled is not null and uif_enabled is not null and document_row is not null));

create table public.payroll_financial_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  employee_id text not null,
  tax_year_start date not null,
  request_id uuid not null,
  kind text not null check (kind in ('ytd_adjustment','period_correction')),
  value_type text not null check (value_type in ('paye','uif','gross','retirement')),
  previous_value numeric(14,2) not null,
  target_value numeric(14,2) not null check (target_value >= 0),
  delta numeric(14,2) not null,
  applies_after date not null,
  period_id uuid,
  corrected_snapshot jsonb,
  reason text not null default '',
  actor uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  foreign key(company_id,employee_id,tax_year_start,period_id)
    references public.employee_payroll_period_totals(company_id,employee_id,tax_year_start,id),
  check (delta = target_value - previous_value),
  check ((kind='ytd_adjustment' and value_type in ('paye','uif') and period_id is null and corrected_snapshot is null)
    or (kind='period_correction' and period_id is not null and corrected_snapshot is not null)),
  unique(company_id,request_id,value_type)
);
create index payroll_events_employee_year on public.payroll_financial_events(company_id,employee_id,tax_year_start);

create function public.payroll_tax_year(d date) returns date
language sql immutable strict set search_path=pg_catalog as $$
  select make_date(extract(year from d)::int - case when extract(month from d)<3 then 1 else 0 end,3,1)
$$;

create function public.payroll_is_manager(c uuid) returns boolean
language sql stable security definer set search_path=pg_catalog,public as $$
  select exists(select 1 from public.company_users u join public.companies co on co.id=u.company_id
    where u.company_id=c and u.user_id=auth.uid() and u.active and u.role in ('owner','admin') and co.status='active')
$$;
create function public.payroll_can_read_employee(c uuid,e text) returns boolean
language sql stable security definer set search_path=pg_catalog,public as $$
  select public.payroll_is_manager(c) or exists(select 1 from public.company_users u join public.companies co on co.id=u.company_id
    where u.company_id=c and u.user_id=auth.uid() and u.active and u.employee_id=e and co.status='active')
$$;
create function public.payroll_require_manager(c uuid) returns void
language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  if not public.payroll_is_manager(c) then raise exception 'Payroll owner/admin access required' using errcode='42501'; end if;
  if not exists(select 1 from public.company_payroll_rules where company_id=c and payroll_history_enabled
    and (c <> 'f50d8e62-3006-462e-b2a9-b1cf7c500394'::uuid or payroll_tr_parity_verified)) then
    raise exception 'Payroll history is not activated for this company';
  end if;
end $$;

create function public.payroll_lock(c uuid) returns void language sql volatile
set search_path=pg_catalog as $$select pg_advisory_xact_lock(hashtextextended('shiftly-payroll:'||c::text,0))$$;

-- This is a source-change detector, NOT a substitute for tax-engine certification.
create function public.payroll_revision(c uuid) returns text
language sql stable security definer set search_path=pg_catalog,public as $$
 select md5(jsonb_build_array(
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
 )::text)
$$;

create function public.payroll_ytd_value(c uuid,e text,y date,cutoff date) returns jsonb
language sql stable security definer set search_path=pg_catalog,public as $$
 with o as (select * from public.employee_payroll_ytd_opening_balances
   where company_id=c and employee_id=e and tax_year_start=y and as_of_date<cutoff),
 p as (select * from public.employee_payroll_period_totals
   where company_id=c and employee_id=e and tax_year_start=y and period_end<cutoff
     and period_end>coalesce((select as_of_date from o),y-1)),
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

create function public.get_payroll_history(c uuid,s date,t date) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare result jsonb;
begin
  perform public.payroll_require_manager(c);
  if s is null or t is null or s>t then raise exception 'Invalid payroll dates'; end if;
  select jsonb_build_object('revision',public.payroll_revision(c),
    'employees',(select coalesce(jsonb_agg(public.payroll_ytd_value(c,e.employee_id,public.payroll_tax_year(t),s)),'[]') from public.employees e where e.company_id=c),
    'run',(select to_jsonb(r)-'request_payload' from public.payroll_runs r where company_id=c and period_start=s and period_end=t order by finalised_at desc limit 1),
    'periods',(select coalesce(jsonb_agg(to_jsonb(p) order by employee_id),'[]') from public.employee_payroll_period_totals p where company_id=c and period_start=s and period_end=t and run_id is not null)) into result;
  return result;
end $$;

-- Employee reprints expose only the authenticated member's own frozen row.
create function public.get_own_payroll_snapshot(c uuid,s date,t date) returns jsonb
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
    where p.company_id=c and p.employee_id=e and p.period_start=s and p.period_end=t;
  return result;
end $$;

create function public.finalise_payroll(c uuid,request uuid,payload jsonb) returns uuid
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
  -- The rendered snapshot must freeze the logo, never a mutable remote asset URL.
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
    if exists(select 1 from public.employee_payroll_period_totals p where p.company_id=c and p.employee_id=e.employee_id and p.period_start<=t and p.period_end>=s) then
      raise exception 'Duplicate or overlapping finalised payroll for employee %',e.employee_id;
    end if;
    ctx:=public.payroll_ytd_value(c,e.employee_id,y,s);
    pn:=1+(ctx->>'completed_periods')::int+(ctx->>'finalized_periods')::int;
    -- Preserve the existing TR monthly expectation, not a new generic calendar.
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

create function public.get_employee_payroll_ytd(c uuid,e text,y date) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public as $$
begin
  perform public.payroll_require_manager(c);
  if y is distinct from public.payroll_tax_year((now() at time zone 'Africa/Johannesburg')::date) then raise exception 'Employee editing is limited to the current tax year'; end if;
  return public.payroll_ytd_value(c,e,y,(y+interval '1 year')::date) || jsonb_build_object('revision',public.payroll_revision(c),'tax_year_start',y);
end $$;

-- Employee details and both YTD edits share a transaction. No partial employee/YTD save.
create function public.save_employee_with_ytd(c uuid,e text,is_new boolean,details jsonb,targets jsonb,expected_revision text,request uuid) returns void
language plpgsql security definer set search_path=pg_catalog,public as $$
declare y date:=public.payroll_tax_year((now() at time zone 'Africa/Johannesburg')::date); ctx jsonb; k text; v numeric; old numeric; rules public.company_payroll_rules;
begin
  perform public.payroll_require_manager(c); perform public.payroll_lock(c);
  perform public.payroll_require_manager(c);
  if expected_revision is distinct from public.payroll_revision(c) then raise exception 'Employee or payroll changed. Reopen the employee before saving.' using errcode='40001'; end if;
  if request is null or targets is null or details is null or e is null or length(trim(e))=0 then raise exception 'Missing employee edit'; end if;
  if exists(select 1 from public.payroll_financial_events where company_id=c and request_id=request) then raise exception 'Employee edit already recorded; refresh'; end if;
  if (details->>'employee_id') is distinct from e or (details->>'company_id')::uuid is distinct from c then raise exception 'Employee/company mismatch'; end if;
  select * into rules from public.company_payroll_rules where company_id=c;
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
  ctx:=public.payroll_ytd_value(c,e,y,(y+interval '1 year')::date);
  foreach k in array array['paye','uif'] loop
    if not targets ? k then continue; end if;
    if (k='paye' and not rules.calculate_paye) or (k='uif' and not rules.calculate_uif) then raise exception 'YTD setting is disabled'; end if;
    if targets->>k !~ '^\d{1,12}(\.\d{1,2})?$' then raise exception 'Invalid YTD amount'; end if;
    v:=(targets->>k)::numeric; old:=(ctx->>k)::numeric;
    -- Zero delta is retained when explicitly supplied: distinguishes confirmed zero.
    insert into public.payroll_financial_events(company_id,employee_id,tax_year_start,request_id,kind,value_type,previous_value,target_value,delta,applies_after,reason,actor)
      values(c,e,y,request,'ytd_adjustment',k,old,v,v-old,(ctx->>'adjustment_cutoff')::date,coalesce(targets->>'reason',''),auth.uid());
  end loop;
end $$;

create function public.payroll_immutable() returns trigger language plpgsql set search_path=pg_catalog as $$
begin raise exception 'Finalised payroll history is immutable; use an audited correction'; end $$;
create trigger payroll_runs_immutable before update or delete on public.payroll_runs for each row execute function public.payroll_immutable();
create trigger payroll_periods_immutable before update or delete on public.employee_payroll_period_totals for each row execute function public.payroll_immutable();
create trigger payroll_events_immutable before update or delete on public.payroll_financial_events for each row execute function public.payroll_immutable();
create trigger payroll_openings_immutable before update or delete on public.employee_payroll_ytd_opening_balances for each row execute function public.payroll_immutable();

-- Retain legacy data but close the old direct-upsert/document write surface.
revoke insert,update,delete,truncate,references,trigger on public.employee_payroll_period_totals,public.employee_payroll_ytd_opening_balances from anon,authenticated;
revoke all on public.payroll_runs,public.payroll_financial_events from anon,authenticated;
alter table public.payroll_runs enable row level security;
alter table public.payroll_financial_events enable row level security;
drop policy "company admins can manage payroll period totals" on public.employee_payroll_period_totals;
drop policy "company users can view payroll period totals" on public.employee_payroll_period_totals;
drop policy "company admins can manage payroll ytd opening balances" on public.employee_payroll_ytd_opening_balances;
drop policy "company users can view payroll ytd opening balances" on public.employee_payroll_ytd_opening_balances;
create policy payroll_period_read on public.employee_payroll_period_totals for select to authenticated using(public.payroll_can_read_employee(company_id,employee_id));
create policy payroll_opening_read on public.employee_payroll_ytd_opening_balances for select to authenticated using(public.payroll_can_read_employee(company_id,employee_id));
-- Run headers contain all employees' payloads. Never grant employees direct header access.
create policy payroll_run_read on public.payroll_runs for select to authenticated using(public.payroll_is_manager(company_id));
create policy payroll_event_read on public.payroll_financial_events for select to authenticated using(public.payroll_can_read_employee(company_id,employee_id));
grant select on public.payroll_runs,public.payroll_financial_events,public.employee_payroll_period_totals,public.employee_payroll_ytd_opening_balances to authenticated;

create function public.payroll_protect_activation() returns trigger language plpgsql set search_path=pg_catalog as $$
begin
  if current_user not in ('postgres','service_role','supabase_admin') and
    ((tg_op='INSERT' and (new.payroll_history_enabled or new.payroll_tr_parity_verified)) or
     (tg_op='UPDATE' and (new.payroll_history_enabled is distinct from old.payroll_history_enabled or new.payroll_tr_parity_verified is distinct from old.payroll_tr_parity_verified))) then
    raise exception 'Payroll activation requires an approved release';
  end if; return new;
end $$;
create trigger payroll_activation_guard before insert or update on public.company_payroll_rules for each row execute function public.payroll_protect_activation();

-- Explicit ACLs: definer helpers are not public RPC shortcuts around authorization.
revoke all on function public.payroll_revision(uuid),public.payroll_ytd_value(uuid,text,date,date),public.payroll_lock(uuid),public.payroll_require_manager(uuid),
  public.get_own_payroll_snapshot(uuid,date,date),
  public.finalise_payroll(uuid,uuid,jsonb),public.get_payroll_history(uuid,date,date),public.get_employee_payroll_ytd(uuid,text,date),
  public.save_employee_with_ytd(uuid,text,boolean,jsonb,jsonb,text,uuid) from public,anon,authenticated;
grant execute on function public.get_payroll_history(uuid,date,date),public.get_employee_payroll_ytd(uuid,text,date),
  public.get_own_payroll_snapshot(uuid,date,date),
  public.save_employee_with_ytd(uuid,text,boolean,jsonb,jsonb,text,uuid) to authenticated;
revoke all on function public.payroll_is_manager(uuid),public.payroll_can_read_employee(uuid,text),public.payroll_tax_year(date) from public,anon;
grant execute on function public.payroll_is_manager(uuid),public.payroll_can_read_employee(uuid,text),public.payroll_tax_year(date) to authenticated;
-- Every material writer shares the finalisation lock. A writer which wins first
-- commits before revision validation; a later writer cannot commit before payroll.
create function public.payroll_input_lock() returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
declare previous uuid; following uuid; target uuid;
begin
  if tg_op<>'INSERT' then previous:=(to_jsonb(old)->>case when tg_table_name='companies' then 'id' else 'company_id' end)::uuid; end if;
  if tg_op<>'DELETE' then following:=(to_jsonb(new)->>case when tg_table_name='companies' then 'id' else 'company_id' end)::uuid; end if;
  for target in select distinct x from unnest(array[previous,following]) x where x is not null order by x loop
    perform public.payroll_lock(target);
  end loop;
  if tg_op='DELETE' then return old; end if; return new;
end $$;
do $$ declare tab text; begin
  foreach tab in array array['companies','company_users','employees','company_payroll_rules','company_deduction_types',
    'clock_events','payroll_deductions','payroll_adjustments','company_payroll_levy_periods',
    'employee_payroll_ytd_opening_balances','employee_payroll_period_totals','payroll_financial_events'] loop
    execute format('create trigger payroll_material_input_lock before insert or update or delete on public.%I for each row execute function public.payroll_input_lock()',tab);
    execute format('revoke truncate on public.%I from anon,authenticated',tab);
  end loop;
end $$;

create function public.get_payroll_calculation_inputs(c uuid,s date,t date) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public as $$
begin
  perform public.payroll_require_manager(c);
  if s is null or t is null or s>t then raise exception 'Invalid payroll dates'; end if;
  return jsonb_build_object(
    'company',(select jsonb_build_object('id',id,'name',name,'logo_url',logo_url) from public.companies where id=c),
    'rules',(select to_jsonb(r) from public.company_payroll_rules r where company_id=c),
    'employees',(select coalesce(jsonb_agg(to_jsonb(e)-array['face_descriptor','face_photo_path','face_photo_url','face_enrolled_at'] order by employee_id),'[]') from public.employees e where company_id=c),
    'deductionTypes',(select coalesce(jsonb_agg(to_jsonb(d) order by id),'[]') from public.company_deduction_types d where company_id=c and active),
    'events',(select coalesce(jsonb_agg(jsonb_build_object('entry_id',entry_id,'created_at',created_at,'action',action,'employee_id',employee_id,'employee_name',employee_name,'result',result,'message',message) order by created_at,entry_id),'[]') from public.clock_events where company_id=c and created_at>=s::timestamp at time zone 'Africa/Johannesburg' and created_at<(t+1)::timestamp at time zone 'Africa/Johannesburg'),
    'deductions',(select coalesce(jsonb_agg(to_jsonb(d) order by id),'[]') from public.payroll_deductions d where company_id=c and period_start=s and period_end=t),
    'adjustments',(select coalesce(jsonb_agg(to_jsonb(a) order by id),'[]') from public.payroll_adjustments a where company_id=c and period_start=s and period_end=t),
    'levy',(select to_jsonb(l) from public.company_payroll_levy_periods l where company_id=c and period_start=s and period_end=t and levy_scheme='nbcei'),
    'history',public.get_payroll_history(c,s,t));
end $$;
create function public.get_payroll_request(c uuid,request uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public as $$
begin
  perform public.payroll_require_manager(c);
  return (select jsonb_build_object('id',id,'confirmation',request_payload->>'confirmation') from public.payroll_runs where company_id=c and request_id=request);
end $$;
create function public.commit_trusted_payroll(c uuid,request uuid,payload jsonb,actor uuid) returns uuid
language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  if actor is null then raise exception 'Verified actor required'; end if;
  perform set_config('request.jwt.claim.sub',actor::text,true);
  return public.finalise_payroll(c,request,payload);
end $$;
create function public.get_own_payroll_ytd(c uuid,s date,t date) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare e text;
begin
  select employee_id into e from public.company_users where company_id=c and user_id=auth.uid() and active;
  if e is null or not public.payroll_can_read_employee(c,e) then raise exception 'Linked employee access required'; end if;
  if not exists(select 1 from public.company_payroll_rules where company_id=c and payroll_history_enabled
    and (c<>'f50d8e62-3006-462e-b2a9-b1cf7c500394'::uuid or payroll_tr_parity_verified)) then raise exception 'Payroll history not activated'; end if;
  return public.payroll_ytd_value(c,e,public.payroll_tax_year(t),s);
end $$;
revoke all on function public.payroll_input_lock(),public.get_payroll_calculation_inputs(uuid,date,date),public.get_payroll_request(uuid,uuid),
 public.commit_trusted_payroll(uuid,uuid,jsonb,uuid),public.get_own_payroll_ytd(uuid,date,date) from public,anon,authenticated;
grant execute on function public.get_payroll_calculation_inputs(uuid,date,date),public.get_payroll_request(uuid,uuid),public.get_own_payroll_ytd(uuid,date,date) to authenticated;
grant execute on function public.commit_trusted_payroll(uuid,uuid,jsonb,uuid) to service_role;
commit;
