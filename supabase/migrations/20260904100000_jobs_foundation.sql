-- UNEXECUTED: review against the deployed catalog before execution.
-- Atomic, one-time additive migration. Existing object names cause rollback;
-- intentionally do not use CREATE OR REPLACE against unknown deployed functions.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

alter table public.companies add column jobs_enabled boolean not null default false;

-- Entitlement belongs to Shiftly platform administration, not customer managers.
-- No session_user bypass: Supabase connections may share a database login.
create function public.enforce_jobs_enabled_update() returns trigger
language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if (tg_op = 'INSERT' and new.jobs_enabled) or
     (tg_op = 'UPDATE' and new.jobs_enabled is distinct from old.jobs_enabled) then
    if coalesce(auth.role(), '') <> 'service_role'
       and not coalesce(public.is_platform_admin(auth.uid()), false) then
      raise exception 'Only a platform administrator can change Jobs entitlement' using errcode='42501';
    end if;
  end if;
  return new;
end $$;
create trigger enforce_jobs_enabled_update before insert or update of jobs_enabled
on public.companies for each row execute function public.enforce_jobs_enabled_update();

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  job_number text not null,
  title text not null check (btrim(title) <> ''),
  client_name text not null check (btrim(client_name) <> ''),
  client_contact_name text not null default '',
  client_email text not null default '',
  client_contact_phone text not null default '',
  site_id text,
  site_name text not null default '',
  service_address text not null default '',
  company_name text not null,
  company_logo_url text not null default '',
  description text not null default '',
  scheduled_start_at timestamptz,
  scheduled_end_at timestamptz,
  lifecycle_status text not null default 'draft' check (lifecycle_status in
    ('draft','scheduled','in_progress','submitted_for_review','correction_required','completed','cancelled')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  created_by uuid,
  created_actor_name text not null,
  submitted_for_review_at timestamptz,
  submitted_for_review_by uuid,
  submitted_actor_name text,
  correction_reason text,
  corrected_at timestamptz,
  corrected_by uuid,
  corrected_actor_name text,
  completed_at timestamptz,
  completed_by uuid,
  completed_actor_name text,
  completion_outcome text check (completion_outcome in
    ('completed','partially_completed','return_visit_required','quotation_required')),
  cancelled_at timestamptz,
  cancelled_by uuid,
  cancelled_actor_name text,
  cancel_reason text,
  revision bigint not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id,id), unique(company_id,job_number),
  check(job_number ~ '^JC-[0-9]{4}-[0-9]{4,}$'),
  check(scheduled_end_at is null or (scheduled_start_at is not null and scheduled_end_at >= scheduled_start_at)),
  check(lifecycle_status = 'draft' or lifecycle_status = 'cancelled' or scheduled_start_at is not null),
  check(lifecycle_status <> 'submitted_for_review' or (submitted_for_review_at is not null and submitted_actor_name is not null)),
  check(lifecycle_status <> 'correction_required' or (nullif(btrim(correction_reason),'') is not null and corrected_at is not null)),
  check((lifecycle_status = 'completed') = (completed_at is not null)),
  check(lifecycle_status <> 'completed' or (completed_actor_name is not null and completion_outcome is not null)),
  check(lifecycle_status = 'completed' or (completed_by is null and completed_actor_name is null and completion_outcome is null)),
  check((lifecycle_status = 'cancelled') = (cancelled_at is not null)),
  check(lifecycle_status <> 'cancelled' or (nullif(btrim(cancel_reason),'') is not null and cancelled_actor_name is not null)),
  foreign key(company_id,site_id) references public.sites(company_id,site_id) on update cascade on delete set null(site_id),
  foreign key(company_id,created_by) references public.company_users(company_id,user_id) on delete set null(created_by),
  foreign key(company_id,submitted_for_review_by) references public.company_users(company_id,user_id) on delete set null(submitted_for_review_by),
  foreign key(company_id,corrected_by) references public.company_users(company_id,user_id) on delete set null(corrected_by),
  foreign key(company_id,completed_by) references public.company_users(company_id,user_id) on delete set null(completed_by),
  foreign key(company_id,cancelled_by) references public.company_users(company_id,user_id) on delete set null(cancelled_by)
);

create table public.job_number_counters (
  company_id uuid not null references public.companies(id) on delete restrict,
  number_year integer not null check(number_year between 2000 and 9999),
  last_number bigint not null check(last_number > 0),
  primary key(company_id,number_year)
);
create function public.jobs_next_job_number(p_company_id uuid,p_year integer) returns text
language plpgsql security definer set search_path=pg_catalog,public as $$
declare n bigint;
begin
  insert into public.job_number_counters values(p_company_id,p_year,1)
  on conflict(company_id,number_year) do update set last_number=job_number_counters.last_number+1
  returning last_number into n;
  return 'JC-'||p_year||'-'||lpad(n::text,greatest(4,length(n::text)),'0');
end $$;

create table public.job_assignments (
  id uuid primary key default gen_random_uuid(), company_id uuid not null, job_id uuid not null,
  employee_id text not null, employee_name text not null,
  assignment_role text not null check(assignment_role in ('lead','member')),
  assigned_by uuid, assigned_actor_name text not null, assigned_at timestamptz not null default now(),
  unassigned_at timestamptz,
  unique(company_id,job_id,id),
  foreign key(company_id,job_id) references public.jobs(company_id,id) on delete restrict,
  foreign key(company_id,employee_id) references public.employees(company_id,employee_id) on update cascade on delete restrict,
  foreign key(company_id,assigned_by) references public.company_users(company_id,user_id) on delete set null(assigned_by),
  check(unassigned_at is null or unassigned_at >= assigned_at)
);
create unique index job_assignments_active_employee_key on public.job_assignments(company_id,job_id,employee_id) where unassigned_at is null;
create unique index job_assignments_active_lead_key on public.job_assignments(company_id,job_id) where unassigned_at is null and assignment_role='lead';
create index job_assignments_employee_history_idx on public.job_assignments(company_id,employee_id,job_id);

