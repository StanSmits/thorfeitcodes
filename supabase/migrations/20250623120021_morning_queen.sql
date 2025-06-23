/*
  # Add subscription fields to profiles table

  1. New Columns
    - `subscription_status` (text) - Track subscription status: inactive, active, cancelled, expired
    - `subscription_plan` (text) - Store the subscription plan name
    - `subscription_expires_at` (timestamptz) - When the subscription expires

  2. Updates
    - Add default values for existing users
    - Create index for subscription queries

  3. Security
    - RLS policies already exist and will cover new fields
*/

-- Add subscription fields to profiles table
DO $$
BEGIN
  -- Add subscription_status column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'subscription_status'
  ) THEN
    ALTER TABLE profiles ADD COLUMN subscription_status text DEFAULT 'inactive' NOT NULL;
  END IF;

  -- Add subscription_plan column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'subscription_plan'
  ) THEN
    ALTER TABLE profiles ADD COLUMN subscription_plan text;
  END IF;

  -- Add subscription_expires_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'subscription_expires_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN subscription_expires_at timestamptz;
  END IF;
END $$;

-- Create index for subscription queries
CREATE INDEX IF NOT EXISTS profiles_subscription_status_idx ON profiles(subscription_status);
CREATE INDEX IF NOT EXISTS profiles_subscription_expires_at_idx ON profiles(subscription_expires_at);

-- Update existing users to have inactive subscription status
UPDATE profiles 
SET subscription_status = 'inactive' 
WHERE subscription_status IS NULL;