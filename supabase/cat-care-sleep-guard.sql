-- REVIEW ONLY: approval required before production application.
-- Requires cat-care-two-windows.sql. Existing rows/counts/boundaries stay intact.
-- Also requires legacy/v2 post RPCs, post_intent and the JST 06:00 date helper.
-- Persists the latest reported state independently of deletable post history.
begin;
do $$begin
 if to_regprocedure('public.oyasumi_submit_post(text)') is null
  or to_regprocedure('public.oyasumi_submit_post_v2(text,text)') is null
  or to_regprocedure('public.oyasumi_night_date_at(timestamptz)') is null
  or not exists(select 1 from information_schema.columns where table_schema='public' and table_name='oyasumi_posts' and column_name='post_intent')
  or not exists(select 1 from information_schema.columns where table_schema='public' and table_name='oyasumi_cat_meals' and column_name='meal_slot')
  or not exists(select 1 from information_schema.columns where table_schema='public' and table_name='oyasumi_cat_treats' and column_name='care_version')
  or not exists(select 1 from pg_constraint c where c.conrelid=to_regclass('public.oyasumi_cat_meals') and c.contype='p'
   and array(select a.attname::text from unnest(c.conkey) with ordinality k(attnum,pos)
    join pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.attnum order by k.pos)=array['user_id','care_date','meal_slot'])
  or not exists(select 1 from pg_constraint c where c.conrelid=to_regclass('public.oyasumi_cat_treats') and c.contype='p'
   and array(select a.attname::text from unnest(c.conkey) with ordinality k(attnum,pos)
    join pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.attnum order by k.pos)=array['giver_id','care_date','recipient_id','care_version']) then
  raise exception 'Requires post RPCs / post_intent / night_date_at and cat-care-two-windows.sql.' using errcode='55000';
 end if;
 if public.oyasumi_night_date_at('2026-01-02T05:59:59.999+09:00'::timestamptz) is distinct from date '2026-01-01'
  or public.oyasumi_night_date_at('2026-01-02T06:00:00+09:00'::timestamptz) is distinct from date '2026-01-02' then
  raise exception 'Requires the JST 06:00 night_date_at boundary.' using errcode='55000';
 end if;
end$$;
-- Block post writes until both backfill and the trigger are installed.
lock table public.oyasumi_posts in share row exclusive mode;
create table if not exists public.oyasumi_cat_post_states (
 user_id uuid not null, care_date date not null, last_post_order bigint not null,
 choice text not null check(choice in ('awake','sleep','try-sleep','early-sleep')),
 reported_at timestamptz not null,
 primary key(user_id,care_date)
);
-- Deliberately no FK to posts/profiles: deleting history must not reset state.
alter table public.oyasumi_cat_post_states enable row level security;
revoke all on public.oyasumi_cat_post_states from public,anon,authenticated;
insert into public.oyasumi_cat_post_states as s(user_id,care_date,last_post_order,choice,reported_at)
 select distinct on (p.user_id,((p.created_at at time zone 'Asia/Tokyo')-interval '6 hours')::date)
  p.user_id,((p.created_at at time zone 'Asia/Tokyo')-interval '6 hours')::date,p.event_order,p.choice,p.created_at
 from public.oyasumi_posts p
 order by p.user_id,((p.created_at at time zone 'Asia/Tokyo')-interval '6 hours')::date,p.event_order desc
 on conflict(user_id,care_date) do update set
  last_post_order=excluded.last_post_order,choice=excluded.choice,reported_at=excluded.reported_at
 where excluded.last_post_order>s.last_post_order;

create or replace function public.oyasumi_lock_cat_post_state()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 -- BEFORE STATEMENT is essential: UPDATE/DELETE row locks must not precede
 -- the user lock (reaction RPCs take the user lock before locking a post).
 if auth.uid() is not null then
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 end if;
 return null;
end;$$;
drop trigger if exists oyasumi_cat_post_state_lock on public.oyasumi_posts;
create trigger oyasumi_cat_post_state_lock before insert or update or delete on public.oyasumi_posts
 for each statement execute function public.oyasumi_lock_cat_post_state();

