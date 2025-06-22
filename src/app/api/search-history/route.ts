import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Create a service role client for admin operations (if available)
const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY ? createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
) : null;

export async function GET(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });

  try {
    // Try to get session from cookies first
    let { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    // If no session from cookies, try Authorization header
    if (!session && request.headers.get('authorization')) {
      const token = request.headers.get('authorization')?.replace('Bearer ', '');
      if (token) {
        const { data, error } = await supabase.auth.getUser(token);
        if (data.user && !error) {
          session = { user: data.user, access_token: token } as any;
        }
      }
    }
    
    if (sessionError && !session) {
      console.error('Session error:', sessionError);
      return NextResponse.json({ error: 'Authentication failed.' }, { status: 401 });
    }

    if (!session) {
      console.log('No session found');
      return NextResponse.json({ error: 'You must be logged in to view search history.' }, { status: 401 });
    }

    const user = session.user;
    
    if (!user) {
      console.log('No user in session');
      return NextResponse.json({ error: 'You must be logged in to view search history.' }, { status: 401 });
    }

    // Use admin client for fetching search history to ensure it works
    const client = supabaseAdmin || supabase;
    
    // Get search history from database
    const { data: history, error } = await client
      .from('search_history')
      .select('id, url, title, image_count, results, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching search history:', error);
      return NextResponse.json({ error: 'Failed to fetch search history' }, { status: 500 });
    }

    return NextResponse.json(history);

  } catch (error) {
    console.error('Error in GET /api/search-history:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });

  try {
    // Try to get session from cookies first
    let { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    // If no session from cookies, try Authorization header
    if (!session && request.headers.get('authorization')) {
      const token = request.headers.get('authorization')?.replace('Bearer ', '');
      if (token) {
        const { data, error } = await supabase.auth.getUser(token);
        if (data.user && !error) {
          session = { user: data.user, access_token: token } as any;
        }
      }
    }
    
    if (sessionError && !session) {
      console.error('Session error:', sessionError);
      return NextResponse.json({ error: 'Authentication failed.' }, { status: 401 });
    }

    if (!session) {
      console.log('No session found');
      return NextResponse.json({ error: 'You must be logged in to add search history.' }, { status: 401 });
    }

    const user = session.user;
    
    if (!user) {
      console.log('No user in session');
      return NextResponse.json({ error: 'You must be logged in to add search history.' }, { status: 401 });
    }

    const body = await request.json();
    const { url, title, imageCount } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL is required.' }, { status: 400 });
    }

    // Check if URL already exists for this user
    const { data: existing } = await supabase
      .from('search_history')
      .select('id')
      .eq('user_id', user.id)
      .eq('url', url)
      .single();

    if (existing) {
      // Update existing entry using admin client to bypass RLS
      const client = supabaseAdmin || supabase;
      const { data: updated, error } = await client
        .from('search_history')
        .update({
          title: title || new URL(url).hostname,
          image_count: imageCount || 0,
          created_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating search history:', error);
        return NextResponse.json({ error: 'Failed to update search history.' }, { status: 500 });
      }

      return NextResponse.json({ history: updated });
    } else {
      // Insert new entry using admin client to bypass RLS
      const client = supabaseAdmin || supabase;
      console.log('Inserting search history with client:', supabaseAdmin ? 'admin' : 'regular');
      console.log('User ID:', user.id);
      console.log('URL:', url);
      
      const { data: inserted, error } = await client
        .from('search_history')
        .insert({
          user_id: user.id,
          url,
          title: title || new URL(url).hostname,
          image_count: imageCount || 0
        })
        .select()
        .single();

      if (error) {
        console.error('Error inserting search history:', error);
        return NextResponse.json({ error: 'Failed to add search history.' }, { status: 500 });
      }

      console.log('Successfully inserted search history:', inserted);
      return NextResponse.json({ history: inserted });
    }

  } catch (error) {
    console.error('Error in search history POST API:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });

  try {
    // Try to get session from cookies first
    let { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    // If no session from cookies, try Authorization header
    if (!session && request.headers.get('authorization')) {
      const token = request.headers.get('authorization')?.replace('Bearer ', '');
      if (token) {
        const { data, error } = await supabase.auth.getUser(token);
        if (data.user && !error) {
          session = { user: data.user, access_token: token } as any;
        }
      }
    }
    
    if (sessionError && !session) {
      console.error('Session error:', sessionError);
      return NextResponse.json({ error: 'Authentication failed.' }, { status: 401 });
    }

    if (!session) {
      console.log('No session found');
      return NextResponse.json({ error: 'You must be logged in to delete search history.' }, { status: 401 });
    }

    const user = session.user;
    
    if (!user) {
      console.log('No user in session');
      return NextResponse.json({ error: 'You must be logged in to delete search history.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const historyId = searchParams.get('id');

    if (historyId) {
      // Delete specific item using admin client to bypass RLS
      const client = supabaseAdmin || supabase;
      const { error } = await client
        .from('search_history')
        .delete()
        .eq('id', historyId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting search history item:', error);
        return NextResponse.json({ error: 'Failed to delete search history item.' }, { status: 500 });
      }

      return NextResponse.json({ message: 'Search history item deleted successfully.' });
    } else {
      // Delete all history for user using admin client to bypass RLS
      const client = supabaseAdmin || supabase;
      const { error } = await client
        .from('search_history')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        console.error('Error clearing search history:', error);
        return NextResponse.json({ error: 'Failed to clear search history.' }, { status: 500 });
      }

      return NextResponse.json({ message: 'Search history cleared successfully.' });
    }

  } catch (error) {
    console.error('Error in search history DELETE API:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
} 