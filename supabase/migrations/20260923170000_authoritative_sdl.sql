-- Phase 3: authoritative Skills Development Levy calculation, evidence and history.
-- Existing payroll rows are deliberately not backfilled or reinterpreted.
begin;

alter table public.company_payroll_rules
  add column calculate_sdl boolean not null default false,
  add column sdl_effective_from date;

create table public.company_payroll_sdl_configurations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  effective_from date not null,
  effective_to date,
  enabled boolean not null,
  reason text not null default '',
  recorded_by uuid not null references auth.users(id),
  recorded_at timestamptz not null default now(),
  check(effective_to is null or effective_to>effective_from),
  unique(company_id,effective_from)
);

create table public.employee_payroll_sdl_circumstances (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  employee_id text not null,
  effective_from date not null,
  effective_to date,
  circumstance text not null check(circumstance in ('standard','section_18_3_learner')),
  evidence_reference text,
  recorded_by uuid not null references auth.users(id),
  recorded_at timestamptz not null default now(),
  foreign key(company_id,employee_id) references public.employees(company_id,employee_id),
  check(effective_to is null or effective_to>effective_from),
  check(circumstance='standard' or length(trim(coalesce(evidence_reference,'')))>0),
  unique(company_id,employee_id,effective_from)
);

create table public.payroll_sdl_rates (
  id uuid primary key,
  rate_version text not null unique,
  effective_from date not null,
  effective_to date not null,
  rate numeric(7,6) not null check(rate=0.010000),
  authority_document text not null,
  authority_url text not null check(authority_url like 'https://www.sars.gov.za/%'),
  created_at timestamptz not null default now(),
  check(effective_to>effective_from)
);

insert into public.payroll_sdl_rates(id,rate_version,effective_from,effective_to,rate,authority_document,authority_url)
values('29800aa5-48d2-41a5-8826-73ad1b0f4260','za-sdl-1pct-2027','2026-03-01','2027-03-01',0.01,
  'PAYE-GEN-01-G21 Guide for Employers in respect of Employees Tax 2027',
  'https://www.sars.gov.za/guide-for-employers-in-respect-of-employees-tax-2027/');

create function public.payroll_sdl_reject_overlap() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  if tg_table_name='company_payroll_sdl_configurations' then
    if exists(select 1 from public.company_payroll_sdl_configurations x where x.company_id=new.company_id and x.id<>new.id
      and daterange(x.effective_from,x.effective_to,'[)')&&daterange(new.effective_from,new.effective_to,'[)')) then
      raise exception 'Company SDL configuration effective ranges may not overlap';
    end if;
    return new;
  end if;
  if tg_table_name='employee_payroll_sdl_circumstances' then
    if exists(select 1 from public.employee_payroll_sdl_circumstances x where x.company_id=new.company_id and x.employee_id=new.employee_id and x.id<>new.id
      and daterange(x.effective_from,x.effective_to,'[)')&&daterange(new.effective_from,new.effective_to,'[)')) then
      raise exception 'Employee SDL circumstance effective ranges may not overlap';
    end if;
    return new;
  end if;
  if tg_table_name='payroll_sdl_rates' then
    if exists(select 1 from public.payroll_sdl_rates x where x.id<>new.id
      and daterange(x.effective_from,x.effective_to,'[)')&&daterange(new.effective_from,new.effective_to,'[)')) then
      raise exception 'SDL rate effective ranges may not overlap';
    end if;
  end if;
  return new;
end $$;
create trigger company_sdl_no_overlap before insert or update on public.company_payroll_sdl_configurations for each row execute function public.payroll_sdl_reject_overlap();
create trigger employee_sdl_no_overlap before insert or update on public.employee_payroll_sdl_circumstances for each row execute function public.payroll_sdl_reject_overlap();
create trigger sdl_rate_no_overlap before insert or update on public.payroll_sdl_rates for each row execute function public.payroll_sdl_reject_overlap();

