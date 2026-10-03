-- 4種類目「無理せずね」を追加。既存データ・RLS・既存RPCは保持します。
begin;

do $$
declare
  v_choice_att smallint;
  v_constraint record;
begin
  select attnum into v_choice_att from pg_attribute
    where attrelid = 'public.oyasumi_reactions'::regclass and attname = 'choice';
  -- choice列だけを対象とする既存の3択CHECKを4択へ置き換えます。
  for v_constraint in
    select conname from pg_constraint
    where conrelid = 'public.oyasumi_reactions'::regclass
      and contype = 'c' and conkey = array[v_choice_att]
      and pg_get_constraintdef(oid) like '%goodnight%'
      and pg_get_constraintdef(oid) like '%dream%'
      and pg_get_constraintdef(oid) like '%tomorrow%'
  loop
    execute format('alter table public.oyasumi_reactions drop constraint %I', v_constraint.conname);
  end loop;
  alter table public.oyasumi_reactions
    add constraint oyasumi_reaction_choices_v2
    check (choice in ('goodnight', 'dream', 'tomorrow', 'comfort'));
end;
$$;

create or replace function public.oyasumi_set_reaction_v2(p_post_id uuid, p_choice text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception '匿名認証が必要です。' using errcode = '42501';
  end if;
  -- 既存RPCで投稿の有効性・本人確認・操作制限をそのまま適用します。
  -- comfortは同一トランザクション内でdreamから変更し、途中の値は公開されません。
  perform public.oyasumi_set_reaction(
    p_post_id, case when p_choice = 'comfort' then 'dream' else p_choice end
  );
  if p_choice = 'comfort' then
    update public.oyasumi_reactions set choice = 'comfort'
      where post_id = p_post_id and user_id = auth.uid();
    if not found then
      raise exception 'リアクションを保存できませんでした。' using errcode = '22023';
    end if;
  end if;
  return p_choice;
end;
$$;

create or replace function public.oyasumi_reaction_counts_v2(p_post_ids uuid[])
returns table (
  post_id uuid,
  goodnight_count bigint,
  dream_count bigint,
  tomorrow_count bigint,
  comfort_count bigint,
  my_choice text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception '匿名認証が必要です。' using errcode = '42501';
  end if;
  -- 元の集計RPCのID件数制限・公開範囲を維持し、個人別情報は本人の選択のみ。
  return query
  select c.post_id, c.goodnight_count::bigint, c.dream_count::bigint, c.tomorrow_count::bigint,
    (select count(*) from public.oyasumi_reactions r
      where r.post_id = c.post_id and r.choice = 'comfort'),
    (select r.choice::text from public.oyasumi_reactions r
      where r.post_id = c.post_id and r.user_id = auth.uid())
  from public.oyasumi_reaction_counts(p_post_ids) c;
end;
$$;

revoke all on function public.oyasumi_set_reaction_v2(uuid, text) from public, anon, authenticated;
revoke all on function public.oyasumi_reaction_counts_v2(uuid[]) from public, anon, authenticated;
grant execute on function public.oyasumi_set_reaction_v2(uuid, text) to authenticated;
grant execute on function public.oyasumi_reaction_counts_v2(uuid[]) to authenticated;
notify pgrst, 'reload schema';
commit;
