alter table public.employees
add column if not exists pay_type text not null default 'hourly',
add column if not exists pay_cycle text not null default 'fortnightly',
add column if not exists rate numeric(10,2);

alter table public.employees
drop constraint if exists employees_pay_type_check;

alter table public.employees
add constraint employees_pay_type_check
check (pay_type in ('hourly', 'daily', 'monthly'));

alter table public.employees
drop constraint if exists employees_pay_cycle_check;

alter table public.employees
add constraint employees_pay_cycle_check
check (pay_cycle in ('weekly', 'fortnightly', 'monthly'));

create index if not exists employees_company_payroll_idx
on public.employees(company_id, pay_type, pay_cycle);

create index if not exists employees_company_rate_idx
on public.employees(company_id, rate);
