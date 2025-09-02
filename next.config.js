/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  output: 'standalone', // 输出为独立文件
  compress: true, // 压缩
  trailingSlash: true, // 尾随斜杠
  experimental: {
    // optimizePackageImports: ['@mantine/core', '@mantine/hooks', '@mantine/carousel'],
    staleTimes: {
      dynamic: 0,
    },
  },
  // 允许从任何域名加载图片和视频
  images: {
    domains: ['*'],
    unoptimized: true,
  },
};

module.exports = nextConfig;