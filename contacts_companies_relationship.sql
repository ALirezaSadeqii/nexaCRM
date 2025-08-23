-- Add foreign key constraint between contacts and companies
ALTER TABLE public.contacts 
ADD CONSTRAINT contacts_company_id_fkey 
FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;
