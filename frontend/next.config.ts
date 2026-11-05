import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep deploy stable: Cache Components + usePathname in the shell
  // was failing Vercel prerender for /shops/[id].
  // Re-enable later with route-level Suspense boundaries.
  devIndicators: false,
};

export default nextConfig;
