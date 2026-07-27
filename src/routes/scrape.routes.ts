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
    const productImages: string[] = [];
    const lifestyleImages: string[] = [];
    
    const isProductImage = (src: string, alt: string, classNames: string): boolean => {
      const lowerSrc = src.toLowerCase();
      const lowerAlt = alt.toLowerCase();
      const lowerClass = classNames.toLowerCase();
      
      const bannerKeywords = ['banner', 'header', 'hero', 'slider', 'carousel', 'promo', 'ad-banner', 'hero-banner', 'category-banner'];
      const logoKeywords = ['logo', 'icon', 'favicon', 'sprite', 'svg'];
      const uiKeywords = ['button', 'nav', 'menu', 'arrow', 'chevron', 'close', 'hamburger', 'star', 'rating', 'badge'];
      
      if (logoKeywords.some(k => lowerSrc.includes(k) || lowerClass.includes(k) || lowerAlt.includes(k))) return false;
      if (uiKeywords.some(k => lowerSrc.includes(k) || lowerClass.includes(k) || lowerAlt.includes(k))) return false;
      if (bannerKeywords.some(k => lowerSrc.includes(k) || lowerClass.includes(k) || lowerAlt.includes(k))) return false;
      
      return true;
    };
    
    const isLikelyProductShot = (src: string, alt: string): boolean => {
      const lowerSrc = src.toLowerCase();
      const lowerAlt = alt.toLowerCase();
      
      const productKeywords = ['product', 'item', 'pdp', 'main', 'zoom', 'front', 'back', 'side', 'detail', 'closeup', 'close-up'];
      const lifestyleKeywords = ['lifestyle', 'scene', 'model', 'wearing', 'using', 'action', 'outdoor', 'studio'];
      
      const productScore = productKeywords.reduce((score, k) => score + (lowerSrc.includes(k) || lowerAlt.includes(k) ? 1 : 0), 0);
      const lifestyleScore = lifestyleKeywords.reduce((score, k) => score + (lowerSrc.includes(k) || lowerAlt.includes(k) ? 1 : 0), 0);
      
      return productScore >= lifestyleScore;
    };

    // 1. OG Image (highest priority - usually main product)
    const ogImage = $('meta[property="og:image"]').attr('content');
    if (ogImage) images.push(ogImage);

    // 2. Priority product images from JSON-LD or structured data
    const jsonLdScripts = $('script[type="application/ld+json"]');
    jsonLdScripts.each((_: any, el: any) => {
      try {
        const data = JSON.parse($(el).text());
        const items = data['@graph'] || [data];
        for (const item of items) {
          if (item.image && typeof item.image === 'string') {
            if (!images.includes(item.image)) images.push(item.image);
          } else if (item.image && item.image.url) {
            if (!images.includes(item.image.url)) images.push(item.image.url);
          }
        }
      } catch (e) {}
    });

    // 3. High-res product images from img tags
    $('img').each((_: any, el: any) => {
      let src = $(el).attr('src') || $(el).attr('data-src');
      if (!src) return;
      
      if (src.startsWith('//')) src = 'https:' + src;
      else if (src.startsWith('/')) {
        const urlObj = new URL(url);
        src = `${urlObj.protocol}//${urlObj.host}${src}`;
      }

      if (src.startsWith('http') && !images.includes(src) && !productImages.includes(src) && !lifestyleImages.includes(src)) {
        const width = parseInt($(el).attr('width') || '0');
        const height = parseInt($(el).attr('height') || '0');
        const classNames = $(el).attr('class') || '';
        const alt = $(el).attr('alt') || '';
        
        const isIcon = width > 0 && width < 150;
        const isBanner = height > 0 && width > 0 && (width / height) > 4;
        const passesFilter = isProductImage(src, alt, classNames);
        
        if (passesFilter && !isIcon && !isBanner) {
          if (isLikelyProductShot(src, alt)) {
            productImages.push(src);
          } else {
            lifestyleImages.push(src);
          }
        }
      }
    });

    // Merge: product images first, then lifestyle, capped at 5 total
    const mergedImages = [...images, ...productImages, ...lifestyleImages];
    const uniqueImages = [...new Set(mergedImages)];

    res.json({
      title: title.trim(),
      description: description.trim(),
      images: uniqueImages.slice(0, 5)
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
