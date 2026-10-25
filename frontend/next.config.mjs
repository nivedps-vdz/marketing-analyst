/** @type {import('next').NextConfig} */
const backend = process.env.BACKEND_URL || "http://127.0.0.1:8000";

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Hide the Next.js development indicator (the floating "N" button and its menu).
  // Build and runtime errors are still shown in an overlay.
  devIndicators: false,
  // The browser only talks to Next.js; API calls are proxied to the local FastAPI backend.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${backend}/api/:path*` }];
  },
};

export default nextConfig;
