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

  // 1. 优先尝试从 SampleTestItem 表查询 (新系统)
  // 检查是否有 bizType='entrustment' 且 bizId=id 的记录
  const sampleTestItems = await prisma.sampleTestItem.findMany({
    where: {
      bizType: 'entrustment',
      bizId: id,
    },
    orderBy: {
      sortOrder: 'asc',
    },
  })

  // 如果找到了新系统的检测项数据，直接返回
  if (sampleTestItems.length > 0) {
    const formattedItems = sampleTestItems.map(item => ({
      key: item.id,
      id: item.id,
      sampleName: item.sampleName,
      batchNo: item.batchNo,
      material: item.material,
      appearance: item.appearance,
      quantity: item.quantity,
      testTemplateId: item.testTemplateId,
      testItemName: item.testItemName,
      testStandard: item.testStandard,
      judgmentStandard: item.judgmentStandard,
    }))
    return success(formattedItems)
  }

  // 2. 如果没有找到，查询委托单及其项目 (旧系统兼容)
  const entrustment = await prisma.entrustment.findUnique({
    where: { id },
    include: {
      projects: true,
    },
  })

  // 验证委托单是否存在
  if (!entrustment) {
    return error('NOT_FOUND', '委托单不存在', 404)
  }

  // 3. 转换项目为检测项格式
  const testItems: any[] = []

  for (const project of entrustment.projects) {
    try {
      // 解析 testItems JSON
      let items: string[] | TestItem[]

      if (typeof project.testItems === 'string') {
        items = JSON.parse(project.testItems)
      } else if (Array.isArray(project.testItems)) {
        items = project.testItems
      } else {
        continue
      }

      // 跳过空数组
      if (!Array.isArray(items) || items.length === 0) {
        continue
      }

      // 判断是字符串数组还是对象数组
      if (items.length > 0 && typeof items[0] === 'string') {
        // 字符串数组格式: ["抗拉强度", "屈服强度"]
        for (const itemName of items) {
          testItems.push({
            key: `${project.id}-${itemName}`,
            sampleName: project.name,
            testItemName: itemName,
            testStandard: project.method,
            testTemplateId: project.testTemplateId,
            quantity: 1,
          })
        }
      } else {
        // 对象数组格式: [{ name, standard }]
        for (const item of items as TestItem[]) {
          testItems.push({
            key: `${project.id}-${item.name}`,
            sampleName: project.name,
            testItemName: item.name,
            testStandard: item.standard || project.method,
            testTemplateId: project.testTemplateId,
            quantity: 1,
          })
        }
      }
    } catch (e) {
      // JSON解析失败，记录错误但继续处理下一个项目
      console.error(`解析项目 ${project.id} 的检测项失败:`, e)
      continue
    }
  }

  return success(testItems)
})
