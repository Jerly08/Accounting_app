/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    // Check if we're in development mode
    const isDev = process.env.NODE_ENV === 'development';
    
    // In development, use a more permissive CSP
    if (isDev) {
      return [
        {
          source: '/:path*',
          headers: [
            {
              key: 'Content-Security-Policy',
              value: "default-src * 'unsafe-inline' 'unsafe-eval'; script-src * 'unsafe-inline' 'unsafe-eval'; connect-src * 'unsafe-inline'; img-src * data: blob: 'unsafe-inline'; frame-src *; style-src * 'unsafe-inline';"
            }
          ]
        }
      ];
    }
    
    // In production, use stricter CSP
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: https://images.unsplash.com blob:; connect-src 'self' http://localhost:5000 https://fonts.googleapis.com https://fonts.gstatic.com; frame-src 'self'; media-src 'self'; object-src 'none';"
          }
        ]
      }
    ];
  }
};

module.exports = nextConfig; 