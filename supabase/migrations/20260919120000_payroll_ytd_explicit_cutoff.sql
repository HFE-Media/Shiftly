-- Explicit accountant YTD cutoff. No existing opening, period or event is rewritten.
begin;

alter table public.payroll_financial_events add column ytd_as_at date,
  add constraint payroll_ytd_explicit_cutoff check (ytd_as_at is null or
    (kind='ytd_adjustment' and applies_after=ytd_as_at and
     ytd_as_at>=tax_year_start and ytd_as_at<(tax_year_start+interval '1 year')::date));

create function public.get_employee_payroll_ytd_at(c uuid,e text,y date,as_at date) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public as $$
begin
  perform public.payroll_require_manager(c);
  if y is distinct from public.payroll_tax_year((now() at time zone 'Africa/Johannesburg')::date) then
    raise exception 'Employee editing is limited to the current tax year';
  end if;
  if as_at is null or public.payroll_tax_year(as_at)<>y then
    raise exception 'YTD as at must belong to the applicable tax year';
  end if;
  -- Inclusive accountant cutoff: the ledger reader uses an exclusive upper bound.
  return public.payroll_ytd_value(c,e,y,as_at+1) ||
    jsonb_build_object('revision',public.payroll_revision(c),'tax_year_start',y,'ytd_as_at',as_at);
end $$;
revoke all on function public.get_employee_payroll_ytd_at(uuid,text,date,date) from public,anon;
grant execute on function public.get_employee_payroll_ytd_at(uuid,text,date,date) to authenticated;

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
    if exists(select 1 from public.employee_payroll_period_totals where company_id=c and employee_id=e and tax_year_start=y and period_start<=cutoff and period_end>cutoff) then
      raise exception 'YTD cutoff falls inside a finalised payroll period; select a period boundary';
    end if;
    -- Do not silently invalidate a later accountant's absolute target.
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

-- The existing finalisation transaction already holds the same company lock.
-- Reject covered/straddling new periods; successful retries insert nothing.
create function public.payroll_guard_ytd_covered_period() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  perform public.payroll_lock(new.company_id);
  if new.run_id is not null and exists(select 1 from public.payroll_financial_events a
    where a.company_id=new.company_id and a.employee_id=new.employee_id and a.tax_year_start=new.tax_year_start
      and a.ytd_as_at>=new.period_start) then
    raise exception 'Payroll period is already covered by an accountant YTD cutoff; select a period starting after the cutoff';
  end if;
  return new;
end $$;
revoke all on function public.payroll_guard_ytd_covered_period() from public,anon,authenticated;
create trigger payroll_ytd_covered_period before insert on public.employee_payroll_period_totals
  for each row execute function public.payroll_guard_ytd_covered_period();
commit;
