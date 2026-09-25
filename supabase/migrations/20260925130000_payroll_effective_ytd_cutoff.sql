-- A YTD audit row is not itself an accountant cutoff. Protect only genuine
-- opening balances or the latest effective non-zero YTD target per value.
begin;

do $$
declare
  definition text;
begin
  select pg_get_functiondef('public.payroll_guard_ytd_covered_period()'::regprocedure)
    into definition;
  if definition is null
     or strpos(definition, 'a.ytd_as_at>=new.period_start') = 0 then
    raise exception 'Expected accountant YTD cutoff guard was not found';
  end if;
end;
$$;

create function public.payroll_has_effective_ytd_cutoff(
  c uuid,
  e text,
  y date,
  period_start date
) returns boolean
language sql stable security definer
set search_path=pg_catalog,public as $$
  select exists(
    select 1
    from public.employee_payroll_ytd_opening_balances o
    where o.company_id=c
      and o.employee_id=e
      and o.tax_year_start=y
      and o.as_of_date>=period_start
  ) or exists(
    select 1
    from (
      select distinct on (a.value_type)
        a.value_type,
        a.target_value
      from public.payroll_financial_events a
      where a.company_id=c
        and a.employee_id=e
        and a.tax_year_start=y
        and a.kind='ytd_adjustment'
        and a.ytd_as_at>=period_start
      order by a.value_type,a.ytd_as_at desc,a.created_at desc,a.id desc
    ) latest
    where latest.target_value<>0
  )
$$;

create or replace function public.payroll_guard_ytd_covered_period()
returns trigger
language plpgsql security definer
set search_path=pg_catalog,public as $$
begin
  perform public.payroll_lock(new.company_id);
  if new.run_id is not null and public.payroll_has_effective_ytd_cutoff(
    new.company_id,
    new.employee_id,
    new.tax_year_start,
    new.period_start
  ) then
    raise exception 'Payroll period is already covered by an accountant YTD cutoff; select a period starting after the cutoff';
  end if;
  return new;
end $$;

-- Existing events remain immutable. Prevent only future zero-to-zero audit
-- noise; a non-zero target at a chosen cutoff remains an auditable cutoff.
create function public.payroll_skip_zero_ytd_adjustment()
returns trigger
language plpgsql security definer
set search_path=pg_catalog,public as $$
begin
  if new.kind='ytd_adjustment'
     and new.previous_value=0
     and new.target_value=0
     and new.delta=0 then
    return null;
  end if;
  return new;
end $$;

create trigger payroll_skip_zero_ytd_adjustment
before insert on public.payroll_financial_events
for each row execute function public.payroll_skip_zero_ytd_adjustment();

revoke all on function public.payroll_has_effective_ytd_cutoff(uuid,text,date,date),
  public.payroll_guard_ytd_covered_period(),
  public.payroll_skip_zero_ytd_adjustment()
from public,anon,authenticated;

commit;
