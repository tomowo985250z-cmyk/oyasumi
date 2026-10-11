-- 読み取り専用。既存の投稿・取消・集計・06:00区切りを引き継ぐための確認です。
select 'functions' as result_type,
  jsonb_agg(jsonb_build_object('name', p.proname,
    'definition', pg_get_functiondef(p.oid)) order by p.proname) as details
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in (
  'oyasumi_submit_post','oyasumi_set_reaction','oyasumi_reaction_counts',
  'oyasumi_night_date_at','oyasumi_morning_night_date_at','oyasumi_night_context'
)
union all
select 'columns',jsonb_agg(to_jsonb(c) order by c.table_name,c.ordinal_position)
from (select table_name,column_name,data_type,column_default,is_generated,
  generation_expression,ordinal_position from information_schema.columns
  where table_schema='public' and table_name in ('oyasumi_posts','oyasumi_reactions')) c
union all
select 'constraints',jsonb_agg(to_jsonb(c) order by c.table_name,c.conname)
from (select conrelid::regclass::text as table_name,conname,pg_get_constraintdef(oid) as definition
  from pg_constraint where conrelid in ('public.oyasumi_posts'::regclass,'public.oyasumi_reactions'::regclass)) c
union all
select 'triggers',jsonb_agg(to_jsonb(t) order by t.tgname)
from (select tgname,pg_get_triggerdef(oid) as definition,pg_get_functiondef(tgfoid) as function_definition
  from pg_trigger where tgrelid in ('public.oyasumi_posts'::regclass,'public.oyasumi_reactions'::regclass)
  and not tgisinternal) t;
