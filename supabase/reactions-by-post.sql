-- 追加移行。過去の投稿・旧4種類・既存RPC・人数集計・猫のお世話は変更しません。
begin;
alter table public.oyasumi_posts add column if not exists post_intent text;
do $$
begin
 if not exists (select 1 from pg_constraint where conrelid='public.oyasumi_posts'::regclass and conname='oyasumi_post_intent_check') then
  alter table public.oyasumi_posts add constraint oyasumi_post_intent_check check (
   post_intent is null or
   (choice='awake' and post_intent in ('relax','sleepless')) or
   (choice in ('sleep','early-sleep') and post_intent='sleep') or
   (choice='try-sleep' and post_intent='try-sleep')
  );
 end if;
end $$;

do $$
declare v_choice_att smallint; v_constraint record;
begin
 select attnum into v_choice_att from pg_attribute
  where attrelid='public.oyasumi_reactions'::regclass and attname='choice';
 for v_constraint in select conname from pg_constraint
  where conrelid='public.oyasumi_reactions'::regclass and contype='c'
   and conkey=array[v_choice_att] and pg_get_constraintdef(oid) like '%goodnight%'
   and pg_get_constraintdef(oid) like '%dream%' and pg_get_constraintdef(oid) like '%tomorrow%'
 loop
  execute format('alter table public.oyasumi_reactions drop constraint %I',v_constraint.conname);
 end loop;
 alter table public.oyasumi_reactions add constraint oyasumi_reaction_choices_v3 check (choice in (
  'goodnight','dream','tomorrow','comfort',
  'relax-time','relax-day','relax-pace','relax-easy',
  'sleep-night','sleep-dream','sleep-tomorrow','sleep-rest',
  'sleepless-patience','sleepless-here','sleepless-kind','sleepless-easy',
  'try-night','try-kind','try-rest','try-easy'
 ));
end $$;

-- 既存と同じ本人ロック、60秒重複防止、1分10件制限、06:00の日付関数。
-- 投稿の意味が変わった場合は旧投稿を上書きせず新しい投稿として保存します。
create or replace function public.oyasumi_submit_post_v2(p_choice text,p_intent text)
returns public.oyasumi_posts language plpgsql security definer set search_path=''
as $$
declare
 v_user uuid:=auth.uid(); v_night date:=public.oyasumi_night_date();
 v_last public.oyasumi_posts; v_post public.oyasumi_posts; v_recent_count bigint;
begin
 if v_user is null then raise exception '匿名認証が必要です。' using errcode='42501'; end if;
 if p_choice is null or p_intent is null or not (
  (p_choice='awake' and p_intent in ('relax','sleepless')) or
  (p_choice in ('sleep','early-sleep') and p_intent='sleep') or
  (p_choice='try-sleep' and p_intent='try-sleep')
 ) then raise exception '用意された投稿から選んでください。' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended(v_user::text,0));
 insert into public.oyasumi_profiles(user_id) values(v_user) on conflict(user_id) do nothing;
 select p.* into v_last from public.oyasumi_posts p
  where p.user_id=v_user order by p.event_order desc limit 1;
 if v_last.id is not null and v_last.night_date=v_night and v_last.choice=p_choice
  and v_last.post_intent=p_intent and v_last.created_at>clock_timestamp()-interval '60 seconds' then
  return v_last;
 end if;
 select count(*) into v_recent_count from public.oyasumi_posts p
  where p.user_id=v_user and p.created_at>clock_timestamp()-interval '1 minute';
 if v_recent_count>=10 then raise exception '少し待ってから投稿してください。' using errcode='22023'; end if;
 insert into public.oyasumi_posts(user_id,choice,post_intent,night_date,created_at)
  values(v_user,p_choice,p_intent,v_night,clock_timestamp()) returning * into v_post;
 return v_post;
end $$;

