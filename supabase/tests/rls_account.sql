-- Run as the database administrator after 0001, 0002 and 0003. All fixtures roll back.
begin;

create function pg_temp.assert_true(condition boolean, description text)
returns void language plpgsql security invoker as $$
begin
  if condition is distinct from true then raise exception 'FAIL: %', description; end if;
end;
$$;

insert into auth.users (id, email, raw_user_meta_data)
values ('91000000-0000-0000-0000-000000000001', 'beta@example.invalid', '{"is_beta_tester":true}'),
       ('91000000-0000-0000-0000-000000000002', 'admin@example.invalid', '{}');

select pg_temp.assert_true(
  (select is_beta_tester and role = 'user' and plan = 'FREE' from public.profiles where id = '91000000-0000-0000-0000-000000000001'),
  'signup beta choice is persisted without granting a paid plan'
);

set local role service_role;
update public.profiles set role = 'admin' where id = '91000000-0000-0000-0000-000000000002';

set local role authenticated;
select set_config('request.jwt.claim.sub', '91000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"91000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
update public.profiles set plan = 'PRO' where id = auth.uid();
select pg_temp.assert_true((select plan = 'PRO' from public.profiles where id = auth.uid()), 'beta tester can switch the test plan');

select set_config('request.jwt.claim.sub', '91000000-0000-0000-0000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"91000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
update public.profiles set plan = 'CAPTAIN' where id = auth.uid();
select pg_temp.assert_true((select plan = 'CAPTAIN' from public.profiles where id = auth.uid()), 'admin can switch the test plan');

rollback;
