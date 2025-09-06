const withTM = require('next-transpile-modules')(['livekit-client', '@livekit/components-react']);

module.exports = withTM({
  experimental: {
    esmExternals: 'loose',
  },
});
