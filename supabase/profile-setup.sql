-- 既存プロフィールの値は変更せず、新規行の仮名・毛色だけ廃止。
begin;
alter table public.oyasumi_profiles alter column nickname drop not null;
alter table public.oyasumi_profiles alter column nickname drop default;
alter table public.oyasumi_profiles alter column cat_coat drop not null;
alter table public.oyasumi_profiles alter column cat_coat drop default;
notify pgrst, 'reload schema';
commit;
