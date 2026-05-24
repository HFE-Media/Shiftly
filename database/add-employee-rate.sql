alter table public.employees
add column if not exists rate numeric(10,2);

create index if not exists employees_company_rate_idx
on public.employees(company_id, rate);
