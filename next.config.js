/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure favicons and other static files are properly served
  output: 'standalone',
  // Allow importing CSS files
  webpack(config) {
    return config;
  },
  typescript: {
    ignoreBuildErrors: true
  },
  eslint: {
    ignoreDuringBuilds: true
  },
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_URL_PROD: process.env.NEXTAUTH_URL_PROD,
  }
};

module.exports = nextConfig; 