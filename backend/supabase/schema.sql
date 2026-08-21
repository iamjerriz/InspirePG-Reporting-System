-- Logger System - Supabase schema
--
-- Run this once in the Supabase SQL editor (or via `supabase db push`) for a
-- new project. Sets up the table that replaces logger.xlsx and locks it down
-- so only the backend's service role key can read/write it directly - the
-- anon/authenticated keys (which the frontend never sees anyway, but just in
-- case) get nothing.

create table if not exists public.log_entries (
  id bigint generated always as identity primary key,
  "timestamp" text not null,
  first_name text not null,
  last_name text not null,
  sid text not null,
  area text not null,
  seller_type text not null,
  proof_filename text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists log_entries_created_at_idx on public.log_entries (created_at);

alter table public.log_entries enable row level security;
-- No policies are defined for anon/authenticated - only requests made with
-- the service role key (used exclusively by the Express backend) can read
-- or write this table. That key bypasses RLS entirely.

-- Storage bucket for proof-of-login images. Created with public = false so
-- files are only reachable via signed URLs the backend issues to
-- authenticated admins - never via a guessable public URL.
insert into storage.buckets (id, name, public)
values ('proofs', 'proofs', false)
on conflict (id) do nothing;