-- 認証・可視範囲・取消・本人ロック・一人一件の更新は元RPCで検証します。
create or replace function public.oyasumi_set_reaction_v3(p_post_id uuid,p_choice text)
returns text language plpgsql security definer set search_path=''
as $$
declare v_post public.oyasumi_posts; v_intent text; v_allowed text[];
begin
 perform public.oyasumi_set_reaction(p_post_id,case when p_choice is null then null else 'goodnight' end);
 if p_choice is null then return null; end if;
 select p.* into v_post from public.oyasumi_posts p where p.id=p_post_id for key share;
 v_intent:=case when v_post.choice='awake' then coalesce(v_post.post_intent,'relax')
  when v_post.choice='try-sleep' then 'try-sleep' else 'sleep' end;
 v_allowed:=case v_intent
  when 'relax' then array['relax-time','relax-day','relax-pace','relax-easy']
  when 'sleep' then array['sleep-night','sleep-dream','sleep-tomorrow','sleep-rest']
  when 'sleepless' then array['sleepless-patience','sleepless-here','sleepless-kind','sleepless-easy']
  when 'try-sleep' then array['try-night','try-kind','try-rest','try-easy'] end;
 if not(p_choice=any(v_allowed)) then
  raise exception 'この投稿へのリアクションから選んでください。' using errcode='22023';
 end if;
 update public.oyasumi_reactions set choice=p_choice where post_id=p_post_id and user_id=auth.uid();
 if not found then raise exception 'リアクションを保存できませんでした。' using errcode='22023'; end if;
 return p_choice;
end $$;

-- 元RPCの100件制限・今夜または本人の履歴という公開範囲をそのまま使用。
create or replace function public.oyasumi_reaction_counts_v3(p_post_ids uuid[])
returns table(post_id uuid,counts jsonb,my_choice text)
language plpgsql stable security definer set search_path=''
as $$
begin
 return query select c.post_id,
  coalesce((select jsonb_object_agg(g.choice,g.n) from (
   select r.choice,count(*) as n from public.oyasumi_reactions r
   where r.post_id=c.post_id group by r.choice
  ) g),'{}'::jsonb),c.my_choice
 from public.oyasumi_reaction_counts(p_post_ids) c;
end $$;

-- 昨夜の本人の全投稿を集計。06:00区切り・自己リアクション除外・履歴保持を維持。
create or replace function public.oyasumi_morning_reactions_v2()
returns table(night_date date,counts jsonb)
language plpgsql stable security definer set search_path=''
as $$
declare v_user uuid:=auth.uid(); v_night date;
begin
 if v_user is null then raise exception '匿名認証が必要です。' using errcode='42501'; end if;
 v_night:=public.oyasumi_morning_night_date_at(statement_timestamp());
 return query select v_night,coalesce(jsonb_object_agg(g.choice,g.n),'{}'::jsonb)
 from (
  select r.choice,count(distinct(r.post_id,r.user_id)) as n
  from public.oyasumi_posts p join public.oyasumi_reactions r on r.post_id=p.id
  where p.user_id=v_user and p.night_date=v_night and r.user_id<>v_user group by r.choice
 ) g;
end $$;

revoke all on function public.oyasumi_submit_post_v2(text,text) from public,anon,authenticated;
revoke all on function public.oyasumi_set_reaction_v3(uuid,text) from public,anon,authenticated;
revoke all on function public.oyasumi_reaction_counts_v3(uuid[]) from public,anon,authenticated;
revoke all on function public.oyasumi_morning_reactions_v2() from public,anon,authenticated;
grant execute on function public.oyasumi_submit_post_v2(text,text) to authenticated;
grant execute on function public.oyasumi_set_reaction_v3(uuid,text) to authenticated;
grant execute on function public.oyasumi_reaction_counts_v3(uuid[]) to authenticated;
grant execute on function public.oyasumi_morning_reactions_v2() to authenticated;
notify pgrst,'reload schema';
commit;
