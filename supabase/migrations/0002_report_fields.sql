-- Phase 3: report bookkeeping. (photo labels already live in anonymous.profiles.photo_hints.)
alter table anonymous.reports add column if not exists source text;            -- ai | ai+template | template
alter table anonymous.reports add column if not exists needs_review boolean not null default false;
alter table anonymous.reports add column if not exists changed_share numeric;  -- share of AI items the rules changed
create unique index if not exists reports_one_per_profile on anonymous.reports(profile_id);
