import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import {
  withErrorHandler,
  success,
  validateRequired,
} from '@/lib/api-handler'
import { auth } from '@/lib/auth'
import { getDataFilter } from '@/lib/data-permission'
import { generateNo, NumberPrefixes } from '@/lib/generate-no'
import { logger } from '@/lib/logger'

// 获取委托单列表（含筛选和关联数据）
export const GET = withErrorHandler(async (request: NextRequest) => {
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

  // 注入数据权限过滤
  const permissionFilter = await getDataFilter()
  Object.assign(where, permissionFilter)

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
            deviceId: true,
            deadline: true,
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

  // 3. 补充查询 SampleTestItem 数据并合并到 projects
  const entrustmentIds = processedList.map((e: any) => e.id)
  const sampleTestItems = await prisma.sampleTestItem.findMany({
    where: {
      bizType: 'entrustment',
      bizId: { in: entrustmentIds }
    }
  })

  // 将 sampleTestItems 按照 entrustmentId -> sampleName 分组
  const testItemsMap: Record<string, Record<string, string[]>> = {}
  for (const item of sampleTestItems) {
    if (!testItemsMap[item.bizId]) {
      testItemsMap[item.bizId] = {}
    }
    if (!testItemsMap[item.bizId][item.sampleName]) {
      testItemsMap[item.bizId][item.sampleName] = []
    }
    testItemsMap[item.bizId][item.sampleName].push(item.testItemName)
  }

  // 遍历 processedList，如果 project 的 testItems 为空，则尝试从 map 中填充
  for (const entrustment of processedList) {
    if (entrustment.projects && Array.isArray(entrustment.projects)) {
      for (const project of entrustment.projects) {
        // 检查 testItems 是否看起来为空 (null, "", "[]")
        const isTestItemsEmpty = !project.testItems || project.testItems === '[]' || project.testItems === ''

        if (isTestItemsEmpty) {
          const items = testItemsMap[entrustment.id]?.[project.name]
          if (items && items.length > 0) {
            // 填充回去，保持 string[] 格式或者 JSON string 格式，虽然前端代码里 projectColumns render 做了兼容，
            // 但为了保险，我们可以直接给 string[]，因为前端 render: (items: string | string[] | null) 支持数组
            // project.testItems 是 string 类型 (数据库字段 db.Text)，所以这里 update 需要注意类型
            // 但这里我们是在修改返回给前端的 JSON 对象，不是数据库对象，所以可以直接赋值数组
            // 注意：TypeScript 可能会为了类型安全报错，但在 JS 运行时 JSON 序列化没事。
            // 我们的 processedList 是 `any` 类型 (line 144)，所以可以直接赋值。
            project.testItems = items
          }
        }
      }
    }
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
export const POST = withErrorHandler(async (request: NextRequest) => {
  const session = await auth()
  const data = await request.json()

  // 记录请求数据用于调试
  logger.info('创建委托单请求', {
    data: {
      clientId: data.clientId,
      clientName: data.clientName,
      contractNo: data.contractNo,
      quotationId: data.quotationId,
      followerId: data.followerId,
      userId: session?.user?.id,
    }
  })

  // 验证必填字段 - 只验证 clientName
  if (!data.clientName) {
    console.log('[Entrustment Create] Missing clientName')
    throw new Error('缺少必填字段: clientName')
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
      select: { fax: true, creditCode: true, invoiceTitle: true, name: true }
    })
    if (clientInfo) {
      data.contactFax = data.contactFax || clientInfo.fax || null
      data.invoiceTitle = data.invoiceTitle || clientInfo.invoiceTitle || clientInfo.name || null
      data.taxId = data.taxId || clientInfo.creditCode || null
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
    sourceType: data.sourceType || null,
    status: data.status || 'pending',
    remark: data.remark || null,
    createdBy: session?.user?.id ? { connect: { id: session.user.id } } : undefined,
  }

  console.log('[Entrustment Create] createData:', JSON.stringify(createData, null, 2))

  // 创建委托单
  const entrustment = await prisma.entrustment.create({
    data: createData,
  })

  console.log('[Entrustment Create] Created entrustment:', entrustment.id)

  // 创建检测项目
  const projects = data.projects
  if (projects && Array.isArray(projects) && projects.length > 0) {
    const validProjects = projects.filter((p: { name?: string }) => p.name)
    if (validProjects.length > 0) {
      await prisma.entrustmentProject.createMany({
        data: validProjects.map((p: { name: string; testItems?: string | string[]; method?: string; standard?: string }) => ({
          entrustmentId: entrustment.id,
          name: p.name,
          testItems: typeof p.testItems === 'string' ? p.testItems : JSON.stringify(p.testItems || []),
          method: p.method || null,
          standard: p.standard || null,
          status: 'pending',
        }))
      })
      console.log('[Entrustment Create] Created projects:', validProjects.length)
    }
  }

  // 创建样品 Sample records
  if (data.samples && Array.isArray(data.samples) && data.samples.length > 0) {
    for (const sample of data.samples) {
      const sampleNo = await generateNo(NumberPrefixes.SAMPLE, 4)
      await prisma.sample.create({
        data: {
          sampleNo,
          entrustmentId: entrustment.id,
          name: sample.name,
          type: sample.type || sample.model,
          specification: sample.specification || sample.model,
          material: sample.material,
          partNo: sample.partNo || null,
          color: sample.color || null,
          weight: sample.weight || null,
          supplier: sample.supplier || null,
          oem: sample.oem || null,
          sampleCondition: sample.sampleCondition || null,
          quantity: String(sample.quantity || 1),
          status: 'received',
          remark: sample.remark || null,
          createdById: session?.user?.id,
        }
      })
    }
    console.log('[Entrustment Create] Created samples:', data.samples.length)
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
