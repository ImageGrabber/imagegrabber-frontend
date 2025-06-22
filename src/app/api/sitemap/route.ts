import { NextRequest, NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';

export async function POST(req: NextRequest) {
  const { sitemapUrl } = await req.json();

  if (!sitemapUrl) {
    return NextResponse.json({ error: 'Sitemap URL is required' }, { status: 400 });
  }

  try {
    const response = await fetch(sitemapUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch sitemap: ${response.statusText}`);
    }

    const xmlText = await response.text();
    const parser = new XMLParser();
    const result = parser.parse(xmlText);
    
    let urls: string[] = [];

    if (result.urlset && result.urlset.url) {
      urls = result.urlset.url.map((u: any) => u.loc);
    } else if (result.sitemapindex && result.sitemapindex.sitemap) {
      // You could extend this to recursively fetch all sitemaps
      // For now, we'll just return the sitemap URLs
      urls = result.sitemapindex.sitemap.map((s: any) => s.loc);
    }

    return NextResponse.json({ urls });

  } catch (error) {
    console.error('Error processing sitemap:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to process sitemap', details: errorMessage }, { status: 500 });
  }
} 