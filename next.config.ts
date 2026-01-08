/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    // 类型检查已启用
    ignoreBuildErrors: false,
  },
  eslint: {
    // 构建时忽略 ESLint 报错，避免非关键警告阻塞部署
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
