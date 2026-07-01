import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  transpilePackages: ['@ecom/shared', '@ecom/ui'],
  images: {
    // Allow local MinIO. Add production S3/CDN hostnames here when deploying.
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', port: '9000' },
    ],
  },
  async rewrites() {
    const api = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4000';
    return [{ source: '/api/proxy/:path*', destination: `${api}/api/v1/:path*` }];
  },
};

export default nextConfig;
