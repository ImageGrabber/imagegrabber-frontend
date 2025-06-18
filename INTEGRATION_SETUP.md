# WordPress and Shopify Integration Setup

This guide will help you set up WordPress and Shopify integrations for pushing images directly from ImageGrabber with user authentication.

## Prerequisites

- WordPress site with admin access
- Shopify store with admin access
- ImageGrabber account (register/login required)
- Supabase database setup

## Database Setup

### 1. Create User Settings Table

Run the following SQL in your Supabase SQL editor:

```sql
-- Create user_settings table for storing integration credentials
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wordpress_url TEXT,
  wordpress_username TEXT,
  wordpress_password TEXT,
  shopify_store TEXT,
  shopify_access_token TEXT,
  shopify_product_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable Row Level Security (RLS)
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for user data access
CREATE POLICY "Users can view their own settings" ON user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings" ON user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" ON user_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own settings" ON user_settings
  FOR DELETE USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON user_settings TO authenticated;
GRANT ALL ON user_settings TO service_role;
```

### 2. Environment Variables

Add the Supabase service role key to your `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## WordPress Integration Setup

### 1. Create Application Password

1. Log in to your WordPress admin dashboard
2. Go to **Users** → **Your Profile**
3. Scroll down to **Application Passwords** section
4. Enter a name for the application (e.g., "ImageGrabber")
5. Click **Add New Application Password**
6. Copy the generated password (it will only be shown once)

### 2. Configure in ImageGrabber

1. **Register/Login** to ImageGrabber
2. Click your profile menu → **Integration Settings**
3. Fill in the WordPress section:
   - **WordPress URL**: `https://yoursite.com` (no trailing slash)
   - **Username**: Your WordPress username (not email)
   - **Application Password**: The password from step 1
4. Click **Save Settings**

**Important Notes:**
- Use the Application Password, not your login password
- The Application Password format: `xxxx xxxx xxxx xxxx xxxx xxxx`

## Shopify Integration Setup

### 1. Create Private App

1. Log in to your Shopify admin dashboard
2. Go to **Apps** → **App and sales channel settings**
3. Click **Develop apps**
4. Click **Create an app**
5. Enter app name (e.g., "ImageGrabber") and select yourself as developer
6. Click **Create app**

### 2. Configure App Permissions

1. Click **Configure Admin API scopes**
2. Enable the following permissions:
   - `write_products` - To upload product images
   - `write_themes` - To upload theme assets
   - `write_files` - To upload files
3. Click **Save**

### 3. Install the App

1. Click **Install app**
2. Copy the **Admin API access token**

### 4. Configure in ImageGrabber

1. Go to **Integration Settings** in ImageGrabber
2. Fill in the Shopify section:
   - **Store Name**: `yourstore.myshopify.com`
   - **Access Token**: The token from step 3
   - **Product ID**: (Optional) Specific product ID for image attachment
3. Click **Save Settings**

**Important Notes:**
- Access token should start with `shpat_`
- Product ID is optional - leave empty to upload as theme assets
- If Product ID is provided, images attach to that specific product

## Usage

### Getting Started

1. **Register/Login** to ImageGrabber
2. Configure your **Integration Settings** (WordPress and/or Shopify)
3. Start scraping and pushing images!

### Authentication Required

- **Push operations require login** - you'll see a login prompt if not authenticated
- After login, you'll be redirected to settings to configure integrations
- All credentials are stored securely in your user account

### Individual Image Push

1. Scrape images from any website
2. Hover over an image card
3. Click the **WordPress** (blue) or **Shopify** (green) button
4. The image will be uploaded using your configured credentials

### Bulk Image Push

1. Select multiple images using the checkboxes
2. Use the **Select All** button to select all images
3. Click **Push to WordPress** or **Push to Shopify** in the selection bar
4. All selected images will be uploaded simultaneously

## Troubleshooting

### Authentication Issues

**Not Logged In:**
- Register or login to ImageGrabber first
- Configure your integration settings after login

**Settings Not Configured:**
- Go to Integration Settings and fill in your credentials
- Ensure all required fields are completed

### WordPress Issues

**Authentication Failed:**
- Verify your WordPress URL is correct and accessible
- Ensure you're using the Application Password, not your login password
- Check that your username is correct (not email address)
- Make sure the Application Password is active in your WordPress profile

**Upload Failed:**
- Check if your WordPress site has sufficient storage space
- Verify that the WordPress REST API is enabled
- Ensure your user account has permission to upload media

### Shopify Issues

**Authentication Failed:**
- Verify your store URL is in the format `yourstore.myshopify.com`
- Check that your access token is correct and starts with `shpat_`
- Ensure the private app is installed and active

**Upload Failed:**
- Verify the app has the required permissions (`write_products`, `write_themes`, `write_files`)
- Check if the product ID exists (if specified)
- Ensure your Shopify plan supports the API features being used

### General Issues

**Network Errors:**
- Check your internet connection
- Verify that the target platforms are accessible
- Try uploading a single image first before bulk operations

**Image Format Issues:**
- Ensure images are in supported formats (JPEG, PNG, GIF, WebP)
- Check that image URLs are accessible and not behind authentication

## Security Features

- **User Authentication**: All push operations require login
- **Encrypted Storage**: Credentials stored securely in Supabase
- **Row Level Security**: Users can only access their own settings
- **Session-based Auth**: API calls use authenticated sessions
- **No Environment Variables**: No sensitive data in code or config files

## API Endpoints

The integration uses these authenticated API endpoints:

- `POST /api/push/wordpress` - Push single image to WordPress (requires auth)
- `POST /api/push/shopify` - Push single image to Shopify (requires auth)

Both endpoints require:
- Valid user session token in Authorization header
- User settings configured in database
- JSON payload with image object

## User Flow

1. **Discover Images**: Scrape images from any website
2. **Attempt Push**: Click push button on image
3. **Authentication Check**: 
   - If not logged in → Show login modal
   - If logged in but no settings → Redirect to settings page
   - If everything configured → Push image
4. **Settings Configuration**: Configure WordPress/Shopify credentials
5. **Push Images**: Successfully push to configured platforms

## Duplicate Selection Fix

The application properly handles duplicate images by using unique identifiers (index + URL) instead of just URLs. This means:
- Each image can be selected individually, even if it's a duplicate
- No more accidental multiple selections when clicking one image
- Better performance with proper React keys 