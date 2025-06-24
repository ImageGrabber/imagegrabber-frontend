import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { domainUrl, urls, settings } = await req.json();
  if (!domainUrl || !urls || !Array.isArray(urls) || urls.length === 0) {
    return NextResponse.json({ error: 'Domain URL and URLs to crawl are required' }, { status: 400 });
  }
  // Simulate job creation (in production, enqueue a background job)
  const jobId = 'job_' + Math.random().toString(36).slice(2);
  // Optionally, store job in a database or in-memory store
  // For now, just return the jobId
  return NextResponse.json({ jobId });
} 