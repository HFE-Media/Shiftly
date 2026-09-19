-- Monthly UIF uses the saved period_end month. Existing history is never rewritten.
begin;
alter table public.employee_payroll_period_totals
  add column uif_liable_remuneration numeric(14,2) check(uif_liable_remuneration>=0),
  add column employer_uif numeric(14,2) check(employer_uif>=0);

create function public.payroll_uif_month(c uuid,e text,t date) returns jsonb
language sql stable security definer set search_path=pg_catalog,public as $$
  select jsonb_build_object('employee_id',e,
    'ambiguous',coalesce(bool_or(uif_enabled is distinct from false and
      (employee_uif is null or employer_uif is null or uif_liable_remuneration is null)),false),
    'liable',coalesce(sum(uif_liable_remuneration) filter(where uif_enabled is distinct from false),0),
    'employee',coalesce(sum(employee_uif) filter(where uif_enabled is distinct from false),0),
    'employer',coalesce(sum(employer_uif) filter(where uif_enabled is distinct from false),0))
  from public.employee_payroll_period_totals
  where company_id=c and employee_id=e
    and period_end>=date_trunc('month',t)::date
    and period_end<(date_trunc('month',t)+interval '1 month')::date
$$;
revoke all on function public.payroll_uif_month(uuid,text,date) from public,anon,authenticated;

create or replace function public.get_payroll_calculation_inputs(c uuid,s date,t date) returns jsonb
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
    'uif_month',jsonb_build_object('month',date_trunc('month',t)::date,'employees',(select coalesce(jsonb_agg(public.payroll_uif_month(c,e.employee_id,t)), '[]'::jsonb) from public.employees e where e.company_id=c and e.active is distinct from false)),
    'history',public.get_payroll_history(c,s,t));
end $$;

-- Existing finalisation holds this company lock and validates the revision first.
-- Revalidate at insertion as well: monthly totals include out-of-order finalisations.
create function public.payroll_validate_monthly_uif() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$
declare used jsonb; expected numeric; liable numeric;
begin
  perform public.payroll_lock(new.company_id);
  if new.run_id is null then raise exception 'New payroll requires an authoritative run'; end if;
  new.uif_liable_remuneration:=(new.document_row->>'uif_liable_remuneration')::numeric;
  new.employer_uif:=(new.document_row->>'employer_uif')::numeric;
  if new.uif_liable_remuneration is null or new.employer_uif is null then
    raise exception 'Monthly UIF snapshot information missing. Refresh payroll using the current authority.';
  end if;
  liable:=case when new.uif_enabled then new.gross_remuneration else 0 end;
  expected:=0;
  if new.uif_enabled then
    used:=public.payroll_uif_month(new.company_id,new.employee_id,new.period_end);
    if (used->>'ambiguous')::boolean then
      raise exception 'This UIF month contains legacy payroll with incomplete UIF information. Monthly UIF cannot be calculated safely.';
    end if;
    expected:=least(
      round(least(liable,greatest(0,17712-(used->>'liable')::numeric))*0.01,2),
      greatest(0,177.12-(used->>'employee')::numeric),
      greatest(0,177.12-(used->>'employer')::numeric));
  end if;
  if new.uif_liable_remuneration is distinct from liable or new.employee_uif is distinct from expected
     or new.employer_uif is distinct from expected
     or (new.document_row->>'combined_uif')::numeric is distinct from expected*2 then
    raise exception 'Monthly UIF allowance or snapshot changed. Run Payroll again.';
  end if;
  return new;
end $$;
revoke all on function public.payroll_validate_monthly_uif() from public,anon,authenticated;
create trigger payroll_monthly_uif before insert on public.employee_payroll_period_totals
  for each row execute function public.payroll_validate_monthly_uif();
commit;
