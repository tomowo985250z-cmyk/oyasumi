-- 任意の「そっとひとこと」を追加。既存ユーザーは未入力のまま。
begin;
alter table public.oyasumi_profiles add column if not exists profile_note text;
do $$
begin
 if not exists(select 1 from pg_constraint where conrelid='public.oyasumi_profiles'::regclass and conname='oyasumi_profile_note_length') then
  alter table public.oyasumi_profiles add constraint oyasumi_profile_note_length check (char_length(profile_note)<=20);
 end if;
end;
$$;
create or replace function public.oyasumi_set_profile_note(p_note text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
 v_user uuid := auth.uid();
 v_note text := normalize(btrim(coalesce(p_note,'')), NFC);
 v_normal text;
 v_compact text;
 v_screen text;
begin
 if v_user is null then raise exception '匿名認証が必要です。' using errcode='42501'; end if;
 if char_length(v_note)>20 then raise exception '20文字以内で入力してください。' using errcode='22023'; end if;
 if v_note ~ '[[:cntrl:]<>]' or v_note ~ U&'[\00AD\200B\200C\200E\200F\202A-\202E\2060-\206F\FEFF]' then
  raise exception '使えない記号が含まれています。' using errcode='22023';
 end if;
 v_normal := lower(normalize(v_note,NFKC));
 v_compact := translate(regexp_replace(v_normal,U&'[[:space:]\200D]','','g'),'。．｡','...');
 if v_compact ~ '(@|(https?|hxxps?|ftp):|www\.|[a-z0-9]([a-z0-9-]*\.)+[a-z]{2,63}|([0-9]{1,3}\.){3}[0-9]{1,3})'
    or v_normal ~ '(\+?[0-9][[:space:]().\-‐‑–—ー]*){7,}' then
  raise exception 'URLや連絡先は使えません。' using errcode='22023';
 end if;
 -- 記号（ハート等）を挟んだ表現もチェックします。
 v_screen := regexp_replace(v_compact,'[^[:alnum:]]','','g');
 if v_screen ~ '(死ね|しね|殺す|ころす|くたばれ|バカ野郎|ばかやろう|キチガイ|きちがい|基地外|土人|セックス|せっくす|ちんこ|チンコ|ちんぽ|チンポ|まんこ|マンコ|オナニー|おなにー|ペニス|ぺにす|レイプ|れいぷ|おっぱい|オッパイ|児童ポルノ)'
    or v_normal ~ '\m(fuck(ing|er)?|shit|bitch|cunt|nigg(er|a)s?|fagg?ot|chink|retard|sex|porn|penis|vagina|rape)\M'
    or v_screen ~ '\m(fuck(ing|er)?|shit|bitch|cunt|nigg(er|a)s?|fagg?ot|chink|retard|sex|porn|penis|vagina|rape)\M'
    or v_screen ~ '^(ばか|バカ|馬鹿|あほ|アホ|くず|クズ|くそ|クソ|チョン|ちょん|エロ|えろ)$' then
  raise exception '不適切な表現は使えません。' using errcode='22023';
 end if;
 perform pg_advisory_xact_lock(hashtextextended(v_user::text,0));
 insert into public.oyasumi_profiles(user_id,profile_note) values(v_user,nullif(v_note,''))
 on conflict(user_id) do update set profile_note=excluded.profile_note, updated_at=clock_timestamp();
 return v_note;
end;
$$;
revoke all on function public.oyasumi_set_profile_note(text) from public,anon,authenticated;
grant execute on function public.oyasumi_set_profile_note(text) to authenticated;
notify pgrst,'reload schema';
commit;
