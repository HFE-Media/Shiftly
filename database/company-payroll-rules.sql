-- Shiftly: company-scoped payroll rules.
-- Lets each client keep its own overtime/payroll behaviour without hardcoding one policy for everyone.

create table if not exists public.company_payroll_rules (
  company_id uuid not null,
  company_name text not null,
  payroll_profile text not null default 'standard',
  overtime_method text not null default 'cycle_only',
  weekly_normal_hours numeric(8,2) not null default 45,
  fortnightly_normal_hours numeric(8,2) not null default 90,
  monthly_normal_hours numeric(8,2) not null default 195,
  ot1_multiplier numeric(5,2) not null default 1.5,
  ot2_multiplier numeric(5,2) not null default 2,
  saturday_rule text not null default 'threshold',
  sunday_rule text not null default 'ot2',
  public_holiday_rule text not null default 'ot2_with_topup',
  public_holiday_standard_hours numeric(5,2) not null default 8,
  calculate_uif boolean not null default false,
  calculate_paye boolean not null default false,
  work_week_enabled boolean not null default false,
  work_week jsonb not null default '{
    "mon": {"normal_hours": 8, "rule": "threshold"},
    "tue": {"normal_hours": 8, "rule": "threshold"},
    "wed": {"normal_hours": 8, "rule": "threshold"},
    "thu": {"normal_hours": 8, "rule": "threshold"},
    "fri": {"normal_hours": 8, "rule": "threshold"},
    "sat": {"normal_hours": 0, "rule": "threshold"},
    "sun": {"normal_hours": 0, "rule": "ot2"}
  }'::jsonb,
  daily_overtime_enabled boolean not null default false,
  daily_normal_hours numeric(5,2) not null default 8,
  lunch_deduction_enabled boolean not null default false,
  lunch_deduction_minutes integer not null default 0,
  paid_start_time time null,
  normal_end_time time null,
  overtime_trigger_time time null,
  friday_normal_end_time time null,
  friday_overtime_trigger_time time null,
  active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint company_payroll_rules_pkey primary key (company_id),
  constraint company_payroll_rules_company_id_fkey foreign key (company_id)
    references public.companies (id) on delete cascade,
  constraint company_payroll_rules_overtime_method_check check (
    overtime_method = any (array['cycle_only'::text, 'daily_cycle'::text, 'day_rules'::text])
  ),
  constraint company_payroll_rules_profile_check check (
    payroll_profile = any (array['standard'::text, 'mixocron'::text])
  ),
  constraint company_payroll_rules_saturday_rule_check check (
    saturday_rule = any (array['threshold'::text, 'normal'::text, 'ot1'::text, 'ot2'::text])
  ),
  constraint company_payroll_rules_sunday_rule_check check (
    sunday_rule = any (array['ot2'::text, 'ot1'::text, 'threshold'::text, 'normal'::text])
  ),
  constraint company_payroll_rules_public_holiday_rule_check check (
    public_holiday_rule = any (array['ot2_with_topup'::text, 'ot2'::text, 'threshold'::text, 'normal'::text])
  ),
  constraint company_payroll_rules_hours_check check (
    weekly_normal_hours >= 0
    and fortnightly_normal_hours >= 0
    and monthly_normal_hours >= 0
    and public_holiday_standard_hours >= 0
    and daily_normal_hours >= 0
    and lunch_deduction_minutes >= 0
  ),
  constraint company_payroll_rules_multiplier_check check (
    ot1_multiplier >= 1
    and ot2_multiplier >= 1
  ),
  constraint company_payroll_rules_time_window_check check (
    normal_end_time is null
    or overtime_trigger_time is null
    or overtime_trigger_time >= normal_end_time
  ),
  constraint company_payroll_rules_friday_time_window_check check (
    friday_normal_end_time is null
    or friday_overtime_trigger_time is null
    or friday_overtime_trigger_time >= friday_normal_end_time
  )
);