create table public.job_time_entries (
  id uuid primary key default gen_random_uuid(), company_id uuid not null, job_id uuid not null,
  employee_id text not null, employee_name text not null,
  started_at timestamptz not null default now(), ended_at timestamptz,
  started_by uuid, ended_by uuid,
  unique(company_id,job_id,id),
  foreign key(company_id,job_id) references public.jobs(company_id,id) on delete restrict,
  foreign key(company_id,employee_id) references public.employees(company_id,employee_id) on update cascade on delete restrict,
  foreign key(company_id,started_by) references public.company_users(company_id,user_id) on delete set null(started_by),
  foreign key(company_id,ended_by) references public.company_users(company_id,user_id) on delete set null(ended_by),
  check(ended_at is null or ended_at >= started_at)
);
create unique index job_time_entries_employee_open_key on public.job_time_entries(company_id,employee_id) where ended_at is null;
create index job_time_entries_job_time_idx on public.job_time_entries(company_id,job_id,started_at);

create table public.job_work_days (
  id uuid primary key default gen_random_uuid(), company_id uuid not null, job_id uuid not null,
  session_id uuid not null unique, employee_id text not null, actor_name text not null,
  work_date date not null, work_performed text not null check(btrim(work_performed) <> ''),
  notes text not null default '', created_at timestamptz not null default now(),
  unique(company_id,job_id,id),
  foreign key(company_id,job_id,session_id) references public.job_time_entries(company_id,job_id,id) on delete restrict,
  foreign key(company_id,job_id) references public.jobs(company_id,id) on delete restrict
);

-- Evidence is append-only via RPC. Session links group evidence by work record;
-- a second session on the same calendar date creates a separate work record.
create table public.job_materials (
  id uuid primary key default gen_random_uuid(), company_id uuid not null, job_id uuid not null, session_id uuid,
  description text not null check(btrim(description) <> ''), quantity numeric not null check(quantity > 0 and quantity < 1000000000),
  unit text not null check(btrim(unit) <> ''), actor_user_id uuid, actor_employee_id text, actor_name text not null,
  created_at timestamptz not null default now(),
  foreign key(company_id,job_id) references public.jobs(company_id,id) on delete restrict,
  foreign key(company_id,job_id,session_id) references public.job_time_entries(company_id,job_id,id) on delete restrict
);
create table public.job_test_results (
  id uuid primary key default gen_random_uuid(), company_id uuid not null, job_id uuid not null, session_id uuid,
  description text not null check(btrim(description) <> ''), result text not null check(btrim(result) <> ''), note text not null default '',
  actor_user_id uuid, actor_employee_id text, actor_name text not null, created_at timestamptz not null default now(),
  foreign key(company_id,job_id) references public.jobs(company_id,id) on delete restrict,
  foreign key(company_id,job_id,session_id) references public.job_time_entries(company_id,job_id,id) on delete restrict
);
create table public.job_notes (
  id uuid primary key default gen_random_uuid(), company_id uuid not null, job_id uuid not null, session_id uuid,
  note text not null check(btrim(note) <> ''), actor_user_id uuid, actor_employee_id text, actor_name text not null,
  created_at timestamptz not null default now(),
  foreign key(company_id,job_id) references public.jobs(company_id,id) on delete restrict,
  foreign key(company_id,job_id,session_id) references public.job_time_entries(company_id,job_id,id) on delete restrict
);
-- Future PRIVATE bucket: shiftly-jobs-media. Immutable paths:
-- <company UUID>/<job UUID>/photos/<object UUID>.(jpg|jpeg|png|webp)
-- <company UUID>/<job UUID>/signatures/<object UUID>.png
-- No Storage policies/bucket are created here. Metadata registration stays
-- blocked until a matching private object actually exists; signed URLs are
-- resolved at read time and never stored in completion snapshots.
create table public.job_photos (
  id uuid primary key default gen_random_uuid(), company_id uuid not null, job_id uuid not null, session_id uuid,
  object_path text not null unique, category text not null check(category in ('before','during','after','other')),
  note text not null default '', actor_user_id uuid, actor_employee_id text, actor_name text not null,
  created_at timestamptz not null default now(),
  foreign key(company_id,job_id) references public.jobs(company_id,id) on delete restrict,
  foreign key(company_id,job_id,session_id) references public.job_time_entries(company_id,job_id,id) on delete restrict
);
create table public.job_client_signoffs (
  id uuid primary key default gen_random_uuid(), company_id uuid not null, job_id uuid not null,
  client_name text not null default '', signed_at timestamptz not null default now(),
  signature_object_path text unique, unavailable_reason text,
  actor_user_id uuid, actor_employee_id text, actor_name text not null,
  foreign key(company_id,job_id) references public.jobs(company_id,id) on delete restrict,
  check ((signature_object_path is not null and btrim(client_name) <> '' and unavailable_reason is null)
    or (signature_object_path is null and nullif(btrim(unavailable_reason),'') is not null))
);
create table public.job_activity (
  id uuid primary key default gen_random_uuid(), company_id uuid not null, job_id uuid not null,
  event_type text not null, actor_user_id uuid, actor_employee_id text,
  actor_name text not null, actor_role text not null, occurred_at timestamptz not null default now(),
  summary text not null, metadata jsonb not null default '{}' check(jsonb_typeof(metadata)='object'),
  foreign key(company_id,job_id) references public.jobs(company_id,id) on delete restrict
);
-- Snapshot identity fields above are deliberately scalar, not live FKs. They
-- describe the historical actor, not a new authorization relationship.
create table public.job_completion_snapshots (
  id uuid primary key default gen_random_uuid(), company_id uuid not null, job_id uuid not null unique,
  schema_version integer not null default 1 check(schema_version=1),
  payload jsonb not null check(jsonb_typeof(payload)='object'),
  created_at timestamptz not null default now(),
  foreign key(company_id,job_id) references public.jobs(company_id,id) on delete restrict
);

