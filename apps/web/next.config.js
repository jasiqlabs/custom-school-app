/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@custom-school/contracts',
    '@custom-school/validation',
    '@custom-school/design-tokens',
  ],
};

module.exports = nextConfig;
