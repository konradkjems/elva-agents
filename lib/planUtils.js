/**
 * Plan Utilities
 * 
 * Shared utilities for handling organization plans
 */

/**
 * Translates internal plan identifiers to localized display names
 * @param {string} plan - Internal plan identifier
 * @returns {string} Localized plan display name
 */
export function getPlanDisplayName(plan) {
  switch (plan) {
    case 'free':
      return 'Gratis';
    case 'basic':
      return 'Basis';
    case 'growth':
      return 'Vækst';
    case 'pro':
      return 'Pro';
    default:
      return plan;
  }
}

