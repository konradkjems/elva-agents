import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function WidgetPreviewPage() {
  const router = useRouter();
  const { widgetId } = router.query;
  const [widget, setWidget] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (widgetId) {
      fetchWidget();
      // Also load the widget script dynamically
      loadWidgetScript();
    }
  }, [widgetId]);

  const loadWidgetScript = () => {
    // Check if script is already loaded
    const existingScript = document.querySelector(`script[src*="/api/widget-embed/${widgetId}"]`);
    if (existingScript) {
      return;
    }

    // Create and append script tag
    const script = document.createElement('script');
    script.src = `/api/widget-embed/${widgetId}`;
    script.defer = true;
    script.async = true;
    
    // Append to body before closing tag
    document.body.appendChild(script);
    
    // Cleanup function
    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  };

  const fetchWidget = async () => {
    try {
      const response = await fetch(`/api/admin/widgets/${widgetId}`);
      if (response.ok) {
        const data = await response.json();
        setWidget(data);
      }
    } catch (error) {
      console.error('Failed to fetch widget:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading preview...</p>
        </div>
      </div>
    );
  }

  if (!widget) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Widget Not Found</h1>
          <p className="text-gray-600 mb-4">The widget you're looking for doesn't exist.</p>
          <button 
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Widget Preview - {widget.name} | Elva Solutions</title>
        <meta name="description" content={`Preview of ${widget.name} widget on a sample page`} />
      </Head>
      
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-gray-900">
                  {widget.name} - Preview
                </h1>
                <span className="ml-3 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                  Live Preview
                </span>
              </div>
              <div className="flex items-center space-x-4">
                <button 
                  onClick={() => window.close()}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Sample Website Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Hero Section */}
          <section className="text-center py-16">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Welcome to Our Sample Website
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              This is a sample page to demonstrate how your {widget.name} widget looks and behaves 
              on a real website. The widget is embedded at the bottom right corner.
            </p>
            <div className="flex justify-center space-x-4">
              <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Get Started
              </button>
              <button className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                Learn More
              </button>
            </div>
          </section>

          {/* Features Section */}
          <section className="py-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Why Choose Our Platform?
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Experience the power of AI-driven customer support with our advanced chat widget.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center p-6 bg-white rounded-lg shadow-sm">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Lightning Fast</h3>
                <p className="text-gray-600">
                  Get instant responses to your questions with our AI-powered chat system.
                </p>
              </div>
              
              <div className="text-center p-6 bg-white rounded-lg shadow-sm">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">24/7 Available</h3>
                <p className="text-gray-600">
                  Our chat widget is always online, ready to help your customers anytime.
                </p>
              </div>
              
              <div className="text-center p-6 bg-white rounded-lg shadow-sm">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Secure & Private</h3>
                <p className="text-gray-600">
                  Your conversations are encrypted and protected with enterprise-grade security.
                </p>
              </div>
            </div>
          </section>

          {/* Test Section */}
          <section className="py-16 bg-white rounded-lg shadow-sm">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Try Our Chat Widget
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Click the chat button in the bottom right corner to test the {widget.name} widget. 
                Ask questions about our services, pricing, or anything else you'd like to know!
              </p>
            </div>
            
            <div className="max-w-4xl mx-auto">
              <div className="bg-gray-50 rounded-lg p-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Sample Questions to Try:
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">• "What are your pricing plans?"</p>
                    <p className="text-sm text-gray-600">• "How does the chat widget work?"</p>
                    <p className="text-sm text-gray-600">• "Do you offer custom integrations?"</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">• "What's your response time?"</p>
                    <p className="text-sm text-gray-600">• "Can I customize the widget appearance?"</p>
                    <p className="text-sm text-gray-600">• "Is there a free trial available?"</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="mt-16 py-8 border-t border-gray-200">
            <div className="text-center">
              <p className="text-gray-600">
                This is a sample page for previewing your widget. 
                The actual widget is embedded below and will appear in the bottom right corner.
              </p>
            </div>
          </footer>
        </main>
      </div>

      {/* Widget will be loaded dynamically via useEffect */}
    </>
  );
}

export async function getServerSideProps({ params }) {
  return {
    props: {
      widgetId: params.widgetId,
    },
  };
}