create function public.can_manage_company_jobs(p_company_id uuid) returns boolean
language sql stable security definer set search_path=pg_catalog,public as $$
  select auth.uid() is not null and exists(select 1 from public.companies c
    join public.company_users u on u.company_id=c.id where c.id=p_company_id and c.jobs_enabled
    and c.status='active' and u.user_id=auth.uid() and u.active and u.role in ('owner','admin'));
$$;
create function public.can_access_company_jobs(p_company_id uuid) returns boolean
language sql stable security definer set search_path=pg_catalog,public as $$
  select auth.uid() is not null and exists(select 1 from public.companies c
    join public.company_users u on u.company_id=c.id where c.id=p_company_id and c.jobs_enabled and c.status='active'
    and u.user_id=auth.uid() and u.active and (u.role in ('owner','admin') or (u.role='supervisor'
      and exists(select 1 from public.employees e where e.company_id=c.id and e.employee_id=u.employee_id and e.active))));
$$;
create function public.can_access_job(p_company_id uuid,p_job_id uuid) returns boolean
language sql stable security definer set search_path=pg_catalog,public as $$
  select public.can_manage_company_jobs(p_company_id) or (public.can_access_company_jobs(p_company_id)
    and exists(select 1 from public.company_users u join public.job_assignments a
      on a.company_id=u.company_id and a.employee_id=u.employee_id
      where u.company_id=p_company_id and u.user_id=auth.uid() and u.active and u.role='supervisor'
      and a.job_id=p_job_id and a.unassigned_at is null));
$$;

-- All mutation RPCs use the same lock order: company -> membership -> Job ->
-- employee/session. Flag changes conflict with company SHARE locks, preventing
-- mutations from crossing an entitlement revocation transaction.
create function public.jobs_actor(p_company_id uuid) returns public.company_users
language plpgsql security definer set search_path=pg_catalog,public as $$
declare a public.company_users;
begin
  perform 1 from public.companies where id=p_company_id and jobs_enabled and status='active' for share;
  if not found or auth.uid() is null then raise exception 'Jobs disabled or session expired' using errcode='42501'; end if;
  select * into a from public.company_users where company_id=p_company_id and user_id=auth.uid() and active for share;
  if not found or a.role not in ('owner','admin','supervisor') then raise exception 'Jobs access denied' using errcode='42501'; end if;
  if a.role='supervisor' then
    perform 1 from public.employees where company_id=p_company_id and employee_id=a.employee_id and active for share;
    if not found then raise exception 'Active linked Supervisor employee required' using errcode='42501'; end if;
  end if;
  return a;
end $$;
create function public.jobs_lock(p_company_id uuid,p_job_id uuid,p_revision bigint) returns public.jobs
language plpgsql security definer set search_path=pg_catalog,public as $$
declare j public.jobs;
begin
  perform public.jobs_actor(p_company_id);
  select * into j from public.jobs where company_id=p_company_id and id=p_job_id for update;
  if not found or not public.can_access_job(p_company_id,p_job_id) then raise exception 'Job access denied' using errcode='42501'; end if;
  if p_revision is null or j.revision<>p_revision then raise exception 'Job changed. Refresh and try again.' using errcode='40001'; end if;
  if j.lifecycle_status in ('completed','cancelled') then raise exception 'Closed Job is read-only'; end if;
  return j;
end $$;
create function public.jobs_log(p_company_id uuid,p_job_id uuid,p_event text,p_summary text,p_metadata jsonb default '{}') returns void
language plpgsql security definer set search_path=pg_catalog,public as $$
declare a public.company_users;
begin
  a:=public.jobs_actor(p_company_id);
  insert into public.job_activity(company_id,job_id,event_type,actor_user_id,actor_employee_id,actor_name,actor_role,summary,metadata)
  values(p_company_id,p_job_id,p_event,a.user_id,a.employee_id,coalesce(nullif(a.full_name,''),'User'),a.role,p_summary,p_metadata);
end $$;
create function public.jobs_touch(p_company_id uuid,p_job_id uuid) returns bigint
language sql security definer set search_path=pg_catalog,public as $$
  update public.jobs set revision=revision+1,updated_at=now() where company_id=p_company_id and id=p_job_id returning revision;
$$;
create function public.jobs_require_lead(p_company_id uuid,p_job_id uuid) returns text
language plpgsql security definer set search_path=pg_catalog,public as $$
declare e text;
begin
  select a.employee_id into e from public.job_assignments a join public.employees x
    on x.company_id=a.company_id and x.employee_id=a.employee_id
    where a.company_id=p_company_id and a.job_id=p_job_id and a.assignment_role='lead' and a.unassigned_at is null and x.active
    and exists(select 1 from public.company_users u where u.company_id=a.company_id and u.employee_id=a.employee_id
      and u.active and u.role='supervisor');
  if e is null then raise exception 'An active linked Supervisor lead is required'; end if;
  return e;
end $$;
create function public.jobs_no_open_sessions(p_company_id uuid,p_job_id uuid) returns void
language plpgsql security definer set search_path=pg_catalog,public as $$
declare names text;
begin
  select string_agg(employee_name,', ') into names from public.job_time_entries
    where company_id=p_company_id and job_id=p_job_id and ended_at is null;
  if names is not null then raise exception 'Finish all open Job sessions before continuing: %',names; end if;
end $$;

