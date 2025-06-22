import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import sharp from 'sharp';

type OutputFormat = 'original' | 'jpeg' | 'png' | 'webp' | 'avif';

export async function POST(req: NextRequest) {
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const quality = formData.get('quality') as string | null;
    const width = formData.get('width') as string | null;
    const height = formData.get('height') as string | null;
    const format = (formData.get('format') as OutputFormat | null) || 'original';
    const isPreview = formData.get('preview') === 'true';
    
    // Enhancement parameters
    const brightness = formData.get('brightness') as string | null;
    const contrast = formData.get('contrast') as string | null;
    const saturation = formData.get('saturation') as string | null;
    const gamma = formData.get('gamma') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    
    // Only check credits for actual optimization, not preview
    if (!isPreview) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        return NextResponse.json({ error: 'Could not retrieve your profile.' }, { status: 500 });
      }

      if (profile.credits <= 0) {
        return NextResponse.json({ error: 'You are out of credits.' }, { status: 402 });
      }
    }
    
    const buffer = Buffer.from(await file.arrayBuffer());
    let image = sharp(buffer);

    // Apply image enhancements
    if (brightness && brightness !== '100') {
      const brightnessValue = parseFloat(brightness) / 100;
      image = image.modulate({ brightness: brightnessValue });
    }

    if (contrast && contrast !== '100') {
      const contrastValue = parseFloat(contrast) / 100;
      image = image.linear(contrastValue, -(contrastValue * 0.5) + 0.5);
    }

    if (saturation && saturation !== '100') {
      const saturationValue = parseFloat(saturation) / 100;
      image = image.modulate({ saturation: saturationValue });
    }

    if (gamma && gamma !== '100') {
      const gammaValue = parseFloat(gamma) / 100;
      image = image.gamma(gammaValue);
    }

    // Resize
    const resizeOptions: { width?: number; height?: number } = {};
    if (width && parseInt(width, 10) > 0) {
      resizeOptions.width = parseInt(width, 10);
    }
    if (height && parseInt(height, 10) > 0) {
      resizeOptions.height = parseInt(height, 10);
    }
    if (Object.keys(resizeOptions).length > 0) {
      image = image.resize(resizeOptions);
    }

    // Compress and convert format
    const imageQuality = quality ? parseInt(quality, 10) : 80;
    
    let optimizedBuffer;
    let mimeType;

    const outputFormat = format === 'original' 
      ? file.name.split('.').pop()?.toLowerCase() 
      : format;

    // Map UI quality (1-100) to PNG compression level (0-9).
    // Higher UI quality means less compression (faster) and larger file.
    // Lower UI quality means more compression (slower) and smaller file.
    const pngCompressionLevel = Math.round(((100 - imageQuality) / 100) * 9);

    switch (outputFormat) {
        case 'jpeg':
        case 'jpg':
            optimizedBuffer = await image.jpeg({ quality: imageQuality }).toBuffer();
            mimeType = 'image/jpeg';
            break;
        case 'png':
            optimizedBuffer = await image.png({ compressionLevel: pngCompressionLevel }).toBuffer();
            mimeType = 'image/png';
            break;
        case 'webp':
            optimizedBuffer = await image.webp({ quality: imageQuality }).toBuffer();
            mimeType = 'image/webp';
            break;
        case 'avif':
            optimizedBuffer = await image.avif({ quality: imageQuality }).toBuffer();
            mimeType = 'image/avif';
            break;
        default:
             // For original format, try to apply quality based on the detected format
             const originalFormat = file.name.split('.').pop()?.toLowerCase();
             switch (originalFormat) {
                 case 'jpeg':
                 case 'jpg':
                     optimizedBuffer = await image.jpeg({ quality: imageQuality }).toBuffer();
                     mimeType = 'image/jpeg';
                     break;
                 case 'png':
                     optimizedBuffer = await image.png({ compressionLevel: pngCompressionLevel }).toBuffer();
                     mimeType = 'image/png';
                     break;
                 case 'webp':
                     optimizedBuffer = await image.webp({ quality: imageQuality }).toBuffer();
                     mimeType = 'image/webp';
                     break;
                 default:
                     // Fallback to original format if it's something else (e.g. gif)
                     optimizedBuffer = await image.toBuffer();
                     mimeType = file.type;
                     break;
             }
            break;
    }

    // Only deduct credit for actual optimization, not preview
    let newCreditTotal = null;
    if (!isPreview) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', user.id)
        .single();

      if (profile) {
        newCreditTotal = profile.credits - 1;
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ credits: newCreditTotal })
          .eq('id', user.id);

        if (updateError) {
          console.error('Could not update credits:', updateError);
        }
      }
    }

    const base64Image = optimizedBuffer.toString('base64');

    const headers = new Headers();
    if (newCreditTotal !== null) {
      headers.set('X-Credits-Remaining', newCreditTotal.toString());
    }

    return NextResponse.json({
      image: `data:${mimeType};base64,${base64Image}`,
      size: optimizedBuffer.length,
    }, { headers });

  } catch (error) {
    console.error('Image optimization error:', error);
    return NextResponse.json({ error: 'Failed to optimize image' }, { status: 500 });
  }
} 