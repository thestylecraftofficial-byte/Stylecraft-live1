-- Thank-you email tracking for the waitlist. 'pending' emails are retried by the daily job.
alter table identity.waitlist
  add column if not exists mail_status text not null default 'pending' check (mail_status in ('pending','sent','failed')),
  add column if not exists mail_sent_at timestamptz,
  add column if not exists mail_tries int not null default 0;
