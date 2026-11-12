-- SnapCut: Bookings RLS Fix
-- Run this in Supabase SQL Editor if joining a line still shows the RLS error.
-- This grants the service_role full access so the backend can always insert bookings.

-- Option 1 (Recommended): Add a policy that lets authenticated users insert their own bookings
-- (This is what the main code fix already relies on via the user JWT client)
-- If you already have "Customer insert booking", skip Option 1.

-- Option 2: Grant service_role bypass (run if Option 1 alone is not enough)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'bookings'
      AND policyname = 'Service role full access on bookings'
  ) THEN
    EXECUTE $q$
      CREATE POLICY "Service role full access on bookings"
        ON bookings FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true);
    $q$;
    RAISE NOTICE 'Policy created.';
  ELSE
    RAISE NOTICE 'Policy already exists, skipping.';
  END IF;
END $$;
