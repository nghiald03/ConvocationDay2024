import nextra from 'nextra';

/** @type {import('next').NextConfig} */

const withNextra = nextra({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.tsx',
});
const apiUrl = process.env.API_URL || 'http://localhost:8081/api';
const apiOrigin = process.env.API_ORIGIN || 'http://localhost:8081';
const isDevelopment = process.env.NODE_ENV === 'development';
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https: http:",
  "font-src 'self' data:",
  "media-src 'self' blob: https: http:",
  "connect-src 'self' https: http: ws: wss:",
  isDevelopment ? null : 'upgrade-insecure-requests',
].filter(Boolean).join('; ');

const nextConfig = {
  // Keep the long-running dev compiler isolated from `next build`. Both
  // processes otherwise mutate `.next`, which can leave webpack runtimes
  // pointing at vendor chunks that the other process has replaced.
  distDir: isDevelopment ? '.next-dev' : '.next',
  async rewrites() {
    return [
      { source: '/backend-api/:path*', destination: `${apiUrl}/:path*` },
      { source: '/backend-events/:path*', destination: `${apiOrigin}/:path*` },
    ];
  },
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'Content-Security-Policy', value: contentSecurityPolicy },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
      ],
    }];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.lorem.space',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'a0.muscache.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
      },
      {
        protocol: 'http',
        hostname: 'fjourney.site',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'http',
        hostname: '192.168.0.110',
      },
      {
        protocol: 'https',
        hostname: 'img.freepik.com',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'cdn11.dienmaycholon.vn',
      },
    ],
  },
  swcMinify: true,
  output: 'standalone',
};

export default withNextra(nextConfig);
