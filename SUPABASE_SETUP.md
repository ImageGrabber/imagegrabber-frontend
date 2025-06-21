# Supabase Authentication Setup

## Prerequisites
1. Create a Supabase account at [supabase.com](https://supabase.com)
2. Create a new project in Supabase
3. Get your project URL and anon key from the API settings

## Environment Variables
Create a `.env.local` file in your project root with the following variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

## Example:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Finding Your Credentials
1. Go to your Supabase project dashboard
2. Navigate to Settings → API
3. Copy the "Project URL" for `NEXT_PUBLIC_SUPABASE_URL`
4. Copy the "anon public" key for `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Email Configuration (Required for Password Reset)
1. Go to Authentication → Settings in your Supabase dashboard
2. Scroll down to "SMTP Settings" 
3. Configure your email provider (Gmail, SendGrid, etc.) or use Supabase's built-in email service
4. Set the "Site URL" to your domain (e.g., `http://localhost:3000` for development)
5. Add your domain to "Redirect URLs" if needed

## Authentication Features Included
- ✅ User registration with email confirmation
- ✅ User login/logout
- ✅ **Forgot password functionality**
- ✅ **Password reset via email**
- ✅ **Secure password update**
- ✅ Protected routes and components
- ✅ Persistent sessions
- ✅ User profile management
- ✅ Beautiful authentication modals
- ✅ Error handling and loading states

## Usage
Once you've set up your environment variables and restarted your development server, users can:
1. Click "Sign Up" to create a new account
2. Check their email for a confirmation link
3. Click "Sign In" to log into existing accounts
4. **Click "Forgot your password?" on the login form**
5. **Enter their email to receive a password reset link**
6. **Click the reset link in their email to set a new password**
7. Access their profile menu when logged in
8. Sign out securely

## Password Reset Flow
1. User clicks "Forgot your password?" in the login modal
2. User enters their email address
3. Supabase sends a password reset email
4. User clicks the link in the email
5. User is redirected to `/reset-password` page
6. User enters and confirms their new password
7. Password is updated and user is redirected to home page

## Security Features
- ✅ **Time-limited reset tokens** (links expire for security)
- ✅ **Email verification required** for password resets
- ✅ **Password strength validation** (minimum 6 characters)
- ✅ **Password confirmation matching**
- ✅ **Secure token handling** via Supabase auth

## Database Schema
Supabase will automatically handle the user authentication tables. However, you need to create additional tables for the application features:

### Required Tables Setup
1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the following SQL into the SQL Editor and click "Run":

```sql
-- Create search_history table
CREATE TABLE IF NOT EXISTS search_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT,
  image_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transactions table  
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('deduction', 'purchase')),
  amount INTEGER NOT NULL,
  description TEXT NOT NULL,
  url TEXT,
  images_found INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create profiles table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  credits INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS search_history_user_id_idx ON search_history(user_id);
CREATE INDEX IF NOT EXISTS search_history_created_at_idx ON search_history(created_at DESC);
CREATE INDEX IF NOT EXISTS transactions_user_id_idx ON transactions(user_id);
CREATE INDEX IF NOT EXISTS transactions_created_at_idx ON transactions(created_at DESC);

-- Row Level Security (RLS) policies
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Search history policies
CREATE POLICY "Users can view their own search history" ON search_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own search history" ON search_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own search history" ON search_history
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own search history" ON search_history
  FOR DELETE USING (auth.uid() = user_id);

-- Allow service role to bypass RLS for search history
CREATE POLICY "Service role can manage search history" ON search_history
  FOR ALL USING (auth.role() = 'service_role');

-- Transaction policies  
CREATE POLICY "Users can view their own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions" ON transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow service role to bypass RLS for transactions
CREATE POLICY "Service role can manage transactions" ON transactions
  FOR ALL USING (auth.role() = 'service_role');

-- Profile policies
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at on profiles
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
```

This creates the required tables:
   - `profiles` - User profiles with credit balance
   - `search_history` - User search history
   - `transactions` - Credit transaction history

The schema includes:
- ✅ **Row Level Security (RLS)** policies for data protection
- ✅ **Proper indexes** for optimal performance  
- ✅ **Foreign key constraints** for data integrity
- ✅ **Automatic timestamps** and triggers

### Service Role Key (Optional but Recommended)
For better database operations, add your service role key to `.env.local`:
```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

This allows the application to:
- Create user profiles automatically
- Record transactions reliably  
- Bypass RLS policies when needed for admin operations 