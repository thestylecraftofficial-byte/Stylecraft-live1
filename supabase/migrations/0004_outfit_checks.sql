-- Phase 6: outfit check. The photo row is deleted by run_deletion after its delete_after date.
-- The written feedback lives in its own table so the customer keeps it after the photo is gone.
alter table anonymous.outfit_checks add column if not exists occasion text;
alter table anonymous.outfit_checks add column if not exists status text not null default 'pending';  -- pending | answered
alter table anonymous.reports add column if not exists checks_used int not null default 0;           -- free checks used (limit 1)

create table if not exists anonymous.outfit_feedback (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references anonymous.profiles(id) on delete cascade,
  occasion    text,
  feedback    text not null,
  created_at  timestamptz not null default now()
);
create index if not exists outfit_feedback_profile on anonymous.outfit_feedback(profile_id);
alter table anonymous.outfit_feedback enable row level security;
grant all on anonymous.outfit_feedback to service_role;

-- Private storage bucket (only where Supabase Storage exists).
do $$ begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public) values ('outfit-checks', 'outfit-checks', false) on conflict (id) do nothing;
  end if;
end $$;
