import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import {
  withAuth,
  success,
  validateRequired,
} from '@/lib/api-handler'
// auth 不再需要手动调用，withAuth 已包含认证
import { getDataFilterWithParticipants } from '@/lib/data-permission'
import { generateNo, NumberPrefixes } from '@/lib/generate-no'
import { logger } from '@/lib/logger'

// 获取委托单列表（含筛选和关联数据）
export const GET = withAuth(async (request: NextRequest, user) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const status = searchParams.get('status')
  const keyword = searchParams.get('keyword')
  const followerId = searchParams.get('followerId')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const sourceType = searchParams.get('sourceType')

  // 构建筛选条件
  const where: Record<string, unknown> = {}

  if (status) {
    where.status = status
  }

  if (followerId) {
    where.followerId = followerId
  }

  if (sourceType) {
    where.sourceType = sourceType
  }

  if (keyword) {
    where.OR = [
      { entrustmentNo: { contains: keyword } },
      { sampleName: { contains: keyword } },
      { contractNo: { contains: keyword } },
    ]
  }

  if ((startDate && startDate.trim()) || (endDate && endDate.trim())) {
    where.createdAt = {}
    if (startDate && startDate.trim()) (where.createdAt as Record<string, Date>).gte = new Date(startDate)
    if (endDate && endDate.trim()) (where.createdAt as Record<string, Date>).lte = new Date(endDate)
  }

  const skipPermission = searchParams.get('skipPermission')

  // 注入数据权限过滤（skipPermission=1 时跳过，用于客户报告生成等场景）
  if (skipPermission !== '1') {
    const permissionFilter = await getDataFilterWithParticipants(['followerId'])
    Object.assign(where, permissionFilter)
  }

  const [list, total] = await Promise.all([
    prisma.entrustment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            contact: true,
            phone: true,
          },
        },
        followerUser: {
          select: { id: true, name: true },
        },
        contract: {
          select: {
            id: true,
            contractNo: true,
            contractName: true,
            status: true,
            clientReportDeadline: true,
            sampleName: true,
            sampleModel: true,
            sampleMaterial: true,
            sampleQuantity: true,
          },
        },
        quotation: {
          select: {
            id: true,
            quotationNo: true,
            clientReportDeadline: true,
            followerId: true,
            followerUser: { select: { id: true, name: true } },
            items: {
              select: {
                sampleName: true,
                serviceItem: true,
              }
            }
          },
        },
        projects: {
          select: {
            id: true,
            name: true,
            testItems: true,
            method: true,
            standard: true,
            status: true,
            assignTo: true,
            subcontractor: true,
            subcontractAssignee: true,
            deviceId: true,
            deadline: true,
            assignDate: true,
          },
        },
        samples: {
          select: {
            id: true,
            sampleNo: true,
            name: true,
            type: true,
            specification: true,
            material: true,
            partNo: true,
            color: true,
            weight: true,
            supplier: true,
            oem: true,
            sampleCondition: true,
            quantity: true,
            status: true,
            remark: true,
            vehicleModel: true,
            manufactureDate: true,
            manufactureLotNo: true,
            packingDate: true,
            projectDeadline: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    }),
    prisma.entrustment.count({ where }),
  ])

  // 统计各状态数量
  const stats = await prisma.entrustment.groupBy({
    by: ['status'],
    _count: true,
  })

  // 处理列表数据，确保报告时间和跟单人显示
  const processedList = list.map((item: any) => {
    // 1. 如果委托单本身没有报告时间，尝试从报价单或合同获取
    if (!item.clientReportDeadline) {
      if (item.quotation?.clientReportDeadline) {
        item.clientReportDeadline = item.quotation.clientReportDeadline
      } else if (item.contract?.clientReportDeadline) {
        item.clientReportDeadline = item.contract.clientReportDeadline
      }
    }

    // 2. 如果委托单本身没有跟单人，尝试从报价单获取
    if (!item.followerId) {
      if (item.quotation?.followerId) {
        item.followerId = item.quotation.followerId
      }
    }


    return item
  })

  // 3. 查询 SampleTestItem 数据，直接挂到委托单对象上
  const entrustmentIds = processedList.map((e: any) => e.id)
  const sampleTestItems = await prisma.sampleTestItem.findMany({
    where: {
      bizType: 'entrustment',
      bizId: { in: entrustmentIds }
    },
    orderBy: { sortOrder: 'asc' }
  })

  // 按 bizId 分组，直接挂到对应委托单
  const stiByEntrustment: Record<string, any[]> = {}
  for (const item of sampleTestItems) {
    if (!stiByEntrustment[item.bizId]) {
      stiByEntrustment[item.bizId] = []
    }
    stiByEntrustment[item.bizId].push(item)
  }

  for (const entrustment of processedList) {
    // 将 SampleTestItem 数据挂到委托单上，供前端展开行使用
    entrustment.sampleTestItems = stiByEntrustment[entrustment.id] || []
  }



  return success({
    list: processedList,
    total,
    page,
    pageSize,
    stats: stats.reduce((acc: any, item: any) => {
      acc[item.status] = item._count
      return acc
    }, {} as Record<string, number>),
  })
})