create function public.payroll_record_company_sdl_configuration() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  if tg_op='INSERT' and not new.calculate_sdl then return new; end if;
  if tg_op='UPDATE' and new.calculate_sdl is not distinct from old.calculate_sdl then return new; end if;
  if new.sdl_effective_from is null then raise exception 'SDL effective date is required'; end if;
  perform public.payroll_lock(new.company_id);
  if exists(select 1 from public.employee_payroll_period_totals p where p.company_id=new.company_id
    and p.period_start<new.sdl_effective_from and p.period_end>=new.sdl_effective_from and p.run_id is not null
    and not exists(select 1 from public.payroll_legacy_period_voids v where v.company_id=p.company_id and v.period_id=p.id)) then
    raise exception 'SDL effective date falls inside a finalised payroll period';
  end if;
  if exists(select 1 from public.company_payroll_sdl_configurations x where x.company_id=new.company_id and x.effective_from>=new.sdl_effective_from) then
    raise exception 'SDL effective date must follow the latest recorded configuration';
  end if;
  update public.company_payroll_sdl_configurations set effective_to=new.sdl_effective_from
    where company_id=new.company_id and effective_to is null;
  insert into public.company_payroll_sdl_configurations(company_id,effective_from,enabled,reason,recorded_by)
    values(new.company_id,new.sdl_effective_from,new.calculate_sdl,'Payroll Rules SDL applicability change',auth.uid());
  return new;
end $$;
create trigger record_company_sdl_configuration after insert or update of calculate_sdl
on public.company_payroll_rules for each row execute function public.payroll_record_company_sdl_configuration();

alter table public.payroll_item_classifications drop constraint payroll_item_classifications_calculation_status_check;
alter table public.payroll_item_classifications add constraint payroll_item_classifications_calculation_status_check
  check(calculation_status in ('metadata_only','payroll_active'));
update public.payroll_item_classifications set calculation_status='payroll_active'
where statutory_category in ('employee_pension_fund_contribution','employee_provident_fund_contribution','employee_retirement_annuity_fund_contribution');

alter table public.company_deduction_types
  add column payroll_item_definition_id uuid references public.payroll_item_definitions(id);
update public.company_deduction_types d set payroll_item_definition_id=x.id
from public.payroll_item_definitions x
where x.item_key=case
  when lower(trim(d.name)) in ('provident','provident fund','provident fund contribution') then 'provident_fund_contribution'
  when lower(trim(d.name)) in ('tools/ppe','tools & ppe','tools') then 'tools_ppe'
  when lower(trim(d.name))='fine' then 'fine'
  when lower(trim(d.name)) in ('loan','loan repayment') then 'loan'
end and lower(trim(d.name)) in ('provident','provident fund','provident fund contribution','tools/ppe','tools & ppe','tools','fine','loan','loan repayment');

alter table public.employee_payroll_period_totals
  add column sdl_enabled boolean,
  add column sdl_leviable_remuneration numeric(14,2) check(sdl_leviable_remuneration>=0),
  add column sdl_amount numeric(14,2) check(sdl_amount>=0),
  add column sdl_rate numeric(7,6),
  add column sdl_rate_version text,
  add column sdl_configuration_id uuid references public.company_payroll_sdl_configurations(id),
  add column sdl_circumstance jsonb,
  add column sdl_classifications jsonb;

alter table public.payroll_financial_events drop constraint payroll_financial_events_value_type_check;
alter table public.payroll_financial_events add constraint payroll_financial_events_value_type_check
  check(value_type in ('paye','uif','gross','retirement','sdl'));
alter table public.payroll_financial_events drop constraint payroll_financial_events_check1;
alter table public.payroll_financial_events add constraint payroll_financial_events_check1 check(
  (kind='ytd_adjustment' and value_type in ('paye','uif','gross','sdl') and period_id is null and corrected_snapshot is null)
  or (kind='period_correction' and period_id is not null and corrected_snapshot is not null));

alter table public.company_payroll_sdl_configurations enable row level security;
alter table public.employee_payroll_sdl_circumstances enable row level security;
alter table public.payroll_sdl_rates enable row level security;
create policy company_sdl_read on public.company_payroll_sdl_configurations for select to authenticated using(public.payroll_is_manager(company_id));
create policy employee_sdl_read on public.employee_payroll_sdl_circumstances for select to authenticated using(public.payroll_can_read_employee(company_id,employee_id));
create policy sdl_rate_read on public.payroll_sdl_rates for select to authenticated using(true);
revoke all on public.company_payroll_sdl_configurations,public.employee_payroll_sdl_circumstances,public.payroll_sdl_rates from public,anon,authenticated;
grant select on public.company_payroll_sdl_configurations,public.employee_payroll_sdl_circumstances,public.payroll_sdl_rates to authenticated;
revoke all on function public.payroll_sdl_reject_overlap(),public.payroll_record_company_sdl_configuration() from public,anon,authenticated;

commit;

begin;

