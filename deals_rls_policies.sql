-- Enable Row Level Security on deals table
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own deals
CREATE POLICY "Users can view their own deals" ON public.deals
    FOR SELECT USING (auth.uid() = user_id);

-- Policy for users to insert their own deals
CREATE POLICY "Users can insert their own deals" ON public.deals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy for users to update their own deals
CREATE POLICY "Users can update their own deals" ON public.deals
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy for users to delete their own deals
CREATE POLICY "Users can delete their own deals" ON public.deals
    FOR DELETE USING (auth.uid() = user_id);

-- Optional: Policy to allow users to view deals where they are the contact owner
-- This would be useful if you want users to see deals associated with their contacts
-- CREATE POLICY "Users can view deals for their contacts" ON public.deals
--     FOR SELECT USING (
--         EXISTS (
--             SELECT 1 FROM public.contacts 
--             WHERE contacts.id = deals.contact_id 
--             AND contacts.user_id = auth.uid()
--         )
--     );
