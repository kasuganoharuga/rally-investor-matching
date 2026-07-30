import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // GitHub Actions runs `typecheck:web` before deployment. The formal EC2
    // host can skip Next.js's duplicate check to keep its 2 GB build stable.
    ignoreBuildErrors: process.env.RALLY_DEPLOY_SKIP_TYPECHECK === "1",
  },
};

export default nextConfig;
