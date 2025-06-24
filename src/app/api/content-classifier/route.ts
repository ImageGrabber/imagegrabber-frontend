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

function extractTextContent(html: string): string {
    // Remove script and style tags
    html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    
    // Remove HTML tags but keep text content
    html = html.replace(/<[^>]*>/g, ' ');
    
    // Clean up whitespace
    html = html.replace(/\s+/g, ' ').trim();
    
    return html;
}

function extractImages(html: string): string[] {
    const imgRegex = /<img[^>]*src=["']([^"']+)["'][^>]*>/gi;
    const images: string[] = [];
    let match;
    
    while ((match = imgRegex.exec(html)) !== null) {
        const src = match[1];
        if (src && !src.startsWith('data:')) {
            images.push(src);
        }
    }
    
    return images.slice(0, 10); // Limit to 10 images
}

async function classifyWithAI(title: string, description: string, content: string): Promise<{ contentType: string; confidence: number; method: string }> {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const huggingfaceApiKey = process.env.HUGGINGFACE_API_KEY;
    
    // Try OpenAI first if available
    if (openaiApiKey) {
        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${openaiApiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a content classifier. Analyze the given content and classify it into one of these categories: product, blog, review, landing, article, or other. Respond with only the category name and a confidence score from 0 to 1, separated by a comma. Example: "product,0.85"'
                        },
                        {
                            role: 'user',
                            content: `Title: ${title}\nDescription: ${description}\nContent: ${content.substring(0, 1000)}`
                        }
                    ],
                    max_tokens: 50,
                    temperature: 0.1
                })
            });

            if (response.ok) {
                const data = await response.json();
                const result = data.choices[0].message.content.trim();
                const [contentType, confidenceStr] = result.split(',');
                const confidence = parseFloat(confidenceStr) || 0.5;
                
                return {
                    contentType: contentType.toLowerCase(),
                    confidence: Math.max(confidence, 0.3),
                    method: 'openai'
                };
            } else {
                const errorBody = await response.json();
                console.error('OpenAI API request failed:', response.status, response.statusText, errorBody);
            }
        } catch (error) {
            console.error('OpenAI classification failed:', error);
        }
    }
    
    // Try HuggingFace if OpenAI failed or unavailable
    if (huggingfaceApiKey) {
        try {
            const response = await fetch('https://api-inference.huggingface.co/models/facebook/bart-large-mnli', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${huggingfaceApiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    inputs: `${title} ${description} ${content.substring(0, 500)}`,
                    parameters: {
                        candidate_labels: ['product page', 'blog post', 'review', 'landing page', 'article', 'other content']
                    }
                })
            });

            if (response.ok) {
                const data = await response.json();
                const contentType = data.labels[0].replace(' ', '').replace('page', '').replace('post', '');
                const confidence = data.scores[0];
                
                return {
                    contentType: contentType === 'othercontent' ? 'other' : contentType,
                    confidence: Math.max(confidence, 0.3),
                    method: 'huggingface'
                };
            } else {
                const errorBody = await response.json();
                console.error('HuggingFace API request failed:', response.status, response.statusText, errorBody);
            }
        } catch (error) {
            console.error('HuggingFace classification failed:', error);
        }
    }
    
    // Fallback to keyword-based classification
    return classifyWithKeywords(title, description, content);
}

function classifyWithKeywords(title: string, description: string, content: string): { contentType: string; confidence: number; method: string } {
    const text = `${title} ${description} ${content}`.toLowerCase();
    
    // Enhanced keyword-based classification
    const patterns = {
        product: {
            keywords: ['buy', 'purchase', 'order', 'add to cart', 'shopping cart', 'price', '$', 'sale', 'discount', 'product', 'item', 'shop', 'store', 'checkout', 'payment', 'shipping', 'in stock', 'out of stock'],
            score: 0
        },
        blog: {
            keywords: ['blog', 'post', 'article', 'read more', 'published', 'author', 'date', 'category', 'tags', 'comment', 'share', 'subscribe', 'newsletter', 'latest post'],
            score: 0
        },
        review: {
            keywords: ['review', 'rating', 'stars', 'opinion', 'recommend', 'pros', 'cons', 'verdict', 'score', 'out of', 'stars', 'customer review', 'user review', 'testimonial'],
            score: 0
        },
        landing: {
            keywords: ['get started', 'sign up', 'free trial', 'download', 'learn more', 'contact us', 'subscribe', 'newsletter', 'cta', 'call to action', 'join now', 'start free', 'get access'],
            score: 0
        },
        article: {
            keywords: ['news', 'report', 'analysis', 'study', 'research', 'findings', 'conclusion', 'methodology', 'data', 'statistics', 'according to', 'study shows', 'research indicates'],
            score: 0
        }
    };
    
    // Calculate scores with weighted matching
    Object.keys(patterns).forEach(type => {
        patterns[type as keyof typeof patterns].keywords.forEach(keyword => {
            const regex = new RegExp(keyword, 'gi');
            const matches = text.match(regex);
            if (matches) {
                patterns[type as keyof typeof patterns].score += matches.length;
            }
        });
    });
    
    // Find the type with highest score
    let bestType = 'other';
    let bestScore = 0;
    
    Object.keys(patterns).forEach(type => {
        const score = patterns[type as keyof typeof patterns].score;
        if (score > bestScore) {
            bestScore = score;
            bestType = type;
        }
    });
    
    // Calculate confidence (normalize score)
    const maxPossibleScore = Math.max(...Object.values(patterns).map(p => p.keywords.length));
    const confidence = Math.min(bestScore / maxPossibleScore, 1);
    
    return {
        contentType: bestType,
        confidence: Math.max(confidence, 0.3), // Minimum 30% confidence
        method: 'keyword'
    };
}

export async function POST(request: Request) {
  try {
    const { url, useAI = false } = await request.json();
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
    
    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : 'Untitled';
    
    // Extract meta description
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i);
    const description = descMatch ? descMatch[1].trim() : '';
    
    // Extract main content
    const content = extractTextContent(html);
    
    // Extract images
    const images = extractImages(html);
    
    // Classify content
    const classification = useAI ? 
        await classifyWithAI(title, description, content) : 
        classifyWithKeywords(title, description, content);
    
    const result = {
      id: Date.now().toString(),
      url,
      title,
      description,
      contentType: classification.contentType as 'product' | 'blog' | 'review' | 'landing' | 'article' | 'other',
      confidence: classification.confidence,
      images,
      createdAt: new Date().toISOString(),
      method: classification.method
    };

    return NextResponse.json(result);

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
} 