-- No browser direct writes anywhere. Triggers additionally protect historical
-- data against accidental privileged edits. FK identity cleanup remains allowed.
create function public.jobs_protect_history() returns trigger
language plpgsql set search_path=pg_catalog,public as $$
declare closed boolean;
begin
  if tg_op='DELETE' then raise exception 'Jobs history cannot be hard deleted'; end if;
  if tg_table_name in ('job_activity','job_completion_snapshots') and tg_op='UPDATE' then
    raise exception 'Historical record is append-only';
  end if;
  if tg_table_name='jobs' then
    if tg_op='UPDATE' and old.lifecycle_status in ('completed','cancelled') and
      (to_jsonb(new)-array['site_id','created_by','submitted_for_review_by','corrected_by','completed_by','cancelled_by'])
      is distinct from
      (to_jsonb(old)-array['site_id','created_by','submitted_for_review_by','corrected_by','completed_by','cancelled_by']) then
      raise exception 'Closed Job is immutable';
    end if;
  else
    select lifecycle_status in ('completed','cancelled') into closed from public.jobs
      where company_id=new.company_id and id=new.job_id;
    if closed and tg_table_name not in ('job_activity','job_completion_snapshots') then
      if tg_op='UPDATE' and tg_table_name in ('job_assignments','job_time_entries') and
        (to_jsonb(new)-array['employee_id','assigned_by','started_by','ended_by']) =
        (to_jsonb(old)-array['employee_id','assigned_by','started_by','ended_by']) then return new; end if;
      raise exception 'Closed Job evidence is immutable';
    end if;
  end if;
  return new;
end $$;

create function public.create_job(p_company_id uuid,p_data jsonb) returns public.jobs
language plpgsql security definer set search_path=pg_catalog,public as $$
declare a public.company_users; j public.jobs; c public.companies; s text; sn text:='';
begin
  a:=public.jobs_actor(p_company_id);
  if not public.can_manage_company_jobs(p_company_id) then raise exception 'Manager required' using errcode='42501'; end if;
  select * into c from public.companies where id=p_company_id;
  s:=nullif(upper(btrim(p_data->>'site_id')),'');
  if s is not null then
    select name into sn from public.sites where company_id=p_company_id and site_id=s and active for share;
    if not found then raise exception 'Active company site required'; end if;
  end if;
  insert into public.jobs(company_id,job_number,title,client_name,client_contact_name,client_email,client_contact_phone,
    site_id,site_name,service_address,company_name,company_logo_url,description,priority,created_by,created_actor_name)
  values(p_company_id,public.jobs_next_job_number(p_company_id,extract(year from now() at time zone 'UTC')::int),
    btrim(p_data->>'title'),btrim(p_data->>'client_name'),coalesce(p_data->>'client_contact_name',''),
    coalesce(p_data->>'client_email',''),coalesce(p_data->>'client_contact_phone',''),s,coalesce(sn,''),
    coalesce(p_data->>'service_address',''),c.name,coalesce(c.logo_url,''),coalesce(p_data->>'description',''),
    coalesce(p_data->>'priority','normal'),a.user_id,a.full_name) returning * into j;
  perform public.jobs_log(p_company_id,j.id,'job_created','Job created');
  return j;
end $$;

create function public.assign_job_employee(p_company_id uuid,p_job_id uuid,p_revision bigint,p_employee_id text,p_assignment_role text default 'member') returns bigint
language plpgsql security definer set search_path=pg_catalog,public as $$
declare j public.jobs; a public.company_users; n text; e text:=upper(btrim(p_employee_id));
begin
  j:=public.jobs_lock(p_company_id,p_job_id,p_revision); a:=public.jobs_actor(p_company_id);
  if a.role not in ('owner','admin') then raise exception 'Manager required' using errcode='42501'; end if;
  if j.lifecycle_status='submitted_for_review' then raise exception 'Return Job for correction before changing team'; end if;
  select full_name into n from public.employees where company_id=p_company_id and employee_id=e and active for share;
  if not found then raise exception 'Active company employee required'; end if;
  if p_assignment_role='lead' and not exists(select 1 from public.company_users where company_id=p_company_id and employee_id=e and active and role='supervisor') then
    raise exception 'Lead must be a linked Supervisor';
  end if;
  insert into public.job_assignments(company_id,job_id,employee_id,employee_name,assignment_role,assigned_by,assigned_actor_name)
    values(p_company_id,p_job_id,e,n,p_assignment_role,a.user_id,a.full_name);
  perform public.jobs_log(p_company_id,p_job_id,'assignment_added','Assigned '||n,jsonb_build_object('employee_id',e,'role',p_assignment_role));
  return public.jobs_touch(p_company_id,p_job_id);
end $$;

create function public.replace_job_lead(p_company_id uuid,p_job_id uuid,p_revision bigint,p_employee_id text) returns bigint
language plpgsql security definer set search_path=pg_catalog,public as $$
declare j public.jobs; a public.company_users; e text:=upper(btrim(p_employee_id)); n text;
begin
  j:=public.jobs_lock(p_company_id,p_job_id,p_revision); a:=public.jobs_actor(p_company_id);
  if a.role not in ('owner','admin') then raise exception 'Manager required' using errcode='42501'; end if;
  if j.lifecycle_status='submitted_for_review' then raise exception 'Return for correction before replacing lead'; end if;
  perform public.jobs_no_open_sessions(p_company_id,p_job_id);
  select x.full_name into n from public.employees x where x.company_id=p_company_id and x.employee_id=e and x.active
    and exists(select 1 from public.company_users u where u.company_id=p_company_id and u.employee_id=e and u.active and u.role='supervisor') for share;
  if not found then raise exception 'Active linked Supervisor lead required'; end if;
  update public.job_assignments set unassigned_at=now() where company_id=p_company_id and job_id=p_job_id
    and unassigned_at is null and (assignment_role='lead' or employee_id=e);
  insert into public.job_assignments(company_id,job_id,employee_id,employee_name,assignment_role,assigned_by,assigned_actor_name)
    values(p_company_id,p_job_id,e,n,'lead',a.user_id,a.full_name);
  perform public.jobs_log(p_company_id,p_job_id,'lead_changed','Lead replaced with '||n);
  return public.jobs_touch(p_company_id,p_job_id);
