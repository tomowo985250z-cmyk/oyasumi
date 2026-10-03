-- 今夜の就寝状態を一人一件で集計。個人名・ユーザーIDは返しません。
begin;
create or replace function public.oyasumi_tonight_summary()
returns table (night_date date, sleeping_count bigint, cat_coats jsonb, peak_hours jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v_night date;
begin
  if auth.uid() is null then
    raise exception '匿名認証が必要です。' using errcode = '42501';
  end if;
  select c.night_date into v_night from public.oyasumi_tonight_counts() c;
  return query
  with latest as (
    select distinct on (p.user_id) p.user_id, p.choice, p.created_at
    from public.oyasumi_posts p where p.night_date = v_night
    order by p.user_id, p.event_order desc
  ), sleeping as (
    select l.user_id, l.created_at, coalesce(p.cat_coat, 'calico') as coat
    from latest l left join public.oyasumi_profiles p on p.user_id = l.user_id
    where l.choice in ('sleep', 'try-sleep', 'early-sleep')
  ), coats as (
    select s.coat, count(*) as people from sleeping s group by s.coat
  ), hours as (
    select extract(hour from s.created_at at time zone 'Asia/Tokyo')::integer as hour,
      count(*) as people from sleeping s group by 1
  )
  select v_night, (select count(*) from sleeping),
    coalesce((select jsonb_agg(jsonb_build_object('coat', c.coat, 'count', c.people) order by c.coat) from coats c), '[]'::jsonb),
    coalesce((select jsonb_agg(jsonb_build_object('hour', h.hour, 'count', h.people) order by h.hour)
      from hours h where h.people = (select max(x.people) from hours x)), '[]'::jsonb);
end;
$$;
revoke all on function public.oyasumi_tonight_summary() from public, anon, authenticated;
grant execute on function public.oyasumi_tonight_summary() to authenticated;
notify pgrst, 'reload schema';
commit;
