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

  useEffect(() => {
    if (demoId) {
      fetchDemo();
      trackView();
    }
  }, [demoId]);

  const fetchDemo = async () => {
    try {
      const response = await fetch(`/api/admin/demo-widgets/${demoId}`);
      if (!response.ok) {
        throw new Error('Demo not found');
      }
      const demoData = await response.json();
      setDemo(demoData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const trackView = async () => {
    try {
      await fetch(`/api/admin/demo-widgets/${demoId}/usage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'view' })
      });
    } catch (error) {
      console.error('Failed to track view:', error);
    }
  };

  const trackInteraction = async () => {
    try {
      const response = await fetch(`/api/admin/demo-widgets/${demoId}/usage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'interaction' })
      });
      
      if (response.ok) {
        const result = await response.json();
        setUsage(result.currentUsage);
      }
    } catch (error) {
      console.error('Failed to track interaction:', error);
    }
  };

  const loadWidgetScript = () => {
    // Check if script is already loaded
    const existingScript = document.querySelector(`script[src*="/api/widget-embed/${demoId}"]`);
    if (existingScript) {
      return;
    }

    // Create and append script tag
    const script = document.createElement('script');
    script.src = `/api/widget-embed/${demoId}`;
    script.defer = true;
    script.async = true;
    
    // Track interaction when widget is clicked
    script.onload = () => {
      // Add click listener to widget container when it appears
      const checkForWidget = setInterval(() => {
        const widgetContainer = document.getElementById('elva-chat-widget-container');
        if (widgetContainer) {
          clearInterval(checkForWidget);
          
          // Add click listener to track interactions
          widgetContainer.addEventListener('click', trackInteraction);
          
          // Also track when chat opens
          const chatBtn = document.querySelector('[data-widget="chat-button"]');
          if (chatBtn) {
            chatBtn.addEventListener('click', trackInteraction);
          }
        }
      }, 1000);
      
      // Stop checking after 10 seconds
      setTimeout(() => clearInterval(checkForWidget), 10000);
    };
    
    document.body.appendChild(script);
  };

  useEffect(() => {
    if (demo && !loading) {
      loadWidgetScript();
    }
  }, [demo, loading]);

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
      
      {/* Full Screen Demo - Just the website with widget */}
      <div className="relative w-full h-screen overflow-hidden">
        {demo.demoSettings?.screenshotUrl ? (
          <img 
            src={demo.demoSettings.screenshotUrl} 
            alt="Client website screenshot"
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback if screenshot fails to load
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}
        
        {/* Loading/Fallback state */}
        <div className={`flex items-center justify-center w-full h-full bg-gray-100 ${demo.demoSettings?.screenshotUrl ? 'hidden' : 'flex'}`}>
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-200 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <ExternalLink className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-gray-500 mb-2">
              {demo.demoSettings?.screenshotCapturedAt ? 'Screenshot processing...' : 'Capturing website preview...'}
            </p>
            {demo.demoSettings?.clientWebsiteUrl && (
              <a 
                href={demo.demoSettings.clientWebsiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                View original website →
              </a>
            )}
          </div>
        </div>
        
        {/* Subtle demo indicator - only show briefly */}
        <div className="absolute top-4 right-4 z-10">
          <div className="bg-black bg-opacity-50 text-white px-3 py-1 rounded-lg text-sm">
            Demo Mode
          </div>
        </div>
      </div>

      {/* Widget will be loaded dynamically via useEffect */}
    </>
  );
}

export async function getServerSideProps({ params }) {
  return {
    props: {
      demoId: params.demoId
    }
  };
}
