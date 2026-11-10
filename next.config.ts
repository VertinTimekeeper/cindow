import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma 的查询引擎是原生模块，交给 Node 运行时处理，不参与打包
  serverExternalPackages: ["@prisma/client"],
  // 上传的视频可能较大，骨架阶段用本地磁盘承接（详见 PLAN.md 的存储方案）
  experimental: {
    serverActions: {
      bodySizeLimit: "512mb",
    },
  },
};

export default nextConfig;
