-- ============================================================
-- SnapCut Migration: Add chair_count to shops table
-- Run this in your Supabase SQL Editor
-- ============================================================

ALTER TABLE shops 
ADD COLUMN IF NOT EXISTS chair_count INT DEFAULT 1 CHECK (chair_count >= 1);

COMMENT ON COLUMN shops.chair_count IS 'Number of service chairs / stylists available simultaneously';
