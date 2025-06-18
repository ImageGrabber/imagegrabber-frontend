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
Supabase will automatically handle the user authentication tables. No additional setup required! 