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
      return NextResponse.json({ error: 'You must be logged in to view transactions.' }, { status: 401 });
    }

    const user = session.user;
    
    if (!user) {
      console.log('No user in session');
      return NextResponse.json({ error: 'You must be logged in to view transactions.' }, { status: 401 });
    }

    // Use admin client for fetching transactions to ensure it works
    const client = supabaseAdmin || supabase;
    
    // Get transactions from database
    const { data: transactions, error } = await client
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching transactions:', error);
      return NextResponse.json({ error: 'Failed to fetch transactions.' }, { status: 500 });
    }

    console.log('Fetched', transactions.length, 'transactions for user', user.id);
    return NextResponse.json({ transactions: transactions || [] });

  } catch (error) {
    console.error('Error in transactions API:', error);
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
      return NextResponse.json({ error: 'You must be logged in to create transactions.' }, { status: 401 });
    }

    const user = session.user;
    
    if (!user) {
      console.log('No user in session');
      return NextResponse.json({ error: 'You must be logged in to create transactions.' }, { status: 401 });
    }

    const body = await request.json();
    const { type, amount, description, url, images_found } = body;

    if (!type || !amount || !description) {
      return NextResponse.json({ error: 'Type, amount, and description are required.' }, { status: 400 });
    }

    if (!['deduction', 'purchase'].includes(type)) {
      return NextResponse.json({ error: 'Type must be either "deduction" or "purchase".' }, { status: 400 });
    }

    // Use admin client for inserting transactions to ensure it works
    const client = supabaseAdmin || supabase;
    
    // Insert new transaction
    const { data: inserted, error } = await client
      .from('transactions')
      .insert({
        user_id: user.id,
        type,
        amount,
        description,
        url,
        images_found
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting transaction:', error);
      return NextResponse.json({ error: 'Failed to create transaction.' }, { status: 500 });
    }

    console.log('Created transaction for user', user.id, ':', inserted);
    return NextResponse.json({ transaction: inserted });

  } catch (error) {
    console.error('Error in transactions POST API:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
} 