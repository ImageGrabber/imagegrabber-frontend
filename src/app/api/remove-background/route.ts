import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Base URL of the application. In production, this should be your domain.
// For local development, it's localhost:3000.
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(req: NextRequest) {
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user's credit balance
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
    
    const requestFormData = await req.formData();
    const file = requestFormData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const removeBgFormData = new FormData();
    removeBgFormData.append('image_file', file);
    removeBgFormData.append('size', 'auto');

    const removeBgResponse = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': process.env.REMOVE_BG_API_KEY!,
      },
      body: removeBgFormData,
    });

    if (!removeBgResponse.ok) {
      const errorText = await removeBgResponse.text();
      console.error('remove.bg API error:', errorText);
      return NextResponse.json({ error: 'Failed to remove background', details: errorText }, { status: removeBgResponse.status });
    }

    const responseBuffer = await removeBgResponse.arrayBuffer();
    const base64Image = Buffer.from(responseBuffer).toString('base64');

    // Deduct credit
    const newCreditTotal = profile.credits - 1;
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ credits: newCreditTotal })
      .eq('id', user.id);

    if (updateError) {
      console.error('Could not update credits:', updateError);
    }

    const headers = new Headers();
    headers.set('X-Credits-Remaining', newCreditTotal.toString());

    return NextResponse.json({
      image: `data:image/png;base64,${base64Image}`,
    }, { headers });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Background removal error:', errorMessage);
    return NextResponse.json({ error: 'Failed to remove background', details: errorMessage }, { status: 500 });
  }
} 