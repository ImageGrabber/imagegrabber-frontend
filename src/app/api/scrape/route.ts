import { NextRequest, NextResponse } from 'next/server';
import { parse, HTMLElement } from 'node-html-parser';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import puppeteer from 'puppeteer';
import type { Page } from 'puppeteer';
import fs from 'fs';

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

// Helper function to get image metadata
async function getImageMetadata(url: string): Promise<{
  size?: number;
  width?: number;
  height?: number;
  type?: string;
  quality?: 'low' | 'medium' | 'high';
}> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    const contentLength = response.headers.get('content-length');
    const contentType = response.headers.get('content-type');
    
    const metadata: any = {};
    
    if (contentLength) {
      metadata.size = parseInt(contentLength);
    }
    
    if (contentType) {
      metadata.type = contentType;
    }

    // Try to get image dimensions by fetching the actual image
    try {
      const imgResponse = await fetch(url);
      if (imgResponse.ok) {
        const buffer = await imgResponse.arrayBuffer();
        const uint8Array = new Uint8Array(buffer);
        
        // Basic image dimension extraction for common formats
        if (contentType?.includes('jpeg') || contentType?.includes('jpg')) {
          const dimensions = getJPEGDimensions(uint8Array);
          if (dimensions) {
            metadata.width = dimensions.width;
            metadata.height = dimensions.height;
          }
        } else if (contentType?.includes('png')) {
          const dimensions = getPNGDimensions(uint8Array);
          if (dimensions) {
            metadata.width = dimensions.width;
            metadata.height = dimensions.height;
          }
        }

        // Determine quality based on size and dimensions
        if (metadata.width && metadata.height && metadata.size) {
          const pixels = metadata.width * metadata.height;
          const bytesPerPixel = metadata.size / pixels;
          
          if (bytesPerPixel > 3 || (metadata.width > 1920 && metadata.height > 1080)) {
            metadata.quality = 'high';
          } else if (bytesPerPixel > 1 || (metadata.width > 800 && metadata.height > 600)) {
            metadata.quality = 'medium';
          } else {
            metadata.quality = 'low';
          }
        }
      }
    } catch (error) {
      // If we can't get dimensions, that's okay - we'll still have basic metadata
      console.log('Could not extract image dimensions for:', url);
    }
    
    return metadata;
  } catch (error) {
    console.error('Failed to get image metadata for:', url);
    return {};
  }
}

// Helper function to extract JPEG dimensions
function getJPEGDimensions(uint8Array: Uint8Array): { width: number; height: number } | null {
  try {
    let offset = 2;
    while (offset < uint8Array.length) {
      if (uint8Array[offset] === 0xFF) {
        const marker = uint8Array[offset + 1];
        if (marker >= 0xC0 && marker <= 0xC3) {
          const height = (uint8Array[offset + 5] << 8) | uint8Array[offset + 6];
          const width = (uint8Array[offset + 7] << 8) | uint8Array[offset + 8];
          return { width, height };
        }
        offset += 2 + ((uint8Array[offset + 2] << 8) | uint8Array[offset + 3]);
      } else {
        break;
      }
    }
  } catch (error) {
    console.error('Error parsing JPEG dimensions');
  }
  return null;
}

// Helper function to extract PNG dimensions
function getPNGDimensions(uint8Array: Uint8Array): { width: number; height: number } | null {
  try {
    if (uint8Array.length > 24 && 
        uint8Array[0] === 0x89 && uint8Array[1] === 0x50 && 
        uint8Array[2] === 0x4E && uint8Array[3] === 0x47) {
      const width = (uint8Array[16] << 24) | (uint8Array[17] << 16) | (uint8Array[18] << 8) | uint8Array[19];
      const height = (uint8Array[20] << 24) | (uint8Array[21] << 16) | (uint8Array[22] << 8) | uint8Array[23];
      return { width, height };
    }
  } catch (error) {
    console.error('Error parsing PNG dimensions');
  }
  return null;
}

// Helper function to normalize URL for deduplication
function normalizeUrl(urlStr: string): string {
  try {
    const url = new URL(urlStr);
    // Remove common parameter variations that don't change the image content
    const paramsToRemove = ['t', 'v', 'cache', 'timestamp', '_', 'cb', 'bust'];
    paramsToRemove.forEach(param => url.searchParams.delete(param));
    
    // Normalize common size parameters to detect duplicates
    const sizeParams = ['w', 'width', 'h', 'height', 's', 'size', 'resize'];
    let hasKnownSizeParams = false;
    sizeParams.forEach(param => {
      if (url.searchParams.has(param)) {
        hasKnownSizeParams = true;
      }
    });
    
    // Create a base URL without size parameters for deduplication
    const baseUrl = url.origin + url.pathname;
    return hasKnownSizeParams ? baseUrl : url.toString();
  } catch {
    return urlStr;
  }
}

