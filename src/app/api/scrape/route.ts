import { NextRequest, NextResponse } from 'next/server';
import { parse, HTMLElement } from 'node-html-parser';

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
    const images: { url: string; filename: string; size?: number; width?: number; height?: number; type?: string; quality?: 'low' | 'medium' | 'high' }[] = [];
    const processedUrls = new Set<string>();
    
    // Helper function to process image URL with metadata
    const processImageUrl = async (src: string) => {
      if (!src || processedUrls.has(src)) return;
      
      try {
        const absoluteUrl = new URL(src, baseUrl.origin).toString();
        const filename = absoluteUrl.split('/').pop() || 'image.jpg';
        
        // Get image metadata
        const metadata = await getImageMetadata(absoluteUrl);
        
        images.push({ 
          url: absoluteUrl, 
          filename,
          ...metadata
        });
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
      
      const imagePromises: Promise<void>[] = [];
      
      allProductElements.forEach((productElement: HTMLElement) => {
        // Get all images within the product element
        productElement.querySelectorAll('img').forEach((img: HTMLElement) => {
          const src = img.getAttribute('src');
          if (src) imagePromises.push(processImageUrl(src));
          
          // Check data attributes for lazy loading
          const dataSrc = img.getAttribute('data-src');
          if (dataSrc) imagePromises.push(processImageUrl(dataSrc));
          
          const dataLazySrc = img.getAttribute('data-lazy-src');
          if (dataLazySrc) imagePromises.push(processImageUrl(dataLazySrc));
          
          // Check srcset for responsive images
          const srcset = img.getAttribute('srcset');
          if (srcset) {
            srcset.split(',').forEach(src => {
              const url = src.trim().split(' ')[0];
              imagePromises.push(processImageUrl(url));
            });
          }
        });
        
        // Check for picture elements within product element
        productElement.querySelectorAll('picture source').forEach((source: HTMLElement) => {
          const srcset = source.getAttribute('srcset');
          if (srcset) {
            srcset.split(',').forEach(src => {
              const url = src.trim().split(' ')[0];
              imagePromises.push(processImageUrl(url));
            });
          }
        });
        
        // Check for background images in product element
        productElement.querySelectorAll('[style*="background-image"]').forEach((el: HTMLElement) => {
          const style = el.getAttribute('style');
          if (style) {
            const match = style.match(/url\(['"]?([^'"()]+)['"]?\)/);
            if (match?.[1]) imagePromises.push(processImageUrl(match[1]));
          }
        });
      });
      
      // Wait for all metadata extraction to complete
      await Promise.all(imagePromises);
    }
    
    // FALLBACK: If no product galleries found, use general image scraping
    if (images.length === 0) {
      console.log('No product galleries found, using fallback scraping...');
      
      const imagePromises: Promise<void>[] = [];
      
      // Regular img tags
      root.querySelectorAll('img').forEach((img: HTMLElement) => {
        const src = img.getAttribute('src');
        if (src) imagePromises.push(processImageUrl(src));
        
        const dataSrc = img.getAttribute('data-src');
        if (dataSrc) imagePromises.push(processImageUrl(dataSrc));
        
        const dataLazySrc = img.getAttribute('data-lazy-src');
        if (dataLazySrc) imagePromises.push(processImageUrl(dataLazySrc));
      });

      // Background images in style attributes
      root.querySelectorAll('[style*="background-image"]').forEach((el: HTMLElement) => {
        const style = el.getAttribute('style');
        if (style) {
          const match = style.match(/url\(['"]?([^'"()]+)['"]?\)/);
          if (match?.[1]) imagePromises.push(processImageUrl(match[1]));
        }
      });
      
      // Wait for all metadata extraction to complete
      await Promise.all(imagePromises);
    }
    
    console.log(`Found ${images.length} images total`);
    return NextResponse.json({ images });
  } catch (error) {
    console.error('Scraping failed:', error);
    return NextResponse.json({ error: 'Failed to scrape images' }, { status: 500 });
  }
} 