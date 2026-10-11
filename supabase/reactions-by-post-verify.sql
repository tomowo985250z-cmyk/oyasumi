-- 適用後の読み取り専用確認。データ・認証情報・送信者IDは返しません。
select 'schema' as result_type,jsonb_build_object(
 'post_intent',exists(select 1 from information_schema.columns where table_schema='public' and table_name='oyasumi_posts' and column_name='post_intent'),
 'reaction_check',(select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.oyasumi_reactions'::regclass and conname='oyasumi_reaction_choices_v3')
) as details
union all
select 'rpc',jsonb_agg(jsonb_build_object('name',p.proname,'security_definer',p.prosecdef,
 'authenticated',has_function_privilege('authenticated',p.oid,'EXECUTE'),
 'anon',has_function_privilege('anon',p.oid,'EXECUTE')) order by p.proname)
from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in (
 'oyasumi_submit_post_v2','oyasumi_set_reaction_v3','oyasumi_reaction_counts_v3','oyasumi_morning_reactions_v2')
union all
select 'six_am',jsonb_build_object(
 'before',public.oyasumi_night_date_at('2026-10-11T05:59:59.999+09:00'),
 'after',public.oyasumi_night_date_at('2026-10-11T06:00:00+09:00'),
 'morning',public.oyasumi_morning_night_date_at('2026-10-11T06:00:00+09:00'),
 'current_night',public.oyasumi_night_date(),
 'expected_current_night',public.oyasumi_night_date_at(statement_timestamp())
);
