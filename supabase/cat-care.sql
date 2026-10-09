-- Additive cat-care migration. Apply only after separate production approval.
-- Procedure / impact / verification: supabase/cat-care-release.md
-- Existing tables, posts, images and paused cat-coat cooldown are not modified.
begin;
create table if not exists public.oyasumi_cat_meals (
 user_id uuid not null, care_date date not null, created_at timestamptz not null default clock_timestamp(),
 primary key(user_id,care_date)
);
create table if not exists public.oyasumi_cat_treats (
 giver_id uuid not null, recipient_id uuid not null, care_date date not null,
 created_at timestamptz not null default clock_timestamp(),
 primary key(giver_id,care_date), check(giver_id<>recipient_id)
);
create index if not exists oyasumi_cat_treats_recipient_day on public.oyasumi_cat_treats(recipient_id,care_date);
alter table public.oyasumi_cat_meals enable row level security;
alter table public.oyasumi_cat_treats enable row level security;
revoke all on public.oyasumi_cat_meals,public.oyasumi_cat_treats from public,anon,authenticated;

create or replace function public.oyasumi_cat_care_status()
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_now timestamptz:=clock_timestamp();v_day date;v_start timestamptz;v_days jsonb;
begin
 if v_user is null then raise exception '匿名認証が必要です。' using errcode='42501';end if;
 v_day:=(v_now at time zone 'Asia/Tokyo')::date;v_start:=v_day::timestamp at time zone 'Asia/Tokyo';
 select coalesce(jsonb_agg(jsonb_build_object('day',d.care_date,'count',d.n) order by d.care_date desc),'[]'::jsonb) into v_days
 from (select t.care_date,count(*) as n from public.oyasumi_cat_treats t where t.recipient_id=v_user group by t.care_date order by t.care_date desc limit 30) d;
 return jsonb_build_object('day',v_day,
  'mealEligible',exists(select 1 from public.oyasumi_posts p where p.user_id=v_user and p.choice in ('sleep','try-sleep','early-sleep') and p.created_at>=v_start and p.created_at<v_start+interval '1 day'),
  'mealDone',exists(select 1 from public.oyasumi_cat_meals m where m.user_id=v_user and m.care_date=v_day),
  'treatGiven',exists(select 1 from public.oyasumi_cat_treats t where t.giver_id=v_user and t.care_date=v_day),
  'receivedToday',(select count(*) from public.oyasumi_cat_treats t where t.recipient_id=v_user and t.care_date=v_day),
  'receivedTotal',(select count(*) from public.oyasumi_cat_treats t where t.recipient_id=v_user), 'receivedDays',v_days);
end;$$;

create or replace function public.oyasumi_give_cat_meal()
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_day date;v_start timestamptz;v_rows integer;
begin
 if v_user is null then raise exception '匿名認証が必要です。' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('cat-care:'||v_user::text,0));
 v_day:=(clock_timestamp() at time zone 'Asia/Tokyo')::date;v_start:=v_day::timestamp at time zone 'Asia/Tokyo';
 if exists(select 1 from public.oyasumi_cat_meals where user_id=v_user and care_date=v_day) then
  return jsonb_build_object('accepted',false,'status',public.oyasumi_cat_care_status());end if;
 if not exists(select 1 from public.oyasumi_profiles where user_id=v_user and cat_coat is not null) then
  raise exception '猫を選んでください。' using errcode='P0041';end if;
 if not exists(select 1 from public.oyasumi_posts p where p.user_id=v_user and p.choice in ('sleep','try-sleep','early-sleep') and p.created_at>=v_start and p.created_at<v_start+interval '1 day') then
  raise exception '今日のおやすみ投稿後にごはんをあげられます。' using errcode='P0040';end if;
 insert into public.oyasumi_cat_meals(user_id,care_date) values(v_user,v_day) on conflict do nothing;
 get diagnostics v_rows=row_count;
 return jsonb_build_object('accepted',v_rows=1,'status',public.oyasumi_cat_care_status());
end;$$;

create or replace function public.oyasumi_give_cat_treat(p_recipient uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_day date;v_rows integer;
begin
 if v_user is null then raise exception '匿名認証が必要です。' using errcode='42501';end if;
 if p_recipient is null or p_recipient=v_user then raise exception '他の猫を選んでください。' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('cat-care:'||v_user::text,0));
 v_day:=(clock_timestamp() at time zone 'Asia/Tokyo')::date;
 if not exists(select 1 from public.oyasumi_profiles where user_id=p_recipient and cat_coat is not null) or
    not exists(select 1 from public.oyasumi_profiles where user_id=v_user and cat_coat is not null) then
  raise exception '猫が見つかりません。' using errcode='P0041';end if;
 insert into public.oyasumi_cat_treats(giver_id,recipient_id,care_date) values(v_user,p_recipient,v_day) on conflict do nothing;
 get diagnostics v_rows=row_count;
 return jsonb_build_object('accepted',v_rows=1,'status',public.oyasumi_cat_care_status());
end;$$;
revoke all on function public.oyasumi_cat_care_status(),public.oyasumi_give_cat_meal(),public.oyasumi_give_cat_treat(uuid) from public,anon,authenticated;
grant execute on function public.oyasumi_cat_care_status(),public.oyasumi_give_cat_meal(),public.oyasumi_give_cat_treat(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
