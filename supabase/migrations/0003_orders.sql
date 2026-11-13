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
