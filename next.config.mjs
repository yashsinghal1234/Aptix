/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  poweredByHeader: false,
  compress: true,
  experimental: {
    optimizePackageImports: [
      "jose",
      "@prisma/client",
      "hls.js",
    ],
  },
  async headers() {
    if (process.env.NODE_ENV !== "production") {
      return [];
    }
    return [
      {
        source: "/:all*(svg|jpg|png|webp|mp4|webm|woff2|ico|js|css)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

