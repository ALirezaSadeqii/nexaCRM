-- Activities table schema for NexaCRM
-- This creates the activities table with proper structure

-- Create activities table
CREATE TABLE IF NOT EXISTS public.activities (
  id uuid not null default gen_random_uuid(),
  type text not null,
  notes text null,
  contact_id uuid null,
  deal_id uuid null,
  due_date timestamp with time zone null,
  completed boolean default false,
  user_id uuid null default auth.uid(),
  created_at timestamp with time zone not null default now(),
  constraint activities_pkey primary key (id),
  constraint activities_user_id_fkey foreign KEY (user_id) references users (id),
  constraint activities_contact_id_fkey foreign KEY (contact_id) references contacts (id) ON DELETE SET NULL,
  constraint activities_deal_id_fkey foreign KEY (deal_id) references deals (id) ON DELETE SET NULL
) TABLESPACE pg_default;

-- Enable RLS on activities table
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own activities" ON public.activities;
DROP POLICY IF EXISTS "Users can insert their own activities" ON public.activities;
DROP POLICY IF EXISTS "Users can update their own activities" ON public.activities;
DROP POLICY IF EXISTS "Users can delete their own activities" ON public.activities;

-- Activities RLS Policies
CREATE POLICY "Users can view their own activities" ON public.activities
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activities" ON public.activities
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own activities" ON public.activities
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own activities" ON public.activities
  FOR DELETE USING (auth.uid() = user_id);