create or replace function public.oyasumi_capture_cat_post_state()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op<>'INSERT' then
  -- Preserve the last state even when its post is updated or deleted.
  insert into public.oyasumi_cat_post_states as s(user_id,care_date,last_post_order,choice,reported_at)
   values(old.user_id,((old.created_at at time zone 'Asia/Tokyo')-interval '6 hours')::date,old.event_order,old.choice,old.created_at)
   on conflict(user_id,care_date) do update set
    last_post_order=excluded.last_post_order,choice=excluded.choice,reported_at=excluded.reported_at
   where excluded.last_post_order>s.last_post_order;
 end if;
 if tg_op<>'DELETE' then
  insert into public.oyasumi_cat_post_states as s(user_id,care_date,last_post_order,choice,reported_at)
   values(new.user_id,((new.created_at at time zone 'Asia/Tokyo')-interval '6 hours')::date,new.event_order,new.choice,new.created_at)
   on conflict(user_id,care_date) do update set
    last_post_order=excluded.last_post_order,choice=excluded.choice,reported_at=excluded.reported_at
   where excluded.last_post_order>=s.last_post_order;
  return new;
 end if;
 return old;
end;$$;
drop trigger if exists oyasumi_cat_post_state on public.oyasumi_posts;
create trigger oyasumi_cat_post_state before insert or update or delete on public.oyasumi_posts
 for each row execute function public.oyasumi_capture_cat_post_state();

create or replace function public.oyasumi_cat_post_choice_at(p_now timestamptz)
returns text language sql stable security definer set search_path='' as $$
 select s.choice from public.oyasumi_cat_post_states s
 where s.user_id=auth.uid()
  and s.care_date=((p_now at time zone 'Asia/Tokyo')-interval '6 hours')::date
  and s.reported_at<=p_now;
$$;
create or replace function public.oyasumi_cat_is_sleeping_at(p_now timestamptz)
returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(public.oyasumi_cat_post_choice_at(p_now) in ('sleep','try-sleep','early-sleep'),false);
$$;
revoke all on function public.oyasumi_capture_cat_post_state() from public,anon,authenticated;
revoke all on function public.oyasumi_lock_cat_post_state() from public,anon,authenticated;
revoke all on function public.oyasumi_cat_post_choice_at(timestamptz) from public,anon,authenticated;
revoke all on function public.oyasumi_cat_is_sleeping_at(timestamptz) from public,anon,authenticated;

-- A deleted newer report must not make the 60-second dedupe return an older
-- choice without firing the state trigger. Preserve ordinary dedupe/rate limits.
CREATE OR REPLACE FUNCTION public.oyasumi_submit_post(p_choice text)
 RETURNS public.oyasumi_posts
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := auth.uid();
  v_night date; v_now timestamptz;
  v_last public.oyasumi_posts;
  v_post public.oyasumi_posts;
  v_recent_count bigint;
begin
  if v_user is null then
    raise exception '匿名認証が必要です。' using errcode = '42501';
  end if;

  if p_choice is null
     or p_choice not in ('awake', 'sleep', 'try-sleep', 'early-sleep') then
    raise exception '用意された投稿から選んでください。'
      using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user::text, 0));
  v_now := clock_timestamp(); v_night := public.oyasumi_night_date_at(v_now);

  insert into public.oyasumi_profiles (user_id)
  values (v_user)
  on conflict (user_id) do nothing;

  select p.*
  into v_last
  from public.oyasumi_posts p
  where p.user_id = v_user
  order by p.event_order desc
  limit 1;

  if v_last.id is not null
     and v_last.night_date = v_night
     and v_last.choice = p_choice
     and v_last.created_at > clock_timestamp() - interval '60 seconds'
     and not exists(select 1 from public.oyasumi_cat_post_states s
      where s.user_id=v_user and s.care_date=v_night and s.last_post_order>v_last.event_order) then
    return v_last;
  end if;

  select count(*)
  into v_recent_count
  from public.oyasumi_posts p
  where p.user_id = v_user
    and p.created_at > clock_timestamp() - interval '1 minute';

  if v_recent_count >= 10 then
    raise exception '少し待ってから投稿してください。'
      using errcode = '22023';
  end if;

  insert into public.oyasumi_posts
    (user_id, choice, night_date, created_at)
  values
    (v_user, p_choice, v_night, v_now)
  returning * into v_post;

  return v_post;
end;
$function$;

