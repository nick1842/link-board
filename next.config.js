const withPWA = require("next-pwa")({
  dest: "public",

  // 👇 important for development/testing
  disable: process.env.NODE_ENV === "development",

  register: true,
  skipWaiting: true,
});

const nextConfig = {
  webpack(config) {
    return config;
  },
};

module.exports = nextConfig;

module.exports = withPWA({
  reactStrictMode: true,

  // optional but recommended for PWA stability
  swcMinify: true,
});