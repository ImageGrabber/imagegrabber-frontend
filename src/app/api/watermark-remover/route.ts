import { NextResponse } from 'next/server';

// This API route now constructs a PixelBin.io URL for watermark removal.
// The actual processing is handled by PixelBin on the client side.
export async function POST(request: Request) {
  try {
    const { imageUrl } = await request.json();
    const cloudName = process.env.NEXT_PUBLIC_PIXELBIN_CLOUD_NAME;

    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
    }

    if (!cloudName) {
      return NextResponse.json(
        { error: 'PixelBin cloud name is not configured. Please set NEXT_PUBLIC_PIXELBIN_CLOUD_NAME in your .env.local file.' },
        { status: 500 }
      );
    }
    
    // Construct the PixelBin URL for watermark removal
    const processedUrl = `https://cdn.pixelbin.io/v2/${cloudName}/wm.remove()/${imageUrl}`;

    // For the sake of the demo, we assume a watermark is always "detected".
    // A real detection would require a different, more complex API call.
    const result = {
      hasWatermark: true,
      originalUrl: imageUrl,
      processedUrl: processedUrl,
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error constructing PixelBin URL:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { error: 'Failed to process image.', details: errorMessage },
      { status: 500 }
    );
  }
} 