create or replace function public.oyasumi_submit_post_v2(p_choice text,p_intent text)
returns public.oyasumi_posts language plpgsql security definer set search_path=''
as $$
declare
 v_user uuid:=auth.uid(); v_night date; v_now timestamptz;
 v_last public.oyasumi_posts; v_post public.oyasumi_posts; v_recent_count bigint;
begin
 if v_user is null then raise exception '匿名認証が必要です。' using errcode='42501'; end if;
 if p_choice is null or p_intent is null or not (
  (p_choice='awake' and p_intent in ('relax','sleepless')) or
  (p_choice in ('sleep','early-sleep') and p_intent='sleep') or
  (p_choice='try-sleep' and p_intent='try-sleep')
 ) then raise exception '用意された投稿から選んでください。' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended(v_user::text,0));
 v_now:=clock_timestamp();v_night:=public.oyasumi_night_date_at(v_now);
 insert into public.oyasumi_profiles(user_id) values(v_user) on conflict(user_id) do nothing;
 select p.* into v_last from public.oyasumi_posts p
  where p.user_id=v_user order by p.event_order desc limit 1;
 if v_last.id is not null and v_last.night_date=v_night and v_last.choice=p_choice
  and v_last.post_intent=p_intent and v_last.created_at>clock_timestamp()-interval '60 seconds'
     and not exists(select 1 from public.oyasumi_cat_post_states s
      where s.user_id=v_user and s.care_date=v_night and s.last_post_order>v_last.event_order) then
  return v_last;
 end if;
 select count(*) into v_recent_count from public.oyasumi_posts p
  where p.user_id=v_user and p.created_at>clock_timestamp()-interval '1 minute';
 if v_recent_count>=10 then raise exception '少し待ってから投稿してください。' using errcode='22023'; end if;
 insert into public.oyasumi_posts(user_id,choice,post_intent,night_date,created_at)
  values(v_user,p_choice,p_intent,v_night,v_now) returning * into v_post;
 return v_post;
end $$;

revoke all on function public.oyasumi_submit_post(text),public.oyasumi_submit_post_v2(text,text) from public,anon,authenticated;
grant execute on function public.oyasumi_submit_post(text),public.oyasumi_submit_post_v2(text,text) to authenticated;

