import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

// Loads the translations of the current language on every request (src/i18n/request.ts).
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// In GitHub Codespaces the app is opened through <codespace>-3000.<forwarding domain>;
// the dev server must accept that origin (it only allows localhost by default).
const codespacesDomain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;

// The browser only talks to this app; /api/* is relayed to the NestJS API (decision D-004),
// so that session cookies stay on a single origin.
// On Railway, API_INTERNAL_URL is the API's private address (http://api.railway.internal:4000);
// it is read when the app is built, so it is passed to the build as well (D-106).
const apiUrl = process.env.API_INTERNAL_URL;

const nextConfig: NextConfig = {
  // Workspace packages are compiled by Next.js like local code.
  transpilePackages: ['@veris/shared'],
  allowedDevOrigins: codespacesDomain
    ? [`*.${codespacesDomain}`]
    : ['veris-assets.com', '*.veris-assets.com', '*.hosted.app', '*.web.app', '*.run.app'],
  rewrites() {
    return Promise.resolve(
      apiUrl ? [{ source: '/api/:path*', destination: `${apiUrl}/api/:path*` }] : [],
    );
  },
  // Security headers of every response (SPEC §24, P16-1); the Content Security Policy of the
  // pages is set per request in src/proxy.ts, with its nonce.
  headers() {
    return Promise.resolve([
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // same-origin-allow-popups allows Firebase Auth signInWithPopup on veris-assets.com
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
          },
          // Honoured by browsers over HTTPS (https://veris-assets.com and *.hosted.app / *.run.app).
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
        ],
      },
    ]);
  },
  poweredByHeader: false,
};

export default withNextIntl(nextConfig);
