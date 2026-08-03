import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/favicon.ico",
        destination: "/favicon-48.png",
      },
    ];
  },
};

export default nextConfig;
