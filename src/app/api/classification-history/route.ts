import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  try {
    // Get user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch classification history for the user
    const { data, error } = await supabase
      .from('classification_history')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching classification history:', error);
      return NextResponse.json({ error: 'Failed to fetch classification history' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Classification history fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  try {
    // Get user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { url, title, description, contentType, confidence, images, method } = body;

    // Validate required fields
    if (!url || !title || !description || !contentType || confidence === undefined || !method) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Insert new classification record
    const { data, error } = await supabase
      .from('classification_history')
      .insert({
        user_id: session.user.id,
        url,
        title,
        description,
        content_type: contentType,
        confidence,
        images: images || [],
        method
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating classification record:', error);
      return NextResponse.json({ error: 'Failed to save classification' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Classification history creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  try {
    // Get user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      // Delete specific classification record
      const { error } = await supabase
        .from('classification_history')
        .delete()
        .eq('id', id)
        .eq('user_id', session.user.id);

      if (error) {
        console.error('Error deleting classification record:', error);
        return NextResponse.json({ error: 'Failed to delete classification' }, { status: 500 });
      }
    } else {
      // Delete all classification records for the user
      const { error } = await supabase
        .from('classification_history')
        .delete()
        .eq('user_id', session.user.id);

      if (error) {
        console.error('Error clearing classification history:', error);
        return NextResponse.json({ error: 'Failed to clear classification history' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Classification history deletion error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 