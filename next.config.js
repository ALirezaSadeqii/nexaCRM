/** @type {import('next').NextConfig} */
const nextConfig = {
  // Export a fully static bundle that GitHub Pages can host
  output: 'export',
  distDir: 'out',

  // Reduce chunk splitting to minimize loading errors
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },

  // Configure webpack for better chunk handling
  webpack: (config, { dev }) => {
    if (dev) {
      // In development, reduce chunk splitting
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: {
              minChunks: 1,
              priority: -20,
              reuseExistingChunk: true,
            },
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              priority: -10,
              chunks: 'all',
            },
          },
        },
      }
    }

    return config
  },

  // Enable static optimization
  trailingSlash: false,

  // Disable x-powered-by header
  poweredByHeader: false,
}
  
module.exports = nextConfig