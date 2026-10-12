-- REVIEW ONLY: approval required before production application.
-- Requires cat-care-two-windows.sql. No table/row/count/boundary changes.
begin;
create or replace function public.oyasumi_cat_is_sleeping_at(p_now timestamptz)
returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((select p.choice in ('sleep','try-sleep','early-sleep')
  from public.oyasumi_posts p
  where p.user_id=auth.uid()
   and p.created_at>=((((p_now at time zone 'Asia/Tokyo')-interval '6 hours')::date::timestamp+interval '6 hours') at time zone 'Asia/Tokyo')
   and p.created_at<=p_now
  order by p.event_order desc limit 1),false);
$$;
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
  'mealSleeping',public.oyasumi_cat_is_sleeping_at(p_now),
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
 -- Serialize against posting as well as other care writes.
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

revoke all on function public.oyasumi_cat_is_sleeping_at(timestamptz) from public,anon,authenticated;
revoke all on function public.oyasumi_cat_care_status_at(timestamptz) from public,anon,authenticated;
revoke all on function public.oyasumi_cat_care_status(),public.oyasumi_give_cat_meal() from public,anon,authenticated;
grant execute on function public.oyasumi_cat_care_status(),public.oyasumi_give_cat_meal() to authenticated;
notify pgrst,'reload schema';
commit;
