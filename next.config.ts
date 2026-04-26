import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['172.20.10.5', '*.ngrok-free.dev', '*.ngrok.io'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: '**.ai-coustics.com' },
    ],
  },
  experimental: {
    serverActions: { bodySizeLimit: '50mb' },
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
