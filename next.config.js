/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  webpack: (config) => {
    config.ignoreWarnings = [
      (warning) =>
        typeof warning.message === 'string' &&
        warning.message.includes('Critical dependency: the request of a dependency is an expression'),
    ];
    return config;
  },
}

module.exports = nextConfig 