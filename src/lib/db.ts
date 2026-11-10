import { PrismaClient } from "@prisma/client";

// 开发环境下 Next.js 会热重载模块，用全局变量复用连接，避免 SQLite 连接数爆掉
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