create or replace function public.get_payroll_report(c uuid,r_id uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare selected public.payroll_runs; cutoff date; monthly_rows jsonb; ytd_rows jsonb; missing_identity text; sdl_supported boolean;
begin
  perform public.payroll_require_manager(c);
  select * into selected from public.payroll_runs r where r.company_id=c and r.id=r_id and r.status='finalised';
  if selected.id is null then raise exception 'Finalised payroll period not found' using errcode='42501'; end if;
  cutoff:=selected.period_end+1;
  if (select count(*) from public.employee_payroll_period_totals p where p.company_id=c and p.run_id=selected.id)<>selected.employee_count then raise exception 'Finalised payroll snapshot is incomplete'; end if;
  if exists(select 1 from public.employee_payroll_period_totals p where p.company_id=c and p.run_id=selected.id and p.uif_enabled
    and (p.employee_uif is null or p.employer_uif is null or p.uif_liable_remuneration is null)) then raise exception 'Finalised payroll is missing authoritative UIF reporting values'; end if;
  select bool_and(p.sdl_enabled is not null and p.sdl_amount is not null and p.sdl_leviable_remuneration is not null)
    into sdl_supported from public.employee_payroll_period_totals p where p.company_id=c and p.run_id=selected.id;
  select coalesce(jsonb_agg(jsonb_build_object(
    'employee_id',p.employee_id,'employee_name',p.document_row->>'employee_name','id_number',p.document_row->>'id_number',
    'gross',p.gross_remuneration,'paye',case when p.paye_enabled then p.paye_deducted else 0 end,
    'uif_combined',case when p.uif_enabled then p.employee_uif+p.employer_uif else 0 end,
    'sdl',case when p.sdl_enabled then p.sdl_amount else 0 end,
    'paye_applicable',p.paye_enabled,'uif_applicable',p.uif_enabled,'sdl_applicable',p.sdl_enabled
  ) order by p.employee_id),'[]') into monthly_rows
  from public.employee_payroll_period_totals p where p.company_id=c and p.run_id=selected.id
    and not exists(select 1 from public.payroll_legacy_period_voids v where v.company_id=p.company_id and v.period_id=p.id);

  with ids as (
    select o.employee_id from public.employee_payroll_ytd_opening_balances o where o.company_id=c and o.tax_year_start=selected.tax_year_start and o.as_of_date<cutoff
    union select p.employee_id from public.employee_payroll_period_totals p where p.company_id=c and p.tax_year_start=selected.tax_year_start and p.period_end<cutoff and p.run_id is not null
      and not exists(select 1 from public.payroll_legacy_period_voids v where v.company_id=p.company_id and v.period_id=p.id)
    union select a.employee_id from public.payroll_financial_events a where a.company_id=c and a.tax_year_start=selected.tax_year_start and a.applies_after<cutoff
  ), identities as (
    select distinct on(p.employee_id) p.employee_id,p.document_row from public.employee_payroll_period_totals p
    where p.company_id=c and p.tax_year_start=selected.tax_year_start and p.period_end<cutoff and p.run_id is not null
      and not exists(select 1 from public.payroll_legacy_period_voids v where v.company_id=p.company_id and v.period_id=p.id)
    order by p.employee_id,p.period_end desc,p.finalized_at desc,p.id desc
  ) select string_agg(i.employee_id,',' order by i.employee_id) into missing_identity from ids i left join identities x using(employee_id) where x.employee_id is null;
  if missing_identity is not null then raise exception 'Historical employee snapshot unavailable for YTD report: %',missing_identity; end if;

  with ids as (
    select o.employee_id from public.employee_payroll_ytd_opening_balances o where o.company_id=c and o.tax_year_start=selected.tax_year_start and o.as_of_date<cutoff
    union select p.employee_id from public.employee_payroll_period_totals p where p.company_id=c and p.tax_year_start=selected.tax_year_start and p.period_end<cutoff and p.run_id is not null
      and not exists(select 1 from public.payroll_legacy_period_voids v where v.company_id=p.company_id and v.period_id=p.id)
    union select a.employee_id from public.payroll_financial_events a where a.company_id=c and a.tax_year_start=selected.tax_year_start and a.applies_after<cutoff
  ), identities as (
    select distinct on(p.employee_id) p.employee_id,p.document_row from public.employee_payroll_period_totals p
    where p.company_id=c and p.tax_year_start=selected.tax_year_start and p.period_end<cutoff and p.run_id is not null
      and not exists(select 1 from public.payroll_legacy_period_voids v where v.company_id=p.company_id and v.period_id=p.id)
    order by p.employee_id,p.period_end desc,p.finalized_at desc,p.id desc
  ) select coalesce(jsonb_agg(jsonb_build_object(
    'employee_id',i.employee_id,'employee_name',x.document_row->>'employee_name','id_number',x.document_row->>'id_number',
    'gross',(y.value->>'gross')::numeric,'paye',case when (y.value->>'paye_supplied')::boolean then (y.value->>'paye')::numeric else 0 end,
    'uif_combined',case when (y.value->>'uif_supplied')::boolean then (y.value->>'uif')::numeric*2 else 0 end,
    'sdl',(y.value->>'sdl')::numeric,'paye_applicable',(y.value->>'paye_supplied')::boolean,
    'uif_applicable',(y.value->>'uif_supplied')::boolean,'sdl_applicable',(y.value->>'sdl_supplied')::boolean
  ) order by i.employee_id),'[]') into ytd_rows from ids i join identities x using(employee_id)
  cross join lateral(select public.payroll_ytd_value(c,i.employee_id,selected.tax_year_start,cutoff) value)y;

  return jsonb_build_object('run',jsonb_build_object('id',selected.id,'period_start',selected.period_start,'period_end',selected.period_end,
    'tax_year_start',selected.tax_year_start,'finalised_at',selected.finalised_at,'company',selected.company_snapshot,'rules',selected.rules_snapshot),
    'monthly',monthly_rows,'ytd',ytd_rows,'sdl_supported',coalesce(sdl_supported,false),'eti_supported',false);
end $$;

revoke all on function public.get_payroll_report(uuid,uuid) from public,anon;
grant execute on function public.get_payroll_report(uuid,uuid) to authenticated;

commit;

begin;

create or replace function public.payroll_validate_dynamic_item() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$
declare expected_type text; definition public.payroll_item_definitions; classification public.payroll_item_classifications;
begin
  if new.payroll_item_definition_id is null then new.payroll_item_classification_id:=null; return new; end if;
  expected_type:=case when tg_table_name='payroll_adjustments' then 'adjustment' else 'deduction' end;
  select * into definition from public.payroll_item_definitions d where d.id=new.payroll_item_definition_id and d.active;
  if definition.id is null or definition.item_type<>expected_type then raise exception 'Invalid or unsupported dynamic payroll item'; end if;
  select * into classification from public.payroll_item_classifications x where x.payroll_item_definition_id=definition.id and x.active
    and new.period_end>=x.effective_from and new.period_end<x.effective_to;
  if classification.id is null or classification.calculation_status not in ('metadata_only','payroll_active') then raise exception 'No supported payroll item classification for this period'; end if;
  new.payroll_item_classification_id:=classification.id; new.description:=definition.display_name;
  if expected_type='adjustment' then new.adjustment_type:='dynamic'; new.hours:=0; end if;
  if expected_type='deduction' then new.deduction_type_id:=null; end if;
  return new;
end $$;

create function public.payroll_validate_sdl_run() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$
declare config public.company_payroll_sdl_configurations; enabled boolean;
begin
  select * into config from public.company_payroll_sdl_configurations x where x.company_id=new.company_id and x.effective_from<=new.period_start and (x.effective_to is null or x.effective_to>new.period_end);
  enabled:=coalesce(config.enabled,false);
  if coalesce((new.rules_snapshot->>'calculate_sdl')::boolean,false) is distinct from enabled then raise exception 'SDL configuration changed. Run Payroll again.'; end if;
  return new;
end $$;
create trigger payroll_run_sdl before insert on public.payroll_runs for each row execute function public.payroll_validate_sdl_run();

create function public.payroll_validate_sdl_period() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$
declare config public.company_payroll_sdl_configurations; rate public.payroll_sdl_rates; circumstance public.employee_payroll_sdl_circumstances;
  expected_base numeric; expected_amount numeric; deduction_total numeric; learner boolean; snapshot jsonb;
begin
  if new.run_id is null then return new; end if;
  snapshot:=new.document_row;
  select * into config from public.company_payroll_sdl_configurations x where x.company_id=new.company_id and x.effective_from<=new.period_start and (x.effective_to is null or x.effective_to>new.period_end);
  new.sdl_enabled:=coalesce(config.enabled,false);
  new.sdl_leviable_remuneration:=coalesce((snapshot->>'sdl_leviable_remuneration')::numeric,0);
  new.sdl_amount:=coalesce((snapshot->>'sdl_amount')::numeric,0);
  new.sdl_rate:=coalesce((snapshot->>'sdl_rate')::numeric,0);
  new.sdl_rate_version:=snapshot->>'sdl_rate_version';
  new.sdl_configuration_id:=nullif(snapshot->>'sdl_configuration_id','')::uuid;
  new.sdl_circumstance:=snapshot->'sdl_circumstance';
  new.sdl_classifications:=snapshot->'sdl_classifications';
  if not new.sdl_enabled then
    if new.sdl_leviable_remuneration<>0 or new.sdl_amount<>0 or new.sdl_configuration_id is not null then raise exception 'SDL is disabled for this payroll period'; end if;
    return new;
  end if;
  select * into rate from public.payroll_sdl_rates x where x.effective_from<=new.period_start and x.effective_to>new.period_end;
  if rate.id is null or new.sdl_rate is distinct from rate.rate or new.sdl_rate_version is distinct from rate.rate_version or new.sdl_configuration_id is distinct from config.id then
    raise exception 'SDL rate or configuration snapshot changed. Run Payroll again.';
  end if;
  select * into circumstance from public.employee_payroll_sdl_circumstances x where x.company_id=new.company_id and x.employee_id=new.employee_id and x.effective_from<=new.period_start and (x.effective_to is null or x.effective_to>new.period_end);
  learner:=coalesce(circumstance.circumstance,'standard')='section_18_3_learner';
  if circumstance.id is not null and new.sdl_circumstance->>'id' is distinct from circumstance.id::text then raise exception 'SDL employee circumstance changed. Run Payroll again.'; end if;
  if learner and length(trim(coalesce(circumstance.evidence_reference,'')))=0 then raise exception 'SDL learner evidence is required'; end if;
  select coalesce(sum((d->>'amount')::numeric),0) into deduction_total from jsonb_array_elements(snapshot->'deductions') d
    where d->'payroll_item_classification'->>'calculation_status'='payroll_active' and d->'payroll_item_classification'->>'sdl_treatment'='allowable_deduction';
  expected_base:=case when learner then 0 else greatest(0,new.gross_remuneration-deduction_total) end;
  expected_amount:=round(expected_base*rate.rate,2);
  if new.sdl_leviable_remuneration is distinct from expected_base or new.sdl_amount is distinct from expected_amount then raise exception 'SDL calculation snapshot changed. Run Payroll again.'; end if;
  if jsonb_typeof(new.sdl_classifications) is distinct from 'array' then raise exception 'SDL classification evidence missing'; end if;
  return new;
end $$;
create trigger payroll_period_sdl before insert on public.employee_payroll_period_totals for each row execute function public.payroll_validate_sdl_period();

alter function public.save_employee_with_ytd(uuid,text,boolean,jsonb,jsonb,text,uuid) rename to save_employee_with_ytd_pre_sdl;
create function public.save_employee_with_ytd(c uuid,e text,is_new boolean,details jsonb,targets jsonb,expected_revision text,request uuid) returns void
language plpgsql security definer set search_path=pg_catalog,public as $$
declare y date:=public.payroll_tax_year((now() at time zone 'Africa/Johannesburg')::date); cutoff date; ctx jsonb; old numeric; target numeric;
  effective date; circumstance text; evidence text; current_row public.employee_payroll_sdl_circumstances;
begin
  perform public.payroll_require_manager(c); perform public.payroll_lock(c);
  if expected_revision is distinct from public.payroll_revision(c) then raise exception 'Employee or payroll changed. Reopen the employee before saving.' using errcode='40001'; end if;
  if targets ? 'sdl' then
    if coalesce(targets->>'as_at','')!~'^\d{4}-\d{2}-\d{2}$' or targets->>'sdl'!~'^\d{1,12}(\.\d{1,2})?$' then raise exception 'Valid SDL YTD target and cutoff required'; end if;
    cutoff:=(targets->>'as_at')::date;
    if public.payroll_tax_year(cutoff)<>y then raise exception 'YTD as at must belong to the applicable tax year'; end if;
    if exists(select 1 from public.employee_payroll_period_totals p where p.company_id=c and p.employee_id=e and p.period_start<=cutoff and p.period_end>cutoff
      and not exists(select 1 from public.payroll_legacy_period_voids v where v.company_id=p.company_id and v.period_id=p.id)) then raise exception 'YTD cutoff falls inside a finalised payroll period; select a period boundary'; end if;
    ctx:=public.payroll_ytd_value(c,e,y,cutoff+1); old:=(ctx->>'sdl')::numeric; target:=(targets->>'sdl')::numeric;
  end if;
  perform public.save_employee_with_ytd_pre_sdl(c,e,is_new,details,targets-'sdl',expected_revision,request);
  if targets ? 'sdl' then
    insert into public.payroll_financial_events(company_id,employee_id,tax_year_start,request_id,kind,value_type,previous_value,target_value,delta,applies_after,ytd_as_at,reason,actor)
    values(c,e,y,request,'ytd_adjustment','sdl',old,target,target-old,cutoff,cutoff,coalesce(targets->>'reason',''),auth.uid());
  end if;
  circumstance:=coalesce(details->>'sdl_circumstance','standard'); effective:=coalesce(nullif(details->>'sdl_circumstance_effective_from','')::date,(details->>'employment_date')::date);
  evidence:=nullif(trim(coalesce(details->>'sdl_evidence_reference','')),'');
  if circumstance not in ('standard','section_18_3_learner') or (circumstance='section_18_3_learner' and evidence is null) then raise exception 'Invalid SDL employee circumstance or evidence'; end if;
  select * into current_row from public.employee_payroll_sdl_circumstances x where x.company_id=c and x.employee_id=e and x.effective_to is null order by effective_from desc limit 1;
  if current_row.id is null or current_row.circumstance is distinct from circumstance or current_row.evidence_reference is distinct from evidence then
    if current_row.id is not null and effective<=current_row.effective_from then raise exception 'SDL circumstance effective date must follow the current record'; end if;
    if exists(select 1 from public.employee_payroll_period_totals p where p.company_id=c and p.employee_id=e and p.period_start<effective and p.period_end>=effective and p.run_id is not null
      and not exists(select 1 from public.payroll_legacy_period_voids v where v.company_id=p.company_id and v.period_id=p.id)) then raise exception 'SDL circumstance effective date falls inside a finalised payroll period'; end if;
    update public.employee_payroll_sdl_circumstances set effective_to=effective where id=current_row.id;
    insert into public.employee_payroll_sdl_circumstances(company_id,employee_id,effective_from,circumstance,evidence_reference,recorded_by)
      values(c,e,effective,circumstance,evidence,auth.uid());
  end if;
end $$;

revoke all on function public.save_employee_with_ytd_pre_sdl(uuid,text,boolean,jsonb,jsonb,text,uuid),public.payroll_validate_sdl_run(),public.payroll_validate_sdl_period() from public,anon,authenticated;
revoke all on function public.save_employee_with_ytd(uuid,text,boolean,jsonb,jsonb,text,uuid) from public,anon;
grant execute on function public.save_employee_with_ytd(uuid,text,boolean,jsonb,jsonb,text,uuid) to authenticated;

commit;

begin;

create or replace function public.payroll_revision(c uuid) returns text
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
   (select jsonb_agg(to_jsonb(t) order by entry_id) from public.clock_events t where company_id=c),
   (select jsonb_agg(to_jsonb(v) order by period_id) from public.payroll_legacy_period_voids v where company_id=c),
   (select jsonb_agg(to_jsonb(x) order by effective_from) from public.company_payroll_sdl_configurations x where company_id=c),
   (select jsonb_agg(to_jsonb(x) order by employee_id,effective_from) from public.employee_payroll_sdl_circumstances x where company_id=c),
   (select jsonb_agg(to_jsonb(x) order by effective_from) from public.payroll_sdl_rates x),
   (select jsonb_agg(to_jsonb(x) order by x.id) from public.payroll_item_classifications x)
 )::text)
