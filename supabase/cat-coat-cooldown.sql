-- wild-cats.sql / profile-setup.sql適用後に実行。既存プロフィールは更新しない。
-- 導入後の最初の保存から7日間の制限を開始する。
-- 再適用時は既存のchanged_atを保持し、全ユーザーの期限を変更日＋168時間に短縮する。
begin;
create table if not exists public.oyasumi_cat_coat_changes (
 user_id uuid primary key references public.oyasumi_profiles(user_id) on delete cascade,
 changed_at timestamptz not null
);
alter table public.oyasumi_cat_coat_changes enable row level security;
revoke all on public.oyasumi_cat_coat_changes from public, anon, authenticated;
create or replace function public.oyasumi_guard_cat_coat()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_changed timestamptz; v_now timestamptz;
begin
 if new.cat_coat is null then
  if tg_op = 'UPDATE' and old.cat_coat is not null then
   raise exception '猫の種類は解除できません。' using errcode = '22023';
  end if;
  return new;
 end if;
 perform pg_advisory_xact_lock(hashtextextended(new.user_id::text,0));
 select changed_at into v_changed from public.oyasumi_cat_coat_changes where user_id=new.user_id;
 v_now := clock_timestamp();
 if tg_op = 'UPDATE' and new.cat_coat is not distinct from old.cat_coat and v_changed is not null then
  return new;
 end if;
 if v_changed is not null and v_now < v_changed + interval '168 hours' then
  raise exception '猫の種類は7日に1回変更できます。' using errcode = 'P0030',
   detail = (v_changed + interval '168 hours')::text;
 end if;
 insert into public.oyasumi_cat_coat_changes(user_id,changed_at) values(new.user_id,v_now)
 on conflict(user_id) do update set changed_at=excluded.changed_at;
 return new;
end;
$$;
drop trigger if exists oyasumi_cat_coat_cooldown on public.oyasumi_profiles;
create trigger oyasumi_cat_coat_cooldown after insert or update of cat_coat
 on public.oyasumi_profiles for each row execute function public.oyasumi_guard_cat_coat();
revoke all on function public.oyasumi_guard_cat_coat() from public,anon,authenticated;
create or replace function public.oyasumi_cat_coat_status()
returns table(changed_at timestamptz,next_change_at timestamptz,server_now timestamptz)
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid();
begin
 if v_user is null then raise exception '匿名認証が必要です。' using errcode='42501'; end if;
 return query select c.changed_at,c.changed_at + interval '168 hours',clock_timestamp()
 from (select v_user as user_id) u left join public.oyasumi_cat_coat_changes c using(user_id);
end;
$$;
revoke all on function public.oyasumi_cat_coat_status() from public,anon,authenticated;
grant execute on function public.oyasumi_cat_coat_status() to authenticated;
notify pgrst,'reload schema';
commit;
