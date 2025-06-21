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
      return NextResponse.json({ error: 'You must be logged in to view credits.' }, { status: 401 });
    }

    const user = session.user;
    
    if (!user) {
      console.log('No user in session');
      return NextResponse.json({ error: 'You must be logged in to view credits.' }, { status: 401 });
    }

    // Check user's credit balance using admin client (if available)
    let profile;
    let profileError;
    
    if (supabaseAdmin) {
      const result = await supabaseAdmin
        .from('profiles')
        .select('credits')
        .eq('id', user.id)
        .single();
      profile = result.data;
      profileError = result.error;
    } else {
      // Fallback to regular client if no admin client
      const result = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', user.id)
        .single();
      profile = result.data;
      profileError = result.error;
    }

    // If profile doesn't exist, try to create one
    if (profileError && profileError.code === 'PGRST116') {
      console.log('Profile not found, attempting to create profile');
      
      if (supabaseAdmin) {
        const { data: newProfile, error: createError } = await supabaseAdmin
          .from('profiles')
          .insert({
            id: user.id,
            credits: 10
          })
          .select('credits')
          .single();
        
        if (createError) {
          console.error('Failed to create profile:', createError);
          return NextResponse.json({ credits: 10 });
        } else {
          profile = newProfile;
          console.log('Profile created successfully');
        }
      } else {
        console.log('No admin client available, returning default credits');
        return NextResponse.json({ credits: 10 });
      }
    } else if (profileError || !profile) {
      console.error('Profile error:', profileError);
      return NextResponse.json({ credits: 10 }); // Return default credits on error
    }

    console.log('User has', profile.credits, 'credits');
    return NextResponse.json({ credits: profile.credits });

  } catch (error) {
    console.error('Error fetching credits:', error);
    return NextResponse.json({ credits: 10 }, { status: 200 }); // Return default credits on error
  }
} 