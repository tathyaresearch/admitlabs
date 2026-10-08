import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The PDF library runs on the server only, for the shared Audit PDF (the monthly report is made
  // by its job). Loaded as a plain Node package rather than bundled.
  serverExternalPackages: ['@react-pdf/renderer'],
  // The Client Brain takes a logo (up to 2 MB) and brand guidelines (a PDF up to 10 MB) through a
  // form (BRAIN_RULES.files); every other form stays far below this.
  experimental: {
    serverActions: { bodySizeLimit: '11mb' },
  },
};

export default nextConfig;
