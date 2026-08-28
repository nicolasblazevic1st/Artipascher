import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Deploy builds into .next-build so the live .next is not overwritten mid-serve.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  async redirects() {
    return [
      { source: "/encheres", destination: "/offres", permanent: true },
      { source: "/encheres/:id", destination: "/offres/:id", permanent: true },
      {
        source: "/devis-travaux",
        destination: "/particulier/demande",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
