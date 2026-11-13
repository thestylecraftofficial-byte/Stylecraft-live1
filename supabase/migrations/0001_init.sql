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
