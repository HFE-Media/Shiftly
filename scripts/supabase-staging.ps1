[CmdletBinding()]
param(
    [ValidateSet("status", "version", "migration-list", "migration-hash", "foundation-inspect")]
    [string]$Command = "status",
    [switch]$EnableWrite,
    [string]$ConfirmProjectRef
)

$ErrorActionPreference = "Stop"
$StagingProjectRef = "pxewcfpmrxzcpntjmqkr"
$ProductionProjectRef = "szougedvngaoratbtars"
$UnresolvedProjectRef = "tevpwavxrsaawnmlgpra"
$StagingWorkspace = "C:\dev\Shiftly-Supabase-Staging"
$RequiredCliVersion = "2.116.0"
$JobsMigrationName = "20260904100000_jobs_foundation.sql"

if ($EnableWrite) {
    if ($ConfirmProjectRef -ne $StagingProjectRef) {
        throw "A future write operation must confirm the exact staging project ref."
    }
    throw "Write commands are disabled in this safety wrapper checkpoint."
}

$RepositoryRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$ResolvedStagingWorkspace = [System.IO.Path]::GetFullPath($StagingWorkspace)

if (-not (Test-Path -LiteralPath $ResolvedStagingWorkspace -PathType Container)) {
    throw "Staging workspace is missing: $ResolvedStagingWorkspace"
}
if ($ResolvedStagingWorkspace.TrimEnd("\") -eq $RepositoryRoot.TrimEnd("\")) {
    throw "Refusing to use the production-linked repository as the staging workspace."
}

$ProjectRefPath = Join-Path $ResolvedStagingWorkspace "supabase\.temp\project-ref"
if (-not (Test-Path -LiteralPath $ProjectRefPath -PathType Leaf)) {
    throw "Staging project-ref file is missing: $ProjectRefPath"
}

$ResolvedProjectRef = (Get-Content -Raw -LiteralPath $ProjectRefPath).Trim()
if ($ResolvedProjectRef -ne $StagingProjectRef) {
    throw "Target mismatch. Expected staging ref '$StagingProjectRef' but found '$ResolvedProjectRef'."
}
if ($ResolvedProjectRef -eq $ProductionProjectRef) {
    throw "Refusing to target the Shiftly production project."
}
if ($ResolvedProjectRef -eq $UnresolvedProjectRef) {
    throw "Refusing to use the unresolved third project ref."
}

Write-Host "TARGET: SHIFTLY STAGING"
Write-Host "PROJECT REF: $StagingProjectRef"
Write-Host "WORKSPACE: $ResolvedStagingWorkspace"

function Invoke-PinnedSupabase {
    param([Parameter(Mandatory)][string[]]$Arguments)

    $NpxCacheRoot = Join-Path $env:LOCALAPPDATA "npm-cache\_npx"
    $CliPath = Get-ChildItem -LiteralPath $NpxCacheRoot -Recurse -Filter "supabase.exe" -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -like "*\node_modules\@supabase\cli-windows-x64\bin\supabase.exe" } |
        ForEach-Object {
            $CandidateVersion = (& $_.FullName --version 2>$null | Out-String).Trim()
            if ($CandidateVersion -eq $RequiredCliVersion) { $_.FullName }
        } |
        Select-Object -First 1

    if (-not $CliPath) {
        throw "Supabase CLI $RequiredCliVersion is not available in the local pinned npx cache."
    }

    & $CliPath @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Supabase CLI command failed with exit code $LASTEXITCODE."
    }
}

