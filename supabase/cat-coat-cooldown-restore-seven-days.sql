-- Admin only: preserve the last actual coat change; resume seven-day restrictions.
begin;
update public.oyasumi_cat_coat_cooldown_control set paused=false where singleton;
commit;
