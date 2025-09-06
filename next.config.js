/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['livekit-client', '@livekit/components-react'],
  experimental: {
    esmExternals: 'loose',
  },
}

module.exports = nextConfig
