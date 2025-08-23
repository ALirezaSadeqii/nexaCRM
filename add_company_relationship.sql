-- Add company relationship to existing contacts table
-- This file updates the existing contacts table to work with companies

-- Add company_id column to contacts table (if it doesn't exist)
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS company_id uuid null;

-- Add foreign key constraint (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'contacts_company_id_fkey' 
        AND table_name = 'contacts'
    ) THEN
        ALTER TABLE public.contacts 
        ADD CONSTRAINT contacts_company_id_fkey 
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;
    END IF;
END $$;
