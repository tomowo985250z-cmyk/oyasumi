-- Isolated test fixture: existing production RPC definitions confirmed 2026-10-11.
CREATE OR REPLACE FUNCTION public.oyasumi_reaction_counts(p_post_ids uuid[])
 RETURNS TABLE(post_id uuid, goodnight_count bigint, dream_count bigint, tomorrow_count bigint, my_choice text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception '匿名認証が必要です。' using errcode = '42501';
  end if;

  if p_post_ids is null or cardinality(p_post_ids) > 100 then
    raise exception '投稿IDは100件以内で指定してください。'
      using errcode = '22023';
  end if;

  return query
  select
    p.id,
    count(r.user_id) filter (where r.choice = 'goodnight'),
    count(r.user_id) filter (where r.choice = 'dream'),
    count(r.user_id) filter (where r.choice = 'tomorrow'),
    max(r.choice) filter (where r.user_id = v_user)
  from public.oyasumi_posts p
  left join public.oyasumi_reactions r on r.post_id = p.id
  where p.id = any(p_post_ids)
    and (
      p.night_date = public.oyasumi_night_date()
      or p.user_id = v_user
    )
  group by p.id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.oyasumi_set_reaction(p_post_id uuid, p_choice text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := auth.uid();
  v_post public.oyasumi_posts;
begin
  if v_user is null then
    raise exception '匿名認証が必要です。' using errcode = '42501';
  end if;

  if p_choice is not null
     and p_choice not in ('goodnight', 'dream', 'tomorrow') then
    raise exception '用意されたリアクションから選んでください。'
      using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user::text, 0));

  select p.*
  into v_post
  from public.oyasumi_posts p
  where p.id = p_post_id
    and (
      p.night_date = public.oyasumi_night_date()
      or p.user_id = v_user
    )
  for key share;

  if not found then
    raise exception '投稿が見つかりません。' using errcode = '22023';
  end if;

  if p_choice is null then
    delete from public.oyasumi_reactions
    where post_id = p_post_id
      and user_id = v_user;
    return;
  end if;

  insert into public.oyasumi_profiles (user_id)
  values (v_user)
  on conflict (user_id) do nothing;

  insert into public.oyasumi_reactions (post_id, user_id, choice)
  values (p_post_id, v_user, p_choice)
  on conflict (post_id, user_id) do update
    set choice = excluded.choice,
        updated_at = clock_timestamp();
end;
$function$;

CREATE OR REPLACE FUNCTION public.oyasumi_submit_post(p_choice text)
 RETURNS oyasumi_posts
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := auth.uid();
  v_night date := public.oyasumi_night_date();
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
     and v_last.created_at > clock_timestamp() - interval '60 seconds' then
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
    (v_user, p_choice, v_night, clock_timestamp())
  returning * into v_post;

  return v_post;
end;
$function$;

CREATE OR REPLACE FUNCTION public.oyasumi_tonight_counts()
 RETURNS TABLE(night_date date, awake_count bigint, sleeping_count bigint, my_state text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := auth.uid();
  v_night date := public.oyasumi_night_date();
begin
  if v_user is null then
    raise exception '匿名認証が必要です。' using errcode = '42501';
  end if;

  return query
  with latest as (
    select distinct on (p.user_id)
      p.user_id,
      p.choice
    from public.oyasumi_posts p
    where p.night_date = v_night
    order by p.user_id, p.event_order desc
  )
  select
    v_night,
    count(*) filter (where l.choice = 'awake'),
    count(*) filter (where l.choice <> 'awake'),
    max(
      case when l.choice = 'awake' then 'awake' else 'sleep' end
    ) filter (where l.user_id = v_user)
  from latest l;
end;
$function$;
