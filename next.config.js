/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  trailingSlash: false,
  generateEtags: false,
  async headers() {
    return [
      {
        // Apply CORS headers to API routes
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
      {
        // Legacy v0 widget script (rewritten to /api/widget/:widgetId below).
        // Scoped to widget.js only: /widget/* also hosts the v2 chat app.
        source: '/widget/:widgetId/widget.js',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Content-Type', value: 'application/javascript' },
        ],
      },
      {
        // v2 chat app build (widget-app/ → public/widget/). Hashed assets are immutable.
        source: '/widget/assets/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/widget/:widgetId/widget.js',
        destination: '/api/widget/:widgetId',
      },
    ];
  },
};

module.exports = nextConfig;
