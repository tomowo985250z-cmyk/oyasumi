-- 読み取り専用。1回の実行で1つの結果表（4行）を返します。
-- Results → Export → Download CSV で、この結果表だけを渡してください。
-- 関数定義のCSVは受領済みのため、ここでは残りの構造情報を確認します。
select 'columns' as result_type,
  coalesce(jsonb_agg(to_jsonb(c) order by c.ordinal_position), '[]'::jsonb) as details
from (
  select column_name,data_type,column_default,is_generated,generation_expression,ordinal_position
  from information_schema.columns
  where table_schema='public' and table_name='oyasumi_posts'
) c
union all
select 'policies',coalesce(jsonb_agg(to_jsonb(p) order by p.tablename,p.policyname),'[]'::jsonb)
from (
  select tablename,policyname,cmd,roles,qual,with_check
  from pg_policies
  where schemaname='public' and tablename in ('oyasumi_posts','oyasumi_reactions')
) p
union all
select 'triggers',coalesce(jsonb_agg(to_jsonb(t) order by t.trigger_name),'[]'::jsonb)
from (
  select tgname as trigger_name,pg_get_triggerdef(oid) as definition,
    pg_get_functiondef(tgfoid) as function_definition
  from pg_trigger
  where tgrelid='public.oyasumi_posts'::regclass and not tgisinternal
) t
union all
select 'constraints',coalesce(jsonb_agg(to_jsonb(k) order by k.constraint_name),'[]'::jsonb)
from (
  select conname as constraint_name,contype as constraint_type,pg_get_constraintdef(oid) as definition
  from pg_constraint
  where conrelid='public.oyasumi_posts'::regclass
) k;
