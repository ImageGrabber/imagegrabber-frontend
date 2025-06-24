-- MIGRATION: Create classification_history table

-- Create classification_history table to store content classification results
CREATE TABLE IF NOT EXISTS classification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('product', 'blog', 'review', 'landing', 'article', 'other')),
  confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  images TEXT[] NOT NULL DEFAULT '{}',
  method TEXT NOT NULL CHECK (method IN ('openai', 'huggingface', 'keyword')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add comments to the table and columns
COMMENT ON TABLE classification_history IS 'Stores content classification results for users.';
COMMENT ON COLUMN classification_history.content_type IS 'The classified content type (product, blog, review, etc.).';
COMMENT ON COLUMN classification_history.confidence IS 'Confidence score from 0 to 1.';
COMMENT ON COLUMN classification_history.method IS 'Classification method used (openai, huggingface, keyword).';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS classification_history_user_id_idx ON classification_history(user_id);
CREATE INDEX IF NOT EXISTS classification_history_created_at_idx ON classification_history(created_at DESC);
CREATE INDEX IF NOT EXISTS classification_history_content_type_idx ON classification_history(content_type);
CREATE INDEX IF NOT EXISTS classification_history_url_idx ON classification_history(url);

-- Enable Row Level Security (RLS)
ALTER TABLE classification_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only view and manage their own classification history
CREATE POLICY "Allow users to manage their own classification history"
ON classification_history
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow service role to bypass RLS for admin operations
CREATE POLICY "Service role can manage classification history"
ON classification_history
FOR ALL
USING (auth.role() = 'service_role');

-- Grant permissions
GRANT ALL ON classification_history TO authenticated;
GRANT ALL ON classification_history TO service_role; 