import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // typedRoutes is intentionally OFF: storefront links come from user-authored
  // CMS content (menu items, banner target URLs) where the target isn't known
  // to the type system. Admin-side routes still use `Route` casts as hints.
  typedRoutes: false,
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
