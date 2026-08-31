-- TR Electrical owner/admin clock-event correction with a durable audit trail.

create table if not exists public.clock_event_correction_audit (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  entry_id uuid not null references public.clock_events(entry_id) on delete restrict,
  changed_by uuid not null references auth.users(id) on delete restrict,
  changed_at timestamp with time zone not null default now(),
  original_created_at timestamp with time zone not null,
  corrected_created_at timestamp with time zone not null,
  original_site_id text not null,
  original_site_name text not null,
  corrected_site_id text not null,
  corrected_site_name text not null,
  original_result text not null,
  corrected_result text not null,
  original_message text not null,
  corrected_message text not null,
  approved_blocked boolean not null default false
);

create index if not exists clock_event_correction_audit_company_entry_idx
on public.clock_event_correction_audit(company_id, entry_id, changed_at desc);

alter table public.clock_event_correction_audit enable row level security;

drop policy if exists "company owners and admins can view clock correction audit"
on public.clock_event_correction_audit;
create policy "company owners and admins can view clock correction audit"
on public.clock_event_correction_audit for select
to authenticated
using (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = clock_event_correction_audit.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.role in ('owner', 'admin')
  )
);

create or replace function public.correct_tr_electrical_clock_event(
  p_entry_id uuid,
  p_created_at timestamp with time zone,
  p_site_id text,
  p_approve_blocked boolean default false
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_company_id constant uuid := 'f50d8e62-3006-462e-b2a9-b1cf7c500394'::uuid;
  v_event public.clock_events%rowtype;
  v_site public.sites%rowtype;
  v_result text;
  v_message text;
  v_distance integer;
begin
  if auth.uid() is null or not exists (
    select 1
    from public.company_users cu
    where cu.company_id = v_company_id
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.role in ('owner', 'admin')
  ) then
    raise exception 'Only TR Electrical owners or admins may correct clock entries';
  end if;

  select * into v_event
  from public.clock_events
  where entry_id = p_entry_id
    and company_id = v_company_id
  for update;
  if not found then
    raise exception 'TR Electrical clock entry was not found';
  end if;

  select * into v_site
  from public.sites
  where company_id = v_company_id
    and site_id = p_site_id;
  if not found then
    raise exception 'The selected TR Electrical site was not found';
  end if;

  if v_event.result = 'BLOCKED' and not p_approve_blocked then
    raise exception 'Blocked entries require explicit approval';
  end if;

  v_result := case when v_event.result = 'BLOCKED' then 'OK' else v_event.result end;
  v_message := case
    when v_event.result = 'BLOCKED'
      then 'ADMIN CORRECTION: Blocked entry approved after site correction'
    else v_event.message
  end;
  v_distance := round(
    6371000 * 2 * asin(sqrt(
      power(sin(radians(v_site.lat - v_event.lat) / 2), 2)
      + cos(radians(v_event.lat)) * cos(radians(v_site.lat))
      * power(sin(radians(v_site.lon - v_event.lon) / 2), 2)
    ))
  )::integer;

  insert into public.clock_event_correction_audit (
    company_id, entry_id, changed_by,
    original_created_at, corrected_created_at,
    original_site_id, original_site_name,
    corrected_site_id, corrected_site_name,
    original_result, corrected_result,
    original_message, corrected_message,
    approved_blocked
  ) values (
    v_company_id, v_event.entry_id, auth.uid(),
    v_event.created_at, p_created_at,
    v_event.site_id, v_event.site_name,
    v_site.site_id, v_site.name,
    v_event.result, v_result,
    v_event.message, v_message,
    v_event.result = 'BLOCKED' and p_approve_blocked
  );

  update public.clock_events
  set created_at = p_created_at,
      site_id = v_site.site_id,
      site_name = v_site.name,
      distance_m = v_distance,
      result = v_result,
      message = v_message
  where entry_id = v_event.entry_id
    and company_id = v_company_id;
end;
$$;

revoke all on function public.correct_tr_electrical_clock_event(uuid, timestamp with time zone, text, boolean)
from public, anon;
grant execute on function public.correct_tr_electrical_clock_event(uuid, timestamp with time zone, text, boolean)
to authenticated;
