import Head from 'next/head';
import { useState } from 'react';

export default function Home() {
  const [widgetId, setWidgetId] = useState('test-widget-123');
  const [apiUrl, setApiUrl] = useState('http://localhost:3000');

  return (
    <>
      <Head>
        <title>Elva Chat Widget Platform</title>
        <meta name="description" content="AI Chat Widget Platform with conversation storage" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main style={{ 
        minHeight: '100vh', 
        padding: '2rem',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h1 style={{ 
            fontSize: '3rem', 
            fontWeight: 'bold', 
            marginBottom: '1rem',
            textAlign: 'center'
          }}>
            🤖 Elva Chat Widget
          </h1>
          
          <p style={{ 
            fontSize: '1.2rem', 
            marginBottom: '3rem',
            textAlign: 'center',
            opacity: 0.9
          }}>
            AI-powered chat widget with conversation persistence
          </p>

          <div style={{
            background: 'rgba(255,255,255,0.1)',
            padding: '2rem',
            borderRadius: '12px',
            marginBottom: '2rem',
            backdropFilter: 'blur(10px)'
          }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
              🚀 Quick Start
            </h2>
            
            <p style={{ marginBottom: '1rem', opacity: 0.9 }}>
              Add this script tag to any website to integrate the chat widget:
            </p>
            
            <div style={{
              background: 'rgba(0,0,0,0.3)',
              padding: '1rem',
              borderRadius: '8px',
              fontFamily: 'monospace',
              fontSize: '0.9rem',
              overflow: 'auto'
            }}>
              {`<script src="${apiUrl}/widget/${widgetId}/widget.js"></script>`}
            </div>
          </div>

          <div style={{
            background: 'rgba(255,255,255,0.1)',
            padding: '2rem',
            borderRadius: '12px',
            marginBottom: '2rem',
            backdropFilter: 'blur(10px)'
          }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
              ⚙️ Configuration
            </h2>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                Widget ID:
              </label>
              <input
                type="text"
                value={widgetId}
                onChange={(e) => setWidgetId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '1rem'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                API URL:
              </label>
              <input
                type="text"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '1rem'
                }}
              />
            </div>
          </div>

          <div style={{
            background: 'rgba(255,255,255,0.1)',
            padding: '2rem',
            borderRadius: '12px',
            backdropFilter: 'blur(10px)'
          }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
              📋 Features
            </h2>
            
            <ul style={{ 
              listStyle: 'none', 
              padding: 0,
              lineHeight: '1.8'
            }}>
              <li>✅ Easy integration with single script tag</li>
              <li>✅ Conversation persistence across sessions</li>
              <li>✅ Mobile-responsive design</li>
              <li>✅ Customizable themes and styling</li>
              <li>✅ OpenAI GPT integration</li>
              <li>✅ MongoDB conversation storage</li>
              <li>✅ CORS-enabled for cross-domain usage</li>
            </ul>
          </div>
        </div>
      </main>

      {/* Live demo widget */}
      <script 
        src={`${apiUrl}/widget/${widgetId}/widget.js`}
        async
      />
    </>
  );
}
