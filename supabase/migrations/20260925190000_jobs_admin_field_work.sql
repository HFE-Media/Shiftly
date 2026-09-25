-- Allow company owners/admins to use the existing Jobs field-work workflow
-- without becoming Job assignments. Attendance and payroll are not involved.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- Supervisor sessions retain their employee identity and existing unique index.
-- Manager sessions are instead owned by the authenticated company user.
alter table public.job_time_entries alter column employee_id drop not null;
alter table public.job_work_days alter column employee_id drop not null;
alter table public.job_time_entries
  add constraint job_time_entries_actor_identity_check
  check (employee_id is not null or started_by is not null);
create unique index job_time_entries_manager_open_key
  on public.job_time_entries(company_id,started_by)
  where ended_at is null and employee_id is null;

create or replace function public.start_job_work(p_company_id uuid,p_job_id uuid,p_revision bigint) returns uuid
language plpgsql security definer set search_path=pg_catalog,public as $$
declare
  j public.jobs; a public.company_users; tid uuid; n text; worker_id text;
  prior boolean; actor_lock text;
begin
  j:=public.jobs_lock(p_company_id,p_job_id,p_revision);
  a:=public.jobs_actor(p_company_id);
  if a.role='supervisor' then
    worker_id:=a.employee_id;
    select full_name into n from public.employees
      where company_id=p_company_id and employee_id=worker_id and active;
    actor_lock:='employee:'||worker_id;
  elsif a.role in ('owner','admin') then
    worker_id:=null;
    n:=coalesce(nullif(btrim(a.full_name),''),'Manager');
    actor_lock:='user:'||a.user_id::text;
  else
    raise exception 'Operational Jobs access required' using errcode='42501';
  end if;
  if j.lifecycle_status not in ('scheduled','in_progress','correction_required') then raise exception 'Job unavailable for work'; end if;
  perform public.jobs_require_lead(p_company_id,p_job_id);
  perform pg_advisory_xact_lock(hashtextextended(p_company_id::text||':jobs:'||actor_lock,0));
  if exists(
    select 1 from public.job_time_entries t
    where t.company_id=p_company_id and t.ended_at is null
      and ((a.role='supervisor' and t.employee_id=worker_id)
        or (a.role in ('owner','admin') and t.employee_id is null and t.started_by=a.user_id))
  ) then raise exception 'Finish your open Job session first' using errcode='23505'; end if;
  select exists(select 1 from public.job_time_entries where company_id=p_company_id and job_id=p_job_id) into prior;
  insert into public.job_time_entries(company_id,job_id,employee_id,employee_name,started_by)
    values(p_company_id,p_job_id,worker_id,n,a.user_id) returning id into tid;
  update public.jobs set lifecycle_status='in_progress' where id=p_job_id;
  perform public.jobs_log(p_company_id,p_job_id,case when prior then 'job_continued' else 'job_started' end,
    'Work session started',jsonb_build_object('session_id',tid));
  perform public.jobs_touch(p_company_id,p_job_id);
  return tid;
end $$;

create or replace function public.finish_work_for_today(p_company_id uuid,p_job_id uuid,p_revision bigint,p_work text,p_notes text default '') returns uuid
language plpgsql security definer set search_path=pg_catalog,public as $$
declare j public.jobs; a public.company_users; t public.job_time_entries; wid uuid;
begin
  j:=public.jobs_lock(p_company_id,p_job_id,p_revision);
  a:=public.jobs_actor(p_company_id);
  if a.role not in ('owner','admin','supervisor') then raise exception 'Operational Jobs access required' using errcode='42501'; end if;
  if j.lifecycle_status<>'in_progress' or nullif(btrim(p_work),'') is null then raise exception 'In-progress Job and meaningful work record required'; end if;
  select * into t from public.job_time_entries e
    where e.company_id=p_company_id and e.job_id=p_job_id and e.ended_at is null
      and ((a.role='supervisor' and e.employee_id=a.employee_id)
        or (a.role in ('owner','admin') and e.employee_id is null and e.started_by=a.user_id))
    for update;
  if not found then raise exception 'No open session for this Jobs actor'; end if;
  insert into public.job_work_days(company_id,job_id,session_id,employee_id,actor_name,work_date,work_performed,notes)
    values(p_company_id,p_job_id,t.id,t.employee_id,t.employee_name,
      (t.started_at at time zone 'Africa/Johannesburg')::date,btrim(p_work),coalesce(p_notes,'')) returning id into wid;
  update public.job_time_entries set ended_at=now(),ended_by=a.user_id where id=t.id;
  perform public.jobs_log(p_company_id,p_job_id,'work_paused','Finished work for today',
    jsonb_build_object('session_id',t.id,'work_day_id',wid));
  perform public.jobs_touch(p_company_id,p_job_id);
  return wid;
end $$;

