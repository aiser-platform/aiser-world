/**
 * Next.js rewrites to proxy auth service under the same origin during development.
 * This avoids cross-port cookie issues by making auth requests appear same-origin.
 */
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Avoid failing builds due to ESLint plugin issues in CI/dev images;
  // we'll still run lint in CI, but avoid blocking the Next build here.
  eslint: {
    ignoreDuringBuilds: true,
  },
  // No rewrites here: the API route `pages/api/auth/[...path]` will proxy to auth-service
};

module.exports = nextConfig;


