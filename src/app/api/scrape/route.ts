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
    const imageHashes = new Map<string, { url: string; filename: string; size?: number; width?: number; height?: number; type?: string; quality?: 'low' | 'medium' | 'high' }>();
    
    // Helper function to process image URL with metadata
    const processImageUrl = async (src: string) => {
      if (!src) return;
      
      // Skip data URLs, empty strings, and very short URLs
      if (src.startsWith('data:') || src.length < 4) return;
      
      try {
        const absoluteUrl = new URL(src, baseUrl.href).toString();
        const normalizedUrl = normalizeUrl(absoluteUrl);
        const contentHash = getImageContentHash(absoluteUrl);
        
        // Check if we already have this exact URL
        if (images.some(img => img.url === absoluteUrl)) {
          return;
        }
        
        // Basic filtering - only skip obviously non-image URLs
        // Skip if it's clearly not an image (has obvious non-image extensions)
        const nonImageExtensions = ['.js', '.css', '.html', '.pdf', '.doc', '.txt', '.xml', '.json'];
        const hasNonImageExtension = nonImageExtensions.some(ext => absoluteUrl.toLowerCase().includes(ext));
        if (hasNonImageExtension) return;
        
        const filename = absoluteUrl.split('/').pop()?.split('?')[0] || 'image.jpg';
        
        // Create basic image data first
        const imageData = { 
          url: absoluteUrl, 
          filename,
          type: 'image/unknown',
          quality: 'medium' as const
        };
        
        // Store in our images array
        images.push(imageData);
        
        // Try to get metadata asynchronously (don't wait for it)
        getImageMetadata(absoluteUrl).then(metadata => {
          Object.assign(imageData, metadata);
        }).catch(() => {
          // Ignore metadata failures
        });
      } catch (error) {
        console.error('Failed to process image URL:', src, error instanceof Error ? error.message : 'Unknown error');
      }
    };

    // COMPREHENSIVE IMAGE SCRAPING - No longer using specific product gallery targeting
    console.log('Starting comprehensive image scraping...');
    
    const imagePromises: Promise<void>[] = [];
    
    // 1. Regular img tags with all possible src attributes
    root.querySelectorAll('img').forEach((img: HTMLElement) => {
      // Main src attribute
      const src = img.getAttribute('src');
      if (src) imagePromises.push(processImageUrl(src));
      
      // Common lazy loading attributes
      const lazyAttrs = ['data-src', 'data-lazy-src', 'data-original', 'data-lazy', 'data-srcset', 'data-img-src', 'data-image-src'];
      lazyAttrs.forEach(attr => {
        const value = img.getAttribute(attr);
        if (value) imagePromises.push(processImageUrl(value));
      });
      
      // Handle srcset for responsive images
      const srcset = img.getAttribute('srcset');
      if (srcset) {
        srcset.split(',').forEach(src => {
          const url = src.trim().split(' ')[0];
          if (url) imagePromises.push(processImageUrl(url));
        });
      }
      
      // Handle data-srcset for lazy loading
      const dataSrcset = img.getAttribute('data-srcset');
      if (dataSrcset) {
        dataSrcset.split(',').forEach(src => {
          const url = src.trim().split(' ')[0];
          if (url) imagePromises.push(processImageUrl(url));
        });
      }
    });

    // 2. Picture elements and their sources
    root.querySelectorAll('picture source').forEach((source: HTMLElement) => {
      const srcset = source.getAttribute('srcset');
      if (srcset) {
        srcset.split(',').forEach(src => {
          const url = src.trim().split(' ')[0];
          if (url) imagePromises.push(processImageUrl(url));
        });
      }
      
      // Check for lazy loading on sources too
      const dataSrcset = source.getAttribute('data-srcset');
      if (dataSrcset) {
        dataSrcset.split(',').forEach(src => {
          const url = src.trim().split(' ')[0];
          if (url) imagePromises.push(processImageUrl(url));
        });
      }
    });

    // 3. CSS background images in style attributes
    root.querySelectorAll('[style*="background-image"], [style*="background:"]').forEach((el: HTMLElement) => {
      const style = el.getAttribute('style');
      if (style) {
        // Match multiple URL patterns in background properties
        const urlMatches = style.match(/url\(['"]?([^'"()]+)['"]?\)/g);
        if (urlMatches) {
          urlMatches.forEach(match => {
            const url = match.match(/url\(['"]?([^'"()]+)['"]?\)/)?.[1];
            if (url) imagePromises.push(processImageUrl(url));
          });
        }
      }
    });

    // 4. Common container classes that might have images
    const commonImageContainers = [
      '.image', '.img', '.photo', '.picture', '.gallery', '.carousel', 
      '.slider', '.banner', '.hero', '.thumbnail', '.avatar', '.logo',
      '.product-image', '.gallery-item', '[data-bg]', '[data-background]'
    ];
    
    commonImageContainers.forEach(selector => {
      try {
        root.querySelectorAll(selector).forEach((el: HTMLElement) => {
          // Check for data attributes that might contain image URLs
          const dataAttrs = ['data-bg', 'data-background', 'data-image', 'data-img'];
          dataAttrs.forEach(attr => {
            const value = el.getAttribute(attr);
            if (value) imagePromises.push(processImageUrl(value));
          });
          
          // Check nested images
          el.querySelectorAll('img').forEach((img: HTMLElement) => {
            const src = img.getAttribute('src');
            if (src) imagePromises.push(processImageUrl(src));
          });
        });
      } catch (e) {
        // Continue if selector fails
      }
    });

    // 5. Links to image files
    root.querySelectorAll('a[href]').forEach((link: HTMLElement) => {
      const href = link.getAttribute('href');
      if (href && isImageUrl(href)) {
        imagePromises.push(processImageUrl(href));
      }
    });

    // 6. Input elements with image sources (like file inputs with previews)
    root.querySelectorAll('input[type="image"], input[src]').forEach((input: HTMLElement) => {
      const src = input.getAttribute('src');
      if (src) imagePromises.push(processImageUrl(src));
    });
    
    // Wait for all image processing to complete
    await Promise.all(imagePromises);
    
    console.log(`Found ${images.length} images after comprehensive scraping`);
    
    // If we didn't find many images, try a super aggressive approach
    if (images.length < 5) {
      console.log('Low image count, trying aggressive scraping...');
      const aggressivePromises: Promise<void>[] = [];
      
      // Get ALL elements with any src-like attribute
      root.querySelectorAll('*').forEach((el: HTMLElement) => {
        const attrs = ['src', 'data-src', 'data-lazy-src', 'data-original', 'data-img', 'data-image'];
        attrs.forEach(attr => {
          const value = el.getAttribute(attr);
          if (value && value.length > 10 && !value.startsWith('data:')) {
            aggressivePromises.push(processImageUrl(value));
          }
        });
      });
      
      await Promise.all(aggressivePromises);
      console.log(`After aggressive scraping: ${images.length} images`);
    }
    
    // Minimal deduplication - only remove exact URL duplicates
    const seenUrls = new Set<string>();
    const deduplicatedImages = images.filter(image => {
      if (seenUrls.has(image.url)) return false;
      seenUrls.add(image.url);
      return true;
    });
    
    console.log(`Found ${images.length} images total, deduplicated to ${deduplicatedImages.length} unique images`);
    return NextResponse.json({ images: deduplicatedImages });
  } catch (error) {
    console.error('Scraping failed:', error);
    return NextResponse.json({ error: 'Failed to scrape images' }, { status: 500 });
  }
} 