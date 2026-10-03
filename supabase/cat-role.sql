-- 任意の職業選択に対応する猫ラベルのみ保存。元の職業名は保存しません。
-- 既存行はNULL（未設定）のまま、既存データ・RLS・他のRPCは変更しません。
begin;
alter table public.oyasumi_profiles add column if not exists cat_role text;
do $$
begin
  if not exists (select 1 from pg_constraint
    where conrelid = 'public.oyasumi_profiles'::regclass and conname = 'oyasumi_cat_role_choices') then
    alter table public.oyasumi_profiles add constraint oyasumi_cat_role_choices check (
      cat_role in ('steady','guardian','caring','watchful','mechanic','maker','welcoming',
        'foodie','courier','foresight','creative','independent','learner','homely','resting','carefree','private')
    );
  end if;
end;
$$;
create or replace function public.oyasumi_set_cat_role(p_role text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception '匿名認証が必要です。' using errcode = '42501';
  end if;
  if p_role is not null and p_role not in (
    'steady','guardian','caring','watchful','mechanic','maker','welcoming','foodie',
    'courier','foresight','creative','independent','learner','homely','resting','carefree','private'
  ) then
    raise exception '用意された職業から選んでください。' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_user::text, 0));
  insert into public.oyasumi_profiles (user_id, cat_role)
  values (v_user, p_role)
  on conflict (user_id) do update set cat_role = excluded.cat_role, updated_at = clock_timestamp();
  return p_role;
end;
$$;
revoke all on function public.oyasumi_set_cat_role(text) from public, anon, authenticated;
grant execute on function public.oyasumi_set_cat_role(text) to authenticated;
notify pgrst, 'reload schema';
commit;
