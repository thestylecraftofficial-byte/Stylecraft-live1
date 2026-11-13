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
