-- Administrator inspection only. NOT a migration; NOT executed on production.
-- Catalogs only: no application/auth rows, RPC calls, definitions, defaults,
-- policy literals, secrets, tokens, user IDs, role names for custom owners.
-- Run the whole file in SQL Editor. One JSON result; never auto-fix findings.
begin read only;
set local search_path = pg_catalog;
set local statement_timeout = '10s';
set local lock_timeout = '2s';

with
client_roles as (
 select oid,rolname,rolsuper,rolbypassrls,rolinherit from pg_roles
 where rolname in ('anon','authenticated')
),
relations as (
 select c.*,n.nspname,o.rolsuper as owner_superuser,o.rolbypassrls as owner_bypassrls,
  case when o.rolname in ('postgres','supabase_admin') then o.rolname else 'other_role' end as owner_class
 from pg_class c join pg_namespace n on n.oid=c.relnamespace join pg_roles o on o.oid=c.relowner
 where n.nspname='public' and c.relkind in ('r','p','v','m')
 and not exists(select 1 from pg_depend d where d.classid='pg_class'::regclass and d.objid=c.oid and d.deptype='e')
),
relation_report as (
 select nspname as schema,relname as name,relkind as kind,
  relrowsecurity as rls_enabled,relforcerowsecurity as force_rls,owner_class,owner_superuser,owner_bypassrls,
  coalesce('security_invoker=true'=any(reloptions),false) as view_security_invoker
 from relations
),
table_permissions as (
 select c.relname as relation,r.rolname as role,x.privilege,
  has_table_privilege(r.oid,c.oid,x.privilege) as allowed
 from relations c cross join client_roles r
 cross join (values('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) x(privilege)
),
column_permissions as (
 select c.relname as relation,a.attname as column_name,r.rolname as role,x.privilege,
  has_column_privilege(r.oid,c.oid,a.attnum,x.privilege) as allowed
 from relations c join pg_attribute a on a.attrelid=c.oid and a.attnum>0 and not a.attisdropped
 cross join client_roles r cross join (values('SELECT'),('INSERT'),('UPDATE')) x(privilege)
),
policy_report as (
 select c.relname as relation,p.oid as policy_id,md5(p.polname) as policy_name_hash,
  case p.polcmd when 'r' then 'SELECT' when 'a' then 'INSERT' when 'w' then 'UPDATE' when 'd' then 'DELETE' else 'ALL' end as command,
  p.polpermissive as permissive,
  exists(select 1 from unnest(p.polroles) x(role_id) where role_id=0) as applies_public,
  exists(select 1 from unnest(p.polroles) x(role_id) cross join client_roles r where r.rolname='anon'
   and case when role_id=0 then true else pg_has_role(r.oid,role_id,'USAGE') end) as applies_anon,
  exists(select 1 from unnest(p.polroles) x(role_id) cross join client_roles r where r.rolname='authenticated'
   and case when role_id=0 then true else pg_has_role(r.oid,role_id,'USAGE') end) as applies_authenticated,
  p.polqual is not null as has_using,p.polwithcheck is not null as has_with_check,
  md5(pg_get_expr(p.polqual,p.polrelid)) as using_hash,
  md5(pg_get_expr(p.polwithcheck,p.polrelid)) as with_check_hash,
  coalesce(btrim(pg_get_expr(p.polqual,p.polrelid)) in ('true','(true)'),false) as using_literal_true,
  coalesce(btrim(pg_get_expr(p.polwithcheck,p.polrelid)) in ('true','(true)'),false) as check_literal_true,
  coalesce(position('auth.uid(' in pg_get_expr(p.polqual,p.polrelid))>0,false) as using_mentions_auth_uid,
  coalesce(position('auth.uid(' in pg_get_expr(p.polwithcheck,p.polrelid))>0,false) as check_mentions_auth_uid
 from pg_policy p join relations c on c.oid=p.polrelid
),
routines as (
 select p.*,o.rolsuper as owner_superuser,o.rolbypassrls as owner_bypassrls,
  case when o.rolname in ('postgres','supabase_admin') then o.rolname else 'other_role' end as owner_class
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_roles o on o.oid=p.proowner
 where n.nspname='public' and p.prokind in ('f','p')
 and not exists(select 1 from pg_depend d where d.classid='pg_proc'::regclass and d.objid=p.oid and d.deptype='e')
),
routine_report as (
 select p.oid::regprocedure::text as signature,p.prosecdef as security_definer,
  p.owner_class,p.owner_superuser,p.owner_bypassrls,
  exists(select 1 from relations c where pg_has_role(p.proowner,c.relowner,'USAGE')) as owner_has_relation_ownership,
  p.provolatile as volatility,
  exists(select 1 from unnest(p.proconfig) s where s like 'search_path=%') as search_path_explicit,
  exists(select 1 from unnest(p.proconfig) s where s like 'search_path=%'
   and btrim(split_part(s,'=',2)) in ('','""',chr(39)||chr(39))) as search_path_empty,
  exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where a.grantee=0 and a.privilege_type='EXECUTE') as public_execute,
  (select has_function_privilege(r.oid,p.oid,'EXECUTE') from client_roles r where r.rolname='anon') as anon_execute,
  (select has_function_privilege(r.oid,p.oid,'EXECUTE') from client_roles r where r.rolname='authenticated') as authenticated_execute,
  position('auth.uid(' in pg_get_functiondef(p.oid))>0 as definition_mentions_auth_uid,
  md5(pg_get_functiondef(p.oid)) as definition_hash
 from routines p
),
schema_permissions as (
 select n.nspname as schema,r.rolname as role,
  has_schema_privilege(r.oid,n.oid,'USAGE') as usage_allowed,
  has_schema_privilege(r.oid,n.oid,'CREATE') as create_allowed
 from pg_namespace n cross join client_roles r where n.nspname='public'
),
default_permissions as (
 select case when o.rolname in ('postgres','supabase_admin') then o.rolname else 'other_role' end as creator_class,
  case when d.defaclnamespace=0 then '<global>' else n.nspname end as schema,
  d.defaclobjtype as object_type,
  case when a.grantee=0 then 'PUBLIC' else r.rolname end as grantee,
  a.privilege_type,a.is_grantable
 from pg_default_acl d join pg_roles o on o.oid=d.defaclrole
 left join pg_namespace n on n.oid=d.defaclnamespace cross join lateral aclexplode(d.defaclacl) a
 left join client_roles r on r.oid=a.grantee
 where (d.defaclnamespace=0 or n.nspname='public') and (a.grantee=0 or r.oid is not null)
),
view_dependencies as (
 select distinct c.relname as view_name,n.nspname as referenced_schema,t.relname as referenced_relation
 from relations c join pg_rewrite w on w.ev_class=c.oid
 join pg_depend d on d.classid='pg_rewrite'::regclass and d.objid=w.oid and d.refclassid='pg_class'::regclass
 join pg_class t on t.oid=d.refobjid join pg_namespace n on n.oid=t.relnamespace
 where c.relkind in ('v','m') and t.oid<>c.oid
),
expected_tables(name) as (values('oyasumi_profiles'),('oyasumi_posts'),('oyasumi_reactions'),('oyasumi_cat_meals'),('oyasumi_cat_treats'),('oyasumi_cat_post_states')),
expected_routines(name) as (values('oyasumi_set_nickname'),('oyasumi_delete_post'),('oyasumi_submit_post_v2'),('oyasumi_set_reaction_v3'),('oyasumi_reaction_counts_v3'),('oyasumi_cat_care_status'),('oyasumi_give_cat_meal'),('oyasumi_give_cat_treat'))
select jsonb_build_object(
 'format','oyasumi-security-metadata-v1',
 'transaction_read_only',current_setting('transaction_read_only'),
 'scope','public non-extension objects only; exposed schemas must be checked separately',
 'verdict','REVIEW_REQUIRED; metadata and text hints do not prove A/B isolation',
 'missing_tables',(select coalesce(jsonb_agg(e.name order by e.name),'[]'::jsonb) from expected_tables e where not exists(select 1 from relations r where r.relname=e.name)),
 'missing_routines',(select coalesce(jsonb_agg(e.name order by e.name),'[]'::jsonb) from expected_routines e where not exists(select 1 from routines r where r.proname=e.name)),
 'roles',(select coalesce(jsonb_agg(to_jsonb(x) order by x.rolname),'[]'::jsonb) from client_roles x),
 'relations',(select coalesce(jsonb_agg(to_jsonb(x) order by x.name),'[]'::jsonb) from relation_report x),
 'table_permissions',(select coalesce(jsonb_agg(to_jsonb(x) order by x.relation,x.role,x.privilege),'[]'::jsonb) from table_permissions x),
 'column_permissions',(select coalesce(jsonb_agg(to_jsonb(x) order by x.relation,x.column_name,x.role,x.privilege),'[]'::jsonb) from column_permissions x),
 'policies',(select coalesce(jsonb_agg(to_jsonb(x) order by x.relation,x.policy_id),'[]'::jsonb) from policy_report x),
 'routines',(select coalesce(jsonb_agg(to_jsonb(x) order by x.signature),'[]'::jsonb) from routine_report x),
 'schema_permissions',(select coalesce(jsonb_agg(to_jsonb(x) order by x.schema,x.role),'[]'::jsonb) from schema_permissions x),
 'explicit_default_acl',(select coalesce(jsonb_agg(to_jsonb(x) order by x.creator_class,x.schema,x.object_type,x.grantee,x.privilege_type),'[]'::jsonb) from default_permissions x),
 'view_dependencies',(select coalesce(jsonb_agg(to_jsonb(x) order by x.view_name,x.referenced_schema,x.referenced_relation),'[]'::jsonb) from view_dependencies x)
) as security_metadata;
rollback;
