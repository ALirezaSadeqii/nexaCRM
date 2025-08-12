-- Enable RLS on contacts table
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Policy for users to select their own contacts
CREATE POLICY "Users can view their own contacts" ON public.contacts
    FOR SELECT USING (auth.uid() = user_id);

-- Policy for users to insert their own contacts
CREATE POLICY "Users can insert their own contacts" ON public.contacts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy for users to update their own contacts
CREATE POLICY "Users can update their own contacts" ON public.contacts
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy for users to delete their own contacts
CREATE POLICY "Users can delete their own contacts" ON public.contacts
    FOR DELETE USING (auth.uid() = user_id);
