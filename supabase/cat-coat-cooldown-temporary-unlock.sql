-- Admin-only temporary unlock. Existing seven-day migration/trigger remains installed.
-- Apply this SQL in Supabase SQL Editor; use the restore script to re-enable seven days.
begin;
create table if not exists public.oyasumi_cat_coat_cooldown_control (
 singleton boolean primary key default true check(singleton),
 paused boolean not null default false
);
alter table public.oyasumi_cat_coat_cooldown_control enable row level security;
revoke all on public.oyasumi_cat_coat_cooldown_control from public,anon,authenticated;
insert into public.oyasumi_cat_coat_cooldown_control(singleton,paused) values(true,true)
on conflict(singleton) do update set paused=true;

create or replace function public.oyasumi_guard_cat_coat()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_changed timestamptz; v_now timestamptz; v_paused boolean;
begin
 if new.cat_coat is null then
  if tg_op = 'UPDATE' and old.cat_coat is not null then
   raise exception '猫の種類は解除できません。' using errcode = '22023';
  end if;
  return new;
 end if;
 perform pg_advisory_xact_lock(hashtextextended(new.user_id::text,0));
 select changed_at into v_changed from public.oyasumi_cat_coat_changes where user_id=new.user_id;
 select paused into v_paused from public.oyasumi_cat_coat_cooldown_control where singleton;
 v_now := clock_timestamp();
 if tg_op = 'UPDATE' and new.cat_coat is not distinct from old.cat_coat and v_changed is not null then
  return new;
 end if;
 if not coalesce(v_paused,false) and v_changed is not null and v_now < v_changed + interval '168 hours' then
  raise exception '猫の種類は7日に1回変更できます。' using errcode = 'P0030',
   detail = (v_changed + interval '168 hours')::text;
 end if;
 insert into public.oyasumi_cat_coat_changes(user_id,changed_at) values(new.user_id,v_now)
 on conflict(user_id) do update set changed_at=excluded.changed_at;
 return new;
end;
$$;
revoke all on function public.oyasumi_guard_cat_coat() from public,anon,authenticated;

create or replace function public.oyasumi_cat_coat_status()
returns table(changed_at timestamptz,next_change_at timestamptz,server_now timestamptz)
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_paused boolean;
begin
 if v_user is null then raise exception '匿名認証が必要です。' using errcode='42501'; end if;
 select paused into v_paused from public.oyasumi_cat_coat_cooldown_control where singleton;
 return query select c.changed_at,
  case when coalesce(v_paused,false) then null::timestamptz else c.changed_at + interval '168 hours' end,
  clock_timestamp()
 from (select v_user as user_id) u left join public.oyasumi_cat_coat_changes c using(user_id);
end;
$$;
revoke all on function public.oyasumi_cat_coat_status() from public,anon,authenticated;
grant execute on function public.oyasumi_cat_coat_status() to authenticated;

create or replace function public.oyasumi_cat_coat_cooldown_paused()
returns boolean language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() is null then raise exception '匿名認証が必要です。' using errcode='42501'; end if;
 return coalesce((select paused from public.oyasumi_cat_coat_cooldown_control where singleton),false);
end;
$$;
revoke all on function public.oyasumi_cat_coat_cooldown_paused() from public,anon,authenticated;
grant execute on function public.oyasumi_cat_coat_cooldown_paused() to authenticated;
notify pgrst,'reload schema';
commit;
