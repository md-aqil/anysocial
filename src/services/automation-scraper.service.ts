import axios from 'axios';
import * as cheerio from 'cheerio';
import { logger } from '../logger/pino.js';
import { prisma } from '../db/prisma.js';

export class AutomationScraperService {
  /**
   * Discovers products from a URL and saves them to the AutomatedCampaign
   */
  async discoverProducts(campaignId: string, websiteUrl: string): Promise<void> {
    try {
      logger.info(`Starting product discovery for campaign ${campaignId} at ${websiteUrl}`);
      
      const products = await this.scrapeProducts(websiteUrl);
      
      if (products.length === 0) {
        logger.warn(`No products found for ${websiteUrl}`);
        return;
      }

      logger.info(`Discovered ${products.length} products. Saving to database...`);
      
      // Save to database, ignoring duplicates
      let added = 0;
      for (const p of products) {
        try {
          await prisma.automatedProduct.upsert({
            where: {
              campaignId_productUrl: {
                campaignId,
                productUrl: p.url,
              }
            },
            update: {
              title: p.title,
              description: p.description,
              imageUrl: p.imageUrl
            },
            create: {
              campaignId,
              productUrl: p.url,
              title: p.title,
              description: p.description,
              imageUrl: p.imageUrl,
              status: 'PENDING'
            }
          });
          added++;
        } catch (e) {
          // Ignore unique constraint or other minor errors for individual products
        }
      }
      
      logger.info(`Successfully added/updated ${added} products for campaign ${campaignId}`);
    } catch (error) {
      logger.error(`Error discovering products: ${error}`);
      throw error;
    }
  }

  private async scrapeProducts(baseUrl: string): Promise<Array<{url: string, title: string, description: string, imageUrl: string}>> {
    const products: Array<{url: string, title: string, description: string, imageUrl: string}> = [];
    
    // Clean URL
    const urlObj = new URL(baseUrl);
    const domain = `${urlObj.protocol}//${urlObj.host}`;
    
    // Strategy 1: Try Shopify products.json
    try {
      const response = await axios.get(`${domain}/products.json?limit=250`);
      if (response.data && response.data.products) {
        for (const item of response.data.products) {
          const productUrl = `${domain}/products/${item.handle}`;
          const title = item.title;
          const description = item.body_html ? cheerio.load(item.body_html).text().trim() : '';
          const imageUrl = item.images && item.images.length > 0 ? item.images[0].src : '';
          
          if (title && imageUrl) {
            products.push({ url: productUrl, title, description, imageUrl });
          }
        }
        return products; // If Shopify succeeds, return
      }
    } catch (e) {
      logger.info(`Not a standard Shopify store or /products.json blocked for ${domain}`);
    }
    
    // Future Strategy 2: Sitemap parsing or HTML crawling can be added here
    // For now, if it's not Shopify, we just return empty or we could try fetching the homepage and extracting links.
    
    return products;
  }
}

export const automationScraperService = new AutomationScraperService();
