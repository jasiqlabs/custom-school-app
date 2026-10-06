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
    const backend = (process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'https://custom-school-app.onrender.com/api/v1').replace(/\/api\/v1\/?$/, '');
    return [
      {
        source: '/api/v1/:path*',
        destination: `${backend}/api/v1/:path*`,
      },
    ];
  },
};
module.exports = nextConfig;
