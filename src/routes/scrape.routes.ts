import express from 'express';
import * as cheerio from 'cheerio';
import { logger } from '../logger/pino.js';

const router = express.Router();

router.post('/', async (req: any, res: any) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

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
    $('img').each((_: any, el: any) => {
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

    res.json({
      title: title.trim(),
      description: description.trim(),
      images: images.slice(0, 5) // Return up to 5 best images
    });

  } catch (error: any) {
    logger.error('Scrape error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/proxy-image', async (req: any, res: any) => {
  try {
    const imageUrl = req.query.url as string;
    if (!imageUrl) return res.status(400).send('Missing url parameter');

    const imgRes = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      }
    });

    if (!imgRes.ok) {
      return res.status(500).send(`Failed to fetch image: ${imgRes.statusText}`);
    }

    const arrayBuffer = await imgRes.arrayBuffer();
    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(Buffer.from(arrayBuffer));
  } catch (err: any) {
    logger.error('Proxy image error:', err);
    res.status(500).send(err.message);
  }
});

export default router;
