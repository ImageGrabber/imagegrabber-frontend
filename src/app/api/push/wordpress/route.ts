import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json();
    
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization required' },
        { status: 401 }
      );
    }

    // Verify the user token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authorization token' },
        { status: 401 }
      );
    }

    // Get user settings from Supabase
    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .select('wordpress_url, wordpress_username, wordpress_password')
      .eq('user_id', user.id)
      .single();

    if (settingsError || !settings) {
      return NextResponse.json(
        { error: 'WordPress credentials not configured. Please configure your settings first.' },
        { status: 400 }
      );
    }

    const { wordpress_url: wpUrl, wordpress_username: wpUsername, wordpress_password: wpPassword } = settings;

    if (!wpUrl || !wpUsername || !wpPassword) {
      return NextResponse.json(
        { error: 'WordPress credentials incomplete. Please check your settings.' },
        { status: 400 }
      );
    }

    // Download the image
    const imageResponse = await fetch(image.url);
    if (!imageResponse.ok) {
      throw new Error('Failed to download image');
    }
    const imageBuffer = await imageResponse.arrayBuffer();

    // Get content type from the original response
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';

    // Create form data for WordPress upload
    const formData = new FormData();
    formData.append('file', new Blob([imageBuffer], { type: contentType }), image.filename);

    // Upload to WordPress media library
    const uploadResponse = await fetch(`${wpUrl}/wp-json/wp/v2/media`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${wpUsername}:${wpPassword}`).toString('base64')}`,
      },
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('WordPress upload error:', errorText);
      throw new Error(`Failed to upload to WordPress: ${uploadResponse.status} ${uploadResponse.statusText}`);
    }

    const uploadResult = await uploadResponse.json();

    return NextResponse.json({
      success: true,
      mediaId: uploadResult.id,
      url: uploadResult.source_url,
      title: uploadResult.title?.rendered || image.filename,
      altText: uploadResult.alt_text || '',
      caption: uploadResult.caption?.rendered || '',
    });
  } catch (error) {
    console.error('WordPress upload failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload to WordPress' },
      { status: 500 }
    );
  }
} 