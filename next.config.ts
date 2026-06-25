import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "https://yappa.perceptionlabs.tech/api/:path*",
      },
    ];
  },
};

export default nextConfig;
