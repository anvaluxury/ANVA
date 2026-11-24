-- Run ONCE, only AFTER anvaluxury@mail.ru has registered on the site and confirmed the email.
insert into public.user_roles (user_id, role)
select id, 'super_admin' from auth.users
where email = 'anvaluxury@mail.ru' and email_confirmed_at is not null
on conflict do nothing;
-- Check: select * from public.user_roles;