end $$;
create function public.unassign_job_employee(p_company_id uuid,p_job_id uuid,p_revision bigint,p_employee_id text) returns bigint
language plpgsql security definer set search_path=pg_catalog,public as $$
declare j public.jobs; ar text;
begin
  j:=public.jobs_lock(p_company_id,p_job_id,p_revision);
  if not public.can_manage_company_jobs(p_company_id) then raise exception 'Manager required' using errcode='42501'; end if;
  if j.lifecycle_status='submitted_for_review' then raise exception 'Return for correction before changing team'; end if;
  select assignment_role into ar from public.job_assignments where company_id=p_company_id and job_id=p_job_id and employee_id=p_employee_id and unassigned_at is null;
  if not found then raise exception 'Active assignment not found'; end if;
  if ar='lead' and j.lifecycle_status<>'draft' then raise exception 'Replace the lead atomically'; end if;
  if exists(select 1 from public.job_time_entries where company_id=p_company_id and job_id=p_job_id and employee_id=p_employee_id and ended_at is null) then raise exception 'Employee has an open Job session'; end if;
  update public.job_assignments set unassigned_at=now() where company_id=p_company_id and job_id=p_job_id and employee_id=p_employee_id and unassigned_at is null;
  perform public.jobs_log(p_company_id,p_job_id,'assignment_removed','Assignment ended',jsonb_build_object('employee_id',p_employee_id));
  return public.jobs_touch(p_company_id,p_job_id);
end $$;

create function public.schedule_job(p_company_id uuid,p_job_id uuid,p_revision bigint,p_start timestamptz,p_end timestamptz default null) returns bigint
language plpgsql security definer set search_path=pg_catalog,public as $$
declare j public.jobs;
begin
  j:=public.jobs_lock(p_company_id,p_job_id,p_revision);
  if not public.can_manage_company_jobs(p_company_id) then raise exception 'Manager required' using errcode='42501'; end if;
  if j.lifecycle_status not in ('draft','scheduled') or p_start is null then raise exception 'Draft/scheduled Job and start time required'; end if;
  perform public.jobs_require_lead(p_company_id,p_job_id);
  update public.jobs set lifecycle_status='scheduled',scheduled_start_at=p_start,scheduled_end_at=p_end where id=p_job_id;
  perform public.jobs_log(p_company_id,p_job_id,case when j.lifecycle_status='draft' then 'job_scheduled' else 'job_rescheduled' end,'Job scheduled',jsonb_build_object('start',p_start,'end',p_end));
  return public.jobs_touch(p_company_id,p_job_id);
end $$;
-- Atomic creation used by Create Job: a failed assignment/schedule rolls back
-- the draft and counter. A date alone is never an implicit state transition.
create function public.create_job_with_team(p_company_id uuid,p_data jsonb,p_team text[],p_lead text,p_schedule boolean default false,p_start timestamptz default null) returns public.jobs
language plpgsql security definer set search_path=pg_catalog,public as $$
declare j public.jobs; e text; r bigint;
begin
  j:=public.create_job(p_company_id,p_data); r:=j.revision;
  r:=public.assign_job_employee(p_company_id,j.id,r,p_lead,'lead');
  for e in select distinct upper(btrim(x)) from unnest(p_team) x where upper(btrim(x))<>upper(btrim(p_lead)) loop
    r:=public.assign_job_employee(p_company_id,j.id,r,e,'member');
  end loop;
  if p_schedule then r:=public.schedule_job(p_company_id,j.id,r,p_start); end if;
  select * into j from public.jobs where id=j.id; return j;
end $$;

create function public.start_job_work(p_company_id uuid,p_job_id uuid,p_revision bigint) returns uuid
language plpgsql security definer set search_path=pg_catalog,public as $$
declare j public.jobs; a public.company_users; tid uuid; n text; prior boolean;
begin
  j:=public.jobs_lock(p_company_id,p_job_id,p_revision); a:=public.jobs_actor(p_company_id);
  if a.role<>'supervisor' then raise exception 'Assigned Supervisor required' using errcode='42501'; end if;
  if j.lifecycle_status not in ('scheduled','in_progress','correction_required') then raise exception 'Job unavailable for work'; end if;
  perform public.jobs_require_lead(p_company_id,p_job_id);
  perform pg_advisory_xact_lock(hashtextextended(p_company_id::text||':jobs:'||a.employee_id,0));
  if exists(select 1 from public.job_time_entries where company_id=p_company_id and employee_id=a.employee_id and ended_at is null) then raise exception 'Finish your open Job session first' using errcode='23505'; end if;
  select full_name into n from public.employees where company_id=p_company_id and employee_id=a.employee_id;
  select exists(select 1 from public.job_time_entries where company_id=p_company_id and job_id=p_job_id) into prior;
  insert into public.job_time_entries(company_id,job_id,employee_id,employee_name,started_by)
    values(p_company_id,p_job_id,a.employee_id,n,a.user_id) returning id into tid;
  update public.jobs set lifecycle_status='in_progress' where id=p_job_id;
  perform public.jobs_log(p_company_id,p_job_id,case when prior then 'job_continued' else 'job_started' end,'Work session started',jsonb_build_object('session_id',tid));
  perform public.jobs_touch(p_company_id,p_job_id); return tid;
