-- Shiftly clean Supabase test-project schema.
-- Use this ONLY in the new test project, not the live project.

create extension if not exists pgcrypto;

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  plan text not null default 'premium',
  status text not null default 'active' check (status in ('active', 'paused', 'cancelled')),
  created_at timestamptz not null default now()
);

create table public.company_users (
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  role text not null default 'supervisor' check (role in ('owner', 'admin', 'supervisor', 'viewer')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (company_id, user_id)
);

create or replace function public.generate_company_site_id(p_company_id uuid)
returns text
language plpgsql
as $$
declare
  next_num integer;
begin
  select coalesce(max(substring(site_id from 2)::integer), 0) + 1
  into next_num
  from public.sites
  where company_id = p_company_id
    and site_id ~ '^S[0-9]+$';

  return 'S' || lpad(next_num::text, 2, '0');
end;
$$;

create or replace function public.set_site_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.site_id is null or trim(new.site_id) = '' then
    new.site_id := public.generate_company_site_id(new.company_id);
  else
    new.site_id := upper(trim(new.site_id));
  end if;

  select c.name into new.company_name
  from public.companies c
  where c.id = new.company_id;

  return new;
end;
$$;

create table public.sites (
  site_id text not null,
  company_id uuid not null references public.companies(id) on delete cascade,
  company_name text not null,
  name text not null,
  lat double precision not null,
  lon double precision not null,
  radius_m integer not null check (radius_m >= 20 and radius_m <= 25000),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint sites_pkey primary key (company_id, site_id)
);

create table public.employees (
  employee_id text not null,
  company_id uuid not null references public.companies(id) on delete cascade,
  full_name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (company_id, employee_id)
);

create table public.admins (
  admin_id bigint generated always as identity not null,
  code text not null,
  company_id uuid not null references public.companies(id) on delete cascade,
  full_name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint admins_pkey primary key (admin_id),
  constraint admins_company_code_key unique (company_id, code)
);

create table public.supervisors (
  supervisor_id text not null,
  company_id uuid not null references public.companies(id) on delete cascade,
  code text not null,
  full_name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint supervisors_pkey primary key (company_id, supervisor_id),
  constraint supervisors_company_code_key unique (company_id, code)
);

create table public.clock_events (
  id bigint generated always as identity primary key,
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id text not null,
  site_id text not null,
  action text not null check (action in ('IN', 'OUT')),
  supervisor_code text not null,
  lat double precision not null,
  lon double precision not null,
  accuracy_m integer not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  foreign key (company_id, employee_id) references public.employees(company_id, employee_id),
  foreign key (company_id, site_id) references public.sites(company_id, site_id)
);

create index sites_company_id_idx on public.sites(company_id);
create index sites_site_id_idx on public.sites(site_id);
create index employees_company_id_idx on public.employees(company_id);
create index admins_company_id_idx on public.admins(company_id);
create index admins_code_idx on public.admins(code);
create index supervisors_company_code_idx on public.supervisors(company_id, code);
create index company_users_user_id_idx on public.company_users(user_id);
create index company_users_email_idx on public.company_users(email);
create index clock_events_company_employee_created_idx on public.clock_events(company_id, employee_id, created_at desc);

alter table public.companies enable row level security;
alter table public.company_users enable row level security;
alter table public.sites enable row level security;
alter table public.employees enable row level security;
alter table public.admins enable row level security;
alter table public.supervisors enable row level security;
alter table public.clock_events enable row level security;

create trigger set_site_defaults
before insert or update of company_id, site_id
on public.sites
for each row
execute function public.set_site_defaults();

create policy "members can view their companies"
on public.companies for select
to authenticated
using (
  exists (
    select 1 from public.company_users cu
    where cu.company_id = companies.id
      and cu.user_id = auth.uid()
      and cu.active = true
  )
);

create policy "users can view own memberships"
on public.company_users for select
to authenticated
using (user_id = auth.uid() and active = true);

create policy "members can view company sites"
on public.sites for select
to authenticated
using (
  exists (
    select 1 from public.company_users cu
    where cu.company_id = sites.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
  )
);

create policy "admins can manage company sites"
on public.sites for all
to authenticated
using (
  exists (
    select 1 from public.company_users cu
    where cu.company_id = sites.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1 from public.company_users cu
    where cu.company_id = sites.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.role in ('owner', 'admin')
  )
);

create policy "members can view company employees"
on public.employees for select
to authenticated
using (
  exists (
    select 1 from public.company_users cu
    where cu.company_id = employees.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
  )
);

create policy "members can validate company admin codes"
on public.admins for select
to authenticated
using (
  exists (
    select 1 from public.company_users cu
    where cu.company_id = admins.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
  )
);

create policy "members can view company supervisors"
on public.supervisors for select
to authenticated
using (
  exists (
    select 1 from public.company_users cu
    where cu.company_id = supervisors.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
  )
);

create policy "members can view company clock events"
on public.clock_events for select
to authenticated
using (
  exists (
    select 1 from public.company_users cu
    where cu.company_id = clock_events.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
  )
);

create or replace function public.distance_meters(
  lat1 double precision,
  lon1 double precision,
  lat2 double precision,
  lon2 double precision
) returns double precision
language sql
immutable
as $$
  select 6371000 * 2 * asin(
    sqrt(
      power(sin(radians((lat2 - lat1) / 2)), 2) +
      cos(radians(lat1)) * cos(radians(lat2)) *
      power(sin(radians((lon2 - lon1) / 2)), 2)
    )
  );
$$;

create or replace function public.clock_batch(
  p_company_id uuid,
  p_action text,
  p_supervisor_code text,
  p_site_id text,
  p_lat double precision,
  p_lon double precision,
  p_accuracy_m integer,
  p_employee_ids text[]
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_member boolean;
  v_site sites%rowtype;
  v_distance double precision;
  v_emp_id text;
  v_emp employees%rowtype;
  v_supervisor supervisors%rowtype;
  v_last_action text;
  v_results jsonb := '[]'::jsonb;
  v_ok boolean;
  v_message text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select exists (
    select 1 from public.company_users cu
    where cu.company_id = p_company_id
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.role in ('owner', 'admin', 'supervisor')
  ) into v_is_member;

  if not v_is_member then
    raise exception 'No access to this company';
  end if;

  if p_action not in ('IN', 'OUT') then
    raise exception 'Invalid clock action';
  end if;

  if p_accuracy_m > 50 then
    raise exception 'GPS accuracy too low';
  end if;

  select * into v_site
  from public.sites
  where site_id = p_site_id
    and company_id = p_company_id
    and active = true;

  if not found then
    raise exception 'Site not found for this company';
  end if;

  v_distance := public.distance_meters(p_lat, p_lon, v_site.lat, v_site.lon);
  if v_distance > v_site.radius_m then
    raise exception 'Outside site radius';
  end if;

  select * into v_supervisor
  from public.supervisors
  where company_id = p_company_id
    and code = upper(trim(p_supervisor_code))
    and active = true;

  if not found then
    raise exception 'Invalid supervisor code';
  end if;

  foreach v_emp_id in array p_employee_ids loop
    v_ok := false;
    v_message := '';

    select * into v_emp
    from public.employees
    where company_id = p_company_id
      and employee_id = upper(trim(v_emp_id))
      and active = true;

    if not found then
      v_message := 'Employee not found or inactive';
    else
      select ce.action into v_last_action
      from public.clock_events ce
      where ce.company_id = p_company_id
        and ce.employee_id = v_emp.employee_id
      order by ce.created_at desc, ce.id desc
      limit 1;

      if p_action = 'IN' and v_last_action = 'IN' then
        v_message := 'Already clocked in';
      elsif p_action = 'OUT' and coalesce(v_last_action, 'OUT') <> 'IN' then
        v_message := 'Not clocked in';
      else
        insert into public.clock_events (
          company_id, employee_id, site_id, action, supervisor_code,
          lat, lon, accuracy_m, created_by
        ) values (
          p_company_id, v_emp.employee_id, p_site_id, p_action, v_supervisor.code,
          p_lat, p_lon, p_accuracy_m, auth.uid()
        );

        v_ok := true;
        v_message := 'Clocked ' || p_action;
      end if;
    end if;

    v_results := v_results || jsonb_build_array(jsonb_build_object(
      'employeeId', upper(trim(v_emp_id)),
      'employeeName', coalesce(v_emp.full_name, ''),
      'supervisorId', coalesce(v_supervisor.supervisor_id, ''),
      'supervisorName', coalesce(v_supervisor.full_name, ''),
      'ok', v_ok,
      'message', v_message
    ));
  end loop;

  return jsonb_build_object('results', v_results);
end;
$$;

grant execute on function public.clock_batch(uuid, text, text, text, double precision, double precision, integer, text[]) to authenticated;

-- After creating a user in Supabase Auth, run these examples with real values:
-- insert into public.companies (name, slug) values ('Test Company', 'test-company') returning id;
-- insert into public.company_users (company_id, user_id, email, full_name, role) values ('COMPANY_ID', 'AUTH_USER_ID', 'user@example.com', 'User Name', 'owner');
-- insert into public.admins (company_id, code, full_name) values ('COMPANY_ID', '999111', 'Admin Name');
-- insert into public.supervisors (company_id, supervisor_id, code, full_name) values ('COMPANY_ID', 'SUP01', '384981', 'Supervisor Name');
-- insert into public.sites (company_id, company_name, name, lat, lon, radius_m) values ('COMPANY_ID', 'Company Name', 'Test Site', -26.2041, 28.0473, 2000);
-- insert into public.employees (company_id, employee_id, full_name) values ('COMPANY_ID', 'E001', 'Test Employee');
