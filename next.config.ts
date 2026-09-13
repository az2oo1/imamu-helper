import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.100.165', 'localhost:3000', '127.0.0.1'],
  serverExternalPackages: ['@electric-sql/pglite', 'pg'],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    return [
      {
        source: '/@/:handle/dashboard/:path*',
        destination: '/account/:handle/dashboard/:path*',
      },
      {
        source: '/@/:handle/dashboard',
        destination: '/account/:handle/dashboard',
      },
      {
        source: '/@/:handle',
        destination: '/account/:handle',
      },
      {
        source: '/@:handle/dashboard/:path*',
        destination: '/account/:handle/dashboard/:path*',
      },
      {
        source: '/@:handle/dashboard',
        destination: '/account/:handle/dashboard',
      },
      {
        source: '/@:handle',
        destination: '/account/:handle',
      },
      {
        source: '/news/account/:handle/dashboard/:path*',
        destination: '/account/:handle/dashboard/:path*',
      },
      {
        source: '/news/account/:handle/dashboard',
        destination: '/account/:handle/dashboard',
      },
      {
        source: '/news/account/:handle',
        destination: '/account/:handle',
      },
    ];
  },
};

export default nextConfig;
