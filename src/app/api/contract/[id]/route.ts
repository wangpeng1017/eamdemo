import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withErrorHandler, success, notFound } from '@/lib/api-handler'

export const GET = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params
  const contract = await prisma.contract.findUnique({
    where: { id },
    include: { client: true, quotation: true, contractSamples: true },
  })
  if (!contract) notFound('合同不存在')
  return success(contract)
})

export const PUT = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params
  const data = await request.json()

  // 分离 items 和 samples 数据
  const { items, samples, ...contractData } = data

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

    // 3. 如果提供了 samples，则更新样品
    if (samples && Array.isArray(samples)) {
      // 删除旧样品
      await tx.contractSample.deleteMany({
        where: { contractId: id }
      })

      // 创建新样品
      if (samples.length > 0) {
        await tx.contractSample.createMany({
          data: samples.map((sample: any) => ({
            contractId: id,
            name: sample.name,
            model: sample.model,
            material: sample.material,
            quantity: parseInt(sample.quantity, 10) || 1,
            remark: sample.remark
          }))
        })
      }
    }

    return contract
  })

  return success(result)
})

export const DELETE = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params
  await prisma.contract.delete({ where: { id } })
  return success({ success: true })
})
