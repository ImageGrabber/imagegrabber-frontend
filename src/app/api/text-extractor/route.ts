import { NextRequest, NextResponse } from 'next/server';
import { parse, HTMLElement } from 'node-html-parser';
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

export async function POST(request: NextRequest) {
  const { url } = await request.json();

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    // Get user session
    const cookieStore = await cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile and check credits
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (profile.credits <= 0) {
      return NextResponse.json({ error: 'Insufficient credits' }, { status: 402 });
    }

    // Fetch the webpage
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ImageGrabber/1.0)'
      }
    });

    if (!response.ok) {
      return NextResponse.json({ error: `HTTP error! status: ${response.status}` }, { status: response.status });
    }

    const html = await response.text();
    const root = parse(html);

    // Extract title
    const title = root.querySelector('title')?.text?.trim() || '';

    // Extract meta description
    const metaDescription = root.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() || '';

    // Extract Open Graph tags
    const openGraph: any = {};
    const ogTags = root.querySelectorAll('meta[property^="og:"]');
    ogTags.forEach(tag => {
      const property = tag.getAttribute('property')?.replace('og:', '');
      const content = tag.getAttribute('content');
      if (property && content) {
        openGraph[property] = content;
      }
    });

    // Extract headings
    const headings = {
      h1: root.querySelectorAll('h1').map(h => h.text?.trim()).filter(Boolean),
      h2: root.querySelectorAll('h2').map(h => h.text?.trim()).filter(Boolean),
      h3: root.querySelectorAll('h3').map(h => h.text?.trim()).filter(Boolean),
      h4: root.querySelectorAll('h4').map(h => h.text?.trim()).filter(Boolean),
      h5: root.querySelectorAll('h5').map(h => h.text?.trim()).filter(Boolean),
      h6: root.querySelectorAll('h6').map(h => h.text?.trim()).filter(Boolean),
    };

    // Extract keywords
    const keywordsMeta = root.querySelector('meta[name="keywords"]')?.getAttribute('content');
    const keywords = keywordsMeta ? keywordsMeta.split(',').map(k => k.trim()).filter(Boolean) : [];

    // Extract text content - use a more robust approach
    let textContent = '';
    
    try {
      // First, remove all script, style, and other non-content elements
      root.querySelectorAll('script, style, noscript, iframe, img, svg, canvas, audio, video, meta, link, head').forEach(el => el.remove());
      
      // Get the body element
      const body = root.querySelector('body');
      console.log('Body element found:', !!body);
      
      if (body) {
        // Get all text content from the body
        textContent = body.text || '';
        console.log('Initial text content length:', textContent.length);
      } else {
        // If no body, get all text from the document
        textContent = root.text || '';
        console.log('Using root text, length:', textContent.length);
      }
      
      // Clean up the text
      textContent = textContent
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s.,!?;:()\-'"]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      console.log('After cleanup, text length:', textContent.length);
      
      // If we still don't have much content, try extracting from specific elements
      if (!textContent || textContent.length < 50) {
        console.log('Trying element-specific extraction...');
        const contentElements = root.querySelectorAll('p, div, span, li, td, th, h1, h2, h3, h4, h5, h6, a, strong, em, b, i, article, section, main, aside, header, footer, nav, blockquote, pre, code, label, button');
        console.log('Found content elements:', contentElements.length);
        
        const texts: string[] = [];
        
        contentElements.forEach(el => {
          const text = el.text?.trim();
          if (text && text.length > 5) {
            texts.push(text);
          }
        });
        
        textContent = texts.join('\n\n');
        console.log('Element extraction result length:', textContent.length);
      }
      
    } catch (error) {
      console.error('Error extracting text content:', error);
      // Fallback: get all text from the document
      textContent = root.text || '';
    }
    
    console.log('Final text content length:', textContent.length);
    console.log('Text content preview:', textContent.substring(0, 200));

    // Calculate word and character counts
    const wordCount = textContent.split(/\s+/).filter(word => word.length > 0).length;
    const characterCount = textContent.length;

    // Deduct credit
    const newCreditTotal = profile.credits - 1;
    
    if (supabaseAdmin) {
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ credits: newCreditTotal })
        .eq('id', user.id);
      
      if (updateError) {
        console.error('Could not update credits in database:', updateError);
      }
    }

    // Record transaction
    try {
      const client = supabaseAdmin || supabase;
      await client.from('transactions').insert({
        user_id: user.id,
        type: 'deduction',
        amount: -1,
        description: `Text extraction from ${new URL(url).hostname}`,
        url: url,
        images_found: 0
      });
    } catch (error) {
      console.error('Failed to record transaction:', error);
    }

    const extractedData = {
      url,
      title,
      metaDescription,
      openGraph,
      headings,
      keywords,
      textContent,
      wordCount,
      characterCount,
      extractedAt: new Date().toISOString()
    };

    const headers = new Headers();
    headers.set('X-Credits-Remaining', newCreditTotal.toString());

    return NextResponse.json(extractedData, { headers });

  } catch (error) {
    console.error('Error in text extraction:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
} 