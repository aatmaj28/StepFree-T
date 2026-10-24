/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  // Make sure the committed offline snapshot ships with the serverless functions on Vercel.
  outputFileTracingIncludes: { "/api/**/*": ["./lib/data/snapshots/**/*"] },
};
export default nextConfig;
