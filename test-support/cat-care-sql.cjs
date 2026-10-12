// Isolated schema. Submit RPCs use the checked-in production fixture / v2 SQL.
// Delete models the client contract; export its actual body before application.
const fs=require('node:fs');
const ids=Array.from({length:8},(_,i)=>'00000000-0000-0000-0000-'+String(i+1).padStart(12,'0'));
const schema=`create role anon;create role authenticated;create schema auth;
create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
create function public.test_now() returns timestamptz language sql volatile as $$select coalesce(nullif(current_setting('test.now',true),''),'2026-10-11T14:00:00+09:00')::timestamptz$$;
create function public.oyasumi_night_date_at(p_at timestamptz) returns date language sql immutable strict as $$select ((p_at at time zone 'Asia/Tokyo')-interval '6 hours')::date$$;
create function public.oyasumi_night_date() returns date language sql as $$select public.oyasumi_night_date_at(public.test_now())$$;
create function public.oyasumi_morning_night_date_at(p_at timestamptz) returns date language sql as $$select public.oyasumi_night_date_at(p_at)-1$$;
create table public.oyasumi_profiles(user_id uuid primary key,cat_coat text default 'calico');
create table public.oyasumi_posts(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.oyasumi_profiles,
 choice text not null check(choice in ('awake','sleep','try-sleep','early-sleep')),
 created_at timestamptz not null default public.test_now(),night_date date default public.oyasumi_night_date(),event_order bigint generated always as identity unique);
create table public.oyasumi_reactions(post_id uuid references public.oyasumi_posts on delete cascade,user_id uuid references public.oyasumi_profiles,
 choice text check(choice in ('goodnight','dream','tomorrow')),updated_at timestamptz default public.test_now(),primary key(post_id,user_id));
alter table public.oyasumi_posts enable row level security;
create policy own_posts on public.oyasumi_posts to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
grant usage on schema public,auth to authenticated;
grant select,insert,update,delete on public.oyasumi_posts to authenticated;
grant usage on sequence public.oyasumi_posts_event_order_seq to authenticated;
insert into public.oyasumi_profiles(user_id) values ${ids.map(id=>`('${id}')`).join(',')};
create function public.oyasumi_delete_post(p_post_id uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_count integer;
begin
 if v_user is null then raise exception 'Authentication required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(v_user::text,0));
 delete from public.oyasumi_posts where id=p_post_id and user_id=v_user;
 get diagnostics v_count=row_count;return v_count=1;
end;$$;
revoke all on function public.oyasumi_delete_post(uuid) from public,anon;
grant execute on function public.oyasumi_delete_post(uuid) to authenticated;
`;
const read=file=>fs.readFileSync(file,'utf8').replaceAll('clock_timestamp()','public.test_now()');
const base=()=>schema+'\n'+read('test-fixtures/reactions-base.sql')+'\n'+read('supabase/reactions-by-post.sql')+'\n'+read('supabase/cat-care.sql');
const windows=()=>read('supabase/cat-care-two-windows.sql');
const guard=()=>read('supabase/cat-care-sleep-guard.sql');
module.exports={ids,read,base,windows,guard};
