/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Handle SSL certificate issues in development
  webpack: (config, { dev }) => {
    if (dev) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }
    return config;
  },
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
        // Apply CORS headers to widget files
        source: '/widget/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Content-Type', value: 'application/javascript' },
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
