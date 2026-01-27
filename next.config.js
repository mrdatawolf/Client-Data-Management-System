/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Standalone output for packaging as executable
  output: 'standalone',

  // Exclude large directories from standalone build to prevent size bloat
  outputFileTracingExcludes: {
    '*': [
      './distribute/**',
      './dist-electron/**',
      './dist-server/**',
      './temp-server-build/**',
      './.node-portable/**',
      './electron-app/node_modules/**',
    ],
  },

  // Disable image optimization to avoid Sharp dependency issues
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
