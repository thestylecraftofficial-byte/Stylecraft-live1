-- The waitlist page asks for email first (no phone), and city is optional. Sign-ups are de-duplicated by email.
alter table identity.waitlist alter column phone drop not null;
alter table identity.waitlist alter column area set default '';
alter table identity.waitlist add column if not exists source text;
create unique index if not exists waitlist_email_key on identity.waitlist (lower(email));
