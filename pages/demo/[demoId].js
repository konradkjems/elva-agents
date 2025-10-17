import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MessageCircle, 
  ExternalLink, 
  Clock, 
  Users, 
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';

export default function DemoPage() {
  const router = useRouter();
  const { demoId } = router.query;
  const [demo, setDemo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [usage, setUsage] = useState(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const [clientWebsiteUrl, setClientWebsiteUrl] = useState(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (demoId) {
      console.log('📊 useEffect triggered with demoId:', demoId);
      fetchDemo();
      trackView();
    }
  }, [demoId]);

  const fetchDemo = async () => {
    try {
      const response = await fetch(`/api/admin/demos/${demoId}`);
      if (!response.ok) {
        throw new Error('Demo not found');
      }
      const demoData = await response.json();
      setDemo(demoData);
      
      // Handle client website URL - upgrade HTTP to HTTPS if needed
      if (demoData.demoSettings?.clientWebsiteUrl) {
        let url = demoData.demoSettings.clientWebsiteUrl;
        
        // If we're on HTTPS and the client URL is HTTP, try to upgrade it
        if (typeof window !== 'undefined' && window.location.protocol === 'https:' && url.startsWith('http://')) {
          console.log('⚠️ Mixed content detected - client URL is HTTP but demo page is HTTPS');
          console.log('🔄 Attempting to upgrade to HTTPS:', url);
          
          // Try HTTPS version first
          const httpsUrl = url.replace('http://', 'https://');
          
          // Test if HTTPS version is accessible
          try {
            const testResponse = await fetch(httpsUrl, { method: 'HEAD', mode: 'no-cors' });
            console.log('✅ HTTPS version appears accessible, using it');
            setClientWebsiteUrl(httpsUrl);
          } catch (testError) {
            console.log('⚠️ HTTPS version test failed, will use screenshot fallback');
            // Force screenshot fallback by marking iframe as errored
            setIframeError(true);
            setClientWebsiteUrl(null);
          }
        } else {
          setClientWebsiteUrl(url);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const trackView = async () => {
    try {
      console.log('📊 Tracking view for demo:', demoId);
      const response = await fetch(`/api/admin/demos/${demoId}/usage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'view' }),
      });
      const data = await response.json();
      console.log('✅ View tracked:', data);
    } catch (error) {
      console.error('❌ Failed to track view:', error);
    }
  };

  // Debounce timer to prevent multiple tracking calls
  let interactionTrackingTimer = null;
  
  const trackInteraction = async () => {
    // Clear any existing timer
    if (interactionTrackingTimer) {
      clearTimeout(interactionTrackingTimer);
    }
    
    // Debounce the tracking call
    interactionTrackingTimer = setTimeout(async () => {
      try {
        console.log('📊 Tracking interaction for demo:', demoId);
        const response = await fetch(`/api/admin/demos/${demoId}/usage`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ type: 'interaction' }),
        });
        const data = await response.json();
        console.log('✅ Interaction tracked:', data);
      } catch (error) {
        console.error('Failed to track interaction:', error);
      }
    }, 100); // 100ms debounce
  };

  const loadWidgetScript = () => {
    // Remove any existing widget scripts
    const existingScripts = document.querySelectorAll('script[src*="widget-embed"]');
    existingScripts.forEach(script => script.remove());
    
    // Create and load the widget script using the SOURCE WIDGET ID
    // This way the demo uses the actual widget configuration from the database
    const widgetId = demo.sourceWidgetId || demoId;
    console.log('📝 Loading widget with ID:', widgetId);
    
    const script = document.createElement('script');
    script.src = `/api/widget-embed/${widgetId}`;
    script.async = true;
    
    // Track interactions when widget is used
    script.onload = () => {
      console.log('📊 Widget script loaded, setting up interaction tracking');
      
      // Check if we've already set up tracking (avoid duplicate listeners)
      if (window.demoInteractionTrackingSetup) {
        console.log('📊 Interaction tracking already set up, skipping');
        return;
      }
      
      window.demoInteractionTrackingSetup = true;
      
      // Use event delegation to track interactions
      // Track when user sends a message (Enter key)
      document.addEventListener('keypress', (e) => {
        const input = e.target;
        if (input.tagName === 'INPUT' && input.type === 'text' && e.key === 'Enter') {
          const widget = input.closest('[data-widget="chat-widget"]');
          if (widget) {
            console.log('📊 User sent a message (Enter), tracking interaction');
            trackInteraction();
          }
        }
      });
      
      // Track when send button is clicked
      document.addEventListener('click', (e) => {
        const target = e.target;
        if (target.tagName === 'BUTTON' && target.type === 'submit') {
          const widget = target.closest('[data-widget="chat-widget"]');
          if (widget) {
            console.log('📊 Send button clicked, tracking interaction');
            trackInteraction();
          }
        }
      });
    };
    
    document.body.appendChild(script);
  };

  useEffect(() => {
    if (demo && !loading) {
      console.log('📊 Loading widget script for demo:', demo._id);
      loadWidgetScript();
    }
  }, [demo, loading]);

  // Timeout mechanism to detect iframe loading failures
  useEffect(() => {
    if (demo && clientWebsiteUrl && !iframeLoaded && !iframeError) {
      console.log('📝 Setting up iframe timeout mechanism...');
      
      // Set a timeout to detect if iframe fails to load within 8 seconds
      const timeoutId = setTimeout(() => {
        if (!iframeLoaded && !iframeError) {
          console.log('📝 Iframe timeout reached, triggering fallback to screenshot');
          setIframeError(true);
        }
      }, 8000); // 8 second timeout

      // Clear timeout if iframe loads or errors before timeout
      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [demo, clientWebsiteUrl, iframeLoaded, iframeError]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading demo...</p>
        </div>
      </div>
    );
  }

  if (error || !demo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Demo Not Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              {error || 'This demo widget could not be found or has been removed.'}
            </p>
            <Button onClick={() => router.push('/')} variant="outline">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isExpired = demo.demoSettings?.usageLimits?.expiresAt ? 
    new Date(demo.demoSettings.usageLimits.expiresAt) < new Date() : false;

  const isLimitReached = {
    views: (demo.demoSettings?.usageLimits?.currentUsage?.views || 0) >= 
           (demo.demoSettings?.usageLimits?.maxViews || 0),
    interactions: (demo.demoSettings?.usageLimits?.currentUsage?.interactions || 0) >= 
                  (demo.demoSettings?.usageLimits?.maxInteractions || 0)
  };

  if (isExpired) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <Clock className="h-5 w-5" />
              Demo Expired
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              This demo has expired and is no longer available.
            </p>
            <Button onClick={() => router.push('/')} variant="outline">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLimitReached.views) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <Users className="h-5 w-5" />
              Demo Limit Reached
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              This demo has reached its maximum number of views.
            </p>
            <Button onClick={() => router.push('/')} variant="outline">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{demo.name} - Demo Widget</title>
        <meta name="description" content={`Demo of ${demo.name} AI chat widget`} />
      </Head>
      
      {/* Full Screen Demo - Website iframe with widget overlay */}
      <div className="relative w-full h-screen overflow-hidden">
        {/* Iframe for the client website */}
        {clientWebsiteUrl && !iframeError ? (
          <iframe
            src={clientWebsiteUrl}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            onLoad={() => {
              console.log('📝 Iframe loaded successfully');
              setIframeLoaded(true);
            }}
            onError={() => {
              console.log('📝 Iframe error event triggered');
              setIframeError(true);
            }}
            style={{
              background: 'white',
              display: iframeLoaded ? 'block' : 'none'
            }}
          />
        ) : null}

        {/* Loading state while iframe loads */}
        {clientWebsiteUrl && !iframeLoaded && !iframeError && (
          <div className="flex items-center justify-center w-full h-full bg-gray-100">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600 mb-2">Loading website...</p>
              <p className="text-gray-500 text-sm">
                {clientWebsiteUrl}
              </p>
              <p className="text-gray-400 text-xs mt-2">
                If this takes too long, we'll show a screenshot instead
              </p>
            </div>
          </div>
        )}

        {/* Fallback to screenshot if iframe fails */}
        {(iframeError || !clientWebsiteUrl) && demo.demoSettings?.screenshotUrl ? (
          <div className="relative w-full h-full bg-gray-50">
            <img 
              src={demo.demoSettings.screenshotUrl} 
              alt="Client website screenshot"
              className="w-full h-full object-contain"
              style={{ objectFit: 'contain' }}
            />
            {/* Screenshot fallback indicator */}
            <div className="absolute top-4 left-4 bg-yellow-100 border border-yellow-300 text-yellow-800 px-3 py-2 rounded-lg text-sm shadow-lg">
              <AlertTriangle className="h-4 w-4 inline mr-2" />
              Website preview (screenshot) - {demo.demoSettings.clientWebsiteUrl?.startsWith('http://') ? 'HTTP site on HTTPS page' : 'site cannot be embedded'}
            </div>
          </div>
        ) : null}

        {/* Final fallback if no iframe and no screenshot */}
        {(iframeError || !clientWebsiteUrl) && !demo.demoSettings?.screenshotUrl && (
          <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="text-center max-w-md mx-4">
              <div className="w-20 h-20 bg-blue-100 rounded-full mx-auto mb-6 flex items-center justify-center">
                <ExternalLink className="h-10 w-10 text-blue-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Interactive Demo
              </h3>
              <p className="text-gray-600 mb-4">
                This website cannot be embedded {demo.demoSettings?.clientWebsiteUrl?.startsWith('http://') ? '(HTTP site on HTTPS page)' : 'due to security restrictions'}, but you can still test the chat widget functionality.
              </p>
              <div className="space-y-3">
                {demo.demoSettings?.clientWebsiteUrl && (
                  <a 
                    href={demo.demoSettings.clientWebsiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Website in New Tab
                  </a>
                )}
                <div className="text-sm text-gray-500">
                  <p>💬 The chat widget is active on this page</p>
                  <p>🔗 You can test it while browsing the original website</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Demo info panel - shows on iframe load */}
        {iframeLoaded && !showBanner && (
          <div className="absolute top-4 left-4 right-4 z-10 animate-in fade-in slide-in-from-top-2 duration-500">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-5 rounded-xl shadow-2xl max-w-2xl mx-auto backdrop-blur-sm border border-white/20">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <h3 className="font-bold text-xl">{demo.name}</h3>
                  </div>
                  <p className="text-sm text-blue-100 mb-3 leading-relaxed">
                    {demo.description || `Demo af ${demo.sourceWidgetName}`}
                  </p>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-blue-200" />
                      <span className="text-blue-100">Chat widget aktiv</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      <span className="text-blue-100">Interaktiv demo</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setShowBanner(true)}
                  className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-200 hover:rotate-90 transform"
                  aria-label="Luk banner"
                >
                  <span className="text-2xl font-light leading-none">×</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Subtle demo indicator - always visible */}
        <div className="absolute bottom-4 right-4 z-10">
          <div className="bg-black bg-opacity-50 text-white px-3 py-1 rounded-lg text-sm">
            Demo Mode
          </div>
        </div>
      </div>

      {/* Widget will be loaded dynamically via useEffect */}
    </>
  );
}