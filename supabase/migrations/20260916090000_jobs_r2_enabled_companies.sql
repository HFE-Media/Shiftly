-- Reviewed rollout only: replaces the two R2 functions, never the Jobs foundation.
-- Existing private bucket and photo records are retained. No entitlement updates.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

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
    if a.role<>'supervisor' or j.lifecycle_status not in ('in_progress','correction_required') then
      raise exception 'Assigned working supervisor required' using errcode='42501';
    end if;
    select id into sid from public.job_time_entries where company_id=p_company_id and job_id=p_job_id and employee_id=a.employee_id and ended_at is null;
    if sid is null then raise exception 'Own open session required' using errcode='42501'; end if;
    if (select count(*) from public.job_photos where company_id=p_company_id and job_id=p_job_id)>=100 then
      raise exception 'Limit: 100 photos per Job';
    end if;
  end if;
  return jsonb_build_object('actor_id',a.user_id,'company_id',p_company_id,'revision',j.revision,'session_id',sid);
end $$;

-- Only the trusted media server can attest that image bytes exist in R2.
-- p_actor comes from jobs_r2_photo_context under the authenticated caller's JWT,
-- never from a client-supplied user ID. All authorization is rechecked under locks.
create or replace function public.jobs_register_r2_photo(p_company_id uuid,p_job_id uuid,p_revision bigint,
  p_actor uuid,p_session_id uuid,p_photo_id uuid,p_category text,p_note text,p_bytes integer,p_sha256 text)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare a public.company_users; j public.jobs; existing public.job_photos; path text;
begin
  if p_company_id is null then raise exception 'Company required' using errcode='42501'; end if;
  perform 1 from public.companies where id=p_company_id and jobs_enabled and status='active' for share;
  if not found then raise exception 'Jobs disabled' using errcode='42501'; end if;
  select * into a from public.company_users where company_id=p_company_id and user_id=p_actor and active for share;
  if not found or a.role<>'supervisor' then raise exception 'Supervisor required' using errcode='42501'; end if;
  perform 1 from public.employees where company_id=p_company_id and employee_id=a.employee_id and active for share;
  if not found then raise exception 'Active employee required' using errcode='42501'; end if;
  select * into j from public.jobs where company_id=p_company_id and id=p_job_id for update;
  if not found then raise exception 'Job unavailable' using errcode='42501'; end if;
  perform 1 from public.job_assignments where company_id=p_company_id and job_id=p_job_id and employee_id=a.employee_id and unassigned_at is null for share;
  if not found then raise exception 'Assignment required' using errcode='42501'; end if;
  path:=p_company_id::text||'/'||p_job_id::text||'/photos/'||p_photo_id::text||'.jpg';
  select * into existing from public.job_photos where id=p_photo_id;
  if found then
    if existing.company_id=p_company_id and existing.job_id=p_job_id and existing.actor_user_id=p_actor
       and existing.session_id=p_session_id and existing.sha256=p_sha256 and existing.byte_size=p_bytes
       and existing.category=p_category and existing.note=coalesce(btrim(p_note),'')
       and existing.object_path=path and existing.storage_provider='r2' and existing.storage_bucket='shiftly-jobs-test' then
      return existing.id;
    end if;
    raise exception 'Photo ID conflict' using errcode='23505';
  end if;
  if p_revision is null or j.revision<>p_revision then raise exception 'Job changed' using errcode='40001'; end if;
  if j.lifecycle_status not in ('in_progress','correction_required') then raise exception 'Job is read-only'; end if;
  perform 1 from public.job_time_entries where company_id=p_company_id and job_id=p_job_id and id=p_session_id
    and employee_id=a.employee_id and ended_at is null for share;
  if not found then raise exception 'Own open session required' using errcode='42501'; end if;
  if p_photo_id is null or p_category is null or p_category not in ('before','during','after','other')
    or length(coalesce(p_note,''))>500 or p_bytes is null or p_bytes not between 1 and 2097152
    or p_sha256 is null or p_sha256 !~ '^[a-f0-9]{64}$' then raise exception 'Invalid photo metadata'; end if;
  if (select count(*) from public.job_photos where company_id=p_company_id and job_id=p_job_id)>=100 then raise exception 'Photo limit reached'; end if;
  insert into public.job_photos(id,company_id,job_id,session_id,object_path,category,note,actor_user_id,actor_employee_id,actor_name,storage_provider,storage_bucket,byte_size,sha256)
    values(p_photo_id,p_company_id,p_job_id,p_session_id,path,p_category,coalesce(btrim(p_note),''),a.user_id,a.employee_id,coalesce(nullif(a.full_name,''),'User'),'r2','shiftly-jobs-test',p_bytes,p_sha256);
  insert into public.job_activity(company_id,job_id,event_type,actor_user_id,actor_employee_id,actor_name,actor_role,summary,metadata)
    values(p_company_id,p_job_id,'photo_added',a.user_id,a.employee_id,coalesce(nullif(a.full_name,''),'User'),a.role,'Added photo',jsonb_build_object('record_id',p_photo_id,'session_id',p_session_id));
  perform public.jobs_touch(p_company_id,p_job_id);
  return p_photo_id;
end $$;

revoke all on function public.jobs_r2_photo_context(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.jobs_r2_photo_context(uuid,uuid,boolean) to authenticated;
revoke all on function public.jobs_register_r2_photo(uuid,uuid,bigint,uuid,uuid,uuid,text,text,integer,text) from public,anon,authenticated;
grant execute on function public.jobs_register_r2_photo(uuid,uuid,bigint,uuid,uuid,uuid,text,text,integer,text) to service_role;
notify pgrst,'reload schema';
commit;
