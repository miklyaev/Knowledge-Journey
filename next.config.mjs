/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/gigachat/:path*',
        destination: 'http://localhost:3031/api/gigachat/:path*',
      },
      {
        source: '/api/yandexgpt/:path*',
        destination: 'http://localhost:3031/api/yandexgpt/:path*',
      },
      {
        source: '/api/health',
        destination: 'http://localhost:3031/api/health',
      },
    ];
  },
};

export default nextConfig;
