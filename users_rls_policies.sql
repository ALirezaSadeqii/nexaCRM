-- Enable RLS
alter table public.users enable row level security;

-- Policy: allow authenticated users to select their own row
drop policy if exists "Users can view own row" on public.users;
create policy "Users can view own row"
on public.users
for select
to authenticated
using ( auth.uid() = id );

-- Policy: allow authenticated users to insert their own row
drop policy if exists "Users can insert own row" on public.users;
create policy "Users can insert own row"
on public.users
for insert
to authenticated
with check ( auth.uid() = id );

-- Policy: allow authenticated users to update their own row
drop policy if exists "Users can update own row" on public.users;
create policy "Users can update own row"
on public.users
for update
to authenticated
using ( auth.uid() = id )
with check ( auth.uid() = id );

-- Optional: allow service role to manage everything
-- (Supabase backend uses service role for migrations / admin tasks)
drop policy if exists "Service role full access" on public.users;
create policy "Service role full access"
on public.users
for all
to service_role
using ( true )
with check ( true );

