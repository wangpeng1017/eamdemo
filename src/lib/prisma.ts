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
// 动态添加连接池参数，避免连接池耗尽
function getDatabaseUrl(): string {
  const baseUrl = process.env.DATABASE_URL
  if (!baseUrl) throw new Error('DATABASE_URL is not set')

  // 如果已经包含连接池参数，直接返回
  if (baseUrl.includes('connection_limit')) {
    return baseUrl
  }

  // 添加连接池参数
  const separator = baseUrl.includes('?') ? '&' : '?'
  return `${baseUrl}${separator}schema=lims&connect_timeout=30&pool_timeout=60&connection_limit=10`
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: getDatabaseUrl()
    }
  },
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error', 'warn'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
