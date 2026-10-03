-- 承認後にSQL Editorで実行。夜を日本時間06:00〜翌05:59へ統一します。
-- 投稿・リアクションを削除せず、既存投稿のnight_dateだけ投稿時刻で再分類します。
-- 既存RLS、投稿制限、リアクション制限、ID・event_order・created_atは保持します。
begin;
lock table public.oyasumi_posts in share row exclusive mode;

create or replace function public.oyasumi_night_date_at(p_at timestamptz)
returns date language sql immutable strict set search_path = ''
as $$ select ((p_at at time zone 'Asia/Tokyo') - interval '6 hours')::date; $$;

create or replace function public.oyasumi_night_date()
returns date language sql stable set search_path = ''
as $$ select public.oyasumi_night_date_at(statement_timestamp()); $$;

create or replace function public.oyasumi_morning_night_date_at(p_at timestamptz)
returns date language sql immutable strict set search_path = ''
as $$
 select public.oyasumi_night_date_at(p_at)
   - case when extract(hour from p_at at time zone 'Asia/Tokyo') >= 6 then 1 else 0 end;
$$;

update public.oyasumi_posts p
set night_date = public.oyasumi_night_date_at(p.created_at)
where p.night_date is distinct from public.oyasumi_night_date_at(p.created_at);

-- ロック待ち等で投稿RPCの開始時刻が06:00前、実際の投稿時刻が06:00後でも正しく分類。
create or replace function public.oyasumi_assign_post_night()
returns trigger language plpgsql set search_path = ''
as $$
begin
 new.night_date := public.oyasumi_night_date_at(new.created_at);
 return new;
end;
$$;
drop trigger if exists oyasumi_assign_post_night on public.oyasumi_posts;
create trigger oyasumi_assign_post_night before insert on public.oyasumi_posts
for each row execute function public.oyasumi_assign_post_night();

create or replace function public.oyasumi_night_context()
returns table(night_date date,morning_night_date date,server_now timestamptz,next_reset_at timestamptz)
language plpgsql stable set search_path = ''
as $$
declare v_now timestamptz := statement_timestamp(); v_night date;
begin
 if auth.uid() is null then raise exception '匿名認証が必要です。' using errcode='42501'; end if;
 v_night := public.oyasumi_night_date_at(v_now);
 return query select v_night,public.oyasumi_morning_night_date_at(v_now),v_now,
   ((v_night+1)::timestamp + interval '6 hours') at time zone 'Asia/Tokyo';
end;
$$;

create or replace function public.oyasumi_morning_reactions()
returns table(night_date date,goodnight_count bigint,dream_count bigint,tomorrow_count bigint,comfort_count bigint)
language plpgsql stable security definer set search_path = ''
as $$
declare v_user uuid := auth.uid(); v_night date;
begin
 if v_user is null then raise exception '匿名認証が必要です。' using errcode='42501'; end if;
 -- 06:00以降は「新しい夜」ではなく、切り替え前の夜の本人の全投稿を対象にする。
 v_night := public.oyasumi_morning_night_date_at(statement_timestamp());
 return query select v_night,
   count(distinct (r.post_id,r.user_id)) filter(where r.choice='goodnight'),
   count(distinct (r.post_id,r.user_id)) filter(where r.choice='dream'),
   count(distinct (r.post_id,r.user_id)) filter(where r.choice='tomorrow'),
   count(distinct (r.post_id,r.user_id)) filter(where r.choice='comfort')
 from public.oyasumi_posts p join public.oyasumi_reactions r on r.post_id=p.id
 where p.user_id=v_user and p.night_date=v_night and r.user_id<>v_user;
end;
$$;

revoke all on function public.oyasumi_night_date_at(timestamptz) from public,anon,authenticated;
revoke all on function public.oyasumi_morning_night_date_at(timestamptz) from public,anon,authenticated;
revoke all on function public.oyasumi_assign_post_night() from public,anon,authenticated;
revoke all on function public.oyasumi_night_context() from public,anon,authenticated;
revoke all on function public.oyasumi_morning_reactions() from public,anon,authenticated;
grant execute on function public.oyasumi_night_date_at(timestamptz) to authenticated;
grant execute on function public.oyasumi_morning_night_date_at(timestamptz) to authenticated;
grant execute on function public.oyasumi_night_context() to authenticated;
grant execute on function public.oyasumi_morning_reactions() to authenticated;

-- 同じトランザクション内で境界を検証。失敗すると上の変更もすべてロールバック。
do $$
declare v_awake bigint; v_sleep bigint;
begin
 if public.oyasumi_night_date_at('2026-10-04 05:59:59.999+09') <> date '2026-10-03'
  or public.oyasumi_night_date_at('2026-10-04 06:00:00+09') <> date '2026-10-04'
  or public.oyasumi_night_date_at('2026-10-05 05:59:59.999+09') <> date '2026-10-04'
  or public.oyasumi_night_date_at('2026-12-31 21:00:00+00') <> date '2027-01-01'
  or public.oyasumi_morning_night_date_at('2026-10-04 06:00:00+09') <> date '2026-10-03' then
  raise exception '06:00境界テストに失敗しました。';
 end if;
 with fixture(user_id,choice,created_at,event_order) as (values
  ('a','awake',timestamptz '2026-10-04 05:30+09',1),
  ('a','sleep',timestamptz '2026-10-04 05:59:59+09',2),
  ('b','awake',timestamptz '2026-10-04 05:59:59+09',3),
  ('a','awake',timestamptz '2026-10-04 06:00+09',4)
 ), latest as (
  select distinct on(user_id) user_id,choice from fixture
  where public.oyasumi_night_date_at(created_at)=date '2026-10-03'
  order by user_id,event_order desc
 ) select count(*) filter(where choice='awake'),count(*) filter(where choice='sleep')
 into v_awake,v_sleep from latest;
 if v_awake<>1 or v_sleep<>1 then raise exception '前夜の最新一件集計テストに失敗しました。'; end if;
 with fixture(user_id,created_at) as (values
  ('a',timestamptz '2026-10-04 05:59:59+09'),('b',timestamptz '2026-10-04 06:00+09')
 ) select count(*) into v_awake from fixture
 where public.oyasumi_night_date_at(created_at)=date '2026-10-04';
 if v_awake<>1 then raise exception '新しい夜への切り替えテストに失敗しました。'; end if;
end;
$$;
notify pgrst,'reload schema';
commit;