$$;

create or replace function public.payroll_ytd_value(c uuid,e text,y date,cutoff date) returns jsonb
language sql stable security definer set search_path=pg_catalog,public as $$
 with o as (select * from public.employee_payroll_ytd_opening_balances where company_id=c and employee_id=e and tax_year_start=y and as_of_date<cutoff),
 p as (select * from public.employee_payroll_period_totals p where p.company_id=c and p.employee_id=e and p.tax_year_start=y and p.period_end<cutoff
   and p.period_end>coalesce((select as_of_date from o),y-1)
   and not exists(select 1 from public.payroll_legacy_period_voids v where v.company_id=p.company_id and v.period_id=p.id)),
 a as (select * from public.payroll_financial_events where company_id=c and employee_id=e and tax_year_start=y and applies_after<cutoff)
 select jsonb_build_object(
   'employee_id',e,'has_opening',exists(select 1 from o),'as_of_date',(select as_of_date from o),
   'completed_periods',coalesce((select completed_periods from o),0),'finalized_periods',(select count(*) from p),
   'gross',coalesce((select gross_remuneration from o),0)+coalesce((select sum(gross_remuneration) from p),0)+coalesce((select sum(delta) from a where value_type='gross'),0),
   'retirement',coalesce((select retirement_fund_contributions from o),0)+coalesce((select sum(retirement_fund_contributions) from p),0)+coalesce((select sum(delta) from a where value_type='retirement'),0),
   'paye',coalesce((select paye_deducted from o),0)+coalesce((select sum(paye_deducted) from p where paye_enabled is distinct from false),0)+coalesce((select sum(delta) from a where value_type='paye'),0),
   'uif',coalesce((select employee_uif from o),0)+coalesce((select sum(employee_uif) from p where uif_enabled is distinct from false),0)+coalesce((select sum(delta) from a where value_type='uif'),0),
   'sdl',coalesce((select sum(sdl_amount) from p where sdl_enabled),0)+coalesce((select sum(delta) from a where value_type='sdl'),0),
   'uif_opening_supplied',exists(select 1 from o where employee_uif is not null),
   'paye_supplied',exists(select 1 from o) or exists(select 1 from a where value_type='paye') or exists(select 1 from p where paye_enabled is not false),
   'uif_supplied',exists(select 1 from o where employee_uif is not null) or exists(select 1 from a where value_type='uif') or exists(select 1 from p where employee_uif is not null and uif_enabled is not false),
   'sdl_supplied',exists(select 1 from a where value_type='sdl') or exists(select 1 from p where sdl_enabled),
   'adjustment_cutoff',greatest(y-1,coalesce((select as_of_date from o),y-1),coalesce((select max(period_end) from p),y-1)))
