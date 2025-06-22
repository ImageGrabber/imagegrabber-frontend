import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Create a service role client for admin operations
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

async function processSitemapJob(jobId: string) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  
  const { data: job, error } = await supabase.from('sitemap_jobs').select('*').eq('id', jobId).single();
  if (error || !job) {
    console.error(`Job ${jobId} not found.`);
    return;
  }

  await supabase.from('sitemap_jobs').update({ status: 'processing' }).eq('id', jobId);

  const allResults: any[] = [];
  const urls = job.discovered_urls as string[];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    // Simulate scraping
    await new Promise(res => setTimeout(res, 1000)); 
    
    // Simulate finding images
    const imageCount = Math.floor(Math.random() * 10); 
    const images = Array.from({ length: imageCount }, (_, i) => ({
      url: `https://picsum.photos/seed/${url}-${i}/400/300`,
      filename: `image-${i}.jpg`
    }));

    allResults.push({ url, status: 'success', imageCount, images });

    await supabase.from('sitemap_jobs').update({
      processed_urls: i + 1,
      results: allResults,
    }).eq('id', jobId);
  }

  await supabase.from('sitemap_jobs').update({ status: 'completed' }).eq('id', jobId);
}

export async function POST(req: NextRequest) {
  const cookieStore = cookies();
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  try {
    // Get user session
    let { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError && !session) {
      console.error('Session error:', sessionError);
      return NextResponse.json({ error: 'Authentication failed.' }, { status: 401 });
    }

    if (!session) {
      console.log('No session found');
      return NextResponse.json({ error: 'You must be logged in to start a sitemap crawl.' }, { status: 401 });
    }

    const user = session.user;
    
    if (!user) {
      console.log('No user in session');
      return NextResponse.json({ error: 'You must be logged in to start a sitemap crawl.' }, { status: 401 });
    }

    console.log('User authenticated:', user.id);

    // Check user's credit balance
    let { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', user.id)
      .single();

    let hasRealProfile = true;

    // If profile doesn't exist, try to create one using admin client to bypass RLS
    if (profileError && profileError.code === 'PGRST116') {
      console.log('Profile not found, attempting to create one');
      
      if (supabaseAdmin) {
        console.log('Using admin client to create profile');
        const { data: newProfile, error: createError } = await supabaseAdmin
          .from('profiles')
          .insert({
            id: user.id,
            credits: 10 // Give new users 10 free credits
          })
          .select('credits')
          .single();

        if (createError) {
          console.error('Failed to create profile with admin client:', createError);
          // Use default credits for users without profiles
          profile = { credits: 10 };
          hasRealProfile = false;
          console.log('Using default credits for user without profile');
        } else {
          profile = newProfile;
          hasRealProfile = true;
          console.log('Profile created successfully with admin client');
        }
      } else {
        console.log('No admin client available, using default credits');
        // Use default credits for users without profiles
        profile = { credits: 10 };
        hasRealProfile = false;
        console.log('Using default credits for user without profile');
      }
    } else if (profileError || !profile) {
      console.error('Profile error:', profileError);
      return NextResponse.json({ error: 'Could not retrieve your profile.' }, { status: 500 });
    }

    console.log('User has', profile.credits, 'credits');

    const { sitemapUrl, urls } = await req.json();

    if (!sitemapUrl || !urls || !Array.isArray(urls)) {
      return NextResponse.json({ error: 'Sitemap URL and URLs array are required' }, { status: 400 });
    }

    // Calculate credit cost: 1 credit per URL in the sitemap
    const creditCost = urls.length;
    console.log(`Sitemap crawl will cost ${creditCost} credits for ${urls.length} URLs`);

    // Check if user has enough credits
    if (profile.credits < creditCost) {
      return NextResponse.json({ 
        error: `Insufficient credits. You have ${profile.credits} credits but need ${creditCost} credits for this sitemap crawl.` 
      }, { status: 402 });
    }

    // Deduct credits immediately
    const newCreditTotal = profile.credits - creditCost;
    
    // Only update database if user has a real profile (not using fallback defaults)
    if (hasRealProfile && supabaseAdmin) {
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ credits: newCreditTotal })
        .eq('id', user.id);
      if (updateError) {
        console.error('Could not update credits in database:', updateError);
        return NextResponse.json({ error: 'Failed to update credits.' }, { status: 500 });
      } else {
        console.log('Successfully updated credits to', newCreditTotal);
      }
    } else {
      console.log('User has fallback profile or no admin client, not updating database');
    }

    // Create the sitemap job
    const { data, error } = await supabase
      .from('sitemap_jobs')
      .insert({
        user_id: user.id,
        sitemap_url: sitemapUrl,
        status: 'pending',
        discovered_urls: urls,
        total_urls: urls.length,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating sitemap job:', error);
      return NextResponse.json({ error: 'Failed to create sitemap job' }, { status: 500 });
    }

    // Record transaction in database
    try {
      const client = supabaseAdmin || supabase;
      await client.from('transactions').insert({
        user_id: user.id,
        type: 'deduction',
        amount: -creditCost,
        description: `Sitemap crawl for ${new URL(sitemapUrl).hostname} (${urls.length} URLs)`,
        url: sitemapUrl,
        images_found: 0 // Will be updated when crawl completes
      });
      console.log('Transaction recorded in database');
    } catch (error) {
      console.error('Failed to record transaction:', error);
      // Don't fail the request if we can't record the transaction
    }

    // In a real app, this would be handled by a separate worker.
    // For this example, we'll process it immediately but not wait for it.
    processSitemapJob(data.id);
  
    const headers = new Headers();
    headers.set('X-Credits-Remaining', newCreditTotal.toString());
    
    return NextResponse.json({ jobId: data.id }, { headers });

  } catch (error) {
    console.error('Error in sitemap start:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
} 