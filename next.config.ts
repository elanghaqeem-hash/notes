import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable Cache Components and partial prefetching until the
  // Cloudflare Workers runtime supports their scheduling behavior.
  // Cloudflare logs for production / show a hung request (Error 1101).
  cacheComponents: false,
  partialPrefetching: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