// Helper function to determine if URL is likely an image
function isImageUrl(url: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.tiff', '.ico'];
  const lowercaseUrl = url.toLowerCase();
  return imageExtensions.some(ext => lowercaseUrl.includes(ext));
}

// Helper function to generate image content hash for better deduplication
function getImageContentHash(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const filename = pathParts[pathParts.length - 1];
    
    // Extract meaningful parts of the filename/path
    const baseName = filename.split('.')[0];
    const extension = filename.split('.').pop();
    
    // Create hash based on meaningful URL parts, ignoring size variations
    const hashBase = urlObj.origin + 
      pathParts.slice(0, -1).join('/') + '/' + 
      baseName.replace(/[-_]\d+x?\d*$/, '') + // Remove size suffixes like -300x300, _150, etc.
      '.' + extension;
      
    return hashBase;
  } catch {
    return url;
  }
}

// Helper for Puppeteer: collect images from keen slider
async function collectKeenSliderImages(page: Page): Promise<string[]> {
  return await page.evaluate(() => {
    const slides = Array.from(document.querySelectorAll('.keen-slider__slide'));
    const urls = [];
    for (const slide of slides) {
      const style = slide.getAttribute('style') || '';
      const bgMatch = style.match(/url\(["']?(.*?)["']?\)/);
      if (bgMatch && bgMatch[1]) {
        urls.push(bgMatch[1].startsWith('//') ? 'https:' + bgMatch[1] : bgMatch[1]);
      }
      const img = slide.querySelector('img');
      if (img && img.src) {
        urls.push(img.src.startsWith('//') ? 'https:' + img.src : img.src);
      }
    }
    return urls;
  });
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
      return NextResponse.json({ error: 'You must be logged in to scrape images.' }, { status: 401 });
    }

    const user = session.user;
    
    if (!user) {
      console.log('No user in session');
      return NextResponse.json({ error: 'You must be logged in to scrape images.' }, { status: 401 });
    }

    console.log('User authenticated:', user.id);

    // Check user's credit balance and daily extractions
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

    // Simplified credit check - just use the credits column
    if (profile.credits <= 0) {
      return NextResponse.json({ error: 'You are out of credits.' }, { status: 402 });
    }

    const { url, puppeteer: usePuppeteer } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
    }

    if (usePuppeteer) {
      console.log('Puppeteer: Starting extraction block');
      console.log('Starting Puppeteer scrape for URL:', url);
      try {
        // Validate URL before navigation
        if (!url || typeof url !== 'string' || !/^https?:\/\//.test(url)) {
          throw new Error('Invalid URL for Puppeteer navigation: ' + url);
        }
        const browser = await puppeteer.launch({ headless: false, slowMo: 100 });
        const page = await browser.newPage();

        // Set a real user-agent
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
        // Set extra HTTP headers
        await page.setExtraHTTPHeaders({
          'accept-language': 'en-US,en;q=0.9'
        });

        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        // Dismiss cookie consent popup if present
        try {
          await page.waitForSelector('button[aria-label="I AGREE"], button, .cc-compliance button', { timeout: 5000 });
          await page.evaluate(() => {
            const btn = document.querySelector('button[aria-label="I AGREE"]')
              || Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim().toUpperCase() === 'I AGREE')
              || document.querySelector('.cc-compliance button');
            if (btn) (btn as HTMLButtonElement).click();
          });
          await page.evaluate(() => new Promise(res => setTimeout(res, 1000)));
        } catch (e) {
          // If not found, continue
        }

        // Log all class names in the DOM for debugging (before any waitForSelector)
        const allClasses = await page.evaluate(() => Array.from(document.querySelectorAll('*')).map(e => e.className));
        let classLog = '--- ALL CLASS NAMES IN DOM START ---\n';
        allClasses.forEach(cls => {
          if (cls && typeof cls === 'string' && cls.trim().length > 0) {
            cls.split(' ').forEach(singleClass => {
              if (singleClass.trim().length > 0) {
                classLog += singleClass.trim() + '\n';
              }
            });
          }
        });
        classLog += '--- ALL CLASS NAMES IN DOM END ---\n';
        fs.writeFileSync('puppeteer-classnames.txt', classLog);

        // Scroll halfway down the page to trigger lazy loading
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
        await page.evaluate(() => new Promise(res => setTimeout(res, 1000)));

        // Wait for the slider slides (use .keen-slider-slide)
        await page.waitForSelector('.keen-slider-slide', { timeout: 30000 });

        // Take a screenshot for debugging
        await page.screenshot({ path: 'puppeteer-debug.png', fullPage: true });

        // Try waiting for any product image to appear
        try {
          await page.waitForSelector("img[src*='jeandousset.com/cdn/shop/files/']", { timeout: 30000 });
        } catch (e) {
          console.log('No product images found with generic selector.');
        }

        // Now extract images from .keen-slider-slide
        const imageUrls = new Set();
        let urls = await page.evaluate(() => {
          const slides = Array.from(document.querySelectorAll('.keen-slider-slide'));
          const urls = [];
          for (const slide of slides) {
            const style = slide.getAttribute('style') || '';
            const bgMatch = style.match(/url\(["']?(.*?)["']?\)/);
            if (bgMatch && bgMatch[1]) {
              urls.push(bgMatch[1].startsWith('//') ? 'https:' + bgMatch[1] : bgMatch[1]);
            }
            const img = slide.querySelector('img');
            if (img && img.src) {
              urls.push(img.src.startsWith('//') ? 'https:' + img.src : img.src);
            }
          }
          return urls;
        });
        urls.forEach(url => imageUrls.add(url));
        // Try clicking next arrow as before
        let canClick = true;
        let lastCount = 0;
        while (canClick) {
          try {
            await page.click('.keen-arrow.next, .keen-arrow.next-arrow, .keen-arrow-right');
            await page.evaluate(() => new Promise(res => setTimeout(res, 500)));
            urls = await page.evaluate(() => {
              const slides = Array.from(document.querySelectorAll('.keen-slider-slide'));
              const urls = [];
              for (const slide of slides) {
                const style = slide.getAttribute('style') || '';
                const bgMatch = style.match(/url\(["']?(.*?)["']?\)/);
                if (bgMatch && bgMatch[1]) {
                  urls.push(bgMatch[1].startsWith('//') ? 'https:' + bgMatch[1] : bgMatch[1]);
                }
                const img = slide.querySelector('img');
                if (img && img.src) {
                  urls.push(img.src.startsWith('//') ? 'https:' + img.src : img.src);
                }
              }
              return urls;
            });
            urls.forEach(url => imageUrls.add(url));
            if (imageUrls.size === lastCount) {
              canClick = false;
            } else {
              lastCount = imageUrls.size;
            }
          } catch (e) {
            canClick = false;
          }
        }
        await browser.close();
        const images = Array.from(imageUrls) as string[];
        const formattedImages = images.map((url: string) => ({
          url,
          filename: url.split('/').pop()?.split('?')[0] || 'image.jpg'
        }));
        return NextResponse.json({ images: formattedImages });
      } catch (error) {
        console.error('Puppeteer scraping failed:', error);
        return NextResponse.json({ error: 'Failed to scrape images with Puppeteer.' }, { status: 500 });
      }
    }

    console.log('Starting scrape for URL:', url);

    try {
      const response = await fetch(url);
      console.log('Fetch response status:', response.status);
      
      if (!response.ok) {
        console.error(`HTTP error! status: ${response.status} for URL: ${url}`);
        return NextResponse.json({ error: `HTTP error! status: ${response.status}` }, { status: response.status });
      }
      
      const html = await response.text();
      const root = parse(html);
      const baseUrl = new URL(url);
      const imageHashes = new Map<string, { url: string; filename: string; size?: number; width?: number; height?: number; type?: string; quality?: 'low' | 'medium' | 'high' }>();
      
      const processImageUrl = (src: string) => {
        if (!src || src.startsWith('data:') || src.length < 4) return;
        
        try {
          const absoluteUrl = new URL(src, baseUrl.href).toString();
          const contentHash = getImageContentHash(absoluteUrl);
          
          // If we have a better quality image already, skip this one
          if (imageHashes.has(contentHash)) {
            const existing = imageHashes.get(contentHash)!;
            if (existing.width && existing.width > 250) return; // Simple heuristic for "good enough"
          }
          
          const filename = absoluteUrl.split('/').pop()?.split('?')[0] || 'image.jpg';
          imageHashes.set(contentHash, { url: absoluteUrl, filename });

        } catch (error) {
          console.error('Failed to process image URL:', src, error instanceof Error ? error.message : 'Unknown error');
        }
      };
      
      // --- Start Scraping ---
      
      // 0. All variant images in .image-wrap.keen-slider-slide img (including hidden)
      root.querySelectorAll('.image-wrap.keen-slider-slide img').forEach(img => {
        processImageUrl(img.getAttribute('src') || '');
        processImageUrl(img.getAttribute('data-src') || '');
        // Parse srcset and data-srcset for all URLs
        const srcset = img.getAttribute('srcset') || img.getAttribute('data-srcset') || '';
        if (srcset) {
          srcset.split(',').forEach(entry => {
            const url = entry.trim().split(' ')[0];
            processImageUrl(url);
          });
        }
      });

      // 1. Regular img tags
      root.querySelectorAll('img').forEach(img => {
        processImageUrl(img.getAttribute('src') || '');
        processImageUrl(img.getAttribute('data-src') || '');
        // Add other lazy-load attributes if needed
      });

      // 2. Picture tags
      root.querySelectorAll('picture source').forEach(source => {
        processImageUrl(source.getAttribute('srcset') || '');
      });

      // 3. Style attributes
      root.querySelectorAll('[style*="background-image"]').forEach(el => {
        const style = el.getAttribute('style') || '';
        const match = style.match(/url\(['"]?(.*?)['"]?\)/);
        if (match && match[1]) {
          processImageUrl(match[1]);
        }
      });

      // 3b. Keen-slider slides with background or background-image
      root.querySelectorAll('.keen-slider__slide').forEach(el => {
        const style = el.getAttribute('style') || '';
        // Match both background and background-image
        const match = style.match(/background(?:-image)?:\s*url\(['"]?(.*?)['"]?\)/);
        if (match && match[1]) {
          processImageUrl(match[1]);
        }
      });

      // 4. Embedded JSON in <script type="application/ld+json">
      root.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
        try {
          const data = JSON.parse(script.text);
          if (data && data.image) {
            if (Array.isArray(data.image)) {
              (data.image as any[]).forEach((url: any) => processImageUrl(url));
            } else {
              processImageUrl(data.image);
            }
          }
          // Shopify sometimes has variants with images
          if (data && data.hasOwnProperty('offers') && Array.isArray(data.offers)) {
            (data.offers as any[]).forEach((offer: any) => {
              if (offer.image) processImageUrl(offer.image);
            });
          }
        } catch {}
      });

      const finalImages = Array.from(imageHashes.values());
      console.log('Found', finalImages.length, 'images');
      
      let newCreditTotal = profile.credits;

      // Deduct credit only if scraping was successful and returned images
      if (finalImages.length > 0) {
        console.log('Deducting credit for successful scrape');
        newCreditTotal = profile.credits - 1;
        
        // Only update database if user has a real profile (not using fallback defaults)
        if (hasRealProfile && supabaseAdmin) {
          const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({ credits: newCreditTotal })
            .eq('id', user.id);
          if (updateError) {
            console.error('Could not update credits in database:', updateError);
            // Don't fail the request if we can't update credits, but log it as an error
          } else {
            console.log('Successfully updated credits to', newCreditTotal);
          }
        } else {
          console.log('User has fallback profile or no admin client, not updating database');
        }
      } else {
        console.log('No images found, not deducting credit');
      }
      
      const headers = new Headers();
      headers.set('X-Credits-Remaining', newCreditTotal.toString());

      // Record transaction in database if images were found
      if (finalImages.length > 0) {
        try {
          const client = supabaseAdmin || supabase;
          await client.from('transactions').insert({
            user_id: user.id,
            type: 'deduction',
            amount: -1,
            description: `Image extraction from ${new URL(url).hostname}`,
            url: url,
            images_found: finalImages.length
          });
          console.log('Transaction recorded in database');
        } catch (error) {
          console.error('Failed to record transaction:', error);
          // Don't fail the request if we can't record the transaction
        }
      }

      console.log('Returning response with', finalImages.length, 'images');
      return NextResponse.json({ images: finalImages }, { headers });

    } catch (error: any) {
      console.error('Scraping failed:', error);
      return NextResponse.json({ error: 'Failed to scrape images from the provided URL.' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Authentication failed:', error);
    return NextResponse.json({ error: 'Authentication failed.' }, { status: 401 });
  }
} 