/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@custom-school/contracts', '@custom-school/validation'],
  poweredByHeader: false,
};
module.exports = nextConfig;
