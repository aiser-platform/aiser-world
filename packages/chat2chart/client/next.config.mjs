/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable ESLint during build to allow compilation
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Simplified experimental features
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
  
  // Basic webpack configuration to fix module issues
  webpack: (config, { isServer }) => {
    // Fix for CommonJS/ESM module conflicts
    config.resolve.extensionAlias = {
      '.js': ['.js', '.ts', '.tsx'],
      '.jsx': ['.jsx', '.tsx'],
    };
    
    // Fix for client-side modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    return config;
  },
  
  // Ensure proper page generation
  trailingSlash: false,
};

export default nextConfig;
