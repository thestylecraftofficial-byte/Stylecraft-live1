-- Run after the migration. Proves the 7-day deletion removes every trace, and only what it should.
\set ON_ERROR_STOP on
begin;

-- A: delivered 8 days ago, did NOT consent to keep anonymous data  -> everything must go
-- B: delivered 8 days ago, DID consent                               -> identity + link go, profile stays
-- C: delivered 2 days ago                                            -> nothing may be touched
insert into anonymous.profiles (id, age_range, style_presentation, city_zone, budget_band, keep_anonymous, created_at) values
 ('00000000-0000-0000-0000-00000000000a','25-30','menswear','hyderabad-it-corridor','1500-3000', false, now() - interval '8 days'),
 ('00000000-0000-0000-0000-00000000000b','25-30','womenswear','hyderabad-it-corridor','1500-3000', true,  now() - interval '8 days'),
 ('00000000-0000-0000-0000-00000000000c','31-40','mixed','other-india','3000-6000', true, now() - interval '2 days');

insert into identity.customers (id, name, phone) values
 ('10000000-0000-0000-0000-00000000000a','Test A','9999900001'),
 ('10000000-0000-0000-0000-00000000000b','Test B','9999900002'),
 ('10000000-0000-0000-0000-00000000000c','Test C','9999900003');

insert into identity.links (customer_id, profile_id, report_delivered_at, delete_after) values
 ('10000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-00000000000a', now() - interval '8 days', now() - interval '1 day'),
 ('10000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-00000000000b', now() - interval '8 days', now() - interval '1 day'),
 ('10000000-0000-0000-0000-00000000000c','00000000-0000-0000-0000-00000000000c', now() - interval '2 days', now() + interval '5 days');

insert into anonymous.outfit_checks (profile_id, storage_path, delete_after) values
 ('00000000-0000-0000-0000-00000000000b','b/old.jpg', now() - interval '1 hour'),
 ('00000000-0000-0000-0000-00000000000c','c/new.jpg', now() + interval '3 days');

select * from anonymous.run_deletion(7);

do $$
begin
  assert (select count(*) from identity.customers where id::text like '10000000-%') = 1, 'only customer C should remain';
  assert exists (select 1 from identity.customers where id = '10000000-0000-0000-0000-00000000000c'), 'C identity kept';
  assert (select count(*) from identity.links) = 1, 'only C link should remain';
  assert not exists (select 1 from anonymous.profiles where id = '00000000-0000-0000-0000-00000000000a'), 'A profile deleted (no consent to keep)';
  assert exists (select 1 from anonymous.profiles where id = '00000000-0000-0000-0000-00000000000b'), 'B profile kept (consented)';
  assert exists (select 1 from anonymous.profiles where id = '00000000-0000-0000-0000-00000000000c'), 'C profile kept';
  assert (select count(*) from anonymous.outfit_checks) = 1, 'old photo row removed, new one kept';
  assert (select storage_path from anonymous.outfit_checks) = 'c/new.jpg', 'right photo kept';
  assert (select count(*) from anonymous.deletion_log) = 1, 'deletion logged';
  -- B is now unlinkable: no row anywhere connects the kept profile to a person
  assert not exists (select 1 from identity.links where profile_id = '00000000-0000-0000-0000-00000000000b'), 'B unlinkable';
  raise notice 'ALL DELETION CHECKS PASSED';
end $$;

rollback;
