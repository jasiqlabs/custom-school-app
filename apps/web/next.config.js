/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@custom-school/contracts',
    '@custom-school/validation',
    '@custom-school/design-tokens',
  ],
  distDir: process.env.NEXT_DIST_DIR || '.next',
  poweredByHeader: false,
  async rewrites() {
    const rawTarget = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
    let backend = '';

    if (rawTarget && (rawTarget.startsWith('http://') || rawTarget.startsWith('https://'))) {
      // Guard against rewrites targeting the frontend itself (causes infinite loop and 429s)
      if (!rawTarget.includes('custom-school-app-frontend')) {
        backend = rawTarget.replace(/\/api\/v1\/?$/, '');
      }
    } else if (process.env.NODE_ENV !== 'production') {
      backend = 'http://localhost:4000';
    }

    if (!backend) {
      return [];
    }

    return [
      {
        source: '/api/v1/:path*',
        destination: `${backend}/api/v1/:path*`,
      },
    ];
  },
};
module.exports = nextConfig;
