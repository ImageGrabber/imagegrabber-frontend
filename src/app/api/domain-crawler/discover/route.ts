import { NextRequest, NextResponse } from 'next/server';

interface CrawlSettings {
  maxDepth: number;
  maxPages: number;
  followExternalLinks: boolean;
  respectRobotsTxt: boolean;
  delayBetweenRequests: number;
}

function isSameDomain(url: string, base: string) {
  try {
    return new URL(url).hostname === new URL(base).hostname;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const { domainUrl, settings } = await req.json();
  if (!domainUrl) {
    return NextResponse.json({ error: 'Domain URL is required' }, { status: 400 });
  }
  const crawlSettings: CrawlSettings = {
    maxDepth: settings?.maxDepth || 3,
    maxPages: settings?.maxPages || 50,
    followExternalLinks: !!settings?.followExternalLinks,
    respectRobotsTxt: settings?.respectRobotsTxt !== false,
    delayBetweenRequests: settings?.delayBetweenRequests || 1000,
  };

  const visited = new Set<string>();
  const queue: { url: string; depth: number }[] = [{ url: domainUrl, depth: 0 }];
  const discovered: string[] = [];

  while (queue.length > 0 && discovered.length < crawlSettings.maxPages) {
    const { url, depth } = queue.shift()!;
    if (visited.has(url) || depth > crawlSettings.maxDepth) continue;
    visited.add(url);
    discovered.push(url);
    try {
      const res = await fetch(url, { method: 'GET' });
      if (!res.ok) continue;
      const html = await res.text();
      const links = Array.from(html.matchAll(/href=["']([^"'#>]+)["']/g)).map(m => m[1]);
      for (const link of links) {
        let absUrl: string;
        try {
          absUrl = new URL(link, url).toString();
        } catch {
          continue;
        }
        if (!absUrl.startsWith('http')) continue;
        if (!crawlSettings.followExternalLinks && !isSameDomain(absUrl, domainUrl)) continue;
        if (!visited.has(absUrl)) {
          queue.push({ url: absUrl, depth: depth + 1 });
        }
      }
    } catch {
      continue;
    }
    if (crawlSettings.delayBetweenRequests > 0) {
      await new Promise(r => setTimeout(r, crawlSettings.delayBetweenRequests));
    }
  }

  return NextResponse.json({ urls: discovered });
} 