import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withAuth, success, notFound } from '@/lib/api-handler'

// 获取委托单位的关联数据统计
export const GET = withAuth(async (
  request: NextRequest,
  user,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params
  console.log(`[API] Checking relations for client: ${id}`)

  // 检查委托单位是否存在
  const client = await prisma.client.findUnique({
    where: { id },
    select: { name: true }
  })

  if (!client) {
    notFound('委托单位不存在')
  }

  // 统计关联数据
  const [entrustmentCount, quotationCount, contractCount] = await Promise.all([
    prisma.entrustment.count({ where: { clientId: id } }),
    prisma.quotation.count({ where: { clientId: id } }),
    prisma.contract.count({ where: { clientId: id } }),
  ])

  return success({
    clientName: client.name,
    entrustmentCount,
    quotationCount,
    contractCount,
    canDelete: entrustmentCount === 0 && quotationCount === 0 && contractCount === 0,
    message: (() => {
      const reasons = []
      if (entrustmentCount > 0) reasons.push(`${entrustmentCount} 个委托单`)
      if (quotationCount > 0) reasons.push(`${quotationCount} 个报价单`)
      if (contractCount > 0) reasons.push(`${contractCount} 个合同`)
      return reasons.length > 0 ? `该委托单位有 ${reasons.join('、')}，无法删除` : '可以删除'
    })()
  })
})
