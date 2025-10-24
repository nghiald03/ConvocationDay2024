import createNextIntlPlugin from 'next-intl/plugin';
import nextra from 'nextra';

/** @type {import('next').NextConfig} */

const withNextIntl = createNextIntlPlugin();

const withNextra = nextra({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.tsx',
});
const nextConfig = {
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
    ],
  },
  swcMinify: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  output: 'standalone',
};

export default withNextIntl(withNextra(nextConfig));
