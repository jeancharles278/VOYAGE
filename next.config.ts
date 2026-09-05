import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Hôtes autorisés pour les visuels de destinations et d'hébergements.
    // `picsum.photos` sert de banque d'images de démonstration : remplacer
    // par le CDN du fournisseur de photos retenu (voir README).
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "fastly.picsum.photos" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;
