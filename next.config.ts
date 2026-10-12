import type { NextConfig } from "next";

// next-intl plugin replaced by its one alias (the plugin loads an SWC native binding that fails on this PC)
const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: { "next-intl/config": "./src/i18n/request.ts" },
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
