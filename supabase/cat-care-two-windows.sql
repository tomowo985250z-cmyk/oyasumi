-- REVIEW ONLY: do not apply to production before approval.
-- Requires existing cat-care.sql. Preserves all rows and original care_date /
-- created_at values, including legacy calendar-day records.
begin;
alter table public.oyasumi_cat_meals add column if not exists meal_slot text not null default 'legacy';
do $$begin
 if not exists(select 1 from pg_constraint where conrelid='public.oyasumi_cat_meals'::regclass and conname='oyasumi_cat_meals_slot_check') then
  alter table public.oyasumi_cat_meals add constraint oyasumi_cat_meals_slot_check check(meal_slot in ('legacy','morning','night'));
 end if;
end$$;
alter table public.oyasumi_cat_meals drop constraint if exists oyasumi_cat_meals_pkey;
alter table public.oyasumi_cat_meals add primary key(user_id,care_date,meal_slot);
-- Distinguish legacy midnight dates from new 06:00 dates without moving rows.
alter table public.oyasumi_cat_treats add column if not exists care_version integer not null default 1;
alter table public.oyasumi_cat_treats drop constraint if exists oyasumi_cat_treats_pkey;
alter table public.oyasumi_cat_treats add primary key(giver_id,care_date,recipient_id,care_version);
create index if not exists oyasumi_cat_meals_user_time on public.oyasumi_cat_meals(user_id,created_at);
create index if not exists oyasumi_cat_treats_giver_time on public.oyasumi_cat_treats(giver_id,created_at);
create index if not exists oyasumi_cat_treats_recipient_time on public.oyasumi_cat_treats(recipient_id,created_at);

-- Private helper shares the post-lock timestamp with each write's response.
create or replace function public.oyasumi_cat_care_status_at(p_now timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_day date;v_start timestamptz;v_slot text;v_days jsonb;v_recipients jsonb;v_count bigint;v_morning boolean;v_night boolean;
begin
 if v_user is null then raise exception '匿名認証が必要です。' using errcode='42501';end if;
 v_day:=((p_now at time zone 'Asia/Tokyo')-interval '6 hours')::date;
 v_start:=(v_day::timestamp+interval '6 hours') at time zone 'Asia/Tokyo';
 v_slot:=case when p_now<v_start+interval '6 hours' then 'morning' else 'night' end;
 select exists(select 1 from public.oyasumi_cat_meals where user_id=v_user and created_at>=v_start and created_at<v_start+interval '6 hours'),
  exists(select 1 from public.oyasumi_cat_meals where user_id=v_user and created_at>=v_start+interval '6 hours' and created_at<v_start+interval '1 day') into v_morning,v_night;
 select count(*),coalesce(jsonb_agg(distinct recipient_id),'[]'::jsonb) into v_count,v_recipients
  from public.oyasumi_cat_treats where giver_id=v_user and created_at>=v_start and created_at<v_start+interval '1 day';
 select coalesce(jsonb_agg(jsonb_build_object('day',d.care_date,'count',d.n) order by d.care_date desc),'[]'::jsonb) into v_days
 from (select care_date,count(*) as n from public.oyasumi_cat_treats where recipient_id=v_user group by care_date order by care_date desc limit 30) d;
 return jsonb_build_object('allowanceVersion',2,'day',v_day,'mealSlot',v_slot,
  'mealEligible',exists(select 1 from public.oyasumi_profiles where user_id=v_user and cat_coat is not null),
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
 perform pg_advisory_xact_lock(hashtextextended('cat-care:'||v_user::text,0));
 v_now:=clock_timestamp();v_status:=public.oyasumi_cat_care_status_at(v_now);
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