// 创建委托单
export const POST = withAuth(async (request: NextRequest, user) => {
  const data = await request.json()

  // 记录请求数据用于调试
  logger.info('创建委托单请求', {
    data: {
      clientId: data.clientId,
      clientName: data.clientName,
      contractNo: data.contractNo,
      quotationId: data.quotationId,
      followerId: data.followerId,
      userId: user.id,
    }
  })

  // 验证必填字段 - 只验证 clientName
  if (!data.clientName) {
    console.log('[Entrustment Create] Missing clientName')
    throw new Error('缺少必填字段: clientName')
  }

  // BUG-04: 重复生成检查
  if (data.quotationId) {
    const existingEntrustment = await prisma.entrustment.findFirst({
      where: { quotationId: data.quotationId },
      select: { entrustmentNo: true },
    })
    if (existingEntrustment) {
      throw new Error(`该报价单已生成委托单 ${existingEntrustment.entrustmentNo}，不允许重复生成`)
    }
  }
  if (data.contractNo) {
    const existingEntrustment = await prisma.entrustment.findFirst({
      where: { contractNo: data.contractNo },
      select: { entrustmentNo: true },
    })
    if (existingEntrustment) {
      throw new Error(`该合同已生成委托单 ${existingEntrustment.entrustmentNo}，不允许重复生成`)
    }
  }

  // 生成委托单号
  const entrustmentNo = await generateNo(NumberPrefixes.ENTRUSTMENT, 4)
  console.log('[Entrustment Create] Generated entrustmentNo:', entrustmentNo)

  // 继承字段：报告截止日期和跟单人
  let inheritedDeadline = data.clientReportDeadline ? new Date(data.clientReportDeadline) : null
  let inheritedFollowerId = data.followerId || null

  // 如果从报价单生成
  if (data.quotationId && (!inheritedDeadline || !inheritedFollowerId)) {
    const quotation = await prisma.quotation.findUnique({
      where: { id: data.quotationId },
      select: { clientReportDeadline: true, followerId: true, clientContactPerson: true, clientPhone: true, clientEmail: true, clientAddress: true }
    })
    if (!inheritedDeadline && quotation?.clientReportDeadline) inheritedDeadline = quotation.clientReportDeadline
    if (!inheritedFollowerId && quotation?.followerId) inheritedFollowerId = quotation.followerId
    data.contactPerson = data.contactPerson || quotation?.clientContactPerson
    data.contactPhone = data.contactPhone || quotation?.clientPhone
    data.contactEmail = data.contactEmail || quotation?.clientEmail
    data.clientAddress = data.clientAddress || quotation?.clientAddress
  }

  // 如果从合同生成
  if (data.contractNo && (!inheritedDeadline || !inheritedFollowerId)) {
    const contract = await prisma.contract.findUnique({
      where: { contractNo: data.contractNo },
      select: { clientReportDeadline: true, followerId: true, partyAContact: true, partyATel: true, partyAEmail: true, partyAAddress: true }
    })
    if (!inheritedDeadline && contract?.clientReportDeadline) inheritedDeadline = contract.clientReportDeadline
    if (!inheritedFollowerId && contract?.followerId) inheritedFollowerId = contract.followerId
    data.contactPerson = data.contactPerson || contract?.partyAContact
    data.contactPhone = data.contactPhone || contract?.partyATel
    data.contactEmail = data.contactEmail || contract?.partyAEmail
    data.clientAddress = data.clientAddress || contract?.partyAAddress
  }

  // 从 Client 自动带出开票信息
  if (data.clientId) {
    const clientInfo = await prisma.client.findUnique({
      where: { id: data.clientId },
      select: { fax: true, creditCode: true, invoiceTitle: true, invoiceAddress: true, name: true }
    })
    if (clientInfo) {
      data.contactFax = data.contactFax || clientInfo.fax || null
      data.invoiceTitle = data.invoiceTitle || clientInfo.invoiceTitle || clientInfo.name || null
      data.taxId = data.taxId || clientInfo.creditCode || null
      data.invoiceAddress = data.invoiceAddress || clientInfo.invoiceAddress || null
    }
  }

  // 安全处理 clientId 和 quotationId：空字符串视为 null，防止 Prisma connect 外键错误
  const safeClientId = (typeof data.clientId === 'string' && data.clientId.trim() !== '') ? data.clientId.trim() : null
  const safeQuotationId = (typeof data.quotationId === 'string' && data.quotationId.trim() !== '') ? data.quotationId.trim() : null
  // 安全处理 followerId
  const safeFollowerId = (inheritedFollowerId && String(inheritedFollowerId).trim() !== '') ? inheritedFollowerId : null

  // 提取 schema 中存在的字段
  const createData: any = {
    entrustmentNo,
    contractNo: data.contractNo || null,
    quotation: safeQuotationId ? { connect: { id: safeQuotationId } } : undefined,
    client: safeClientId ? { connect: { id: safeClientId } } : undefined,
    contactPerson: data.contactPerson || null,
    contactPhone: data.contactPhone || null,
    contactFax: data.contactFax || null,
    contactEmail: data.contactEmail || null,
    clientAddress: data.clientAddress || null,
    sampleDate: data.sampleDate ? new Date(data.sampleDate) : new Date(),
    clientReportDeadline: inheritedDeadline,
    followerUser: safeFollowerId ? { connect: { id: safeFollowerId } } : undefined,
    isSampleReturn: data.isSampleReturn || false,
    // 开票信息
    invoiceTitle: data.invoiceTitle || null,
    taxId: data.taxId || null,
    invoiceAddress: data.invoiceAddress || null,
    // 报告配置
    reportFormat: data.reportFormat || null,
    reportGrouping: data.reportGrouping || null,
    reportDeliveryAddress: data.reportDeliveryAddress || null,
    // 服务项目
    serviceScope: data.serviceScope || null,
    reportLanguage: data.reportLanguage || null,
    urgencyLevel: data.urgencyLevel || 'normal',
    reportCopies: data.reportCopies || 1,
    reportDelivery: data.reportDelivery || null,
    acceptSubcontract: data.acceptSubcontract !== false,
    // 试验信息
    testType: data.testType || null,
    oemFactory: data.oemFactory || null,
    sampleDeliveryMethod: data.sampleDeliveryMethod || null,
    // 特殊要求
    specialRequirements: data.specialRequirements || null,
    printTerms: data.printTerms || null,
    sourceType: data.sourceType || null,
    status: data.status || 'pending',
    remark: data.remark || null,
    createdBy: user.id ? { connect: { id: user.id } } : undefined,
  }

  console.log('[Entrustment Create] createData:', JSON.stringify(createData, null, 2))

  // 创建委托单
  const entrustment = await prisma.entrustment.create({
    data: createData,
  })

  console.log('[Entrustment Create] Created entrustment:', entrustment.id)

  // BUG-01: 回写上游报价单/合同状态
  if (data.quotationId) {
    await prisma.quotation.update({
      where: { id: data.quotationId },
      data: { status: 'entrusted' },
    })
  }
  if (data.contractNo) {
    await prisma.contract.updateMany({
      where: { contractNo: data.contractNo },
      data: { status: 'entrusted' },
    })
  }

  // 创建检测项目（自动匹配检测模板）
  const projects = data.projects
  if (projects && Array.isArray(projects) && projects.length > 0) {
    const validProjects = projects.filter((p: { name?: string }) => p.name)
    if (validProjects.length > 0) {
      // 查询所有活跃的检测模板，按名称自动匹配
      const activeTemplates = await prisma.testTemplate.findMany({
        where: { status: 'active' },
        select: { id: true, name: true },
      })

      await prisma.entrustmentProject.createMany({
        data: validProjects.map((p: { name: string; testItems?: string | string[]; method?: string; standard?: string }) => {
          // 按名称模糊匹配模板（检测项目名称包含模板名称，或模板名称包含检测项目名称）
          const matchedTemplate = activeTemplates.find(t =>
            p.name.includes(t.name) || t.name.includes(p.name)
          )
          return {
            entrustmentId: entrustment.id,
            name: p.name,
            testItems: typeof p.testItems === 'string' ? p.testItems : JSON.stringify(p.testItems || []),
            method: p.method || null,
            standard: p.standard || null,
            testTemplateId: matchedTemplate?.id || null,
            status: 'pending',
          }
        })
      })
      console.log('[Entrustment Create] Created projects:', validProjects.length)
    }
  }

  // 创建样品 Sample records
  // 所有样品初始状态为 pending（待收样），需要在收样登记页面手动确认收样
  if (data.samples && Array.isArray(data.samples) && data.samples.length > 0) {
    // 预先查出该委托单的所有检测项（bizType='entrustment'），用于同步到样品
    const entrustmentTestItems = await prisma.sampleTestItem.findMany({
      where: { bizType: 'entrustment', bizId: entrustment.id },
      orderBy: { sortOrder: 'asc' },
    })

    for (const sample of data.samples) {
      const sampleNo = await generateNo(NumberPrefixes.SAMPLE, 4)
      const createdSample = await prisma.sample.create({
        data: {
          sampleNo,
          entrustmentId: entrustment.id,
          name: sample.name,
          type: sample.type || sample.model,
          specification: sample.specification || sample.material || sample.model, // 优先用材质/牌号
          material: sample.material,
          partNo: sample.partNo || null,
          color: sample.color || null,
          weight: sample.weight || null,
          supplier: sample.supplier || null,
          oem: sample.oem || null,
          sampleCondition: sample.sampleCondition || null,
          vehicleModel: sample.vehicleModel || null,
          manufactureDate: sample.manufactureDate ? new Date(sample.manufactureDate) : null,
          manufactureLotNo: sample.manufactureLotNo || null,
          packingDate: sample.packingDate ? new Date(sample.packingDate) : null,
          projectDeadline: sample.projectDeadline ? new Date(sample.projectDeadline) : null,
          quantity: String(sample.quantity || 1),
          status: 'pending',
          remark: sample.remark || null,
          createdById: user.id,
        }
      })

      // 同步检测项到 sample_receipt：按样品名匹配委托单检测项
      const matchedItems = entrustmentTestItems.filter(
        item => item.sampleName === sample.name
      )
      if (matchedItems.length > 0) {
        await prisma.sampleTestItem.createMany({
          data: matchedItems.map((item, index) => ({
            bizType: 'sample_receipt',
            bizId: createdSample.id,
            sampleName: item.sampleName,
            batchNo: item.batchNo,
            material: item.material,
            appearance: item.appearance,
            quantity: item.quantity,
            testTemplateId: item.testTemplateId,
            testItemName: item.testItemName,
            testStandard: item.testStandard,
            judgmentStandard: item.judgmentStandard,
            testCategory: item.testCategory,
            testMethod: item.testMethod,
            samplingLocation: item.samplingLocation,
            specimenCount: item.specimenCount,
            testRemark: item.testRemark,
            sortOrder: index,
          })),
        })
      }
    }
    console.log('[Entrustment Create] Created samples:', data.samples.length)
  }

  // 自动生成客户报告编号
  if (data.reportGrouping) {
    const { generateClientReportsForEntrustment } = await import('@/lib/generate-client-reports')
    const createdSamples = await prisma.sample.findMany({
      where: { entrustmentId: entrustment.id },
      select: { id: true, name: true },
    })
    const createdProjects = await prisma.entrustmentProject.findMany({
      where: { entrustmentId: entrustment.id },
      select: { id: true, name: true },
    })

    await generateClientReportsForEntrustment({
      entrustmentId: entrustment.id,
      reportGrouping: data.reportGrouping,
      reportCopies: data.reportCopies || 1,
      samples: createdSamples,
      projects: createdProjects,
      clientName: data.clientName,
    })
    console.log('[Entrustment Create] Client reports generated for grouping:', data.reportGrouping)
  }

  // 返回完整数据
  const result = await prisma.entrustment.findUnique({
    where: { id: entrustment.id },
    include: {
      client: true,
      contract: true,
      projects: true,
      samples: true,
    },
  })

  console.log('[Entrustment Create] Success!')
  return success(result)
})
