import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch page: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract basic details
    let title = $('title').text() || $('meta[property="og:title"]').attr('content') || '';
    let description = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '';
    
    // Extract images
    const images: string[] = [];
    
    // 1. OG Image (highest priority)
    const ogImage = $('meta[property="og:image"]').attr('content');
    if (ogImage) images.push(ogImage);

    // 2. High-res product images (e.g., from Shopify/Amazon standard classes or JSON-LD if we wanted to get fancy)
    $('img').each((_, el) => {
      let src = $(el).attr('src') || $(el).attr('data-src');
      if (!src) return;
      
      // Fix relative URLs
      if (src.startsWith('//')) src = 'https:' + src;
      else if (src.startsWith('/')) {
        const urlObj = new URL(url);
        src = `${urlObj.protocol}//${urlObj.host}${src}`;
      }

      if (src.startsWith('http') && !images.includes(src)) {
        // filter out tiny icons/logos by checking width or keyword
        const width = $(el).attr('width');
        const classNames = $(el).attr('class') || '';
        const alt = $(el).attr('alt') || '';
        
        const isIcon = classNames.includes('icon') || src.includes('icon') || src.includes('logo');
        const isTiny = width && parseInt(width) < 150;
        
        if (!isIcon && !isTiny) {
            images.push(src);
        }
      }
    });

    return NextResponse.json({
      title: title.trim(),
      description: description.trim(),
      images: images.slice(0, 5) // Return up to 5 best images
    });

  } catch (error: any) {
    console.error('Scrape error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
