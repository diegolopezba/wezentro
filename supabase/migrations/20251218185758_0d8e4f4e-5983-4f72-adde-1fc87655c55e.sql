-- Add last_read_at column to track when user last viewed each chat
ALTER TABLE chat_participants 
ADD COLUMN last_read_at timestamp with time zone DEFAULT now();

-- Create index for performance
CREATE INDEX idx_chat_participants_last_read 
ON chat_participants(chat_id, user_id, last_read_at);

-- Add UPDATE policy for users to update their own read status
CREATE POLICY "Users can update own read status"
ON chat_participants FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create user_settings table for privacy preferences
CREATE TABLE user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  allow_messages_from text DEFAULT 'everyone',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Users can view own settings
CREATE POLICY "Users can view own settings"
ON user_settings FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert own settings
CREATE POLICY "Users can insert own settings"
ON user_settings FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update own settings
CREATE POLICY "Users can update own settings"
ON user_settings FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to check others' messaging settings (for enforcing the rule)
CREATE POLICY "Anyone can view message settings"
ON user_settings FOR SELECT
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_user_settings_updated_at
BEFORE UPDATE ON user_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();