end $$;
create function public.finish_work_for_today(p_company_id uuid,p_job_id uuid,p_revision bigint,p_work text,p_notes text default '') returns uuid
language plpgsql security definer set search_path=pg_catalog,public as $$
declare j public.jobs; a public.company_users; t public.job_time_entries; wid uuid;
begin
  j:=public.jobs_lock(p_company_id,p_job_id,p_revision); a:=public.jobs_actor(p_company_id);
  if a.role<>'supervisor' then raise exception 'Assigned Supervisor required' using errcode='42501'; end if;
  if j.lifecycle_status<>'in_progress' or nullif(btrim(p_work),'') is null then raise exception 'In-progress Job and meaningful work record required'; end if;
  select * into t from public.job_time_entries where company_id=p_company_id and job_id=p_job_id and employee_id=a.employee_id and ended_at is null for update;
  if not found then raise exception 'No open session for this Supervisor'; end if;
  insert into public.job_work_days(company_id,job_id,session_id,employee_id,actor_name,work_date,work_performed,notes)
    values(p_company_id,p_job_id,t.id,a.employee_id,t.employee_name,(t.started_at at time zone 'Africa/Johannesburg')::date,btrim(p_work),coalesce(p_notes,'')) returning id into wid;
  update public.job_time_entries set ended_at=now(),ended_by=a.user_id where id=t.id;
  perform public.jobs_log(p_company_id,p_job_id,'work_paused','Finished work for today',jsonb_build_object('session_id',t.id,'work_day_id',wid));
  perform public.jobs_touch(p_company_id,p_job_id); return wid;
end $$;

-- Explicit manager recovery; never triggered by deactivation. Preserves the
-- original start, records a reason, and does not invent completed field work.
create function public.admin_close_job_session(p_company_id uuid,p_job_id uuid,p_revision bigint,p_session_id uuid,p_reason text) returns bigint
language plpgsql security definer set search_path=pg_catalog,public as $$
declare j public.jobs; a public.company_users; t public.job_time_entries;
begin
  j:=public.jobs_lock(p_company_id,p_job_id,p_revision); a:=public.jobs_actor(p_company_id);
  if a.role not in ('owner','admin') then raise exception 'Manager required' using errcode='42501'; end if;
  if nullif(btrim(p_reason),'') is null then raise exception 'Recovery reason required'; end if;
  if j.lifecycle_status not in ('in_progress','correction_required') then raise exception 'Job is not in a recoverable work state'; end if;
  select * into t from public.job_time_entries where company_id=p_company_id and job_id=p_job_id and id=p_session_id and ended_at is null for update;
  if not found then raise exception 'Open session not found for this Job'; end if;
  update public.job_time_entries set ended_at=clock_timestamp(),ended_by=a.user_id where id=t.id;
  perform public.jobs_log(p_company_id,p_job_id,'session_admin_closed',btrim(p_reason),
    jsonb_build_object('session_id',t.id,'employee_id',t.employee_id,'original_started_at',t.started_at,'reason',btrim(p_reason)));
  return public.jobs_touch(p_company_id,p_job_id);
end $$;

create function public.submit_job_for_review(p_company_id uuid,p_job_id uuid,p_revision bigint) returns bigint
language plpgsql security definer set search_path=pg_catalog,public as $$
declare j public.jobs; a public.company_users;
begin
  j:=public.jobs_lock(p_company_id,p_job_id,p_revision); a:=public.jobs_actor(p_company_id);
  if a.role<>'supervisor' or a.employee_id<>public.jobs_require_lead(p_company_id,p_job_id) then raise exception 'Assigned Supervisor lead required' using errcode='42501'; end if;
  if j.lifecycle_status not in ('in_progress','correction_required') then raise exception 'Job is not ready for submission'; end if;
  perform public.jobs_no_open_sessions(p_company_id,p_job_id);
  if not exists(select 1 from public.job_work_days where company_id=p_company_id and job_id=p_job_id and btrim(work_performed)<>'') then raise exception 'Record work before submitting'; end if;
  update public.jobs set lifecycle_status='submitted_for_review',submitted_for_review_at=now(),submitted_for_review_by=a.user_id,
    submitted_actor_name=a.full_name,correction_reason=null where id=p_job_id;
  perform public.jobs_log(p_company_id,p_job_id,case when j.corrected_at is not null then 'resubmitted' else 'submitted_for_review' end,'Submitted for review');
  return public.jobs_touch(p_company_id,p_job_id);
end $$;
create function public.resubmit_job_for_review(p_company_id uuid,p_job_id uuid,p_revision bigint) returns bigint
language plpgsql security definer set search_path=pg_catalog,public as $$
declare j public.jobs;
begin
  j:=public.jobs_lock(p_company_id,p_job_id,p_revision);
  if j.corrected_at is null or j.lifecycle_status not in ('correction_required','in_progress') then raise exception 'No correction awaiting resubmission'; end if;
  return public.submit_job_for_review(p_company_id,p_job_id,p_revision);
end $$;
create function public.return_job_for_correction(p_company_id uuid,p_job_id uuid,p_revision bigint,p_reason text) returns bigint
language plpgsql security definer set search_path=pg_catalog,public as $$
declare j public.jobs; a public.company_users;
begin
  j:=public.jobs_lock(p_company_id,p_job_id,p_revision); a:=public.jobs_actor(p_company_id);
  if not public.can_manage_company_jobs(p_company_id) then raise exception 'Manager required' using errcode='42501'; end if;
  if j.lifecycle_status<>'submitted_for_review' or nullif(btrim(p_reason),'') is null then raise exception 'Submitted Job and correction reason required'; end if;
  update public.jobs set lifecycle_status='correction_required',correction_reason=btrim(p_reason),corrected_at=now(),corrected_by=a.user_id,corrected_actor_name=a.full_name where id=p_job_id;
  perform public.jobs_log(p_company_id,p_job_id,'returned_for_correction',btrim(p_reason));
  return public.jobs_touch(p_company_id,p_job_id);
