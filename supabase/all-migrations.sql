-- StyleCraft Week 1 schema.
-- Two separate schemas so identity data and anonymous body data never share a table.
-- Neither schema is exposed through the Supabase API; only the server (service role) touches them.

create extension if not exists pgcrypto;

create schema if not exists identity;
create schema if not exists anonymous;

-- ---------------------------------------------------------------- identity store
create table identity.customers (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  phone         text not null,
  email         text,
  created_at    timestamptz not null default now()
);

-- The only bridge between a person and their anonymous record.
-- Deleting this row makes the anonymous record unlinkable.
create table identity.links (
  customer_id         uuid primary key references identity.customers(id) on delete cascade,
  profile_id          uuid not null unique,
  report_delivered_at timestamptz,          -- set when the report is delivered
  delete_after        timestamptz,          -- report_delivered_at + retention
  created_at          timestamptz not null default now()
);

-- ---------------------------------------------------------------- anonymous store
create table anonymous.profiles (
  id                uuid primary key default gen_random_uuid(),
  age_range         text not null,
  style_presentation text not null,          -- how the customer wants to be styled
  city_zone         text not null,           -- kept broad on purpose
  occasions         text[] not null default '{}',
  style_prefs       text[] not null default '{}',
  liked_colours     text[] not null default '{}',
  disliked_colours  text[] not null default '{}',
  fit_preference    text,
  budget_band       text not null,
  measurements      jsonb not null default '{}'::jsonb,   -- each field: {value, unit, unsure}
  undertone_answers jsonb not null default '{}'::jsonb,
  photo_hints       jsonb,                    -- filled by the on-device step in Week 2
  categories        text[] not null default '{}', -- clothing categories the customer chose
  keep_anonymous    boolean not null default false, -- consent to keep data to improve the service
  rule_version      text,
  created_at        timestamptz not null default now()
);

create table anonymous.reports (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references anonymous.profiles(id) on delete cascade,
  rule_version text,
  prompt_version text,
  model_name  text,
  status      text not null default 'pending',   -- pending | ready | flagged | delivered
  report      jsonb,
  access_token text unique,                      -- unguessable link token (Week 3)
  created_at  timestamptz not null default now()
);

create table anonymous.feedback (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references anonymous.profiles(id) on delete cascade,
  rating      int check (rating between 1 and 5),
  would_pay   boolean,
  notes_tags  text[] not null default '{}',
  created_at  timestamptz not null default now()
);

-- Outfit-check photos are the only photos StyleCraft ever stores.
create table anonymous.outfit_checks (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references anonymous.profiles(id) on delete cascade,
  storage_path  text not null,
  created_at    timestamptz not null default now(),
  delete_after  timestamptz not null
);

-- ---------------------------------------------------------------- logs (kept)
create table anonymous.consent_log (
  id               uuid primary key default gen_random_uuid(),
  profile_id       uuid references anonymous.profiles(id) on delete set null,
  consent_version  text not null,
  items            jsonb not null,           -- which statements were accepted
  keep_anonymous   boolean not null,
  accepted_at      timestamptz not null default now()
);

create table anonymous.deletion_log (
  id          uuid primary key default gen_random_uuid(),
  run_at      timestamptz not null default now(),
  customers_deleted int not null default 0,
  links_deleted     int not null default 0,
  photos_deleted    int not null default 0,
  unconsented_profiles_deleted int not null default 0
);

-- ---------------------------------------------------------------- lock everything down
alter table identity.customers       enable row level security;
alter table identity.links           enable row level security;
alter table anonymous.profiles       enable row level security;
alter table anonymous.reports        enable row level security;
alter table anonymous.feedback       enable row level security;
alter table anonymous.outfit_checks  enable row level security;
alter table anonymous.consent_log    enable row level security;
alter table anonymous.deletion_log   enable row level security;
-- No policies on purpose: the anon and authenticated roles can read and write nothing.
-- The server uses the service role key, which bypasses RLS.

grant usage on schema identity, anonymous to service_role;
grant all on all tables in schema identity, anonymous to service_role;

-- ---------------------------------------------------------------- deletion job body
-- Called daily by the server. Returns counts and the storage paths of photos to remove.
create or replace function anonymous.run_deletion(retention_days int default 7)
returns table (customers_deleted int, links_deleted int, photos_due text[], unconsented_profiles_deleted int)
language plpgsql
security definer
set search_path = identity, anonymous, public
as $$
declare
  c_count int := 0;
  l_count int := 0;
  u_count int := 0;
  due_photos text[];
