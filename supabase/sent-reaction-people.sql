-- REVIEW ONLY: additive read-only aggregate. No existing rows/RPCs changed.
begin;
create index if not exists oyasumi_reactions_sender_time on public.oyasumi_reactions(user_id,updated_at);
create or replace function public.oyasumi_sent_reaction_people()
returns table(night_date date,people_count bigint)
language plpgsql stable security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_now timestamptz:=statement_timestamp();v_day date;v_start timestamptz;
begin
 if v_user is null then raise exception '匿名認証が必要です。' using errcode='42501';end if;
 v_day:=public.oyasumi_night_date_at(v_now);
 v_start:=(v_day::timestamp+interval '6 hours') at time zone 'Asia/Tokyo';
 return query select v_day,count(distinct p.user_id)
 from public.oyasumi_reactions r join public.oyasumi_posts p on p.id=r.post_id
 where r.user_id=v_user and p.user_id<>v_user and r.choice is not null
  and r.updated_at>=v_start and r.updated_at<v_start+interval '1 day';
end;$$;
revoke all on function public.oyasumi_sent_reaction_people() from public,anon,authenticated;
grant execute on function public.oyasumi_sent_reaction_people() to authenticated;
notify pgrst,'reload schema';
commit;
