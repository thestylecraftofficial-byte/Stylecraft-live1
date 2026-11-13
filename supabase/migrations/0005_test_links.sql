-- Pilot testing: one-day invite links, report retry state and richer feedback.

-- Links live in the identity store because the label is usually a friend's name.
create table if not exists identity.test_links (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,
  label         text not null,
  note          text,
  expires_at    timestamptz not null,
  attempts      int not null default 0,
  max_attempts  int not null default 2,   -- one report plus one retry for a mistake
  created_at    timestamptz not null default now()
);
create table if not exists identity.test_link_uses (
  id          uuid primary key default gen_random_uuid(),
  link_id     uuid not null references identity.test_links(id) on delete cascade,
  profile_id  uuid not null unique,
  created_at  timestamptz not null default now()
);
alter table identity.test_links     enable row level security;
alter table identity.test_link_uses enable row level security;
grant all on identity.test_links, identity.test_link_uses to service_role;

-- Report generation can be retried when Gemini is busy.
alter table anonymous.reports add column if not exists attempts int not null default 0;
alter table anonymous.reports add column if not exists retry_after timestamptz;
alter table anonymous.reports add column if not exists test_mode boolean not null default false;

-- Feedback: rating is accuracy (1-5); two optional notes.
alter table anonymous.feedback add column if not exists felt_wrong text;
alter table anonymous.feedback add column if not exists liked text;