end $$;

-- Consistent completion data is assembled while the Job row is locked. Every
-- evidence/assignment/session mutation takes that same lock.
create function public.jobs_snapshot(p_company_id uuid,p_job_id uuid) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare payload jsonb; t text; rows jsonb;
begin
  if not public.can_access_job(p_company_id,p_job_id) then raise exception 'Job access denied' using errcode='42501'; end if;
  select jsonb_build_object('schemaVersion',1,'job',to_jsonb(j)) into payload from public.jobs j where company_id=p_company_id and id=p_job_id;
  foreach t in array array['job_assignments','job_time_entries','job_work_days','job_materials','job_test_results','job_notes','job_photos','job_client_signoffs','job_activity'] loop
    execute format('select coalesce(jsonb_agg(to_jsonb(x) order by x.id),''[]''::jsonb) from public.%I x where company_id=$1 and job_id=$2',t) into rows using p_company_id,p_job_id;
    payload:=payload||jsonb_build_object(t,rows);
  end loop;
  return payload;
end $$;
create function public.approve_job_complete(p_company_id uuid,p_job_id uuid,p_revision bigint,p_outcome text default 'completed') returns bigint
language plpgsql security definer set search_path=pg_catalog,public as $$
declare j public.jobs; a public.company_users; r bigint;
begin
  j:=public.jobs_lock(p_company_id,p_job_id,p_revision); a:=public.jobs_actor(p_company_id);
  if not public.can_manage_company_jobs(p_company_id) then raise exception 'Manager required' using errcode='42501'; end if;
  if j.lifecycle_status<>'submitted_for_review' then raise exception 'Submitted Job required'; end if;
  perform public.jobs_no_open_sessions(p_company_id,p_job_id);
  perform public.jobs_require_lead(p_company_id,p_job_id);
  update public.jobs set lifecycle_status='completed',completed_at=now(),completed_by=a.user_id,completed_actor_name=a.full_name,
    completion_outcome=p_outcome,revision=revision+1,updated_at=now() where id=p_job_id returning revision into r;
  perform public.jobs_log(p_company_id,p_job_id,'completed','Approved and completed',jsonb_build_object('outcome',p_outcome));
  insert into public.job_completion_snapshots(company_id,job_id,payload) values(p_company_id,p_job_id,public.jobs_snapshot(p_company_id,p_job_id));
  return r;
end $$;
create function public.cancel_job(p_company_id uuid,p_job_id uuid,p_revision bigint,p_reason text) returns bigint
language plpgsql security definer set search_path=pg_catalog,public as $$
declare j public.jobs; a public.company_users; r bigint;
begin
  j:=public.jobs_lock(p_company_id,p_job_id,p_revision); a:=public.jobs_actor(p_company_id);
  if not public.can_manage_company_jobs(p_company_id) then raise exception 'Manager required' using errcode='42501'; end if;
  if nullif(btrim(p_reason),'') is null then raise exception 'Cancellation reason required'; end if;
  perform public.jobs_no_open_sessions(p_company_id,p_job_id);
  update public.jobs set lifecycle_status='cancelled',cancelled_at=now(),cancelled_by=a.user_id,cancelled_actor_name=a.full_name,
    cancel_reason=btrim(p_reason),revision=revision+1,updated_at=now() where id=p_job_id returning revision into r;
  perform public.jobs_log(p_company_id,p_job_id,'cancelled',btrim(p_reason)); return r;
end $$;

create function public.add_job_evidence(p_company_id uuid,p_job_id uuid,p_revision bigint,p_kind text,p_data jsonb) returns uuid
language plpgsql security definer set search_path=pg_catalog,public as $$
declare j public.jobs; a public.company_users; sid uuid; eid uuid; path text; folder text; unavailable text;
begin
  j:=public.jobs_lock(p_company_id,p_job_id,p_revision); a:=public.jobs_actor(p_company_id);
  if a.role<>'supervisor' then raise exception 'Assigned Supervisor required' using errcode='42501'; end if;
  if j.lifecycle_status not in ('in_progress','correction_required') then raise exception 'Field evidence is read-only in this state'; end if;
  select id into sid from public.job_time_entries where company_id=p_company_id and job_id=p_job_id and employee_id=a.employee_id and ended_at is null;
  if p_kind='material' then
    insert into public.job_materials(company_id,job_id,session_id,description,quantity,unit,actor_user_id,actor_employee_id,actor_name)
    values(p_company_id,p_job_id,sid,btrim(p_data->>'description'),(p_data->>'quantity')::numeric,btrim(p_data->>'unit'),a.user_id,a.employee_id,a.full_name) returning id into eid;
  elsif p_kind='test' then
    insert into public.job_test_results(company_id,job_id,session_id,description,result,note,actor_user_id,actor_employee_id,actor_name)
    values(p_company_id,p_job_id,sid,btrim(p_data->>'description'),btrim(p_data->>'result'),coalesce(p_data->>'note',''),a.user_id,a.employee_id,a.full_name) returning id into eid;
  elsif p_kind='note' then
    insert into public.job_notes(company_id,job_id,session_id,note,actor_user_id,actor_employee_id,actor_name)
    values(p_company_id,p_job_id,sid,btrim(p_data->>'note'),a.user_id,a.employee_id,a.full_name) returning id into eid;
  elsif p_kind in ('photo','signoff') then
    path:=nullif(p_data->>'object_path',''); folder:=case when p_kind='photo' then 'photos' else 'signatures' end;
    unavailable:=nullif(btrim(p_data->>'unavailable_reason'),'');
    if path is not null then
      if path !~ ('^'||p_company_id||'/'||p_job_id||'/'||folder||'/[0-9a-f-]{36}\.'||case when p_kind='photo' then '(jpg|jpeg|png|webp)' else 'png' end||'$') then raise exception 'Invalid private Jobs object path'; end if;
      if not exists(select 1 from storage.objects o join storage.buckets b on b.id=o.bucket_id
        where o.bucket_id='shiftly-jobs-media' and o.name=path and not b.public) then raise exception 'Upload a private Jobs object before registering it'; end if;
    end if;
    if p_kind='photo' then
      insert into public.job_photos(company_id,job_id,session_id,object_path,category,note,actor_user_id,actor_employee_id,actor_name)
      values(p_company_id,p_job_id,sid,path,lower(p_data->>'category'),coalesce(p_data->>'note',''),a.user_id,a.employee_id,a.full_name) returning id into eid;
    else
      insert into public.job_client_signoffs(company_id,job_id,client_name,signature_object_path,unavailable_reason,actor_user_id,actor_employee_id,actor_name)
      values(p_company_id,p_job_id,coalesce(p_data->>'client_name',''),path,unavailable,a.user_id,a.employee_id,a.full_name) returning id into eid;
    end if;
  else raise exception 'Unknown evidence kind'; end if;
  perform public.jobs_log(p_company_id,p_job_id,p_kind||'_added','Added '||p_kind,jsonb_build_object('record_id',eid,'session_id',sid));
  perform public.jobs_touch(p_company_id,p_job_id); return eid;
