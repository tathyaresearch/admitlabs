import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The PDF library runs on the server only, for the shared Audit PDF (the monthly report is made
  // by its job). Loaded as a plain Node package rather than bundled.
  serverExternalPackages: ['@react-pdf/renderer'],
};

export default nextConfig;
