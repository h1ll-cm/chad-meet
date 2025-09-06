/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['livekit-client', '@livekit/components-react'],
  experimental: {
    esmExternals: 'loose',
  },
  webpack: (config) => {
    config.externals = config.externals || [];
    config.externals.push({
      'livekit-client': 'commonjs livekit-client',
    });
    return config;
  },
}

module.exports = nextConfig
