-- ANVA 003: MFA-aware roles, audit triggers, notification triggers, review rate limit. Run after 002.
-- Admin roles only count when the session is AAL2 *if* the user has a verified TOTP factor (real 2FA enforcement in RLS).
create or replace function public.mfa_ok() returns boolean language sql stable security definer set search_path=public,auth as
$$ select coalesce(auth.jwt()->>'aal','aal1')='aal2' or not exists (select 1 from auth.mfa_factors where user_id=auth.uid() and status='verified') $$;
create or replace function public.has_role(_role public.app_role) returns boolean language sql stable security definer set search_path=public as
$$ select public.mfa_ok() and exists (select 1 from public.user_roles where user_id=auth.uid() and role=_role) $$;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as
$$ select public.mfa_ok() and exists (select 1 from public.user_roles where user_id=auth.uid()) $$;

create or replace function public.audit() returns trigger language plpgsql security definer set search_path=public as $$
declare r jsonb;
begin
  if tg_op='DELETE' then r:=to_jsonb(old); else r:=to_jsonb(new); end if;
  insert into public.audit_logs(actor,action,entity,entity_id,details)
  values (auth.uid(), tg_op||' '||tg_table_name, tg_table_name, coalesce(r->>'id',r->>'key',r->>'user_id'), case when tg_op='DELETE' then r else null end);
  if tg_op='DELETE' then return old; else return new; end if;
end $$;
do $$ declare t text; begin foreach t in array array['products','categories','promotions','homepage_sections','site_settings','user_roles'] loop
  execute format('create trigger audit_%1$s after insert or update or delete on public.%1$I for each row execute function public.audit()', t); end loop; end $$;

create or replace function public.notify_review() returns trigger language plpgsql security definer set search_path=public as
$$ begin insert into public.admin_notifications(kind) values ('review_new'); return new; end $$;
create trigger on_review_insert after insert on public.reviews for each row execute function public.notify_review();
create or replace function public.notify_signup() returns trigger language plpgsql security definer set search_path=public as
$$ begin insert into public.admin_notifications(kind) values ('signup_new'); return new; end $$;
create trigger on_profile_insert after insert on public.profiles for each row execute function public.notify_signup();

create or replace function public.limit_reviews() returns trigger language plpgsql security definer set search_path=public as
$$ begin if (select count(*) from public.reviews where user_id=new.user_id and created_at>now()-interval '1 day')>=5 then raise exception 'rate limit'; end if; return new; end $$;
create trigger review_rate before insert on public.reviews for each row execute function public.limit_reviews();
