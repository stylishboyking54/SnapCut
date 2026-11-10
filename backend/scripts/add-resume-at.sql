-- ============================================================
-- Add resume_at to shops for timed pause auto-resume
-- Run this in your Supabase SQL Editor
-- ============================================================
ALTER TABLE shops ADD COLUMN IF NOT EXISTS resume_at TIMESTAMPTZ;

