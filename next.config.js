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
    
    // Build info environment variables - ensure client variables are populated
    // IMPORTANT: For hydration to work, we must use the same value for both client and server
    NEXT_PUBLIC_BUILD_NUMBER: process.env.NEXT_PUBLIC_BUILD_NUMBER || process.env.BUILD_NUMBER || '0.1.5',
    NEXT_PUBLIC_BUILD_DATE: process.env.NEXT_PUBLIC_BUILD_DATE || process.env.BUILD_DATE || new Date().toISOString().split('T')[0],
    NEXT_PUBLIC_COMMIT_HASH: process.env.NEXT_PUBLIC_COMMIT_HASH || process.env.COMMIT_HASH || ''
  }
};

module.exports = nextConfig; 