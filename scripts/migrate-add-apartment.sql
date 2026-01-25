-- Migration: Add apartment column to chat_sessions
-- Run this in Supabase SQL Editor

-- Add apartment column to store which apartment the guest is in
ALTER TABLE chat_sessions
ADD COLUMN IF NOT EXISTS apartment TEXT;

-- Add check constraint for valid apartment values
ALTER TABLE chat_sessions
ADD CONSTRAINT valid_apartment
CHECK (apartment IS NULL OR apartment IN ('HEART1', 'HEART2', 'HEART3', 'HEART4', 'HEART5'));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_chat_sessions_apartment ON chat_sessions(apartment);

-- Comment for documentation
COMMENT ON COLUMN chat_sessions.apartment IS 'Guest apartment (HEART1-5), set when guest identifies their apartment';
