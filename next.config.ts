import type { NextConfig } from "next";

// next-intl plugin replaced by its one alias (the plugin loads an SWC native binding that fails on this PC)
const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      "next-intl/config": "./src/i18n/request.ts",
      // the package's default entry is the Node build (needs tfjs-node); always use the browser build
      "@vladmandic/human": "./node_modules/@vladmandic/human/dist/human.esm.js",
    },
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
