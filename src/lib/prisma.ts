/**
 * @file prisma.ts
 * @desc Prisma ORM 客户端单例（运行时读取 DATABASE_URL，避免构建时硬编码）
 * @input: process.env.DATABASE_URL
 * @output: prisma 实例（供所有数据库操作使用）
 * @pos: 数据库访问统一入口
 * ⚠️ 更新我时，请同步更新 src/lib/_INDEX.md
 */

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// 强制使用运行时 DATABASE_URL，避免构建时硬编码
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
