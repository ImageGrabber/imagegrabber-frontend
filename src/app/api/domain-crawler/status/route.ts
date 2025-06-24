import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get('jobId');
  if (!jobId) {
    return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
  }
  // Simulate a completed job with dummy data
  const job = {
    id: jobId,
    status: 'completed',
    total_urls: 3,
    processed_urls: 3,
    discovered_urls: [
      'https://example.com',
      'https://example.com/about',
      'https://example.com/contact'
    ],
    results: [
      {
        url: 'https://example.com',
        images: [
          { url: 'https://example.com/img1.jpg' },
          { url: 'https://example.com/img2.jpg' }
        ]
      },
      {
        url: 'https://example.com/about',
        images: [
          { url: 'https://example.com/about/img3.jpg' }
        ]
      },
      {
        url: 'https://example.com/contact',
        images: []
      }
    ]
  };
  return NextResponse.json({ job });
} 