/**
 * @file 委托单项目API路由
 * @desc GET /api/entrustment/[id]/projects - 获取委托单的检测项目列表
 * @output 转换为 SampleTestItemData 格式
 * @see PRD: docs/plans/2026-01-30-sample-receipt-tdd.md
 */

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import { success, error } from '@/lib/api-handler'

interface TestItem {
  name: string
  standard?: string
}

export const GET = withAuth(async (
  request: NextRequest,
  session: any,
  context?: { params: Promise<Record<string, string>> }
) => {
  const params = await context?.params
  const id = params?.id

  // 1. 查询委托单及其项目
  const entrustment = await prisma.entrustment.findUnique({
    where: { id },
    include: {
      projects: true,
    },
  })

  // 2. 验证委托单是否存在
  if (!entrustment) {
    return error('NOT_FOUND', '委托单不存在', 404)
  }

  // 3. 转换项目为检测项格式
  const testItems: any[] = []

  for (const project of entrustment.projects) {
    try {
      // 解析 testItems JSON
      const items = JSON.parse(project.testItems) as TestItem[]

      // 跳过空数组
      if (!Array.isArray(items) || items.length === 0) {
        continue
      }

      // 转换每个检测项
      for (const item of items) {
        testItems.push({
          key: `${project.id}-${item.name}`,
          sampleName: project.name,
          testItemName: item.name,
          testStandard: item.standard || project.method,
          testTemplateId: project.testTemplateId,
          quantity: 1,
        })
      }
    } catch (e) {
      // JSON解析失败
      return error('JSON_PARSE_ERROR', `JSON解析失败: ${(e as Error).message}`, 400)
    }
  }

  return success(testItems)
})
