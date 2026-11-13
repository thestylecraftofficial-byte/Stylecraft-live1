-- Feedback must outlive the photo: after run_deletion the photo row is gone but the feedback stays.
do $$
declare pid uuid := gen_random_uuid();
begin
  insert into anonymous.profiles (id, age_range, style_presentation, city_zone, budget_band, keep_anonymous)
    values (pid, '25-30', 'menswear', 'hyderabad-other', '1500-3000', false);
  insert into anonymous.outfit_checks (profile_id, storage_path, occasion, delete_after)
    values (pid, pid || '/old.jpg', 'office', now() - interval '1 minute');
  insert into anonymous.outfit_feedback (profile_id, occasion, feedback) values (pid, 'office', 'Swap the belt for brown.');
  perform * from anonymous.run_deletion(7);
  assert (select count(*) from anonymous.outfit_checks where profile_id = pid) = 0, 'photo row deleted';
  assert (select count(*) from anonymous.outfit_feedback where profile_id = pid) = 1, 'feedback kept after photo deleted';
  delete from anonymous.profiles where id = pid;
  assert (select count(*) from anonymous.outfit_feedback where profile_id = pid) = 0, 'feedback goes when the profile is deleted';
  raise notice 'OUTFIT CHECK CHECKS PASSED';
end $$;
