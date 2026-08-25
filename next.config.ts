import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