end $$;

-- Explicit allowlist only. Every table has RLS; every browser write uses a
-- permission-checking RPC. No direct authenticated INSERT/UPDATE/DELETE grants.
do $$
declare t text; f text;
begin
  foreach t in array array['jobs','job_number_counters','job_assignments','job_time_entries','job_work_days','job_materials','job_test_results','job_notes','job_photos','job_client_signoffs','job_activity','job_completion_snapshots'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public,anon,authenticated',t);
    if t<>'job_number_counters' then
      execute format('grant select on public.%I to authenticated',t);
      execute format('create policy jobs_read on public.%I for select to authenticated using(public.can_access_job(company_id,%I))',t,case when t='jobs' then 'id' else 'job_id' end);
      execute format('create trigger jobs_protect_history before insert or update or delete on public.%I for each row execute function public.jobs_protect_history()',t);
      if t<>'jobs' then execute format('create index %I on public.%I(company_id,job_id)',t||'_job_idx',t); end if;
    end if;
  end loop;
  -- Restrict only exact functions declared in this migration, never existing helpers.
  foreach f in array array[
    'public.enforce_jobs_enabled_update()','public.jobs_next_job_number(uuid,integer)','public.jobs_actor(uuid)',
    'public.jobs_lock(uuid,uuid,bigint)','public.jobs_log(uuid,uuid,text,text,jsonb)','public.jobs_touch(uuid,uuid)',
    'public.jobs_require_lead(uuid,uuid)','public.jobs_no_open_sessions(uuid,uuid)','public.jobs_protect_history()',
    'public.jobs_snapshot(uuid,uuid)','public.can_access_company_jobs(uuid)','public.can_manage_company_jobs(uuid)',
    'public.can_access_job(uuid,uuid)','public.create_job(uuid,jsonb)','public.create_job_with_team(uuid,jsonb,text[],text,boolean,timestamptz)',
    'public.assign_job_employee(uuid,uuid,bigint,text,text)','public.replace_job_lead(uuid,uuid,bigint,text)',
    'public.unassign_job_employee(uuid,uuid,bigint,text)','public.schedule_job(uuid,uuid,bigint,timestamptz,timestamptz)',
    'public.start_job_work(uuid,uuid,bigint)','public.finish_work_for_today(uuid,uuid,bigint,text,text)',
    'public.admin_close_job_session(uuid,uuid,bigint,uuid,text)',
    'public.submit_job_for_review(uuid,uuid,bigint)','public.resubmit_job_for_review(uuid,uuid,bigint)',
    'public.return_job_for_correction(uuid,uuid,bigint,text)','public.approve_job_complete(uuid,uuid,bigint,text)',
    'public.cancel_job(uuid,uuid,bigint,text)','public.add_job_evidence(uuid,uuid,bigint,text,jsonb)'] loop
    execute format('revoke all on function %s from public,anon,authenticated',f);
  end loop;
end $$;
grant execute on function public.can_access_company_jobs(uuid),public.can_manage_company_jobs(uuid),public.can_access_job(uuid,uuid) to authenticated;
grant execute on function public.create_job(uuid,jsonb),public.create_job_with_team(uuid,jsonb,text[],text,boolean,timestamptz) to authenticated;
grant execute on function public.assign_job_employee(uuid,uuid,bigint,text,text),public.replace_job_lead(uuid,uuid,bigint,text),public.unassign_job_employee(uuid,uuid,bigint,text) to authenticated;
grant execute on function public.schedule_job(uuid,uuid,bigint,timestamptz,timestamptz),public.start_job_work(uuid,uuid,bigint),public.finish_work_for_today(uuid,uuid,bigint,text,text) to authenticated;
grant execute on function public.admin_close_job_session(uuid,uuid,bigint,uuid,text) to authenticated;
grant execute on function public.submit_job_for_review(uuid,uuid,bigint),public.resubmit_job_for_review(uuid,uuid,bigint),public.return_job_for_correction(uuid,uuid,bigint,text),public.approve_job_complete(uuid,uuid,bigint,text),public.cancel_job(uuid,uuid,bigint,text),public.add_job_evidence(uuid,uuid,bigint,text,jsonb) to authenticated;
create index jobs_company_status_schedule_idx on public.jobs(company_id,lifecycle_status,scheduled_start_at);
create index jobs_company_created_idx on public.jobs(company_id,created_at desc);
commit;
