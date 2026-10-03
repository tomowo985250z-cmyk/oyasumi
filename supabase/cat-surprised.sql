-- きょとんを追加。既存の値・毛色・RLS・他のRPCは維持します。
begin;
alter table public.oyasumi_profiles
  drop constraint if exists oyasumi_cat_expression_choices;
alter table public.oyasumi_profiles
  add constraint oyasumi_cat_expression_choices
  check (cat_expression in ('calm', 'sleepy', 'yawn', 'restless', 'happy', 'surprised'));
create or replace function public.oyasumi_set_cat_expression(p_expression text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception '匿名認証が必要です。' using errcode = '42501';
  end if;
  if p_expression is null
     or p_expression not in ('calm', 'sleepy', 'yawn', 'restless', 'happy', 'surprised') then
    raise exception '用意された表情から選んでください。' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_user::text, 0));
  insert into public.oyasumi_profiles (user_id, cat_expression)
  values (v_user, p_expression)
  on conflict (user_id) do update
    set cat_expression = excluded.cat_expression,
        updated_at = clock_timestamp();
  return p_expression;
end;
$$;

revoke all on function public.oyasumi_set_cat_expression(text)
  from public, anon, authenticated;
grant execute on function public.oyasumi_set_cat_expression(text)
  to authenticated;

notify pgrst, 'reload schema';
commit;
