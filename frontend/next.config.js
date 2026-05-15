/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost', '127.0.0.1', 's3.amazonaws.com', 'lcsw.dpdns.org'],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3002/api/:path*',
      },
      {
        source: '/oauth/:path*',
        destination: 'http://localhost:3002/oauth/:path*',
      },
      {
        source: '/uploads/:path*',
        destination: 'http://localhost:3002/uploads/:path*',
      },
      {
        source: '/health',
        destination: 'http://localhost:3002/health',
      },
    ];
  },
};

module.exports = nextConfig;