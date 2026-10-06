-- SQL Editorで実行。投稿・認証・猫設定の既存RPC/RLSは変更しません。
-- 各時点までの投稿から、一人につき最新の報告を集計します。
-- 母集団は各時点で報告済みの参加者。起床＋睡眠＝母集団の人数を保証します。
-- 削除された投稿は過去の推移からも除外されます。
begin;

create index if not exists oyasumi_posts_trend_lookup
  on public.oyasumi_posts (night_date, created_at, user_id, event_order desc);

create or replace function public.oyasumi_tonight_trend()
returns table (
  night_date date,
  sampled_at timestamptz,
  awake_count bigint,
  sleeping_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_night date;
  v_now timestamptz := statement_timestamp();
  v_first timestamptz;
  v_start timestamptz;
begin
  if auth.uid() is null then
    raise exception '匿名認証が必要です。' using errcode = '42501';
  end if;
  select c.night_date into v_night from public.oyasumi_tonight_counts() c;
  select min(p.created_at) into v_first
    from public.oyasumi_posts p where p.night_date = v_night and p.created_at <= v_now;
  if v_first is null then return; end if;

  -- 最初の投稿以降の15分境界と、現在時点。未来の点は生成しません。
  v_start := date_trunc('hour', v_first)
    + make_interval(mins => (floor(extract(minute from v_first) / 15)::integer + 1) * 15);
  return query
  with points as (
    select generate_series(v_start, v_now, interval '15 minutes') as point
    union select v_now
  )
  select v_night, t.point,
    count(*) filter (where latest.choice = 'awake'),
    -- choiceは4種類に制約済み。寝た人数は同じ母集団の補集合です。
    -- LEFT JOINの空行は人数に含めません。
    count(latest.user_id) - count(*) filter (where latest.choice = 'awake')
  from points t
  left join lateral (
    select distinct on (p.user_id) p.user_id, p.choice
    from public.oyasumi_posts p
    where p.night_date = v_night and p.created_at <= t.point
    order by p.user_id, p.event_order desc
  ) latest on true
  group by t.point
  order by t.point;
end;
$$;

revoke all on function public.oyasumi_tonight_trend() from public, anon, authenticated;
grant execute on function public.oyasumi_tonight_trend() to authenticated;
notify pgrst, 'reload schema';
commit;
