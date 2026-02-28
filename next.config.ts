import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  trailingSlash: false,
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
      // Catch-all pour les images d'annonces issues de domaines non listés
      { protocol: 'https', hostname: '**' },
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
          // CSP est défini dynamiquement dans middleware.ts (nonce par requête)
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // Uploads source maps to Sentry for readable stack traces
  // Requires SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT env vars
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
  // Tunnelling avoids ad-blockers
  tunnelRoute: '/monitoring',
  // Automatically tree-shake Sentry logger in production
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
    excludeReplayIframe: true,
    excludeReplayShadowDom: true,
  },
})