create or replace function public.add_job_evidence(p_company_id uuid,p_job_id uuid,p_revision bigint,p_kind text,p_data jsonb) returns uuid
language plpgsql security definer set search_path=pg_catalog,public as $$
declare j public.jobs; a public.company_users; sid uuid; eid uuid; path text; folder text; unavailable text;
begin
  j:=public.jobs_lock(p_company_id,p_job_id,p_revision);
  a:=public.jobs_actor(p_company_id);
  if a.role not in ('owner','admin','supervisor') then raise exception 'Operational Jobs access required' using errcode='42501'; end if;
  if a.role in ('owner','admin') and p_kind not in ('material','test','note') then
    raise exception 'This evidence type requires the assigned field workflow' using errcode='42501';
  end if;
  if j.lifecycle_status not in ('in_progress','correction_required') then raise exception 'Field evidence is read-only in this state'; end if;
  select id into sid from public.job_time_entries e
    where e.company_id=p_company_id and e.job_id=p_job_id and e.ended_at is null
      and ((a.role='supervisor' and e.employee_id=a.employee_id)
        or (a.role in ('owner','admin') and e.employee_id is null and e.started_by=a.user_id));
  if p_kind in ('material','test','note','photo') and sid is null then raise exception 'Own open session required' using errcode='42501'; end if;
  if p_kind='material' then
    insert into public.job_materials(company_id,job_id,session_id,description,quantity,unit,actor_user_id,actor_employee_id,actor_name)
    values(p_company_id,p_job_id,sid,btrim(p_data->>'description'),(p_data->>'quantity')::numeric,btrim(p_data->>'unit'),a.user_id,
      case when a.role='supervisor' then a.employee_id else null end,coalesce(nullif(a.full_name,''),'User')) returning id into eid;
  elsif p_kind='test' then
    insert into public.job_test_results(company_id,job_id,session_id,description,result,note,actor_user_id,actor_employee_id,actor_name)
    values(p_company_id,p_job_id,sid,btrim(p_data->>'description'),btrim(p_data->>'result'),coalesce(p_data->>'note',''),a.user_id,
      case when a.role='supervisor' then a.employee_id else null end,coalesce(nullif(a.full_name,''),'User')) returning id into eid;
  elsif p_kind='note' then
    insert into public.job_notes(company_id,job_id,session_id,note,actor_user_id,actor_employee_id,actor_name)
    values(p_company_id,p_job_id,sid,btrim(p_data->>'note'),a.user_id,
      case when a.role='supervisor' then a.employee_id else null end,coalesce(nullif(a.full_name,''),'User')) returning id into eid;
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
      values(p_company_id,p_job_id,sid,path,lower(p_data->>'category'),coalesce(p_data->>'note',''),a.user_id,a.employee_id,coalesce(nullif(a.full_name,''),'User')) returning id into eid;
    else
      insert into public.job_client_signoffs(company_id,job_id,client_name,signature_object_path,unavailable_reason,actor_user_id,actor_employee_id,actor_name)
      values(p_company_id,p_job_id,coalesce(p_data->>'client_name',''),path,unavailable,a.user_id,a.employee_id,coalesce(nullif(a.full_name,''),'User')) returning id into eid;
    end if;
  else raise exception 'Unsupported evidence kind'; end if;
  perform public.jobs_log(p_company_id,p_job_id,case when p_kind='signoff' then 'client_signoff' else p_kind||'_added' end,
    case when p_kind='signoff' then 'Client sign-off recorded' else initcap(p_kind)||' added' end,jsonb_build_object('record_id',eid,'session_id',sid));
  perform public.jobs_touch(p_company_id,p_job_id);
  return eid;
end $$;

create or replace function public.jobs_r2_photo_context(p_company_id uuid,p_job_id uuid,p_write boolean default false)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare a public.company_users; j public.jobs; sid uuid;
begin
  if p_company_id is null then raise exception 'Company required' using errcode='42501'; end if;
  a:=public.jobs_actor(p_company_id);
  if not public.can_access_job(p_company_id,p_job_id) then raise exception 'Job access denied' using errcode='42501'; end if;
  select * into j from public.jobs where company_id=p_company_id and id=p_job_id;
  if not found then raise exception 'Job unavailable' using errcode='42501'; end if;
  if p_write then
    if a.role not in ('owner','admin','supervisor') or j.lifecycle_status not in ('in_progress','correction_required') then
      raise exception 'Active operational session required' using errcode='42501';
    end if;
    select id into sid from public.job_time_entries e
      where e.company_id=p_company_id and e.job_id=p_job_id and e.ended_at is null
        and ((a.role='supervisor' and e.employee_id=a.employee_id)
          or (a.role in ('owner','admin') and e.employee_id is null and e.started_by=a.user_id));
    if sid is null then raise exception 'Own open session required' using errcode='42501'; end if;
    if (select count(*) from public.job_photos where company_id=p_company_id and job_id=p_job_id)>=100 then raise exception 'Limit: 100 photos per Job'; end if;
  end if;
  return jsonb_build_object('actor_id',a.user_id,'company_id',p_company_id,'revision',j.revision,'session_id',sid);
end $$;

create or replace function public.jobs_register_r2_photo(p_company_id uuid,p_job_id uuid,p_revision bigint,
  p_actor uuid,p_session_id uuid,p_photo_id uuid,p_category text,p_note text,p_bytes integer,p_sha256 text)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare a public.company_users; j public.jobs; existing public.job_photos; path text; worker_id text;