-- These four public/private care definitions intentionally match the first
-- migration, so either file can be reapplied without disabling the guard.
create or replace function public.oyasumi_cat_care_status_at(p_now timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_day date;v_start timestamptz;v_slot text;v_days jsonb;v_recipients jsonb;v_count bigint;v_morning boolean;v_night boolean;v_choice text;v_state_version integer:=0;
begin
 if v_user is null then raise exception '匿名認証が必要です。' using errcode='42501';end if;
 v_day:=((p_now at time zone 'Asia/Tokyo')-interval '6 hours')::date;
 v_start:=(v_day::timestamp+interval '6 hours') at time zone 'Asia/Tokyo';
 v_slot:=case when p_now<v_start+interval '6 hours' then 'morning' else 'night' end;
 -- Optional until the second migration; never overwrite an installed guard.
 if to_regclass('public.oyasumi_cat_post_states') is not null
  and to_regprocedure('public.oyasumi_cat_post_choice_at(timestamptz)') is not null then
  v_choice:=public.oyasumi_cat_post_choice_at(p_now);v_state_version:=1;
 end if;
 select exists(select 1 from public.oyasumi_cat_meals where user_id=v_user and created_at>=v_start and created_at<v_start+interval '6 hours'),
  exists(select 1 from public.oyasumi_cat_meals where user_id=v_user and created_at>=v_start+interval '6 hours' and created_at<v_start+interval '1 day') into v_morning,v_night;
 select count(*),coalesce(jsonb_agg(distinct recipient_id),'[]'::jsonb) into v_count,v_recipients
  from public.oyasumi_cat_treats where giver_id=v_user and created_at>=v_start and created_at<v_start+interval '1 day';
 select coalesce(jsonb_agg(jsonb_build_object('day',d.care_date,'count',d.n) order by d.care_date desc),'[]'::jsonb) into v_days
 from (select care_date,count(*) as n from public.oyasumi_cat_treats where recipient_id=v_user group by care_date order by care_date desc limit 30) d;
 return jsonb_build_object('allowanceVersion',2,'day',v_day,'mealSlot',v_slot,
  'mealEligible',exists(select 1 from public.oyasumi_profiles where user_id=v_user and cat_coat is not null),
  'sleepStateVersion',v_state_version,'mealSleeping',coalesce(v_choice in ('sleep','try-sleep','early-sleep'),false),
  'catState',case when v_choice is null then null when v_choice='awake' then 'awake' else 'sleep' end,
  'mealDone',case when v_slot='morning' then v_morning else v_night end,'mealMorningDone',v_morning,'mealNightDone',v_night,
  'treatGiven',v_count>=2,'treatCount',v_count,'treatRecipients',v_recipients,
  'receivedToday',(select count(*) from public.oyasumi_cat_treats where recipient_id=v_user and created_at>=v_start and created_at<v_start+interval '1 day'),
  'receivedTotal',(select count(*) from public.oyasumi_cat_treats where recipient_id=v_user),'receivedDays',v_days);
end;$$;
create or replace function public.oyasumi_cat_care_status()
returns jsonb language sql security definer set search_path='' as $$
 select public.oyasumi_cat_care_status_at(clock_timestamp());
$$;
create or replace function public.oyasumi_give_cat_meal()
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_now timestamptz;v_status jsonb;v_rows integer;
begin
 if v_user is null then raise exception '匿名認証が必要です。' using errcode='42501';end if;
 -- Common order: user/post lock, then care lock; timestamp is read afterwards.
 perform pg_advisory_xact_lock(hashtextextended(v_user::text,0));
 perform pg_advisory_xact_lock(hashtextextended('cat-care:'||v_user::text,0));
 v_now:=clock_timestamp();v_status:=public.oyasumi_cat_care_status_at(v_now);
 if (v_status->>'mealSleeping')::boolean then raise exception 'おやすみ中は、ごはんをあげられません。' using errcode='P0042';end if;
 if (v_status->>'mealDone')::boolean then return jsonb_build_object('accepted',false,'status',v_status);end if;
 if not (v_status->>'mealEligible')::boolean then raise exception '猫を選んでください。' using errcode='P0041';end if;
 insert into public.oyasumi_cat_meals(user_id,care_date,meal_slot,created_at)
  values(v_user,(v_status->>'day')::date,v_status->>'mealSlot',v_now) on conflict do nothing;
 get diagnostics v_rows=row_count;
 return jsonb_build_object('accepted',v_rows=1,'status',public.oyasumi_cat_care_status_at(v_now));
end;$$;
create or replace function public.oyasumi_give_cat_treat(p_recipient uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_now timestamptz;v_status jsonb;v_rows integer;
begin
 if v_user is null then raise exception '匿名認証が必要です。' using errcode='42501';end if;
 if p_recipient is null or p_recipient=v_user then raise exception '他の猫を選んでください。' using errcode='22023';end if;
 -- Common order: user/post lock, then care lock; timestamp is read afterwards.
 perform pg_advisory_xact_lock(hashtextextended(v_user::text,0));
 perform pg_advisory_xact_lock(hashtextextended('cat-care:'||v_user::text,0));
 v_now:=clock_timestamp();v_status:=public.oyasumi_cat_care_status_at(v_now);
 if not exists(select 1 from public.oyasumi_profiles where user_id=p_recipient and cat_coat is not null)
  or not (v_status->>'mealEligible')::boolean then raise exception '猫が見つかりません。' using errcode='P0041';end if;
 if (v_status->>'treatGiven')::boolean or v_status->'treatRecipients' ? p_recipient::text then
  return jsonb_build_object('accepted',false,'status',v_status);end if;
 insert into public.oyasumi_cat_treats(giver_id,recipient_id,care_date,care_version,created_at)
  values(v_user,p_recipient,(v_status->>'day')::date,2,v_now) on conflict do nothing;
 get diagnostics v_rows=row_count;
 return jsonb_build_object('accepted',v_rows=1,'status',public.oyasumi_cat_care_status_at(v_now));
end;$$;
revoke all on function public.oyasumi_cat_care_status_at(timestamptz) from public,anon,authenticated;
revoke all on function public.oyasumi_cat_care_status(),public.oyasumi_give_cat_meal(),public.oyasumi_give_cat_treat(uuid) from public,anon,authenticated;
grant execute on function public.oyasumi_cat_care_status(),public.oyasumi_give_cat_meal(),public.oyasumi_give_cat_treat(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
