import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: [
    "ffmpeg-static",
    "fluent-ffmpeg",
    "@remotion/bundler",
    "@remotion/renderer",
  ],
  experimental: {
    proxyClientMaxBodySize: "50mb",
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
