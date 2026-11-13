/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Optional Privy peer used only for Farcaster mini-apps; Zermitt uses
    // Privy for Google identity only, so resolve it to an empty module.
    config.resolve.alias = { ...config.resolve.alias, "@farcaster/mini-app-solana": false };
    return config;
  },
};

export default nextConfig;
