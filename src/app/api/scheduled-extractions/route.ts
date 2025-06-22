import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });

  try {
    const { data, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.error('--- SUPABASE AUTH ERROR ---');
      console.error(authError.message);
      console.error('--------------------------');
    }
    
    const user = data?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Could not get user from session.' }, { status: 401 });
    }

    const { data: schedules, error: dbError } = await supabase
      .from('scheduled_extractions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (dbError) {
      console.error('Error fetching schedules:', dbError);
      return NextResponse.json({ error: 'Failed to fetch schedules' }, { status: 500 });
    }

    return NextResponse.json(schedules);

  } catch (error) {
    console.error('Error in GET /api/scheduled-extractions:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });

  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { url, frequency } = await req.json();

    if (!url || !frequency) {
      return NextResponse.json({ error: 'URL and frequency are required' }, { status: 400 });
    }
    
    if (frequency !== 'daily' && frequency !== 'weekly') {
      return NextResponse.json({ error: 'Invalid frequency' }, { status: 400 });
    }

    const now = new Date();
    let nextRunAt = new Date(now);

    if (frequency === 'daily') {
      nextRunAt.setDate(now.getDate() + 1);
    } else { // weekly
      nextRunAt.setDate(now.getDate() + 7);
    }
    // For simplicity, we run it at the same time it was created.
    // A more robust solution might run all daily jobs at a specific time, like midnight.

    const { data, error } = await supabase
      .from('scheduled_extractions')
      .insert({
        user_id: user.id,
        url,
        frequency,
        next_run_at: nextRunAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating schedule:', error);
      if (error.code === '23505') { // unique_violation
        return NextResponse.json({ error: 'A schedule for this URL already exists.' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Failed to create schedule' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/scheduled-extractions:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
} 