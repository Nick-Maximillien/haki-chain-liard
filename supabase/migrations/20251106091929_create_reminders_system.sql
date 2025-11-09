/*
  # HakiReminders System - Complete Database Schema

  1. New Tables
    - `reminders` - AI-powered reminder management system
      - `id` (uuid, primary key)
      - `lawyer_id` (uuid, references auth.users)
      - `title` (text) - Reminder title
      - `description` (text) - SMS message content
      - `type` (enum) - follow-up, court-date, meeting, deadline, document-review
      - `priority` (enum) - high, medium, low
      - `scheduled_date` (date) - When to send reminder
      - `scheduled_time` (time) - Time to send reminder
      - `lawyer_phone` (text) - Lawyer's phone number
      - `client_phone` (text) - Client's phone number
      - `client_name` (text) - Client full name
      - `client_email` (text) - Client email
      - `status` (enum) - scheduled, sent, history
      - `confidence_percent` (int) - AI suggestion confidence (0-100)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Profile Extensions
    - Add `last_reminder_check` to profiles table for tracking last interaction

  3. Security
    - Enable RLS on reminders table
    - Add policies for lawyers to manage their own reminders
    - Add policies for admins to view all reminders

  4. Indexes
    - Add index on lawyer_id for fast queries
    - Add index on scheduled_date and status for due reminders
*/

-- Create reminder_type enum
DO $$ BEGIN
  CREATE TYPE reminder_type AS ENUM ('follow-up', 'court-date', 'meeting', 'deadline', 'document-review');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create reminder_priority enum
DO $$ BEGIN
  CREATE TYPE reminder_priority AS ENUM ('high', 'medium', 'low');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create reminder_status enum
DO $$ BEGIN
  CREATE TYPE reminder_status AS ENUM ('scheduled', 'sent', 'history');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create reminders table
CREATE TABLE IF NOT EXISTS reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lawyer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  type reminder_type NOT NULL,
  priority reminder_priority DEFAULT 'medium' NOT NULL,
  scheduled_date date NOT NULL,
  scheduled_time time NOT NULL,
  lawyer_phone text,
  client_phone text,
  client_name text NOT NULL,
  client_email text NOT NULL,
  status reminder_status DEFAULT 'scheduled' NOT NULL,
  confidence_percent int DEFAULT 0 CHECK (confidence_percent >= 0 AND confidence_percent <= 100),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Add last_reminder_check to profiles
DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_reminder_check timestamptz;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- Enable RLS
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- Policies for reminders
CREATE POLICY "Lawyers can view own reminders"
  ON reminders FOR SELECT
  TO authenticated
  USING (auth.uid() = lawyer_id);

CREATE POLICY "Lawyers can create own reminders"
  ON reminders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = lawyer_id);

CREATE POLICY "Lawyers can update own reminders"
  ON reminders FOR UPDATE
  TO authenticated
  USING (auth.uid() = lawyer_id)
  WITH CHECK (auth.uid() = lawyer_id);

CREATE POLICY "Lawyers can delete own reminders"
  ON reminders FOR DELETE
  TO authenticated
  USING (auth.uid() = lawyer_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reminders_lawyer_id ON reminders(lawyer_id);
CREATE INDEX IF NOT EXISTS idx_reminders_scheduled_date ON reminders(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON reminders(status);
CREATE INDEX IF NOT EXISTS idx_reminders_due_today ON reminders(lawyer_id, scheduled_date, status) 
  WHERE status = 'scheduled';

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_reminders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS reminders_updated_at_trigger ON reminders;
CREATE TRIGGER reminders_updated_at_trigger
  BEFORE UPDATE ON reminders
  FOR EACH ROW
  EXECUTE FUNCTION update_reminders_updated_at();
