begin;

-- Keep night-shift ownership deterministic. These processors are already
-- installed functions, so patch their current definitions fail-closed rather
-- than changing tables or rewriting their audit/event behavior.
do $migration$
declare
  v_definition text;
  v_old text;
  v_new text;
begin
  select pg_get_functiondef(
    'public.process_company_auto_clock_outs(timestamp with time zone)'::regprocedure
  ) into v_definition;

  v_old := '      if v_source_local_time <= v_rule.automatic_out_time then';
  v_new := $normal$
      if v_rule.night_shift_enabled
         and v_rule.night_shift_start_time is not null
         and v_source_local_time >= v_rule.night_shift_start_time then
        continue;
      end if;

      if v_source_local_time <= v_rule.automatic_out_time then$normal$;

  if v_definition is null or strpos(v_definition, v_old) = 0 then
    raise exception 'Expected normal automatic clock-out definition was not found';
  end if;

  v_definition := replace(v_definition, v_old, v_new);
  if strpos(v_definition, 'v_source_local_time >= v_rule.night_shift_start_time') = 0 then
    raise exception 'Normal automatic clock-out night exclusion was not installed';
  end if;
  execute v_definition;

  select pg_get_functiondef(
    'public.process_company_night_auto_clock_outs(timestamp with time zone)'::regprocedure
  ) into v_definition;

  v_old := '      if v_source_local_time <= v_rule.night_shift_start_time then';
  v_new := '      if v_source_local_time < v_rule.night_shift_start_time then';

  if v_definition is null or strpos(v_definition, v_old) = 0 then
    raise exception 'Expected night automatic clock-out boundary was not found';
  end if;

  v_definition := replace(v_definition, v_old, v_new);
  if strpos(v_definition, v_old) > 0 or strpos(v_definition, v_new) = 0 then
    raise exception 'Inclusive night automatic clock-out boundary was not installed';
  end if;
  execute v_definition;
end;
$migration$;

revoke all on function public.process_company_auto_clock_outs(timestamp with time zone)
from public, anon, authenticated;

revoke all on function public.process_company_night_auto_clock_outs(timestamp with time zone)
from public, anon, authenticated;

commit;
