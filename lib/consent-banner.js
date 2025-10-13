/**
 * GDPR Consent Banner JavaScript Code
 * To be injected into widget script
 * 
 * This is JavaScript code (not Node.js) that runs in the browser
 */

export function getConsentManagerCode(widgetConfig) {
  return `
  // ============================================
  // GDPR CONSENT MANAGER
  // ============================================
  
  const ElvaConsent = {
    storageKey: 'elva-consent-${widgetConfig.widgetId}',
    
    // Get current consent state
    getConsent: function() {
      try {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
          const consent = JSON.parse(stored);
          // Check if consent is still valid (30 days)
          const consentDate = new Date(consent.timestamp);
          const now = new Date();
          const daysSinceConsent = (now - consentDate) / (1000 * 60 * 60 * 24);
          
          if (daysSinceConsent > 30) {
            // Consent expired, remove it
            localStorage.removeItem(this.storageKey);
            return null;
          }
          
          return consent;
        }
      } catch (error) {
        console.error('Error reading consent:', error);
      }
      return null;
    },
    
    // Save consent
    saveConsent: function(consent) {
      const consentData = {
        ...consent,
        timestamp: new Date().toISOString(),
        version: '1.0',
        widgetId: '${widgetConfig.widgetId}'
      };
      
      localStorage.setItem(this.storageKey, JSON.stringify(consentData));
      
      // Fire consent change event
      window.dispatchEvent(new CustomEvent('elva-consent-changed', {
        detail: consentData
      }));
      
      console.log('✅ Consent saved:', consent);
    },
    
    // Check if we have consent for specific purpose
    hasConsent: function(purpose) {
      const consent = this.getConsent();
      return consent && consent[purpose] === true;
    },
    
    // Show consent banner
    showBanner: function() {
      // Don't show if already decided
      if (this.getConsent()) {
        return;
      }
      
      const primaryColor = '${widgetConfig.theme?.buttonColor || '#4f46e5'}';
      
      // Create banner HTML
      const banner = document.createElement('div');
      banner.id = 'elva-consent-banner';
      banner.innerHTML = \`
        <div class="elva-consent-overlay"></div>
        <div class="elva-consent-banner-container">
          <div class="elva-consent-content">
            <h3>🍪 Vi respekterer dit privatliv</h3>
            <p>
              Vi bruger localStorage til at gemme din samtalehistorik, så du kan fortsætte 
              hvor du slap. Vi indsamler ikke personlige oplysninger uden din tilladelse.
            </p>
            <div class="elva-consent-options">
              <label class="elva-consent-checkbox">
                <input type="checkbox" id="elva-consent-necessary" checked disabled>
                <span><strong>Nødvendige</strong> - Påkrævet for at chatten virker</span>
              </label>
              <label class="elva-consent-checkbox">
                <input type="checkbox" id="elva-consent-functional" checked>
                <span><strong>Funktionelle</strong> - Gem samtalehistorik</span>
              </label>
              <label class="elva-consent-checkbox">
                <input type="checkbox" id="elva-consent-analytics" checked>
                <span><strong>Analytics</strong> - Hjælp os forbedre tjenesten</span>
              </label>
            </div>
            <div class="elva-consent-buttons">
              <button class="elva-consent-btn elva-consent-btn-accept-all" style="background: \${primaryColor}">
                Accepter alle
              </button>
              <button class="elva-consent-btn elva-consent-btn-accept-selected">
                Gem indstillinger
              </button>
              <button class="elva-consent-btn elva-consent-btn-reject">
                Kun nødvendige
              </button>
            </div>
            <p class="elva-consent-footer">
              <a href="https://elva-solutions.com/privacy" target="_blank">Privatlivspolitik</a>
              ·
              <a href="https://elva-solutions.com/cookies" target="_blank">Cookie politik</a>
            </p>
          </div>
        </div>
      \`;
      
      document.body.appendChild(banner);
      
      // Add styles
      const style = document.createElement('style');
      style.textContent = \`
        .elva-consent-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 999998;
          animation: fadeIn 0.3s ease-out;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .elva-consent-banner-container {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          max-width: 600px;
          width: 90%;
          background: white;
          border-radius: 16px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
          z-index: 999999;
          animation: slideUp 0.3s ease-out;
        }
        
        @keyframes slideUp {
          from {
            transform: translateX(-50%) translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
          }
        }
        
        .elva-consent-content {
          padding: 24px;
        }
        
        .elva-consent-content h3 {
          margin: 0 0 12px 0;
          font-size: 20px;
          font-weight: 600;
          color: #1f2937;
        }
        
        .elva-consent-content p {
          margin: 0 0 16px 0;
          font-size: 14px;
          line-height: 1.5;
          color: #6b7280;
        }
        
        .elva-consent-options {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 20px;
        }
        
        .elva-consent-checkbox {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 14px;
          color: #374151;
        }
        
        .elva-consent-checkbox input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }
        
        .elva-consent-checkbox input[disabled] {
          cursor: not-allowed;
          opacity: 0.6;
        }
        
        .elva-consent-buttons {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        
        .elva-consent-btn {
          flex: 1;
          min-width: 120px;
          padding: 10px 16px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .elva-consent-btn-accept-all {
          color: white;
        }
        
        .elva-consent-btn-accept-all:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }
        
        .elva-consent-btn-accept-selected {
          background: #e5e7eb;
          color: #374151;
        }
        
        .elva-consent-btn-accept-selected:hover {
          background: #d1d5db;
        }
        
        .elva-consent-btn-reject {
          background: transparent;
          color: #6b7280;
          border: 1px solid #d1d5db;
        }
        
        .elva-consent-btn-reject:hover {
          background: #f9fafb;
        }
        
        .elva-consent-footer {
          margin-top: 16px;
          font-size: 12px;
          color: #9ca3af;
          text-align: center;
        }
        
        .elva-consent-footer a {
          color: \${primaryColor};
          text-decoration: none;
        }
        
        .elva-consent-footer a:hover {
          text-decoration: underline;
        }
        
        @media (max-width: 640px) {
          .elva-consent-banner-container {
            bottom: 0;
            left: 0;
            right: 0;
            max-width: 100%;
            width: 100%;
            transform: none;
            border-radius: 16px 16px 0 0;
          }
          
          .elva-consent-buttons {
            flex-direction: column;
          }
          
          .elva-consent-btn {
            width: 100%;
          }
        }
      \`;
      document.head.appendChild(style);
      
      // Event listeners
      const acceptAllBtn = banner.querySelector('.elva-consent-btn-accept-all');
      const acceptSelectedBtn = banner.querySelector('.elva-consent-btn-accept-selected');
      const rejectBtn = banner.querySelector('.elva-consent-btn-reject');
      
      acceptAllBtn.addEventListener('click', () => {
        this.saveConsent({
          necessary: true,
          functional: true,
          analytics: true
        });
        this.removeBanner();
        window.location.reload(); // Reload to apply consent
      });
      
      acceptSelectedBtn.addEventListener('click', () => {
        this.saveConsent({
          necessary: true,
          functional: document.getElementById('elva-consent-functional').checked,
          analytics: document.getElementById('elva-consent-analytics').checked
        });
        this.removeBanner();
        window.location.reload(); // Reload to apply consent
      });
      
      rejectBtn.addEventListener('click', () => {
        this.saveConsent({
          necessary: true,
          functional: false,
          analytics: false
        });
        this.removeBanner();
        window.location.reload(); // Reload to apply consent
      });
    },
    
    removeBanner: function() {
      const banner = document.getElementById('elva-consent-banner');
      if (banner) {
        banner.remove();
      }
    }
  };
  
  // Show consent banner if no consent decision made
  ElvaConsent.showBanner();
`;
}

