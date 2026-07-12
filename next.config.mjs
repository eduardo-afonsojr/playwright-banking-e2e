/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Disable the client-side Router Cache for dynamic pages. Account
    // balances must never be served stale: without this, navigating back
    // to an already-visited page (e.g. the dashboard right after a
    // transfer) reuses its cached payload for up to 30 seconds.
    staleTimes: {
      dynamic: 0,
    },
  },
};

export default nextConfig;