create index if not exists company_payroll_rules_company_name_idx
on public.company_payroll_rules using btree (company_name);

alter table public.company_payroll_rules
add column if not exists overtime_method text not null default 'cycle_only';

alter table public.company_payroll_rules
add column if not exists payroll_profile text not null default 'standard';

alter table public.company_payroll_rules
drop constraint if exists company_payroll_rules_overtime_method_check;

alter table public.company_payroll_rules
add constraint company_payroll_rules_overtime_method_check
check (overtime_method = any (array['cycle_only'::text, 'daily_cycle'::text, 'day_rules'::text]));

alter table public.company_payroll_rules
drop constraint if exists company_payroll_rules_profile_check;

alter table public.company_payroll_rules
add constraint company_payroll_rules_profile_check
check (payroll_profile = any (array['standard'::text, 'mixocron'::text]));

alter table public.company_payroll_rules
add column if not exists work_week_enabled boolean not null default false;

alter table public.company_payroll_rules
add column if not exists work_week jsonb not null default '{
  "mon": {"normal_hours": 8, "rule": "threshold"},
  "tue": {"normal_hours": 8, "rule": "threshold"},
  "wed": {"normal_hours": 8, "rule": "threshold"},
  "thu": {"normal_hours": 8, "rule": "threshold"},
  "fri": {"normal_hours": 8, "rule": "threshold"},
  "sat": {"normal_hours": 0, "rule": "threshold"},
  "sun": {"normal_hours": 0, "rule": "ot2"}
}'::jsonb;

alter table public.company_payroll_rules
add column if not exists paid_start_time time null;

alter table public.company_payroll_rules
add column if not exists normal_end_time time null;

alter table public.company_payroll_rules
add column if not exists overtime_trigger_time time null;

alter table public.company_payroll_rules
add column if not exists friday_normal_end_time time null;

alter table public.company_payroll_rules
add column if not exists friday_overtime_trigger_time time null;

alter table public.company_payroll_rules
add column if not exists calculate_uif boolean not null default false;

alter table public.company_payroll_rules
add column if not exists calculate_paye boolean not null default false;

alter table public.company_payroll_rules
drop constraint if exists company_payroll_rules_time_window_check;

alter table public.company_payroll_rules
add constraint company_payroll_rules_time_window_check
check (
  normal_end_time is null
  or overtime_trigger_time is null
  or overtime_trigger_time >= normal_end_time
);

alter table public.company_payroll_rules
drop constraint if exists company_payroll_rules_friday_time_window_check;

alter table public.company_payroll_rules
add constraint company_payroll_rules_friday_time_window_check
check (
  friday_normal_end_time is null
  or friday_overtime_trigger_time is null
  or friday_overtime_trigger_time >= friday_normal_end_time
);

create or replace function public.touch_company_payroll_rules_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_company_payroll_rules_updated_at on public.company_payroll_rules;
create trigger touch_company_payroll_rules_updated_at
before update on public.company_payroll_rules
for each row
execute function public.touch_company_payroll_rules_updated_at();

drop trigger if exists set_company_payroll_rules_company_name on public.company_payroll_rules;
create trigger set_company_payroll_rules_company_name
before insert or update of company_id on public.company_payroll_rules
for each row
execute function public.set_company_name_from_company_id();

insert into public.company_payroll_rules (company_id, company_name)
select id, name
from public.companies
on conflict (company_id)
do update set company_name = excluded.company_name;

alter table public.company_payroll_rules enable row level security;

drop policy if exists "members can view company payroll rules" on public.company_payroll_rules;
create policy "members can view company payroll rules"
on public.company_payroll_rules for select
to authenticated
using (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = company_payroll_rules.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
  )
);

drop policy if exists "company admins can manage company payroll rules" on public.company_payroll_rules;
create policy "company admins can manage company payroll rules"
on public.company_payroll_rules for all
to authenticated
using (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = company_payroll_rules.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = company_payroll_rules.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.role in ('owner', 'admin')
  )
);
