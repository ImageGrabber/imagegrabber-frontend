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
      .select('shopify_store, shopify_access_token, shopify_product_id')
      .eq('user_id', user.id)
      .single();

    if (settingsError || !settings) {
      return NextResponse.json(
        { error: 'Shopify credentials not configured. Please configure your settings first.' },
        { status: 400 }
      );
    }

    const { shopify_store: shopifyStore, shopify_access_token: shopifyAccessToken, shopify_product_id: shopifyProductId } = settings;

    if (!shopifyStore || !shopifyAccessToken) {
      return NextResponse.json(
        { error: 'Shopify credentials incomplete. Please check your settings.' },
        { status: 400 }
      );
    }

    // Download the image
    const imageResponse = await fetch(image.url);
    if (!imageResponse.ok) {
      throw new Error('Failed to download image');
    }
    const imageBuffer = await imageResponse.arrayBuffer();

    // Convert buffer to base64 for Shopify API
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';

    let uploadResult;

    if (shopifyProductId) {
      // Upload as product image
      const productImageData = {
        image: {
          attachment: base64Image,
          filename: image.filename,
          alt: image.filename.replace(/\.[^/.]+$/, ""), // Remove file extension for alt text
        }
      };

      const uploadResponse = await fetch(`https://${shopifyStore}/admin/api/2024-01/products/${shopifyProductId}/images.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': shopifyAccessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productImageData),
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('Shopify product image upload error:', errorText);
        throw new Error(`Failed to upload to Shopify product: ${uploadResponse.status} ${uploadResponse.statusText}`);
      }

      uploadResult = await uploadResponse.json();
      
      return NextResponse.json({
        success: true,
        imageId: uploadResult.image.id,
        productId: uploadResult.image.product_id,
        url: uploadResult.image.src,
        altText: uploadResult.image.alt,
        type: 'product_image'
      });
    } else {
      // Upload as a general asset (file)
      const assetData = {
        asset: {
          key: `assets/${image.filename}`,
          value: base64Image,
        }
      };

      const uploadResponse = await fetch(`https://${shopifyStore}/admin/api/2024-01/themes/main/assets.json`, {
        method: 'PUT',
        headers: {
          'X-Shopify-Access-Token': shopifyAccessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(assetData),
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('Shopify asset upload error:', errorText);
        throw new Error(`Failed to upload to Shopify assets: ${uploadResponse.status} ${uploadResponse.statusText}`);
      }

      uploadResult = await uploadResponse.json();
      
      return NextResponse.json({
        success: true,
        key: uploadResult.asset.key,
        url: `https://${shopifyStore}/${uploadResult.asset.key}`,
        size: uploadResult.asset.size,
        type: 'asset'
      });
    }
  } catch (error) {
    console.error('Shopify upload failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload to Shopify' },
      { status: 500 }
    );
  }
} 