switch ($Command) {
    "status" {
        Write-Host "Safety checks passed. No remote command was run."
    }
    "version" {
        Invoke-PinnedSupabase -Arguments @("--version")
    }
    "migration-list" {
        Invoke-PinnedSupabase -Arguments @(
            "migration", "list", "--linked",
            "--project-ref", $StagingProjectRef,
            "--workdir", $ResolvedStagingWorkspace
        )
    }
    "migration-hash" {
        $MigrationPath = Join-Path $RepositoryRoot "supabase\migrations\$JobsMigrationName"
        if (-not (Test-Path -LiteralPath $MigrationPath -PathType Leaf)) {
            throw "Expected Jobs migration is missing: $MigrationPath"
        }
        $MigrationFile = Get-Item -LiteralPath $MigrationPath
        if ($MigrationFile.Name -ne $JobsMigrationName) {
            throw "Jobs migration filename does not match the approved filename."
        }
        $Hash = Get-FileHash -LiteralPath $MigrationPath -Algorithm SHA256
        Write-Host "SOURCE: $($MigrationFile.FullName)"
        Write-Host "SHA-256: $($Hash.Hash)"
        Write-Host "No migration was copied or applied."
    }
    "foundation-inspect" {
        $InspectionSql = @'
begin transaction read only;

select jsonb_build_object(
  'required_objects', jsonb_build_object(
    'companies', to_regclass('public.companies'),
    'company_users', to_regclass('public.company_users'),
    'employees', to_regclass('public.employees'),
    'sites', to_regclass('public.sites'),
    'supervisors', to_regclass('public.supervisors'),
    'admins', to_regclass('public.admins'),
    'clock_events', to_regclass('public.clock_events'),
    'platform_admins', to_regclass('public.platform_admins'),
    'migration_ledger', to_regclass('supabase_migrations.schema_migrations'),
    'auth_users', to_regclass('auth.users'),
    'storage_objects', to_regclass('storage.objects'),
    'storage_buckets', to_regclass('storage.buckets')
  ),
  'public_relations', coalesce((
    select jsonb_agg(jsonb_build_object(
      'name', c.relname,
      'type', case c.relkind when 'r' then 'table' when 'p' then 'partitioned table'
        when 'v' then 'view' when 'm' then 'materialized view'
        when 'S' then 'sequence' else c.relkind::text end,
      'rls_enabled', c.relrowsecurity,
      'rls_forced', c.relforcerowsecurity
    ) order by c.relname)
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm', 'S')
  ), '[]'::jsonb),
  'public_columns', coalesce((
    select jsonb_agg(jsonb_build_object(
      'table', table_name, 'name', column_name, 'type', data_type,
      'udt', udt_schema || '.' || udt_name, 'nullable', is_nullable,
      'default', column_default
    ) order by table_name, ordinal_position)
    from information_schema.columns where table_schema = 'public'
  ), '[]'::jsonb),
  'public_constraints', coalesce((
    select jsonb_agg(jsonb_build_object(
      'table', c.relname, 'name', con.conname, 'type', con.contype,
      'definition', pg_get_constraintdef(con.oid, true)
    ) order by c.relname, con.conname)
    from pg_constraint con
    join pg_class c on c.oid = con.conrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
  ), '[]'::jsonb),
  'public_indexes', coalesce((
    select jsonb_agg(jsonb_build_object(
      'table', tablename, 'name', indexname, 'definition', indexdef
    ) order by tablename, indexname)
    from pg_indexes where schemaname = 'public'
  ), '[]'::jsonb),
  'public_functions', coalesce((
    select jsonb_agg(jsonb_build_object(
      'name', p.proname,
      'identity_arguments', pg_get_function_identity_arguments(p.oid),
      'result', pg_get_function_result(p.oid),
      'security_definer', p.prosecdef, 'volatility', p.provolatile,
      'config', p.proconfig, 'acl', p.proacl
    ) order by p.proname, pg_get_function_identity_arguments(p.oid))
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
  ), '[]'::jsonb),
  'public_triggers', coalesce((
    select jsonb_agg(jsonb_build_object(
      'table', c.relname, 'name', t.tgname,
      'definition', pg_get_triggerdef(t.oid, true)
    ) order by c.relname, t.tgname)
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and not t.tgisinternal
  ), '[]'::jsonb),
  'public_policies', coalesce((
    select jsonb_agg(to_jsonb(p) order by p.tablename, p.policyname)
    from pg_policies p where p.schemaname = 'public'
  ), '[]'::jsonb),
  'public_table_grants', coalesce((
    select jsonb_agg(to_jsonb(g) order by g.table_name, g.grantee, g.privilege_type)
    from information_schema.role_table_grants g where g.table_schema = 'public'
  ), '[]'::jsonb),
  'public_routine_grants', coalesce((
    select jsonb_agg(to_jsonb(g) order by g.routine_name, g.grantee)
    from information_schema.role_routine_grants g where g.routine_schema = 'public'
  ), '[]'::jsonb),
  'auth_foundation', jsonb_build_object(
    'users_id_column', (
      select jsonb_build_object('type', data_type, 'udt', udt_schema || '.' || udt_name,
        'nullable', is_nullable)
      from information_schema.columns
      where table_schema = 'auth' and table_name = 'users' and column_name = 'id'
    ),
    'users_primary_key', (
      select pg_get_constraintdef(con.oid, true)
      from pg_constraint con
      where con.conrelid = 'auth.users'::regclass and con.contype = 'p'
    ),
    'users_rls_enabled', (select relrowsecurity from pg_class where oid = 'auth.users'::regclass),
    'uid_function', to_regprocedure('auth.uid()'),
    'role_function', to_regprocedure('auth.role()'),
    'gen_random_uuid', to_regprocedure('gen_random_uuid()')
  ),
  'storage_foundation', jsonb_build_object(
    'objects_rls_enabled', (select relrowsecurity from pg_class where oid = 'storage.objects'::regclass),
    'buckets_rls_enabled', (select relrowsecurity from pg_class where oid = 'storage.buckets'::regclass),
    'policies', coalesce((
      select jsonb_agg(to_jsonb(p) order by p.tablename, p.policyname)
      from pg_policies p where p.schemaname = 'storage'
    ), '[]'::jsonb),
    'buckets', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'name', name, 'public', public,
        'file_size_limit', file_size_limit, 'allowed_mime_types', allowed_mime_types
      ) order by id) from storage.buckets
    ), '[]'::jsonb)
  ),
  'extensions', coalesce((
    select jsonb_agg(jsonb_build_object('name', extname, 'version', extversion) order by extname)
    from pg_extension where extname in ('pgcrypto', 'uuid-ossp')
  ), '[]'::jsonb)
) as foundation;

commit;
'@

        Invoke-PinnedSupabase -Arguments @(
            "db", "query", "--linked",
            "--project-ref", $StagingProjectRef,
            "--workdir", $ResolvedStagingWorkspace,
            "--output-format", "json",
            $InspectionSql
        )
    }
    default {
        throw "Command is not in the read-only allowlist."
    }
}
