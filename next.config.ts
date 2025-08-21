import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Disable ESLint during production builds (you can run it separately)
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Enable type checking during builds
    ignoreBuildErrors: false,
  },
  // Image optimization for static export
  images: {
    unoptimized: true,
  },
  // Temporarily disable static export to test API routes
  // output: 'export',
  // trailingSlash: true,
  // distDir: 'out',
  // Disable API routes for static export
  generateBuildId: () => 'build',
};

export default nextConfig;
