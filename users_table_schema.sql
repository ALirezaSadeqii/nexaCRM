-- Create users table (run only if it does not exist)
create table if not exists public.users (
  id uuid not null default auth.uid (),
  full_name text null,
  phone_number text null,
  subscription text null,
  created_at timestamp with time zone not null default now(),
  constraint users_pkey primary key (id)
) tablespace pg_default;

-- Helpful index for lookups
create index if not exists users_id_idx on public.users (id);

