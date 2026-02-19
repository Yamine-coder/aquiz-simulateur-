import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    qualities: [75, 90],
    remotePatterns: [
      { protocol: 'https', hostname: '**.seloger.com' },
      { protocol: 'https', hostname: '**.leboncoin.fr' },
      { protocol: 'https', hostname: '**.pap.fr' },
      { protocol: 'https', hostname: '**.bienici.com' },
      { protocol: 'https', hostname: '**.logic-immo.com' },
      { protocol: 'https', hostname: '**.orpi.com' },
      { protocol: 'https', hostname: '**.century21.fr' },
      { protocol: 'https', hostname: '**.meilleursagents.com' },
      { protocol: 'https', hostname: '**.ouestfrance-immo.com' },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com",
              "style-src 'self' 'unsafe-inline' https://unpkg.com",
              "img-src 'self' data: blob: https: http:",
              "font-src 'self' data:",
              "connect-src 'self' https://vitals.vercel-insights.com https://va.vercel-scripts.com https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com https://api-adresse.data.gouv.fr https://georisques.gouv.fr https://overpass-api.de https://api.cquest.org https://files.data.gouv.fr",
              "frame-src https://www.google.com/maps/",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