begin
  if p_company_id is null then raise exception 'Company required' using errcode='42501'; end if;
  perform 1 from public.companies where id=p_company_id and jobs_enabled and status='active' for share;
  if not found then raise exception 'Jobs disabled' using errcode='42501'; end if;
  select * into a from public.company_users where company_id=p_company_id and user_id=p_actor and active for share;
  if not found or a.role not in ('owner','admin','supervisor') then raise exception 'Operational Jobs access required' using errcode='42501'; end if;
  if a.role='supervisor' then
    perform 1 from public.employees where company_id=p_company_id and employee_id=a.employee_id and active for share;
    if not found then raise exception 'Active employee required' using errcode='42501'; end if;
    perform 1 from public.job_assignments where company_id=p_company_id and job_id=p_job_id and employee_id=a.employee_id and unassigned_at is null for share;
    if not found then raise exception 'Assignment required' using errcode='42501'; end if;
    worker_id:=a.employee_id;
  else
    worker_id:=null;
  end if;
  select * into j from public.jobs where company_id=p_company_id and id=p_job_id for update;
  if not found then raise exception 'Job unavailable' using errcode='42501'; end if;
  path:=p_company_id::text||'/'||p_job_id::text||'/photos/'||p_photo_id::text||'.jpg';
  select * into existing from public.job_photos where id=p_photo_id;
  if found then
    if existing.company_id=p_company_id and existing.job_id=p_job_id and existing.actor_user_id=p_actor
       and existing.session_id=p_session_id and existing.sha256=p_sha256 and existing.byte_size=p_bytes
       and existing.category=p_category and existing.note=coalesce(btrim(p_note),'')
       and existing.object_path=path and existing.storage_provider='r2' and existing.storage_bucket='shiftly-jobs-test' then return existing.id; end if;
    raise exception 'Photo ID conflict' using errcode='23505';
  end if;
  if p_revision is null or j.revision<>p_revision then raise exception 'Job changed' using errcode='40001'; end if;
  if j.lifecycle_status not in ('in_progress','correction_required') then raise exception 'Job is read-only'; end if;
  perform 1 from public.job_time_entries e where e.company_id=p_company_id and e.job_id=p_job_id and e.id=p_session_id and e.ended_at is null
    and ((a.role='supervisor' and e.employee_id=a.employee_id)
      or (a.role in ('owner','admin') and e.employee_id is null and e.started_by=a.user_id)) for share;
  if not found then raise exception 'Own open session required' using errcode='42501'; end if;
  if p_photo_id is null or p_category is null or p_category not in ('before','during','after','other')
    or length(coalesce(p_note,''))>500 or p_bytes is null or p_bytes not between 1 and 2097152
    or p_sha256 is null or p_sha256 !~ '^[a-f0-9]{64}$' then raise exception 'Invalid photo metadata'; end if;
  if (select count(*) from public.job_photos where company_id=p_company_id and job_id=p_job_id)>=100 then raise exception 'Photo limit reached'; end if;
  insert into public.job_photos(id,company_id,job_id,session_id,object_path,category,note,actor_user_id,actor_employee_id,actor_name,storage_provider,storage_bucket,byte_size,sha256)
    values(p_photo_id,p_company_id,p_job_id,p_session_id,path,p_category,coalesce(btrim(p_note),''),a.user_id,worker_id,
      coalesce(nullif(a.full_name,''),'User'),'r2','shiftly-jobs-test',p_bytes,p_sha256);
  insert into public.job_activity(company_id,job_id,event_type,actor_user_id,actor_employee_id,actor_name,actor_role,summary,metadata)
    values(p_company_id,p_job_id,'photo_added',a.user_id,worker_id,coalesce(nullif(a.full_name,''),'User'),a.role,'Added photo',
      jsonb_build_object('record_id',p_photo_id,'session_id',p_session_id));
  perform public.jobs_touch(p_company_id,p_job_id);
  return p_photo_id;
end $$;

revoke all on function public.start_job_work(uuid,uuid,bigint) from public,anon,authenticated;
revoke all on function public.finish_work_for_today(uuid,uuid,bigint,text,text) from public,anon,authenticated;
revoke all on function public.add_job_evidence(uuid,uuid,bigint,text,jsonb) from public,anon,authenticated;
grant execute on function public.start_job_work(uuid,uuid,bigint) to authenticated;
grant execute on function public.finish_work_for_today(uuid,uuid,bigint,text,text) to authenticated;
grant execute on function public.add_job_evidence(uuid,uuid,bigint,text,jsonb) to authenticated;
revoke all on function public.jobs_r2_photo_context(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.jobs_r2_photo_context(uuid,uuid,boolean) to authenticated;
revoke all on function public.jobs_register_r2_photo(uuid,uuid,bigint,uuid,uuid,uuid,text,text,integer,text) from public,anon,authenticated;
grant execute on function public.jobs_register_r2_photo(uuid,uuid,bigint,uuid,uuid,uuid,text,text,integer,text) to service_role;

notify pgrst,'reload schema';
commit;
