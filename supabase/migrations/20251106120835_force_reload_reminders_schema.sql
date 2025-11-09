
/*
  # Force Reload Reminders Schema and Refresh PostgREST Cache
  
  This migration ensures the reminders table is properly registered in PostgREST
  and all policies are active.
  
  1. Verify reminders table exists
  2. Refresh RLS policies
  3. Update table comment to force cache refresh
*/

-- Add a comment to force PostgREST to reload the table
COMMENT ON TABLE public.reminders IS 'AI-powered reminder management system for lawyers - Schema refreshed at 2025-11-06';

-- Verify all policies are active
DO $$
BEGIN
  -- Ensure SELECT policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'reminders' 
    AND policyname = 'Lawyers can view own reminders'
  ) THEN
    CREATE POLICY "Lawyers can view own reminders"
      ON public.reminders FOR SELECT
      TO authenticated
      USING (auth.uid() = lawyer_id);
  END IF;
END $$;

-- Notify PostgREST that schema has changed
NOTIFY pgrst, 'reload schema';
