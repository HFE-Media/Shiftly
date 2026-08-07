-- MCK Power daily automatic clock-out rule.
-- At/after 19:00 Africa/Johannesburg, employees still IN from at/before 17:00
-- are clocked OUT at 17:00 and recorded in an auditable company-scoped ledger.

create extension if not exists pg_cron;

create table if not exists public.company_auto_clock_out_rules (
  company_id uuid not null,
  active boolean not null default false,
  timezone text not null default 'Africa/Johannesburg',
  automatic_out_time time without time zone not null,
  review_time time without time zone not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint company_auto_clock_out_rules_pkey primary key (company_id),
  constraint company_auto_clock_out_rules_company_id_fkey
    foreign key (company_id) references public.companies(id) on delete cascade,
  constraint company_auto_clock_out_rules_time_check
    check (review_time > automatic_out_time)
);

alter table public.company_auto_clock_out_rules enable row level security;

drop policy if exists "company users can view automatic clock-out rules"
on public.company_auto_clock_out_rules;

create policy "company users can view automatic clock-out rules"
on public.company_auto_clock_out_rules for select
to authenticated
using (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = company_auto_clock_out_rules.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
  )
);

drop policy if exists "company admins can manage automatic clock-out rules"
on public.company_auto_clock_out_rules;

create policy "company admins can manage automatic clock-out rules"
on public.company_auto_clock_out_rules for all
to authenticated
using (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = company_auto_clock_out_rules.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = company_auto_clock_out_rules.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.role in ('owner', 'admin')
  )
);

create table if not exists public.company_auto_clock_out_audit (
  id uuid not null default gen_random_uuid(),
  company_id uuid not null,
  employee_id text not null,
  employee_name text not null,
  work_date date not null,
  status text not null,
  scheduled_out_at timestamp with time zone not null,
  detected_at timestamp with time zone not null default now(),
  source_entry_id uuid not null,
  auto_out_entry_id uuid null,
  message text not null,
  created_at timestamp with time zone not null default now(),
  constraint company_auto_clock_out_audit_pkey primary key (id),
  constraint company_auto_clock_out_audit_company_id_fkey
    foreign key (company_id) references public.companies(id) on delete cascade,
  constraint company_auto_clock_out_audit_employee_fkey
    foreign key (company_id, employee_id)
    references public.employees(company_id, employee_id),
  constraint company_auto_clock_out_audit_source_entry_fkey
    foreign key (source_entry_id) references public.clock_events(entry_id),
  constraint company_auto_clock_out_audit_auto_entry_fkey
    foreign key (auto_out_entry_id) references public.clock_events(entry_id),
  constraint company_auto_clock_out_audit_status_check
    check (status in ('auto_clocked_out', 'late_clock_in_review')),
  constraint company_auto_clock_out_audit_unique_day
    unique (company_id, employee_id, work_date)
);

create index if not exists company_auto_clock_out_audit_company_date_idx
on public.company_auto_clock_out_audit (company_id, work_date desc, status);

alter table public.company_auto_clock_out_audit enable row level security;

drop policy if exists "company admins can view automatic clock-out audit"
on public.company_auto_clock_out_audit;

create policy "company admins can view automatic clock-out audit"
on public.company_auto_clock_out_audit for select
to authenticated
using (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = company_auto_clock_out_audit.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.role in ('owner', 'admin')
  )
);

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
  v_work_date date;
  v_cutoff timestamp with time zone;
  v_local_time time without time zone;
  v_audit_id uuid;
  v_auto_entry_id uuid;
  v_auto_count integer := 0;
begin
  for v_rule in
    select *
    from public.company_auto_clock_out_rules
    where active = true
  loop
    v_work_date := (p_now at time zone v_rule.timezone)::date;
    v_local_time := (p_now at time zone v_rule.timezone)::time;
    if v_local_time < v_rule.review_time then
      continue;
    end if;

    v_cutoff := (v_work_date + v_rule.automatic_out_time) at time zone v_rule.timezone;

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
          and (event.created_at at time zone v_rule.timezone)::date = v_work_date
          and event.created_at <= p_now
        order by event.created_at desc, event.entry_id desc
        limit 1
      ) latest on true
      where employee.company_id = v_rule.company_id
        and employee.active = true
        and latest.action = 'IN'
    loop
      v_audit_id := null;
      v_auto_entry_id := null;

      if v_candidate.source_created_at <= v_cutoff then
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
          v_work_date,
          'auto_clocked_out',
          v_cutoff,
          p_now,
          v_candidate.source_entry_id,
          'AUTO CLOCK-OUT FLAG: No manual clock-out by 19:00; recorded at 17:00'
        )
        on conflict (company_id, employee_id, work_date) do nothing
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
          v_cutoff,
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
          'AUTO CLOCK-OUT FLAG: No manual clock-out by 19:00; recorded at 17:00',
          null,
          'Shiftly Automatic Clock-Out'
        from public.companies company
        where company.id = v_rule.company_id
        returning entry_id into v_auto_entry_id;

        update public.company_auto_clock_out_audit
        set auto_out_entry_id = v_auto_entry_id
        where id = v_audit_id;

        v_auto_count := v_auto_count + 1;
      else
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
          v_work_date,
          'late_clock_in_review',
          v_cutoff,
          p_now,
          v_candidate.source_entry_id,
          'REVIEW FLAG: Latest clock-in was after 17:00; no backdated OUT was created'
        )
        on conflict (company_id, employee_id, work_date) do nothing;
      end if;
    end loop;
  end loop;

  return v_auto_count;
end;
$$;

revoke all on function public.process_company_auto_clock_outs(timestamp with time zone)
from public, anon, authenticated;

insert into public.company_auto_clock_out_rules (
  company_id,
  active,
  timezone,
  automatic_out_time,
  review_time,
  updated_at
)
select
  company.id,
  true,
  'Africa/Johannesburg',
  '17:00'::time,
  '19:00'::time,
  now()
from public.companies company
where company.id = '4ca8c47f-3959-468b-bd8a-734f38874623'::uuid
  and company.name = 'MCK Power'
on conflict (company_id)
do update set
  active = true,
  timezone = excluded.timezone,
  automatic_out_time = excluded.automatic_out_time,
  review_time = excluded.review_time,
  updated_at = now();

do $$
declare
  v_job_id bigint;
begin
  if not exists (
    select 1
    from public.company_auto_clock_out_rules
    where company_id = '4ca8c47f-3959-468b-bd8a-734f38874623'::uuid
      and active = true
      and automatic_out_time = '17:00'::time
      and review_time = '19:00'::time
  ) then
    raise exception 'MCK Power automatic clock-out rule could not be configured';
  end if;

  select jobid into v_job_id
  from cron.job
  where jobname = 'shiftly-process-company-auto-clock-outs';

  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;

  perform cron.schedule(
    'shiftly-process-company-auto-clock-outs',
    '*/5 * * * *',
    'select public.process_company_auto_clock_outs();'
  );
end;
$$;
