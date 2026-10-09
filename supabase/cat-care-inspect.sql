-- Read-only pre/post inspection. Prepared only; not executed.
-- Run in SQL Editor as the database administrator after approval.

-- 1. Target project/database and existing data counts: save before/after results.
select current_database() as database_name, current_user as database_role,
       clock_timestamp() at time zone 'Asia/Tokyo' as japan_time;
select 'oyasumi_profiles' as object_name, count(*) as row_count from public.oyasumi_profiles
union all
select 'oyasumi_posts', count(*) from public.oyasumi_posts;
-- Counts can grow during normal use; the migration itself does not modify these rows.

-- 2. Dependencies: these five columns must exist with compatible types.
select table_name,column_name,data_type,udt_name
from information_schema.columns
where table_schema='public' and
 ((table_name='oyasumi_profiles' and column_name in ('user_id','cat_coat')) or
  (table_name='oyasumi_posts' and column_name in ('user_id','choice','created_at')))
order by table_name,column_name;
select rolname from pg_catalog.pg_roles where rolname in ('anon','authenticated') order by rolname;
select pg_catalog.to_regprocedure('auth.uid()') as auth_uid;

-- 3. Paused must remain true before and after. Do not run restore-seven-days.sql.
select singleton,paused from public.oyasumi_cat_coat_cooldown_control;

-- 4. First application: no rows. Reapplication: check existing definitions first.
-- After application: two tables, both RLS true, no client policies.
select c.relname,c.relrowsecurity as rls_enabled,
       pg_catalog.pg_get_userbyid(c.relowner) as owner,c.relacl
from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('oyasumi_cat_meals','oyasumi_cat_treats')
order by c.relname;
select tablename,policyname,roles,cmd,qual,with_check from pg_catalog.pg_policies
where schemaname='public' and tablename in ('oyasumi_cat_meals','oyasumi_cat_treats');
select c.relname,con.conname,pg_catalog.pg_get_constraintdef(con.oid) as definition
from pg_catalog.pg_constraint con join pg_catalog.pg_class c on c.oid=con.conrelid
join pg_catalog.pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('oyasumi_cat_meals','oyasumi_cat_treats')
order by c.relname,con.conname;

-- 5. After application: every client table privilege below must be false.
select c.relname,r.role_name,p.privilege,
       pg_catalog.has_table_privilege(r.role_name,c.oid,p.privilege) as allowed
from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
cross join (values ('anon'),('authenticated')) r(role_name)
cross join (values ('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) p(privilege)
where n.nspname='public' and c.relname in ('oyasumi_cat_meals','oyasumi_cat_treats')
order by c.relname,r.role_name,p.privilege;

-- 6. After application: exactly three signatures, security_definer true,
-- search_path="", anon_execute false, authenticated_execute true.
select p.oid::regprocedure as signature,p.prosecdef as security_definer,p.proconfig,
       pg_catalog.pg_get_userbyid(p.proowner) as owner,p.proacl,
       pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
       pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute
from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in
 ('oyasumi_cat_care_status','oyasumi_give_cat_meal','oyasumi_give_cat_treat')
order by p.oid::regprocedure::text;

-- 7. Reapplication review: inspect bodies without invoking write RPCs.
select pg_catalog.pg_get_functiondef(p.oid) as definition
from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in
 ('oyasumi_cat_care_status','oyasumi_give_cat_meal','oyasumi_give_cat_treat');
