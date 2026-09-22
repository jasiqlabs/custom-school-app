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
};
module.exports = nextConfig;
