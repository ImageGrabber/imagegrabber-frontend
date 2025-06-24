# AI Content Classifier Setup Guide

The AI Content Classifier feature can use either OpenAI's GPT models or HuggingFace's inference API for more accurate content classification. Follow this guide to set up AI-powered classification.

## Features

- **AI-Powered Classification**: Uses OpenAI GPT-3.5-turbo or HuggingFace BART model
- **Keyword Fallback**: Robust keyword-based classification when AI is unavailable
- **Content Types**: Classifies pages as Product, Blog, Review, Landing Page, Article, or Other
- **Confidence Scoring**: Provides confidence levels for each classification
- **Filtering & Sorting**: Advanced filtering by content type and sorting options
- **Image Extraction**: Automatically extracts images from classified pages

## Setup Instructions

### Option 1: OpenAI Integration (Recommended)

1. **Get OpenAI API Key**:
   - Visit [OpenAI Platform](https://platform.openai.com/)
   - Create an account or sign in
   - Navigate to API Keys section
   - Create a new API key

2. **Add Environment Variable**:
   ```bash
   # Add to your .env.local file
   OPENAI_API_KEY=your_openai_api_key_here
   ```

3. **For Production (Netlify/Vercel)**:
   - Go to your deployment platform dashboard
   - Navigate to Environment Variables
   - Add `OPENAI_API_KEY` with your API key

### Option 2: HuggingFace Integration

1. **Get HuggingFace API Key**:
   - Visit [HuggingFace](https://huggingface.co/)
   - Create an account or sign in
   - Go to Settings → Access Tokens
   - Create a new token with "read" permissions

2. **Add Environment Variable**:
   ```bash
   # Add to your .env.local file
   HUGGINGFACE_API_KEY=your_huggingface_api_key_here
   ```

3. **For Production (Netlify/Vercel)**:
   - Go to your deployment platform dashboard
   - Navigate to Environment Variables
   - Add `HUGGINGFACE_API_KEY` with your API key

## Usage

### Basic Classification (Keyword-based)
1. Navigate to "Content Classifier" in the dashboard
2. Enter a website URL
3. Leave "Use AI Classification" unchecked
4. Click "Classify Content"

### AI-Powered Classification
1. Navigate to "Content Classifier" in the dashboard
2. Enter a website URL
3. Check "Use AI Classification (OpenAI/HuggingFace)"
4. Click "Classify Content"

### Filtering and Sorting
- **Search**: Search through classified content by title, description, or URL
- **Type Filter**: Filter by content type (Product, Blog, Review, etc.)
- **Sort**: Sort by Date, Title, Type, or Confidence
- **Sort Order**: Toggle between ascending and descending order

## Content Types

The classifier recognizes these content types:

- **Product**: E-commerce pages, product listings, shopping pages
- **Blog**: Blog posts, personal articles, opinion pieces
- **Review**: Product reviews, service reviews, ratings
- **Landing**: Marketing pages, signup pages, call-to-action pages
- **Article**: News articles, research papers, informational content
- **Other**: Content that doesn't fit the above categories

## API Endpoints

### POST /api/content-classifier

**Request Body**:
```json
{
  "url": "https://example.com",
  "useAI": true
}
```

**Response**:
```json
{
  "id": "1234567890",
  "url": "https://example.com",
  "title": "Page Title",
  "description": "Page description",
  "contentType": "product",
  "confidence": 0.85,
  "images": ["https://example.com/image1.jpg"],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "method": "ai"
}
```

## Cost Considerations

### OpenAI
- GPT-3.5-turbo: ~$0.002 per 1K tokens
- Typical classification: ~100-200 tokens per request
- Estimated cost: $0.0002-0.0004 per classification

### HuggingFace
- Free tier: 30,000 requests per month
- Paid plans available for higher usage
- No cost for basic usage

## Troubleshooting

### AI Classification Not Working
1. Check that your API keys are correctly set in environment variables
2. Verify your API keys have sufficient credits/permissions
3. Check the browser console for error messages
4. The system will automatically fall back to keyword-based classification

### High API Costs
1. Use keyword-based classification for bulk operations
2. Reserve AI classification for important pages
3. Monitor your API usage in the respective platforms

### Classification Accuracy
1. AI classification generally provides higher accuracy
2. Keyword classification works well for clear content types
3. Review and adjust keywords in the API code if needed

## Security Notes

- API keys are stored securely in environment variables
- Keys are never exposed to the client-side
- Use different API keys for development and production
- Regularly rotate your API keys

## Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify your environment variables are set correctly
3. Test with a simple, public website first
4. Ensure your API keys have sufficient permissions and credits 