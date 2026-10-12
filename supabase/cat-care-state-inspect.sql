-- READ ONLY. Prepared for an administrator; not executed against production.
-- Export BEFORE and AFTER results. Do not invoke saving RPCs in this inspection.
select current_database() as database_name,current_user as inspector,
 current_setting('transaction_isolation') as isolation,clock_timestamp() as inspected_at;

-- Compare complete definitions, owners, lock order, clock functions and grants.
select p.oid::regprocedure::text as signature,pg_get_functiondef(p.oid) as definition,
 md5(pg_get_functiondef(p.oid)) as definition_md5,p.prosecdef,p.provolatile,p.proconfig,
 pg_get_userbyid(p.proowner) as owner,p.proacl,
 has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
 has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.prokind='f' and p.proname in (
 'oyasumi_submit_post','oyasumi_submit_post_v2','oyasumi_delete_post',
 'oyasumi_set_reaction','oyasumi_set_reaction_v3',
 'oyasumi_cat_care_status_at','oyasumi_cat_care_status','oyasumi_give_cat_meal','oyasumi_give_cat_treat',
 'oyasumi_cat_post_choice_at','oyasumi_cat_is_sleeping_at','oyasumi_lock_cat_post_state','oyasumi_capture_cat_post_state',
 'oyasumi_night_date_at','oyasumi_night_date','oyasumi_night_context')
order by signature;

select table_name,column_name,data_type,is_nullable,column_default,is_identity,identity_generation
from information_schema.columns where table_schema='public' and table_name in (
 'oyasumi_posts','oyasumi_profiles','oyasumi_cat_meals','oyasumi_cat_treats','oyasumi_cat_post_states')
order by table_name,ordinal_position;
select c.relname,c.relrowsecurity,c.relforcerowsecurity,pg_get_userbyid(c.relowner) as owner,c.relacl
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('oyasumi_posts','oyasumi_cat_meals','oyasumi_cat_treats','oyasumi_cat_post_states');
select tablename,policyname,roles,cmd,qual,with_check from pg_policies
where schemaname='public' and tablename in ('oyasumi_posts','oyasumi_cat_meals','oyasumi_cat_treats','oyasumi_cat_post_states')
order by tablename,policyname;
select c.relname,k.conname,pg_get_constraintdef(k.oid) as definition
from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('oyasumi_posts','oyasumi_cat_meals','oyasumi_cat_treats','oyasumi_cat_post_states')
order by c.relname,k.conname;
select t.tgname,t.tgenabled,pg_get_triggerdef(t.oid) as definition,pg_get_functiondef(t.tgfoid) as function_definition
from pg_trigger t where t.tgrelid='public.oyasumi_posts'::regclass and not t.tgisinternal order by t.tgname;
select c.relname,r.role_name,a.privilege,has_table_privilege(r.role_name,c.oid,a.privilege) as allowed
from pg_class c join pg_namespace n on n.oid=c.relnamespace
cross join (values('anon'),('authenticated')) r(role_name)
cross join (values('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) a(privilege)
where n.nspname='public' and c.relname in ('oyasumi_posts','oyasumi_cat_meals','oyasumi_cat_treats','oyasumi_cat_post_states')
order by c.relname,r.role_name,a.privilege;

-- Common-column aggregate checksums remain comparable across the v2 additions.
-- Compare only while app writes are paused; counts alone do not prove equality.
select 'meals' as object_name,count(*) as rows,
 sum(hashtextextended(row(user_id,care_date,created_at)::text,0)::numeric) as common_column_checksum
from public.oyasumi_cat_meals
union all select 'treats',count(*),sum(hashtextextended(row(giver_id,recipient_id,care_date,created_at)::text,0)::numeric)
from public.oyasumi_cat_treats
union all select 'posts',count(*),sum(hashtextextended(row(id,user_id,choice,created_at,night_date,event_order)::text,0)::numeric)
from public.oyasumi_posts;
-- An AFTER inspection must have one ROW trigger and one BEFORE STATEMENT lock
-- trigger, zero client policies/grants on the new table, and versioned status.
