import { NextResponse } from 'next/server';

// Function to analyze image using Mistral's vision model for brand detection
async function detectBrandsWithMistral(imageUrl: string) {
  const mistralApiKey = process.env.MISTRAL_API_KEY;
  
  if (!mistralApiKey) {
    throw new Error('Mistral API key not configured');
  }

  try {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mistralApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages: [
          {
            role: 'system',
            content: `You are a brand detection expert. Analyze the image and identify any logos, brands, or company names visible. Return your response as a JSON array with the following structure for each detected brand:
            [
              {
                "brand": "Brand Name",
                "confidence": "high/medium/low",
                "description": "Brief description of the logo/brand",
                "location": "General location in image (top-left, center, etc.)"
              }
            ]
            If no brands are detected, return an empty array [].`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Detect all brands and logos in this image.'
              },
              {
                type: 'image_url',
                image_url: imageUrl
              }
            ]
          }
        ],
        max_tokens: 1000,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      throw new Error(`Mistral API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Parse the JSON response
    let brands;
    try {
      const parsed = JSON.parse(content);
      brands = Array.isArray(parsed) ? parsed : parsed.brands || [];
    } catch (parseError) {
      // If JSON parsing fails, try to extract brands from text
      brands = extractBrandsFromText(content);
    }

    return brands.map((brand: any, index: number) => ({
      brand: brand.brand || brand.name || `Brand ${index + 1}`,
      score: getConfidenceScore(brand.confidence),
      bounds: getBoundsFromLocation(brand.location),
      description: brand.description || '',
      location: brand.location || 'Not specified',
      enhanced: true,
      mistralAnalysis: content
    }));

  } catch (error) {
    console.error('Error with Mistral analysis:', error);
    throw error;
  }
}

// Fallback function for when Mistral is not available
function fallbackBrandDetection(imageUrl: string) {
  // This is a very basic fallback that returns a generic response
  return [{
    brand: 'No brands detected',
    score: 0.5,
    bounds: { xmin: 0, ymin: 0, xmax: 100, ymax: 100 },
    description: 'Mistral API not configured. Please add your MISTRAL_API_KEY to .env.local',
    location: 'N/A',
    enhanced: false,
    mistralAnalysis: null
  }];
}

// Helper function to extract brands from text if JSON parsing fails
function extractBrandsFromText(text: string) {
  const commonBrands = [
    'apple', 'google', 'microsoft', 'amazon', 'facebook', 'twitter', 'instagram',
    'nike', 'adidas', 'coca-cola', 'pepsi', 'mcdonalds', 'starbucks', 'netflix',
    'spotify', 'uber', 'airbnb', 'tesla', 'ford', 'toyota', 'honda', 'bmw'
  ];
  
  const foundBrands = [];
  const lowerText = text.toLowerCase();
  
  for (const brand of commonBrands) {
    if (lowerText.includes(brand)) {
      foundBrands.push({
        brand: brand.charAt(0).toUpperCase() + brand.slice(1),
        confidence: 'medium',
        description: `Detected ${brand} brand`,
        location: 'center'
      });
    }
  }
  
  return foundBrands;
}

// Helper function to convert confidence text to score
function getConfidenceScore(confidence: string) {
  switch (confidence?.toLowerCase()) {
    case 'high': return 0.9;
    case 'medium': return 0.7;
    case 'low': return 0.5;
    default: return 0.7;
  }
}

// Helper function to convert location text to bounds
function getBoundsFromLocation(location: string) {
  const locationLower = location?.toLowerCase() || 'center';
  
  switch (locationLower) {
    case 'top-left': return { xmin: 0, ymin: 0, xmax: 30, ymax: 30 };
    case 'top-right': return { xmin: 70, ymin: 0, xmax: 100, ymax: 30 };
    case 'bottom-left': return { xmin: 0, ymin: 70, xmax: 30, ymax: 100 };
    case 'bottom-right': return { xmin: 70, ymin: 70, xmax: 100, ymax: 100 };
    case 'top': return { xmin: 35, ymin: 0, xmax: 65, ymax: 30 };
    case 'bottom': return { xmin: 35, ymin: 70, xmax: 65, ymax: 100 };
    case 'left': return { xmin: 0, ymin: 35, xmax: 30, ymax: 65 };
    case 'right': return { xmin: 70, ymin: 35, xmax: 100, ymax: 65 };
    default: return { xmin: 35, ymin: 35, xmax: 65, ymax: 65 }; // center
  }
}

export async function POST(request: Request) {
  try {
    const { imageUrl } = await request.json();

    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
    }

    let detectedBrands;
    
    try {
      // Try to use Mistral for brand detection
      detectedBrands = await detectBrandsWithMistral(imageUrl);
    } catch (error) {
      console.log('Mistral detection failed, using fallback:', error);
      // Use fallback if Mistral fails
      detectedBrands = fallbackBrandDetection(imageUrl);
    }

    return NextResponse.json(detectedBrands);

  } catch (error) {
    console.error('Error during brand detection:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { error: 'Failed to detect brands.', details: errorMessage },
      { status: 500 }
    );
  }
} 