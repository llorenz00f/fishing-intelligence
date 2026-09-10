begin;

select plan(3);

select has_table('public', 'spots', 'spots table exists');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000101', true);

insert into public.spots (id, user_id, name, location)
values (
  '00000000-0000-0000-0000-000000000301',
  '00000000-0000-0000-0000-000000000101',
  'RLS spot A',
  st_setsrid(st_makepoint(10.1, 42.1), 4326)
);

select is(
  (select count(*)::int from public.spots where id = '00000000-0000-0000-0000-000000000301'),
  1,
  'owner can read own spot'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000102', true);

select is(
  (select count(*)::int from public.spots where id = '00000000-0000-0000-0000-000000000301'),
  0,
  'another user cannot read private spot'
);

select * from finish();

rollback;
