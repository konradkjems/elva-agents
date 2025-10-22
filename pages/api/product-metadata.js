import axios from 'axios';
import * as cheerio from 'cheerio';

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
    const $ = cheerio.load(html);
    
    // Extract Open Graph data
    const ogImage = $('meta[property="og:image"]').attr('content');
    const ogTitle = $('meta[property="og:title"]').attr('content');
    const ogDescription = $('meta[property="og:description"]').attr('content');
    
    // Extract structured data (JSON-LD)
    const jsonLdScripts = $('script[type="application/ld+json"]');
    let structuredData = null;
    
    jsonLdScripts.each((i, script) => {
      try {
        const jsonText = $(script).html()?.trim();
        if (!jsonText) return;
        
        const data = JSON.parse(jsonText);
        if (data['@type'] === 'Product') {
          structuredData = data;
          return false; // break
        }
      } catch (e) {
        console.log('Failed to parse JSON-LD:', e.message);
      }
    });
    
    // Extract price
    let price = null;
    if (structuredData?.offers?.price) {
      price = `${structuredData.offers.price} ${structuredData.offers.priceCurrency || 'kr.'}`;
    } else {
      // Fallback: try to find price in meta tags
      const priceElement = $('[itemprop="price"]').first();
      if (priceElement.length) {
        price = priceElement.attr('content') || priceElement.text()?.trim();
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
          const element = $(selector).first();
          if (element.length) {
            price = element.text()?.trim();
            if (price) break;
          }
        }
      }
      
      // Try to extract price from text content
      if (!price) {
        const bodyText = $('body').text();
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
    
    // Return metadata
    return res.status(200).json({
      url: url,
      image: ogImage || structuredData?.image || null,
      name: ogTitle || structuredData?.name || null,
      price: price,
      description: ogDescription || structuredData?.description || null
    });
    
  } catch (error) {
    console.error('Error fetching product metadata:', error.message);
    return res.status(500).json({ 
      error: 'Failed to fetch product metadata',
      details: error.message,
      code: error.code
    });
  }
}
