import { NextRequest, NextResponse } from 'next/server';
import { parse, HTMLElement } from 'node-html-parser';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return NextResponse.json({ error: `HTTP error! status: ${response.status}` }, { status: response.status });
    }
    
    const html = await response.text();
    const root = parse(html);
    const baseUrl = new URL(url);
    const images: { url: string; filename: string }[] = [];
    const processedUrls = new Set<string>();
    
    // Helper function to process image URL
    const processImageUrl = (src: string) => {
      if (!src || processedUrls.has(src)) return;
      
      try {
        const absoluteUrl = new URL(src, baseUrl.origin).toString();
        const filename = absoluteUrl.split('/').pop() || 'image.jpg';
        images.push({ url: absoluteUrl, filename });
        processedUrls.add(src);
      } catch (error) {
        console.error('Failed to process image URL:', src);
      }
    };

    // PRIMARY TARGET: Product gallery and product main elements
    const productGalleries = root.querySelectorAll('product-gallery[data-desktop="carousel"][data-mobile="thumbnails"], product-gallery.keen');
    const productMains = root.querySelectorAll('product-main[data-section][data-product-id].main-product-grid');
    
    const allProductElements = [...productGalleries, ...productMains];
    
    if (allProductElements.length > 0) {
      console.log(`Found ${productGalleries.length} product galleries and ${productMains.length} product main sections`);
      
      allProductElements.forEach((productElement: HTMLElement) => {
        // Get all images within the product element
        productElement.querySelectorAll('img').forEach((img: HTMLElement) => {
          const src = img.getAttribute('src');
          if (src) processImageUrl(src);
          
          // Check data attributes for lazy loading
          const dataSrc = img.getAttribute('data-src');
          if (dataSrc) processImageUrl(dataSrc);
          
          const dataLazySrc = img.getAttribute('data-lazy-src');
          if (dataLazySrc) processImageUrl(dataLazySrc);
          
          // Check srcset for responsive images
          const srcset = img.getAttribute('srcset');
          if (srcset) {
            srcset.split(',').forEach(src => {
              const url = src.trim().split(' ')[0];
              processImageUrl(url);
            });
          }
        });
        
        // Check for picture elements within product element
        productElement.querySelectorAll('picture source').forEach((source: HTMLElement) => {
          const srcset = source.getAttribute('srcset');
          if (srcset) {
            srcset.split(',').forEach(src => {
              const url = src.trim().split(' ')[0];
              processImageUrl(url);
            });
          }
        });
        
        // Check for background images in product element
        productElement.querySelectorAll('[style*="background-image"]').forEach((el: HTMLElement) => {
          const style = el.getAttribute('style');
          if (style) {
            const match = style.match(/url\(['"]?([^'"()]+)['"]?\)/);
            if (match?.[1]) processImageUrl(match[1]);
          }
        });
      });
    }
    
    // FALLBACK: If no product galleries found, use general image scraping
    if (images.length === 0) {
      console.log('No product galleries found, using fallback scraping...');
      
      // Regular img tags
      root.querySelectorAll('img').forEach((img: HTMLElement) => {
        const src = img.getAttribute('src');
        if (src) processImageUrl(src);
        
        const dataSrc = img.getAttribute('data-src');
        if (dataSrc) processImageUrl(dataSrc);
        
        const dataLazySrc = img.getAttribute('data-lazy-src');
        if (dataLazySrc) processImageUrl(dataLazySrc);
      });

      // Background images in style attributes
      root.querySelectorAll('[style*="background-image"]').forEach((el: HTMLElement) => {
        const style = el.getAttribute('style');
        if (style) {
          const match = style.match(/url\(['"]?([^'"()]+)['"]?\)/);
          if (match?.[1]) processImageUrl(match[1]);
        }
      });
    }
    
    console.log(`Found ${images.length} images total`);
    return NextResponse.json({ images });
  } catch (error) {
    console.error('Scraping failed:', error);
    return NextResponse.json({ error: 'Failed to scrape images' }, { status: 500 });
  }
} 