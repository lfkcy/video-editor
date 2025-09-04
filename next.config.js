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
  webpack: (config, { isServer }) => {
    // 启用 WebAssembly 异步加载
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    // 解决 fs 模块在浏览器端不存在的问题
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
      };
    }

    return config;
  },
  // 允许从任何域名加载图片和视频
  images: {
    domains: ['*'],
    unoptimized: true,
  },
};

module.exports = nextConfig;