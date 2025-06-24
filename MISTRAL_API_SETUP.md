# Mistral API Setup for Brand Detection

This guide explains how to set up the Mistral API key for the brand detection feature.

## Step 1: Get Your Mistral API Key

1. Go to [Mistral AI Console](https://console.mistral.ai/)
2. Sign up or log in to your account
3. Navigate to the API Keys section
4. Create a new API key
5. Copy the API key (it starts with `mist-`)

## Step 2: Configure Environment Variables

Create a `.env.local` file in the `imagegrabber-frontend` directory with the following content:

```bash
# Mistral AI API Configuration
MISTRAL_API_KEY=your_mistral_api_key_here

# Example:
# MISTRAL_API_KEY=mist-abc123def456ghi789...
```

## Step 3: Restart the Development Server

After adding the environment variable, restart your Next.js development server:

```bash
npm run dev
```

## Step 4: Verify Configuration

The brand detection feature will now use Mistral's API for enhanced logo analysis. The system will:

1. Use the local object detection model for initial logo detection with bounding boxes
2. Optionally use Mistral's vision models for additional analysis and context

## Environment File Locations

- **Development**: `.env.local` (recommended)
- **Production**: Set environment variables in your hosting platform (Vercel, Netlify, etc.)

## Security Notes

- Never commit your `.env.local` file to version control
- The `.env.local` file is already in `.gitignore`
- Use different API keys for development and production environments

## Troubleshooting

If you encounter issues:

1. **API Key Not Found**: Ensure the environment variable is named exactly `MISTRAL_API_KEY`
2. **Invalid API Key**: Verify your API key is correct and active
3. **Rate Limits**: Check your Mistral API usage limits in the console

## Next Steps

Once configured, you can:
1. Navigate to the "Brand Detector" page in the application
2. Upload an image or provide an image URL
3. View the detected brands with bounding boxes
4. Get additional analysis from Mistral's vision models 