$$;

create or replace function public.get_employee_payroll_ytd_at(c uuid,e text,y date,as_at date) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare circumstance jsonb;
begin
  perform public.payroll_require_manager(c);
  if y is distinct from public.payroll_tax_year((now() at time zone 'Africa/Johannesburg')::date) then raise exception 'Employee editing is limited to the current tax year'; end if;
  if as_at is null or public.payroll_tax_year(as_at)<>y then raise exception 'YTD as at must belong to the applicable tax year'; end if;
  select to_jsonb(x) into circumstance from public.employee_payroll_sdl_circumstances x
    where x.company_id=c and x.employee_id=e and x.effective_from<=as_at and (x.effective_to is null or x.effective_to>as_at)
    order by x.effective_from desc limit 1;
  return public.payroll_ytd_value(c,e,y,as_at+1)||jsonb_build_object('revision',public.payroll_revision(c),'tax_year_start',y,'ytd_as_at',as_at,
    'sdl_circumstance',coalesce(circumstance,jsonb_build_object('circumstance','standard')));
end $$;

create or replace function public.get_payroll_calculation_inputs(c uuid,s date,t date) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare config jsonb; rate jsonb; rule jsonb;
begin
  perform public.payroll_require_manager(c);
  if s is null or t is null or s>t then raise exception 'Invalid payroll dates'; end if;
  select to_jsonb(x) into config from public.company_payroll_sdl_configurations x where x.company_id=c and x.effective_from<=s and (x.effective_to is null or x.effective_to>t);
  if exists(select 1 from public.company_payroll_sdl_configurations x where x.company_id=c and daterange(x.effective_from,x.effective_to,'[)')&&daterange(s,t+1,'[)')) and config is null then
    raise exception 'SDL configuration changes inside this payroll period. Split the payroll at the effective date.';
  end if;
  select to_jsonb(x) into rate from public.payroll_sdl_rates x where x.effective_from<=s and x.effective_to>t;
  select jsonb_set(to_jsonb(r),'{calculate_sdl}',to_jsonb(coalesce((config->>'enabled')::boolean,false))) into rule from public.company_payroll_rules r where r.company_id=c;
  return jsonb_build_object(
    'company',(select jsonb_build_object('id',id,'name',name,'logo_url',logo_url) from public.companies where id=c),
    'rules',rule,
    'employees',(select coalesce(jsonb_agg(to_jsonb(e)-array['face_descriptor','face_photo_path','face_photo_url','face_enrolled_at'] order by employee_id),'[]') from public.employees e where company_id=c),
    'deductionTypes',(select coalesce(jsonb_agg(to_jsonb(d)||jsonb_build_object('payroll_item_classification_id',x.id) order by d.id),'[]') from public.company_deduction_types d left join public.payroll_item_classifications x on x.payroll_item_definition_id=d.payroll_item_definition_id and x.effective_from<=s and x.effective_to>t where d.company_id=c and d.active),
    'classifications',(select coalesce(jsonb_agg(to_jsonb(x)||jsonb_build_object('item_key',d.item_key,'display_name',d.display_name,'item_type',d.item_type) order by d.item_key),'[]') from public.payroll_item_classifications x join public.payroll_item_definitions d on d.id=x.payroll_item_definition_id where x.active and x.effective_from<=s and x.effective_to>t),
    'events',(select coalesce(jsonb_agg(jsonb_build_object('entry_id',entry_id,'created_at',created_at,'action',action,'employee_id',employee_id,'employee_name',employee_name,'result',result,'message',message) order by created_at,entry_id),'[]') from public.clock_events where company_id=c and created_at>=s::timestamp at time zone 'Africa/Johannesburg' and created_at<(t+1)::timestamp at time zone 'Africa/Johannesburg'),
    'deductions',(select coalesce(jsonb_agg(to_jsonb(d) order by id),'[]') from public.payroll_deductions d where company_id=c and period_start=s and period_end=t),
    'adjustments',(select coalesce(jsonb_agg(to_jsonb(a) order by id),'[]') from public.payroll_adjustments a where company_id=c and period_start=s and period_end=t),
    'levy',(select to_jsonb(l) from public.company_payroll_levy_periods l where company_id=c and period_start=s and period_end=t and levy_scheme='nbcei'),
    'uif_month',jsonb_build_object('month',date_trunc('month',t)::date,'employees',(select coalesce(jsonb_agg(public.payroll_uif_month(c,e.employee_id,t)),'[]') from public.employees e where e.company_id=c and e.active is distinct from false)),
    'sdl',jsonb_build_object('configuration',config,'rate',rate,'employee_circumstances',(select coalesce(jsonb_agg(to_jsonb(x) order by employee_id,effective_from),'[]') from public.employee_payroll_sdl_circumstances x where x.company_id=c and daterange(x.effective_from,x.effective_to,'[)')&&daterange(s,t+1,'[)'))),
    'history',public.get_payroll_history(c,s,t));
