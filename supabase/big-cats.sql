-- Apply after wild-cats.sql and cat-coat-cooldown.sql.
-- Extend only accepted species; retain data, RLS, advisory lock and cooldown trigger.
begin;
alter table public.oyasumi_profiles drop constraint if exists oyasumi_cat_coat_choices;
alter table public.oyasumi_profiles add constraint oyasumi_cat_coat_choices check (
 cat_coat in ('calico','orange','brown','silver','black','white','tuxedo','gray',
             'manul','sand','black-footed','fishing',
             'snow-leopard','leopard','cheetah','jaguar')
);
create or replace function public.oyasumi_set_cat_coat(p_coat text)
returns text language plpgsql security definer set search_path = ''
as $$
declare v_user uuid := auth.uid();
begin
 if v_user is null then raise exception '匿名認証が必要です。' using errcode='42501'; end if;
 if p_coat is null or p_coat not in (
  'calico','orange','brown','silver','black','white','tuxedo','gray',
  'manul','sand','black-footed','fishing',
  'snow-leopard','leopard','cheetah','jaguar'
 ) then raise exception '用意された毛色から選んでください。' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended(v_user::text,0));
 insert into public.oyasumi_profiles(user_id,cat_coat) values(v_user,p_coat)
 on conflict(user_id) do update set cat_coat=excluded.cat_coat,updated_at=clock_timestamp();
 return p_coat;
end;
$$;
revoke all on function public.oyasumi_set_cat_coat(text) from public,anon,authenticated;
grant execute on function public.oyasumi_set_cat_coat(text) to authenticated;
notify pgrst,'reload schema';
commit;