begin
  -- 1. Photos past their date (paths returned so the server can delete the files too).
  select coalesce(array_agg(storage_path), '{}') into due_photos
  from outfit_checks where delete_after <= now();
  delete from outfit_checks where delete_after <= now();

  -- 2. Customers whose links are past their delete date: remove link, then identity.
  with due as (
    select customer_id from identity.links where delete_after is not null and delete_after <= now()
  ), del_links as (
    delete from identity.links where customer_id in (select customer_id from due) returning customer_id
  ), del_customers as (
    delete from identity.customers where id in (select customer_id from del_links) returning id
  )
  select (select count(*) from del_links), (select count(*) from del_customers) into l_count, c_count;

  -- 3. Profiles whose owner did not consent to keeping anonymous data,
  --    and whose identity link is gone: delete them too.
  with gone as (
    delete from anonymous.profiles p
    where p.keep_anonymous = false
      and not exists (select 1 from identity.links l where l.profile_id = p.id)
      and p.created_at <= now() - make_interval(days => retention_days)
    returning p.id
  )
  select count(*) into u_count from gone;

  insert into anonymous.deletion_log (customers_deleted, links_deleted, photos_deleted, unconsented_profiles_deleted)
  values (c_count, l_count, coalesce(array_length(due_photos, 1), 0), u_count);

  return query select c_count, l_count, due_photos, u_count;
end;
$$;

revoke all on function anonymous.run_deletion(int) from public;
grant execute on function anonymous.run_deletion(int) to service_role;
-- Superseded: photo labels use the existing column anonymous.profiles.photo_hints. Safe to delete this file.
-- Phase 3: report bookkeeping. (photo labels already live in anonymous.profiles.photo_hints.)
alter table anonymous.reports add column if not exists source text;            -- ai | ai+template | template
alter table anonymous.reports add column if not exists needs_review boolean not null default false;
alter table anonymous.reports add column if not exists changed_share numeric;  -- share of AI items the rules changed
create unique index if not exists reports_one_per_profile on anonymous.reports(profile_id);
-- Phase 5: payments. Linked to the anonymous profile only; holds no name, phone or email.
create table if not exists anonymous.orders (
  id                   uuid primary key default gen_random_uuid(),
  profile_id           uuid not null references anonymous.profiles(id) on delete cascade,
  tier                 text not null check (tier in ('card','report')),
  amount_paise         integer not null,
  razorpay_order_id    text unique,
  razorpay_payment_id  text,
  status               text not null default 'created',   -- created | paid
  created_at           timestamptz not null default now(),
  paid_at              timestamptz
);
create index if not exists orders_profile on anonymous.orders(profile_id);
alter table anonymous.orders enable row level security;
grant all on anonymous.orders to service_role;
alter table anonymous.reports add column if not exists tier text not null default 'report';
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


-- ======================================================== 0005_test_links.sql
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


-- ======================================================== 0006_waitlist_stylists.sql
-- Waitlist and stylist applications. Both hold contact details, so they live in the identity store.
create table if not exists identity.waitlist (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  phone            text not null unique,
  email            text,
  area             text not null,
  interests        text[] not null default '{}',
  consent_version  text not null,
  created_at       timestamptz not null default now()
);

create table if not exists identity.stylist_applications (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  phone            text not null unique,
  email            text not null,
  city             text not null,
  experience       text not null,
  specialities     text[] not null default '{}',
  languages        text,
  portfolio_url    text,
  about            text,
  availability     text not null,
  consent_version  text not null,
  status           text not null default 'new' check (status in ('new','shortlisted','contacted','rejected')),
  created_at       timestamptz not null default now()
);

alter table identity.waitlist enable row level security;
alter table identity.stylist_applications enable row level security;
grant all on identity.waitlist, identity.stylist_applications to service_role;


-- ======================================================== 0007_waitlist_mail.sql
-- Thank-you email tracking for the waitlist. 'pending' emails are retried by the daily job.
alter table identity.waitlist
  add column if not exists mail_status text not null default 'pending' check (mail_status in ('pending','sent','failed')),
  add column if not exists mail_sent_at timestamptz,
  add column if not exists mail_tries int not null default 0;


-- ======================================================== 0008_waitlist_site.sql
-- The waitlist page asks for email first (no phone), and city is optional. Sign-ups are de-duplicated by email.
alter table identity.waitlist alter column phone drop not null;
alter table identity.waitlist alter column area set default '';
alter table identity.waitlist add column if not exists source text;
create unique index if not exists waitlist_email_key on identity.waitlist (lower(email));
