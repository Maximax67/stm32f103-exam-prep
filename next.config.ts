import type { NextConfig } from 'next';

const isProd = process.env.NODE_ENV === 'production';
const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  basePath: isProd ? '/stm32f103-exam-prep' : '',
  assetPrefix: isProd ? '/stm32f103-exam-prep' : '',
};

export default nextConfig;
