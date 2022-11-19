/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  webpack: (config) => {
    config.module.rules.push(
      {
        test: /\.(mp3|glb)$/,
        type: 'asset',
      }
    );
    return config;
  },
  experimental: {
    externalDir: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3000/api/:path*',
      },
    ]
  },
}
