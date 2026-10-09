-- One Run -> one row / one JSON column (inspection).
-- Read-only SELECT: no DDL, DML, login, or application RPC calls.
-- Use the production project's SQL Editor with the postgres administrator role.
-- Existing cat-care-inspect.sql is retained. This file has NOT been executed.
-- Copy the entire returned JSON for review before approving any migration.
with
expected_columns(table_name,column_name,expected_type) as (
 values ('oyasumi_profiles','user_id','uuid'),
        ('oyasumi_profiles','cat_coat','text'),
        ('oyasumi_posts','user_id','uuid'),
        ('oyasumi_posts','choice','text'),
        ('oyasumi_posts','created_at','timestamptz')
),
dependencies as (
 select e.table_name,e.column_name,e.expected_type,c.data_type,c.udt_name,
        c.column_name is not null as present,
        coalesce(c.udt_name=e.expected_type or
          (e.expected_type='text' and c.udt_name in ('text','varchar')),false) as type_compatible
 from expected_columns e left join information_schema.columns c
 on c.table_schema='public' and c.table_name=e.table_name and c.column_name=e.column_name
),
client_roles as (
 select r.oid,r.rolname from pg_catalog.pg_roles r
 where r.rolname in ('anon','authenticated')
),
cooldown as (
 select singleton,paused from public.oyasumi_cat_coat_cooldown_control
),
care_tables as (
 select c.oid,c.relname,c.relkind,c.relrowsecurity as rls_enabled,
        pg_catalog.pg_get_userbyid(c.relowner) as owner,c.relacl
 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relname in ('oyasumi_cat_meals','oyasumi_cat_treats')
),
care_policies as (
 select tablename,policyname,roles,cmd,qual,with_check
 from pg_catalog.pg_policies where schemaname='public'
 and tablename in ('oyasumi_cat_meals','oyasumi_cat_treats')
),
care_constraints as (
 select c.relname,con.conname,pg_catalog.pg_get_constraintdef(con.oid) as definition
 from pg_catalog.pg_constraint con join care_tables c on c.oid=con.conrelid
),
table_privileges as (
 select c.relname,r.rolname as role_name,p.privilege,
        pg_catalog.has_table_privilege(r.oid,c.oid,p.privilege) as allowed
 from care_tables c cross join client_roles r
 cross join (values ('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) p(privilege)
),
care_functions as (
 select p.oid,p.proname,p.prokind,
        p.oid::regprocedure::text as signature,p.prosecdef as security_definer,
        p.proconfig,pg_catalog.pg_get_userbyid(p.proowner) as owner,p.proacl,
        pg_catalog.has_function_privilege((select oid from client_roles where rolname='anon'),p.oid,'EXECUTE') as anon_execute,
        pg_catalog.has_function_privilege((select oid from client_roles where rolname='authenticated'),p.oid,'EXECUTE') as authenticated_execute
 from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname in
 ('oyasumi_cat_care_status','oyasumi_give_cat_meal','oyasumi_give_cat_treat')
),
function_definitions as (
 select signature,
        case when prokind in ('f','p') then pg_catalog.pg_get_functiondef(oid)
             else 'Unexpected object kind: manual review required' end as definition
 from care_functions
),
checks as (
 select (select bool_and(present and type_compatible) from dependencies) as dependencies_ok,
        (select count(*)=2 from client_roles) as roles_ok,
        pg_catalog.to_regprocedure('auth.uid()') is not null as auth_uid_present,
        (select count(*)=1 and coalesce(bool_and(singleton and paused),false) from cooldown) as seven_day_limit_paused,
        (select count(*) from care_tables) as existing_care_table_count,
        (select count(*) from care_functions) as existing_care_function_count
)
select jsonb_build_object(
 'summary',jsonb_build_object(
   'review_status',case
     when not (checks.dependencies_ok and checks.roles_ok and checks.auth_uid_present and checks.seven_day_limit_paused)
       then 'STOP: prerequisite or paused-state check failed'
     when checks.existing_care_table_count>0 or checks.existing_care_function_count>0
       then 'REVIEW: existing care objects found; compare definitions before applying'
     else 'PRECHECK_READY_FOR_REVIEW: prerequisites present; care objects not installed'
   end,
   'approval_to_apply',false,
   'dependencies_ok',checks.dependencies_ok,
   'roles_ok',checks.roles_ok,
   'auth_uid_present',checks.auth_uid_present,
   'seven_day_limit_paused',checks.seven_day_limit_paused,
   'existing_care_table_count',checks.existing_care_table_count,
   'existing_care_function_count',checks.existing_care_function_count,
   'note','Read-only inspection. Result does not approve SQL application, commit, push or deployment.'
 ),
 '1_database_and_existing_data',jsonb_build_object(
   'database_name',current_database(),'database_role',current_user,
   'japan_time',clock_timestamp() at time zone 'Asia/Tokyo',
   'counts',jsonb_build_object(
     'oyasumi_profiles',(select count(*) from public.oyasumi_profiles),
     'oyasumi_posts',(select count(*) from public.oyasumi_posts)),
   'note','Normal application activity can change counts between inspections.'
 ),
 '2_dependencies',jsonb_build_object(
   'columns',(select jsonb_agg(to_jsonb(d) order by table_name,column_name) from dependencies d),
   'roles',coalesce((select jsonb_agg(rolname order by rolname) from client_roles),'[]'::jsonb),
   'auth_uid',pg_catalog.to_regprocedure('auth.uid()')::text
 ),
 '3_seven_day_limit',jsonb_build_object(
   'expected','Exactly one row: singleton=true, paused=true. Do not restore seven-day limit.',
   'rows',coalesce((select jsonb_agg(to_jsonb(c) order by singleton) from cooldown c),'[]'::jsonb)
 ),
 '4_care_objects',jsonb_build_object(
   'expected_before_first_apply','tables=[], policies=[], constraints=[]',
   'tables',coalesce((select jsonb_agg(to_jsonb(t)-'oid' order by relname) from care_tables t),'[]'::jsonb),
   'policies',coalesce((select jsonb_agg(to_jsonb(p) order by tablename,policyname) from care_policies p),'[]'::jsonb),
   'constraints',coalesce((select jsonb_agg(to_jsonb(c) order by relname,conname) from care_constraints c),'[]'::jsonb)
 ),
 '5_direct_table_privileges',jsonb_build_object(
   'expected_before_first_apply','rows=[]; this does not prove post-application permissions',
   'expected_after_apply','All 28 allowed values must be false',
   'rows',coalesce((select jsonb_agg(to_jsonb(p) order by relname,role_name,privilege) from table_privileges p),'[]'::jsonb)
 ),
 '6_rpc_permissions',jsonb_build_object(
   'expected_before_first_apply','rows=[]',
   'expected_after_apply','Exactly three expected signatures; security_definer=true, empty search_path, anon_execute=false, authenticated_execute=true. Review owners and ACLs.',
   'rows',coalesce((select jsonb_agg(to_jsonb(f)-'oid' order by signature) from care_functions f),'[]'::jsonb)
 ),
 '7_rpc_definitions',jsonb_build_object(
   'expected_before_first_apply','rows=[]',
   'rows',coalesce((select jsonb_agg(to_jsonb(f) order by signature) from function_definitions f),'[]'::jsonb)
 )
) as inspection
from checks;
