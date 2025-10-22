import { useEffect } from 'react';
import { useSession } from 'next-auth/react';

/**
 * ThemeProvider Component
 * 
 * Applies custom organization theme colors to the platform
 * by dynamically updating CSS variables based on organization settings
 */
export default function ThemeProvider({ children }) {
  const { data: session } = useSession();

  useEffect(() => {
    const applyCustomTheme = async () => {
      // Only apply if user has a current organization
      if (!session?.user?.currentOrganizationId) {
        return;
      }

      try {
        // Fetch organization settings
        const response = await fetch(`/api/organizations/${session.user.currentOrganizationId}`);
        if (!response.ok) {
          return;
        }

        const data = await response.json();
        const org = data.organization;

        // Check if custom theme is enabled
        if (!org.useCustomTheme || !org.primaryColor) {
          // Remove custom theme if disabled
          removeCustomTheme();
          return;
        }

        // Apply custom theme
        applyThemeColor(org.primaryColor);
      } catch (error) {
        console.error('Error applying custom theme:', error);
      }
    };

    applyCustomTheme();
  }, [session?.user?.currentOrganizationId]);

  return <>{children}</>;
}

/**
 * Apply custom theme color by updating CSS variables
 */
function applyThemeColor(hexColor) {
  // Convert hex to HSL for better control
  const hsl = hexToHSL(hexColor);
  
  // Update CSS variables for both light and dark modes
  const root = document.documentElement;
  
  // Primary color
  root.style.setProperty('--primary', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
  
  // Primary foreground (contrasting text color)
  const foregroundL = hsl.l > 50 ? 10 : 98;
  root.style.setProperty('--primary-foreground', `${hsl.h} ${hsl.s}% ${foregroundL}%`);
  
  // Accent color (slightly lighter/darker variant)
  const accentL = Math.min(hsl.l + 10, 96);
  root.style.setProperty('--accent', `${hsl.h} ${Math.max(hsl.s - 10, 0)}% ${accentL}%`);
  root.style.setProperty('--accent-foreground', `${hsl.h} ${hsl.s}% ${hsl.l > 50 ? 10 : 98}%`);
  
  // Ring color for focus states
  root.style.setProperty('--ring', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
  
  // Add a class to body to indicate custom theme is active
  document.body.classList.add('custom-theme-active');
  
  console.log('✨ Applied custom theme:', hexColor, hsl);
}

/**
 * Remove custom theme and restore defaults
 */
function removeCustomTheme() {
  const root = document.documentElement;
  
  // Remove custom CSS variables (they will fall back to defaults)
  root.style.removeProperty('--primary');
  root.style.removeProperty('--primary-foreground');
  root.style.removeProperty('--accent');
  root.style.removeProperty('--accent-foreground');
  root.style.removeProperty('--ring');
  
  // Remove custom theme class
  document.body.classList.remove('custom-theme-active');
  
  console.log('🔄 Removed custom theme, restored defaults');
}

/**
 * Convert HEX color to HSL
 * @param {string} hex - Hex color string (e.g., "#1E40AF")
 * @returns {object} HSL object with h, s, l properties
 */
function hexToHSL(hex) {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Convert hex to RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  
  // Find min and max RGB values
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;
  
  // Calculate lightness
  let l = (max + min) / 2;
  
  // Calculate saturation
  let s = 0;
  if (diff !== 0) {
    s = l > 0.5 ? diff / (2 - max - min) : diff / (max + min);
  }
  
  // Calculate hue
  let h = 0;
  if (diff !== 0) {
    switch (max) {
      case r:
        h = ((g - b) / diff + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / diff + 2) / 6;
        break;
      case b:
        h = ((r - g) / diff + 4) / 6;
        break;
    }
  }
  
  // Convert to degrees and percentages
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

