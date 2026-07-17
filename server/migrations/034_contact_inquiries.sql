create table if not exists contact_inquiries (
  id text primary key,
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (char_length(email) between 3 and 254),
  mobile text not null check (char_length(mobile) between 7 and 24),
  message text not null check (char_length(message) between 10 and 3000),
  consent boolean not null check (consent = true),
  source text not null default 'website' check (source in ('website')),
  status text not null default 'new' check (status in ('new', 'in_progress', 'resolved', 'spam')),
  created_at timestamptz not null default now()
);

create index if not exists contact_inquiries_status_created_idx
  on contact_inquiries (status, created_at desc);

alter table contact_inquiries enable row level security;

revoke all on table contact_inquiries from anon, authenticated;
