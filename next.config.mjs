/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allows CI/verification builds to run beside a live `next dev` without
  // fighting over .next (e.g. NEXT_DIST_DIR=.next-build npm run build).
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
