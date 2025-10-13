/**
 * Privacy & GDPR Compliance Utilities
 * 
 * Functions for handling personal data in compliance with GDPR
 */

/**
 * Anonymize IP address for GDPR compliance
 * IPv4: 192.168.1.100 -> 192.168.1.0
 * IPv6: 2001:0db8:85a3::8a2e:0370:7334 -> 2001:0db8:85a3::
 * 
 * @param {string} ip - IP address to anonymize
 * @returns {string|null} Anonymized IP or null
 */
export function anonymizeIP(ip) {
  if (!ip) return null;

  // Remove any port number
  ip = ip.split(':').slice(0, -1).join(':') || ip;

  // Handle IPv6
  if (ip.includes(':')) {
    const parts = ip.split(':');
    // Keep first 3 segments, anonymize the rest
    return parts.slice(0, 3).join(':') + '::';
  }

  // Handle IPv4
  if (ip.includes('.')) {
    const parts = ip.split('.');
    // Keep first 3 octets, set last to 0
    return parts.slice(0, 3).join('.') + '.0';
  }

  // Unknown format
  return null;
}

/**
 * Get country from IP (requires external service or database)
 * For GDPR compliance, only store country-level data, not precise IP
 * 
 * @param {string} ip - IP address
 * @returns {Promise<string|null>} Country code or null
 */
export async function getCountryFromIP(ip) {
  if (!ip) return null;
  
  try {
    // Option 1: Use ip-api.com (free, no auth needed)
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=countryCode`);
    const data = await response.json();
    return data.countryCode || null;
  } catch (error) {
    console.error('Error getting country from IP:', error);
    return null;
  }
}

/**
 * Check if user has given consent for analytics
 * 
 * @param {Object} req - Request object
 * @returns {boolean} True if user has given analytics consent
 */
export function hasAnalyticsConsent(req) {
  // Check for consent cookie or header
  const consentCookie = req.cookies?.['elva-consent'];
  
  if (consentCookie) {
    try {
      const consent = JSON.parse(consentCookie);
      return consent.analytics === true;
    } catch {
      return false;
    }
  }
  
  // Check for header (from widget)
  const consentHeader = req.headers['x-elva-consent-analytics'];
  if (consentHeader === 'true') {
    return true;
  }
  
  // Default: no consent
  return false;
}

