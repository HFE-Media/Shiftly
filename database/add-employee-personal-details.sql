alter table public.employees
add column if not exists id_number text,
add column if not exists employment_date date;

create index if not exists employees_company_employment_date_idx
on public.employees (company_id, employment_date);
