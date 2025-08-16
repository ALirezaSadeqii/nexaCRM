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
