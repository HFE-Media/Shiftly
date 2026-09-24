-- Read-only reporting over immutable, authoritative payroll runs and the existing YTD ledger.
begin;

create function public.get_payroll_report_periods(c uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public as $$
begin
  perform public.payroll_require_manager(c);
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id',r.id,
      'period_start',r.period_start,
      'period_end',r.period_end,
      'tax_year_start',r.tax_year_start,
      'finalised_at',r.finalised_at
    ) order by r.period_end desc,r.finalised_at desc,r.id desc)
    from public.payroll_runs r
    where r.company_id=c and r.status='finalised'
  ),'[]'::jsonb);
end $$;

create function public.get_payroll_report(c uuid,r_id uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare
  selected public.payroll_runs;
  cutoff date;
  missing_identity text;
  monthly_rows jsonb;
  ytd_rows jsonb;
begin
  perform public.payroll_require_manager(c);
  select * into selected from public.payroll_runs r where r.company_id=c and r.id=r_id and r.status='finalised';
  if selected.id is null then raise exception 'Finalised payroll period not found' using errcode='42501'; end if;
  cutoff:=selected.period_end+1;

  if (select count(*) from public.employee_payroll_period_totals p where p.company_id=c and p.run_id=selected.id)<>selected.employee_count then
    raise exception 'Finalised payroll snapshot is incomplete';
  end if;

  if exists(
    select 1 from public.employee_payroll_period_totals p
    where p.company_id=c and p.run_id=selected.id and p.uif_enabled
      and (p.employee_uif is null or p.employer_uif is null or p.uif_liable_remuneration is null)
  ) then
    raise exception 'Finalised payroll is missing authoritative UIF reporting values';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'employee_id',p.employee_id,
    'employee_name',p.document_row->>'employee_name',
    'id_number',p.document_row->>'id_number',
    'gross',p.gross_remuneration,
    'paye',case when p.paye_enabled then p.paye_deducted else 0 end,
    'uif_combined',case when p.uif_enabled then p.employee_uif+p.employer_uif else 0 end,
    'sdl',0,
    'paye_applicable',p.paye_enabled,
    'uif_applicable',p.uif_enabled
  ) order by p.employee_id),'[]'::jsonb) into monthly_rows
  from public.employee_payroll_period_totals p
  where p.company_id=c and p.run_id=selected.id
    and not exists(select 1 from public.payroll_legacy_period_voids v where v.company_id=p.company_id and v.period_id=p.id);

  with ids as (
    select o.employee_id from public.employee_payroll_ytd_opening_balances o
      where o.company_id=c and o.tax_year_start=selected.tax_year_start and o.as_of_date<cutoff
    union
    select p.employee_id from public.employee_payroll_period_totals p
      where p.company_id=c and p.tax_year_start=selected.tax_year_start and p.period_end<cutoff and p.run_id is not null
        and not exists(select 1 from public.payroll_legacy_period_voids v where v.company_id=p.company_id and v.period_id=p.id)
    union
    select a.employee_id from public.payroll_financial_events a
      where a.company_id=c and a.tax_year_start=selected.tax_year_start and a.applies_after<cutoff
  ), identities as (
    select distinct on (p.employee_id) p.employee_id,p.document_row
    from public.employee_payroll_period_totals p
    where p.company_id=c and p.tax_year_start=selected.tax_year_start and p.period_end<cutoff and p.run_id is not null
      and not exists(select 1 from public.payroll_legacy_period_voids v where v.company_id=p.company_id and v.period_id=p.id)
    order by p.employee_id,p.period_end desc,p.finalized_at desc,p.id desc
  )
  select string_agg(i.employee_id,',' order by i.employee_id) into missing_identity
  from ids i left join identities x on x.employee_id=i.employee_id where x.employee_id is null;
  if missing_identity is not null then
    raise exception 'Historical employee snapshot unavailable for YTD report: %',missing_identity;
  end if;

  with ids as (
    select o.employee_id from public.employee_payroll_ytd_opening_balances o
      where o.company_id=c and o.tax_year_start=selected.tax_year_start and o.as_of_date<cutoff
    union
    select p.employee_id from public.employee_payroll_period_totals p
      where p.company_id=c and p.tax_year_start=selected.tax_year_start and p.period_end<cutoff and p.run_id is not null
        and not exists(select 1 from public.payroll_legacy_period_voids v where v.company_id=p.company_id and v.period_id=p.id)
    union
    select a.employee_id from public.payroll_financial_events a
      where a.company_id=c and a.tax_year_start=selected.tax_year_start and a.applies_after<cutoff
  ), identities as (
    select distinct on (p.employee_id) p.employee_id,p.document_row
    from public.employee_payroll_period_totals p
    where p.company_id=c and p.tax_year_start=selected.tax_year_start and p.period_end<cutoff and p.run_id is not null
      and not exists(select 1 from public.payroll_legacy_period_voids v where v.company_id=p.company_id and v.period_id=p.id)
    order by p.employee_id,p.period_end desc,p.finalized_at desc,p.id desc
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'employee_id',i.employee_id,
    'employee_name',x.document_row->>'employee_name',
    'id_number',x.document_row->>'id_number',
    'gross',(y.value->>'gross')::numeric,
    'paye',case when (y.value->>'paye_supplied')::boolean then (y.value->>'paye')::numeric else 0 end,
    'uif_combined',case when (y.value->>'uif_supplied')::boolean then (y.value->>'uif')::numeric*2 else 0 end,
    'sdl',0,
    'paye_applicable',(y.value->>'paye_supplied')::boolean,
    'uif_applicable',(y.value->>'uif_supplied')::boolean
  ) order by i.employee_id),'[]'::jsonb) into ytd_rows
  from ids i join identities x on x.employee_id=i.employee_id
  cross join lateral (select public.payroll_ytd_value(c,i.employee_id,selected.tax_year_start,cutoff) value) y;

  return jsonb_build_object(
    'run',jsonb_build_object(
      'id',selected.id,
      'period_start',selected.period_start,
      'period_end',selected.period_end,
      'tax_year_start',selected.tax_year_start,
      'finalised_at',selected.finalised_at,
      'company',selected.company_snapshot,
      'rules',selected.rules_snapshot
    ),
    'monthly',monthly_rows,
    'ytd',ytd_rows,
    'sdl_supported',false,
    'eti_supported',false
  );
end $$;

revoke all on function public.get_payroll_report_periods(uuid),public.get_payroll_report(uuid,uuid) from public,anon,authenticated;
grant execute on function public.get_payroll_report_periods(uuid),public.get_payroll_report(uuid,uuid) to authenticated;

commit;
