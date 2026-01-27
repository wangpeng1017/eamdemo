import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withAuth, success, notFound } from '@/lib/api-handler'

export const GET = withAuth(async (
  request: NextRequest,
  user,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params
  const contract = await prisma.contract.findUnique({
    where: { id },
    include: { client: true, quotation: true, items: true },
  })
  if (!contract) notFound('合同不存在')
  return success(contract)
})

export const PUT = withAuth(async (
  request: NextRequest,
  user,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params
  const data = await request.json()

  // 分离 items 数据
  const { items, ...contractData } = data

  const result = await prisma.$transaction(async (tx) => {
    // 1. 更新合同主体
    const contract = await tx.contract.update({
      where: { id },
      data: contractData
    })

    // 2. 如果提供了 items，则更新明细
    if (items && Array.isArray(items)) {
      // 删除旧明细
      await tx.contractItem.deleteMany({
        where: { contractId: id }
      })

      // 创建新明细
      if (items.length > 0) {
        await tx.contractItem.createMany({
          data: items.map((item: any, index: number) => ({
            contractId: id,
            serviceItem: item.serviceItem,
            methodStandard: item.methodStandard,
            quantity: Number(item.quantity) || 1,
            unitPrice: Number(item.unitPrice) || 0,
            totalPrice: Number(item.totalPrice) || 0,
            sort: index
          }))
        })
      }
    }

    return contract
  })

  return success(result)
})

export const DELETE = withAuth(async (
  request: NextRequest,
  user,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params
  await prisma.contract.delete({ where: { id } })
  return success({ success: true })
})
