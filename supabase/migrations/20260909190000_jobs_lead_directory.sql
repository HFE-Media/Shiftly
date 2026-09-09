-- Additive read-only directory. Existing RLS and mutation functions are unchanged.
begin;
create function public.jobs_lead_directory(p_company_id uuid, p_offset integer default 0)
returns table(employee_id text, full_name text, supervisor_id text)
language plpgsql stable security definer set search_path=pg_catalog,public as $$
begin
  if not public.can_manage_company_jobs(p_company_id) then
    raise exception 'Jobs manager access required' using errcode='42501';
  end if;
  if p_offset is null or p_offset < 0 then
    raise exception 'Invalid directory offset' using errcode='22023';
  end if;
  return query
  select e.employee_id::text, e.full_name::text,
    -- Legacy supervisor records store names, not employee links. A unique name
    -- match is presentation metadata only; account/employee links authorize leads.
    case when (select count(*) from public.employees other
      where other.company_id=p_company_id and other.active
        and lower(btrim(other.full_name))=lower(btrim(e.full_name)))=1
      then (select case when count(*)=1 then min(s.supervisor_id::text) end
        from public.supervisors s where s.company_id=p_company_id and s.active
          and lower(btrim(s.full_name))=lower(btrim(e.full_name)))
      else null end
  from public.employees e
  where e.company_id=p_company_id and e.active and exists (
    select 1 from public.company_users u where u.company_id=p_company_id
      and u.employee_id=e.employee_id and u.active and u.role='supervisor')
  order by e.employee_id limit 250 offset p_offset;
end $$;
revoke all on function public.jobs_lead_directory(uuid,integer) from public, anon;
grant execute on function public.jobs_lead_directory(uuid,integer) to authenticated;
commit;
