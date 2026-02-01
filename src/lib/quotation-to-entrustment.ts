/**
 * @file 报价单直接生成委托单功能
 * @desc 支持跳过合同，从报价单直接生成委托单
 * @see PRD: docs/plans/2026-01-28-business-workflow-enhancement-design.md#模块1
 */

import { prisma } from '@/lib/prisma'
import { generateNo, NumberPrefixes } from '@/lib/generate-no'

/**
 * 委托单来源类型
 */
export type EntrustmentSourceType = 'contract' | 'quotation' | 'direct'

/**
 * 从报价单创建委托单参数
 */
export interface CreateEntrustmentFromQuotationParams {
  quotationId: string          // 报价单ID（必填）
  contactPerson?: string       // 联系人
  sampleDate?: Date | string  // 送样时间
  follower?: string            // 跟进人
  remark?: string              // 备注
}

/**
 * 委托单创建结果
 */
export interface EntrustmentCreationResult {
  success: boolean
  entrustmentId: string
  entrustmentNo: string
  quotationNo: string
  contractNo?: string          // 如果报价单有关联合同则返回
  message: string
}

/**
 * 生成委托单编号（WT+年月日+序号）
 * 格式: WT-YYYYMMDD-XXX
 */
export async function generateEntrustmentNo(): Promise<string> {
  const no = await generateNo(NumberPrefixes.ENTRUSTMENT, 3)
  // generateNo 返回格式: WT20260201001，需要转换为 WT-20260201-001
  const prefix = no.slice(0, 2)  // WT
  const date = no.slice(2, 10)   // 20260201
  const seq = no.slice(10)       // 001
  return `${prefix}-${date}-${seq}`
}

/**
 * 检查报价单是否可以生成委托单
 *
 * 规则：
 * - 必须是approved状态
 * - 报价单必须存在
 */
export async function canCreateEntrustmentFromQuotation(
  quotationId: string
): Promise<{ canCreate: boolean; reason?: string }> {
  // 查询报价单
  const quotation = await prisma.quotation.findUnique({
    where: { id: quotationId },
    select: {
      id: true,
      quotationNo: true,
      status: true
    }
  })

  if (!quotation) {
    return { canCreate: false, reason: '报价单不存在' }
  }

  // 验证状态
  if (quotation.status !== 'approved') {
    return { canCreate: false, reason: '报价单未审批通过，无法生成委托单' }
  }

  return { canCreate: true }
}

/**
 * 从报价单创建委托单
 *
 * 功能说明：
 * 1. 从报价单读取基础信息（客户、联系方式等）
 * 2. 复制检测项目到委托单
 * 3. 记录来源为quotation，同时记录quotationId
 * 4. 如果报价单有关联合同，同时记录contractNo
 *
 * @param params - 创建参数
 * @param createdBy - 创建人ID
 * @returns 创建结果
 *
 * @example
 * ```typescript
 * const result = await createEntrustmentFromQuotation({
 *   quotationId: 'quotation-123',
 *   contactPerson: '张三',
 *   sampleDate: new Date(),
 *   follower: '李四'
 * }, 'user-456')
 * ```
 */
export async function createEntrustmentFromQuotation(
  params: CreateEntrustmentFromQuotationParams,
  createdBy: string
): Promise<EntrustmentCreationResult> {
  const { quotationId } = params

  // 1. 验证报价单
  const canCreate = await canCreateEntrustmentFromQuotation(quotationId)
  if (!canCreate.canCreate) {
    throw new Error(canCreate.reason)
  }

  // 2. 查询报价单详细信息
  const quotation = await prisma.quotation.findUnique({
    where: { id: quotationId },
    include: {
      items: true,
      client: true
    }
  })

  if (!quotation) {
    throw new Error('报价单不存在')
  }

  // 3. 生成委托单编号
  const entrustmentNo = await generateEntrustmentNo()

  // 4. 创建委托单
  const entrustment = await prisma.entrustment.create({
    data: {
      entrustmentNo,
      quotationNo: quotation.quotationNo,
      quotationId: quotation.id,
      contractNo: quotation.contractNo || undefined,  // 如果有关联合同则记录
      clientId: quotation.clientId,
      contactPerson: params.contactPerson || quotation.clientContactPerson,
      sampleDate: params.sampleDate ? new Date(params.sampleDate) : undefined,
      follower: params.follower || quotation.follower,
      sourceType: 'quotation',
      status: 'pending',
      remark: params.remark,
      createdById: createdBy
    }
  })

  // 5. 复制检测项目到委托单
  const projects = await Promise.all(
    quotation.items.map(item =>
      prisma.entrustmentProject.create({
        data: {
          entrustmentId: entrustment.id,  // 使用 id 而不是 entrustmentNo
          name: item.serviceItem,          // serviceName -> name
          testItems: '[]',                 // 检测参数列表（空数组）
          method: item.methodStandard      // testStandard -> method
        }
      })
    )
  )

  return {
    success: true,
    entrustmentId: entrustment.id,
    entrustmentNo: entrustment.entrustmentNo,
    quotationNo: quotation.quotationNo,
    contractNo: quotation.contractNo || undefined,
    message: `委托单创建成功，已复制 ${projects.length} 个检测项目`
  }
}

