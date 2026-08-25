import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Ingested covers are hosted off-site. Next refuses to optimise a remote
    // image whose host is not listed here, so each source needs an entry.
    remotePatterns: [
      // LibriVox recordings live on archive.org, which serves their cover art.
      { protocol: "https", hostname: "archive.org", pathname: "/services/img/**" },
      { protocol: "https", hostname: "*.archive.org" },
    ],
  },
};

export default nextConfig;
