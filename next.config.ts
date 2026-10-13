import type { NextConfig } from "next";

const publicAssetCache = "public, max-age=86400, s-maxage=31536000, stale-while-revalidate=604800";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
      ...(process.env.NODE_ENV === "production" ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }] : []),
    ] }, { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
    { source: "/images/:path*", headers: [{ key: "Cache-Control", value: publicAssetCache }] },
    { source: "/fonts/:path*", headers: [{ key: "Cache-Control", value: publicAssetCache }] },
    { source: "/models/:path*", headers: [{ key: "Cache-Control", value: publicAssetCache }] },
    { source: "/m/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }, { key: "Cache-Control", value: "private, no-store" }] },
    { source: "/dashboard", headers: [{ key: "Cache-Control", value: "private, no-store" }] }];
  },
  images: { unoptimized: true },
  // Keep the dev compiler cache isolated from production builds.
  distDir: process.env.NODE_ENV === "production" ? ".next-build" : ".next",
};

export default nextConfig;
