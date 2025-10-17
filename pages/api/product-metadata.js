import axios from 'axios';
import { JSDOM } from 'jsdom';
import redis from '../../lib/redis';

// Cache duration: 24 hours
const CACHE_DURATION = 24 * 60 * 60; // in seconds

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }
  
  try {
    // Check Redis cache first
    const cacheKey = `product:${url}`;
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      console.log('✅ Cache HIT for:', url);
      return res.status(200).json(cached);
    }
    
    console.log('❌ Cache MISS for:', url);
    
    // Fetch HTML
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ElvaBot/1.0)'
      },
      timeout: 10000,
      validateStatus: function (status) {
        // Accept any status code (including 404) to handle gracefully
        return status >= 200 && status < 600;
      }
    });
    
    // Handle non-2xx status codes
    if (response.status === 404) {
      return res.status(404).json({ 
        error: 'Product not found',
        details: 'The product URL returned a 404 status code',
        url: url
      });
    }
    
    if (response.status >= 400) {
      return res.status(response.status).json({ 
        error: 'Failed to fetch product page',
        details: `The product URL returned status code ${response.status}`,
        url: url
      });
    }
    
    const html = response.data;
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    // Extract Open Graph data
    const ogImage = document.querySelector('meta[property="og:image"]')?.content;
    const ogTitle = document.querySelector('meta[property="og:title"]')?.content;
    const ogDescription = document.querySelector('meta[property="og:description"]')?.content;
    
    // Extract structured data (JSON-LD)
    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
    let structuredData = null;
    
    for (const script of jsonLdScripts) {
      try {
        const jsonText = script.textContent.trim();
        if (!jsonText) continue;
        
        const data = JSON.parse(jsonText);
        if (data['@type'] === 'Product') {
          structuredData = data;
          break;
        }
      } catch (e) {
        console.log('Failed to parse JSON-LD:', e.message);
        continue;
      }
    }
    
    // Extract price
    let price = null;
    if (structuredData?.offers?.price) {
      price = `${structuredData.offers.price} ${structuredData.offers.priceCurrency || 'kr.'}`;
    } else {
      // Fallback: try to find price in meta tags
      const priceElement = document.querySelector('[itemprop="price"]');
      if (priceElement) {
        price = priceElement.content || priceElement.textContent;
      }
      
      // Additional fallback: look for price in various selectors
      if (!price) {
        const priceSelectors = [
          '.price',
          '.product-price',
          '[data-price]',
          '.current-price',
          '.price-current'
        ];
        
        for (const selector of priceSelectors) {
          const element = document.querySelector(selector);
          if (element) {
            price = element.textContent?.trim();
            if (price) break;
          }
        }
      }
      
      // Try to extract price from text content
      if (!price) {
        const bodyText = document.body.textContent;
        const priceMatch = bodyText.match(/(\d+(?:[.,]\d+)?)\s*(?:kr\.?|DKK|dkk)/i);
        if (priceMatch) {
          price = `${priceMatch[1]} kr.`;
        }
      }
    }
    
    // Clean up price
    if (price) {
      // Extract just the number and clean it up
      const priceMatch = price.match(/(\d+(?:[.,]\d+)?)/);
      if (priceMatch) {
        const cleanPrice = priceMatch[1].replace(',', '.');
        price = `${cleanPrice} kr.`;
      }
    }
    
    // Build metadata object
    const metadata = {
      url: url,
      image: ogImage || structuredData?.image || null,
      name: ogTitle || structuredData?.name || null,
      price: price,
      description: ogDescription || structuredData?.description || null
    };
    
    // Store in Redis cache with 24-hour TTL
    try {
      await redis.setex(cacheKey, CACHE_DURATION, JSON.stringify(metadata));
      console.log('💾 Cached product for 24 hours:', url);
    } catch (cacheError) {
      // Log cache error but don't fail the request
      console.error('⚠️ Failed to cache product:', cacheError.message);
    }
    
    // Return metadata
    return res.status(200).json(metadata);
    
  } catch (error) {
    console.error('Error fetching product metadata:', error.message);
    return res.status(500).json({ 
      error: 'Failed to fetch product metadata',
      details: error.message,
      code: error.code
    });
  }
}
