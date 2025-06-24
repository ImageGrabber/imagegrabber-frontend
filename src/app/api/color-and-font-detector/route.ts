import { NextResponse } from "next/server";

async function fetchWithTimeout(resource: string, options: RequestInit & { timeout?: number } = { timeout: 8000 }) {
    const { timeout } = options;
    
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(resource, {
        ...options,
        signal: controller.signal  
    });
    clearTimeout(id);

    return response;
}

async function getCssContent(url: string, baseUrl: string): Promise<string> {
    try {
        let absoluteUrl: string;
        if (url.startsWith('//')) {
            const base = new URL(baseUrl);
            absoluteUrl = `${base.protocol}${url}`;
        } else if (url.startsWith('/')) {
            const urlObject = new URL(baseUrl);
            absoluteUrl = `${urlObject.protocol}//${urlObject.host}${url}`;
        } else if (!/^(https?:)?\/\//.test(url)) {
            const urlObject = new URL(baseUrl);
            absoluteUrl = new URL(url, urlObject).href;
        } else {
            absoluteUrl = url;
        }
        const response = await fetchWithTimeout(absoluteUrl);
        if (!response.ok) return '';
        return await response.text();
    } catch (error) {
        console.error(`Failed to fetch CSS from ${url}:`, error);
        return '';
    }
}

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    let pageResponse;
    try {
        pageResponse = await fetchWithTimeout(url);
    } catch (e: any) {
        if (e.name === 'AbortError') {
             return NextResponse.json({ error: "Request timed out" }, { status: 408 });
        }
        return NextResponse.json({ error: "Failed to fetch the URL. Please check if the URL is correct and publicly accessible." }, { status: 500 });
    }

    if (!pageResponse.ok) {
        return NextResponse.json({ error: "Failed to fetch the URL. The site may be down or blocking requests." }, { status: pageResponse.status });
    }
    
    const html = await pageResponse.text();
    
    // Extract CSS content using regex instead of cheerio
    const cssTexts: string[] = [];
    
    // 1. Get inline styles
    const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    let styleMatch;
    while ((styleMatch = styleRegex.exec(html)) !== null) {
        cssTexts.push(styleMatch[1]);
    }
    
    // 2. Get external stylesheets
    const linkRegex = /<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi;
    const stylesheetPromises: Promise<string>[] = [];
    let linkMatch;
    while ((linkMatch = linkRegex.exec(html)) !== null) {
        const href = linkMatch[1];
        if (href) {
            stylesheetPromises.push(getCssContent(href, url));
        }
    }
    
    const externalCss = await Promise.all(stylesheetPromises);
    cssTexts.push(...externalCss);

    const fullCssText = cssTexts.join('\n');

    // 3. Extract colors and fonts with regex
    const colorRegex = /(#[0-9a-fA-F]{3,8}|(rgba?|hsla?)\([^)]+\))/g;
    const fontRegex = /font-family:\s*([^;\}]+)/g;

    const colors = fullCssText.match(colorRegex) || [];
    const fontsRaw = fullCssText.match(fontRegex) || [];
    
    const uniqueColors = Array.from(new Set(colors.map(color => color.toLowerCase())));
    
    const uniqueFonts = Array.from(new Set(
        fontsRaw.flatMap(font => 
            font.replace(/font-family:\s*/, '')
                .split(',')
                .map(f => f.replace(/['"]/g, '').trim())
                .filter(f => f && !f.includes(' ') && f.length > 2) // Basic font name filtering
        )
    ));

    return NextResponse.json({ colors: uniqueColors.slice(0, 50), fonts: uniqueFonts.slice(0, 50) });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
} 