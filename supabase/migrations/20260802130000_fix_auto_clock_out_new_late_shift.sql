-- Treat a manual IN after the daily 17:00 automatic OUT as a new shift.
-- That new shift becomes due for automatic OUT at 17:00 the following day.

alter table public.company_auto_clock_out_audit
drop constraint if exists company_auto_clock_out_audit_unique_day;

alter table public.company_auto_clock_out_audit
drop constraint if exists company_auto_clock_out_audit_unique_source;

alter table public.company_auto_clock_out_audit
add constraint company_auto_clock_out_audit_unique_source
unique (company_id, source_entry_id);

create or replace function public.process_company_auto_clock_outs(
  p_now timestamp with time zone default now()
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_rule public.company_auto_clock_out_rules%rowtype;
  v_candidate record;
  v_today date;
  v_local_time time without time zone;
  v_source_work_date date;
  v_source_local_time time without time zone;
  v_out_work_date date;
  v_scheduled_out timestamp with time zone;
  v_message text;
  v_audit_id uuid;
  v_auto_entry_id uuid;
  v_auto_count integer := 0;
begin
  for v_rule in
    select *
    from public.company_auto_clock_out_rules
    where active = true
  loop
    v_today := (p_now at time zone v_rule.timezone)::date;
    v_local_time := (p_now at time zone v_rule.timezone)::time;

    for v_candidate in
      select
        employee.employee_id,
        employee.full_name as employee_name,
        latest.entry_id as source_entry_id,
        latest.created_at as source_created_at,
        latest.site_id,
        latest.site_name,
        latest.lat,
        latest.lon,
        latest.accuracy_m,
        latest.distance_m
      from public.employees employee
      join lateral (
        select event.*
        from public.clock_events event
        where event.company_id = employee.company_id
          and event.employee_id = employee.employee_id
          and event.result = 'OK'
          and event.created_at <= p_now
        order by event.created_at desc, event.entry_id desc
        limit 1
      ) latest on true
      where employee.company_id = v_rule.company_id
        and employee.active = true
        and latest.action = 'IN'
    loop
      v_source_work_date := (
        v_candidate.source_created_at at time zone v_rule.timezone
      )::date;
      v_source_local_time := (
        v_candidate.source_created_at at time zone v_rule.timezone
      )::time;

      if v_source_local_time <= v_rule.automatic_out_time then
        v_out_work_date := v_source_work_date;
        v_message := 'AUTO CLOCK-OUT FLAG: No manual clock-out by 19:00; recorded at 17:00';
      else
        v_out_work_date := v_source_work_date + 1;
        v_message := 'AUTO CLOCK-OUT FLAG: New late shift had no manual clock-out by the following day at 19:00; recorded at 17:00';
      end if;

      if v_out_work_date > v_today
         or (v_out_work_date = v_today and v_local_time < v_rule.review_time) then
        continue;
      end if;

      v_scheduled_out := (
        v_out_work_date + v_rule.automatic_out_time
      ) at time zone v_rule.timezone;
      v_audit_id := null;
      v_auto_entry_id := null;

      insert into public.company_auto_clock_out_audit (
        company_id,
        employee_id,
        employee_name,
        work_date,
        status,
        scheduled_out_at,
        detected_at,
        source_entry_id,
        message
      ) values (
        v_rule.company_id,
        v_candidate.employee_id,
        v_candidate.employee_name,
        v_source_work_date,
        'auto_clocked_out',
        v_scheduled_out,
        p_now,
        v_candidate.source_entry_id,
        v_message
      )
      on conflict (company_id, source_entry_id) do update
      set employee_name = excluded.employee_name,
          status = excluded.status,
          scheduled_out_at = excluded.scheduled_out_at,
          detected_at = excluded.detected_at,
          source_entry_id = excluded.source_entry_id,
          message = excluded.message
      where company_auto_clock_out_audit.auto_out_entry_id is null
      returning id into v_audit_id;

      if v_audit_id is null then
        continue;
      end if;

      insert into public.clock_events (
        company_id,
        company_name,
        created_at,
        action,
        employee_id,
        employee_name,
        supervisor_code,
        site_id,
        site_name,
        lat,
        lon,
        accuracy_m,
        distance_m,
        result,
        message,
        supervisor_id,
        supervisor_name
      )
      select
        company.id,
        company.name,
        v_scheduled_out,
        'OUT',
        v_candidate.employee_id,
        v_candidate.employee_name,
        'SYSTEM',
        v_candidate.site_id,
        v_candidate.site_name,
        v_candidate.lat,
        v_candidate.lon,
        v_candidate.accuracy_m,
        v_candidate.distance_m,
        'OK',
        v_message,
        null,
        'Shiftly Automatic Clock-Out'
      from public.companies company
      where company.id = v_rule.company_id
      returning entry_id into v_auto_entry_id;

      update public.company_auto_clock_out_audit
      set auto_out_entry_id = v_auto_entry_id
      where id = v_audit_id;

      v_auto_count := v_auto_count + 1;
    end loop;
  end loop;

  return v_auto_count;
end;
$$;

revoke all on function public.process_company_auto_clock_outs(timestamp with time zone)
from public, anon, authenticated;

-- Correct automatic OUT records created by the previous late-IN repair. These
-- shifts must end at 17:00 on the following day, not immediately after the IN.
with corrected as (
  select
    audit.id as audit_id,
    audit.auto_out_entry_id,
    (
      audit.work_date + 1 + rule.automatic_out_time
    ) at time zone rule.timezone as corrected_out_at,
    'AUTO CLOCK-OUT FLAG: New late shift had no manual clock-out by the following day at 19:00; recorded at 17:00'::text as corrected_message
  from public.company_auto_clock_out_audit audit
  join public.company_auto_clock_out_rules rule
    on rule.company_id = audit.company_id
  where audit.message = 'AUTO CLOCK-OUT FLAG: Late clock-in remained open; closed automatically and requires review'
    and audit.auto_out_entry_id is not null
), updated_events as (
  update public.clock_events event
  set created_at = corrected.corrected_out_at,
      message = corrected.corrected_message
  from corrected
  where event.entry_id = corrected.auto_out_entry_id
  returning corrected.audit_id
)
update public.company_auto_clock_out_audit audit
set scheduled_out_at = corrected.corrected_out_at,
    message = corrected.corrected_message
from corrected
join updated_events on updated_events.audit_id = corrected.audit_id
where audit.id = corrected.audit_id;

select public.process_company_auto_clock_outs();
