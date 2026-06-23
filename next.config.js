const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {}, // IMPORTANT: silences Next 16 conflict
};

module.exports = withPWA(nextConfig);


module.exports = nextConfig;


module.exports = withPWA({
  reactStrictMode: true,

  // optional but recommended for PWA stability
  swcMinify: true,
});