end $$;

commit;


begin;

-- The legacy finalisation validator recognised retirement only by the text
-- "Provident". Phase 2/3 deductions are authoritative by frozen classification,
-- so validate the three supported retirement categories while retaining the
-- unclassified legacy Provident path for historical TR compatibility.
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
    if retirement is distinct from (select round(coalesce(sum((d->>'amount')::numeric),0),2)
      from jsonb_array_elements(r->'document_row'->'deductions') d
      where (
        d->'payroll_item_classification'->>'calculation_status'='payroll_active'
        and d->'payroll_item_classification'->>'statutory_category' in (
          'employee_pension_fund_contribution',
          'employee_provident_fund_contribution',
          'employee_retirement_annuity_fund_contribution'
        )
      ) or (
        d->'payroll_item_classification_id' is null
        and lower(d->>'description')='provident'
      )
    ) then raise exception 'Retirement snapshot mismatch'; end if;
    if gross is distinct from round((r->'document_row'->>'gross')::numeric,2) then raise exception 'Snapshot gross differs from payroll total'; end if;
    if (not rules.calculate_paye and paye<>0) or (not rules.calculate_uif and uif<>0) then raise exception 'Disabled statutory contribution'; end if;
    if rules.calculate_paye and paye is distinct from (select round(coalesce(sum((d->>'amount')::numeric),0),2) from jsonb_array_elements(r->'document_row'->'deductions') d where lower(d->>'description')='tax') then raise exception 'PAYE snapshot mismatch'; end if;
    if rules.calculate_uif and uif is distinct from (select round(coalesce(sum((d->>'amount')::numeric),0),2) from jsonb_array_elements(r->'document_row'->'deductions') d where lower(d->>'description')='uif') then raise exception 'UIF snapshot mismatch'; end if;
    insert into public.employee_payroll_period_totals(company_id,employee_id,tax_year_start,period_start,period_end,period_number,gross_remuneration,retirement_fund_contributions,paye_deducted,employee_uif,paye_enabled,uif_enabled,run_id,document_row,finalized_by)
      values(c,e.employee_id,y,s,t,pn,gross,retirement,paye,uif,rules.calculate_paye,rules.calculate_uif,run,r->'document_row',auth.uid());
  end loop;
  return run;
end $$;

revoke all on function public.finalise_payroll(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.finalise_payroll(uuid,uuid,jsonb) to service_role;

commit;
