-- 読み取り専用。1つの結果表（3行）で現在の定義と権限を確認します。
-- 対象が見つからない場合、制約は空配列、関数と権限は found: false になります。
with target_function as (
 select p.*
 from pg_catalog.pg_proc p
 where p.oid = pg_catalog.to_regprocedure('public.oyasumi_set_cat_coat(text)')
)
select '01_constraint' as result_type,
 coalesce(
  jsonb_agg(jsonb_build_object(
   'constraint_name', c.conname,
   'definition', pg_catalog.pg_get_constraintdef(c.oid, true),
   'validated', c.convalidated
  ) order by c.conname),
  '[]'::jsonb
 ) as details
from pg_catalog.pg_constraint c
where c.conrelid = pg_catalog.to_regclass('public.oyasumi_profiles')
 and c.conname = 'oyasumi_cat_coat_choices'

union all

select '02_function_definition',
 coalesce((
  select jsonb_build_object(
   'found', true,
   'signature', p.oid::regprocedure::text,
   'owner', pg_catalog.pg_get_userbyid(p.proowner),
   'security_definer', p.prosecdef,
   'configuration', p.proconfig,
   'definition', pg_catalog.pg_get_functiondef(p.oid)
  )
  from target_function p
 ), '{"found":false}'::jsonb)

union all

select '03_execute_privileges',
 coalesce((
  select jsonb_build_object(
   'found', true,
   'owner', pg_catalog.pg_get_userbyid(p.proowner),
   'acl_uses_default', p.proacl is null,
   'stored_acl', p.proacl::text,
   'execute_acl', (
    select coalesce(jsonb_agg(jsonb_build_object(
     'grantee', case when a.grantee = 0 then 'PUBLIC'
                    else pg_catalog.pg_get_userbyid(a.grantee)::text end,
     'grantor', pg_catalog.pg_get_userbyid(a.grantor),
     'privilege', a.privilege_type,
     'grant_option', a.is_grantable
    ) order by a.grantee, a.grantor), '[]'::jsonb)
    from pg_catalog.aclexplode(
     coalesce(p.proacl, pg_catalog.acldefault('f', p.proowner))
    ) a
    where a.privilege_type = 'EXECUTE'
   ),
   'effective_execute_by_role', (
    select coalesce(jsonb_agg(jsonb_build_object(
     'role', r.rolname,
     'superuser', r.rolsuper,
     'can_execute', pg_catalog.has_function_privilege(r.oid, p.oid, 'EXECUTE')
    ) order by r.rolname), '[]'::jsonb)
    from pg_catalog.pg_roles r
   )
  )
  from target_function p
 ), '{"found":false}'::jsonb)
order by result_type;
