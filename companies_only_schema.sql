-- Companies table only - for NexaCRM
-- This file only creates the companies table and its RLS policies
-- DO NOT run this if you already have the companies table

-- Create companies table
CREATE TABLE IF NOT EXISTS public.companies (
  created_at timestamp with time zone not null default now(),
  name text not null default ''::text,
  industry text null,
  website text null,
  phone text null,
  address text null,
  user_id uuid null default auth.uid(),
  id uuid not null default gen_random_uuid(),
  constraint companies_pkey primary key (id),
  constraint companies_user_id_fkey foreign KEY (user_id) references users (id)
) TABLESPACE pg_default;

-- Enable RLS on companies table
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Companies RLS Policies
CREATE POLICY "Users can view their own companies" ON public.companies
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own companies" ON public.companies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own companies" ON public.companies
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own companies" ON public.companies
  FOR DELETE USING (auth.uid() = user_id);
