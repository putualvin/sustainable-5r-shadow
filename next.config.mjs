/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Allow photo uploads (camera images can be several MB) via Server Actions.
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
