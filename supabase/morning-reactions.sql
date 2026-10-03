-- 昨夜の本人の全投稿に届いたリアクション。投稿履歴や既存RPCは変更しません。
begin;
create or replace function public.oyasumi_morning_reactions()
returns table (night_date date, goodnight_count bigint, dream_count bigint, tomorrow_count bigint, comfort_count bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v_user uuid := auth.uid(); v_night date;
begin
  if v_user is null then
    raise exception '匿名認証が必要です。' using errcode = '42501';
  end if;
  -- 06:00区切り。朝は切り替え前の夜の本人の全投稿を集計します。
  v_night := public.oyasumi_morning_night_date_at(statement_timestamp());
  return query
  select v_night,
    count(distinct (r.post_id, r.user_id)) filter (where r.choice = 'goodnight'),
    count(distinct (r.post_id, r.user_id)) filter (where r.choice = 'dream'),
    count(distinct (r.post_id, r.user_id)) filter (where r.choice = 'tomorrow'),
    count(distinct (r.post_id, r.user_id)) filter (where r.choice = 'comfort')
  from public.oyasumi_posts p
  join public.oyasumi_reactions r on r.post_id = p.id
  where p.user_id = v_user and p.night_date = v_night and r.user_id <> v_user;
end;
$$;
revoke all on function public.oyasumi_morning_reactions() from public, anon, authenticated;
grant execute on function public.oyasumi_morning_reactions() to authenticated;
notify pgrst, 'reload schema';
commit;
