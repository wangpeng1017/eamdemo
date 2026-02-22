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
  followerId?: string            // 跟进人用户ID
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
 * 生成委托单编号
 * 格式: WT + YYYYMMDD + NNNN
 */
export async function generateEntrustmentNo(): Promise<string> {
  return generateNo(NumberPrefixes.ENTRUSTMENT)
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
): Promise<{ canCreate: boolean; reason?: string; existingEntrustmentNo?: string }> {
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

  // 检查是否已生成过委托单（一个报价单只能生成一个委托单）
  const existingEntrustment = await prisma.entrustment.findFirst({
    where: { quotationId },
    select: { entrustmentNo: true }
  })

  if (existingEntrustment) {
    return {
      canCreate: false,
      reason: `该报价单已生成委托单（${existingEntrustment.entrustmentNo}），不可重复生成`,
      existingEntrustmentNo: existingEntrustment.entrustmentNo,
    }
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
 *   followerId: 'user-789'
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
      // quotationNo 字段在 Entrustment Schema 中不存在，只使用 quotationId 关联
      quotationId: quotation.id,
      contractNo: quotation.contractNo || undefined,  // 如果有关联合同则记录
      clientId: quotation.clientId,
      contactPerson: params.contactPerson || quotation.clientContactPerson,
      contactPhone: quotation.clientPhone,
      contactEmail: quotation.clientEmail,
      clientAddress: quotation.clientAddress,
      sampleDate: params.sampleDate ? new Date(params.sampleDate) : undefined,
      clientReportDeadline: quotation.clientReportDeadline, // 自动带入报告时间
      followerId: params.followerId || quotation.followerId,
      sourceType: 'quotation',
      status: 'pending',
      remark: params.remark,
      createdById: createdBy,
      // 从客户信息继承开票信息
      invoiceTitle: quotation.client?.invoiceTitle || quotation.client?.name || null,
      taxId: quotation.client?.creditCode || null,
      invoiceAddress: quotation.client?.invoiceAddress || null,
    }
  })

  // 回写报价单状态为 entrusted
  await prisma.quotation.update({
    where: { id: quotationId },
    data: { status: 'entrusted' },
  })

  // 5. 从报价单 items + sampleTestItems 创建样品记录（按 sampleName 去重，聚合信息）
  // 先预查 SampleTestItem，用于聚合样品详细信息
  const quotationSampleTestItems = await prisma.sampleTestItem.findMany({
    where: { bizType: 'quotation', bizId: quotation.id },
    orderBy: { sortOrder: 'asc' }
  })

  // 按样品名称聚合信息（从 SampleTestItem 中提取）
  const sampleInfoMap = new Map<string, {
    material?: string
    batchNo?: string
    appearance?: string
    quantity: number
    testItems: string[]
    testStandards: string[]
  }>()

  for (const item of quotationSampleTestItems) {
    if (!item.sampleName) continue
    const existing = sampleInfoMap.get(item.sampleName) || {
      material: undefined,
      batchNo: undefined,
      appearance: undefined,
      quantity: 1,
      testItems: [],
      testStandards: [],
    }
    // 取第一个非空值
    if (item.material && !existing.material) existing.material = item.material
    if (item.batchNo && !existing.batchNo) existing.batchNo = item.batchNo
    if (item.appearance && !existing.appearance) existing.appearance = item.appearance
    if (item.quantity > existing.quantity) existing.quantity = item.quantity
    if (item.testItemName) existing.testItems.push(item.testItemName)
    if (item.testStandard) existing.testStandards.push(item.testStandard)
    sampleInfoMap.set(item.sampleName, existing)
  }

  // 补充来自 quotation.items 的信息（v1 数据源）
  for (const item of quotation.items) {
    if (!item.sampleName) continue
    if (!sampleInfoMap.has(item.sampleName)) {
      sampleInfoMap.set(item.sampleName, {
        quantity: 1,
        testItems: item.serviceItem ? [item.serviceItem] : [],
        testStandards: item.methodStandard ? [item.methodStandard] : [],
      })
    }
  }

  // 创建 Sample 记录
  const sampleNames = [...sampleInfoMap.keys()]
  if (sampleNames.length > 0) {
    for (const sampleName of sampleNames) {
      const info = sampleInfoMap.get(sampleName)!
      const sampleNo = await generateNo(NumberPrefixes.SAMPLE, 4)
      await prisma.sample.create({
        data: {
          sampleNo,
          entrustmentId: entrustment.id,
          name: sampleName,
          material: info.material || undefined,
          manufactureLotNo: info.batchNo || undefined,
          quantity: String(info.quantity || 1),
          status: params.sampleDate && new Date(params.sampleDate).getTime() > Date.now() + 86400000 ? 'pending' : 'received',
          createdById: createdBy,
          // 将检测项和标准简要写入备注
          remark: [
            info.testItems.length > 0 ? `检测项目: ${[...new Set(info.testItems)].join(', ')}` : '',
            info.testStandards.length > 0 ? `检测标准: ${[...new Set(info.testStandards)].join(', ')}` : '',
          ].filter(Boolean).join('\n') || undefined,
        }
      })
    }
  } else {
    // 兜底：如果 SampleTestItem 和 items 都没有 sampleName，用 items 创建
    const itemSampleNames = [...new Set(
      quotation.items.map(item => item.sampleName).filter(Boolean) as string[]
    )]
    for (const sampleName of itemSampleNames) {
      const sampleNo = await generateNo(NumberPrefixes.SAMPLE, 4)
      await prisma.sample.create({
        data: {
          sampleNo,
          entrustmentId: entrustment.id,
          name: sampleName,
          quantity: '1',
          status: 'received',
          createdById: createdBy,
        }
      })
    }
  }

  // 6. 复制检测项目到委托单 (v1 兼容字段)
  const projects = await Promise.all(
    quotation.items.map(item =>
      prisma.entrustmentProject.create({
        data: {
          entrustmentId: entrustment.id,
          name: item.sampleName || item.serviceItem,
          testItems: '[]',
          method: item.methodStandard
        }
      })
    )
  )

  // 7. 复制样品检测项到委托单 (v2 样品表，含 ⑥⑦ 所需的所有字段)
  // 合并策略: 先复制 v2 SampleTestItem，再补充 v1 QuotationItem 中不在 v2 中的项目
  const allSampleTestItemData: any[] = []

  // 7a. 从 v2 SampleTestItem 复制
  if (quotationSampleTestItems.length > 0) {
    for (const item of quotationSampleTestItems) {
      allSampleTestItemData.push({
        bizType: 'entrustment',
        bizId: entrustment.id,
        sampleName: item.sampleName,
        batchNo: item.batchNo,
        material: item.material,
        appearance: item.appearance,
        quantity: item.quantity,
        testTemplateId: item.testTemplateId,
        testItemName: item.testItemName,
        testStandard: item.testStandard,
        judgmentStandard: item.judgmentStandard,
        testCategory: item.testCategory || 'component',
        testMethod: item.testMethod,
        samplingLocation: item.samplingLocation,
        specimenCount: item.specimenCount,
        testRemark: item.testRemark,
        materialName: item.materialName,
        materialCode: item.materialCode,
        materialSupplier: item.materialSupplier,
        materialSpec: item.materialSpec,
        materialSampleStatus: item.materialSampleStatus,
        sortOrder: allSampleTestItemData.length,
      })
    }
  }

  // 7b. 补充 v1 QuotationItem 中不在 v2 样品名集合里的项目
  const v2SampleNames = new Set(quotationSampleTestItems.map(i => i.sampleName).filter(Boolean))
  for (const item of quotation.items) {
    if (!item.sampleName || v2SampleNames.has(item.sampleName)) continue
    allSampleTestItemData.push({
      bizType: 'entrustment',
      bizId: entrustment.id,
      sampleName: item.sampleName,
      testItemName: item.serviceItem || '',
      testStandard: item.methodStandard || '',
      testCategory: 'component',
      quantity: parseInt(String(item.quantity)) || 1,
      sortOrder: allSampleTestItemData.length,
    })
  }

  if (allSampleTestItemData.length > 0) {
    await prisma.sampleTestItem.createMany({ data: allSampleTestItemData })
  }

  return {
    success: true,
    entrustmentId: entrustment.id,
    entrustmentNo: entrustment.entrustmentNo,
    quotationNo: quotation.quotationNo,
    contractNo: quotation.contractNo || undefined,
    message: `委托单创建成功，已复制 ${projects.length} 个检测项目`
  }
}

