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

// 获取委托单列表（含筛选和关联数据）
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const status = searchParams.get('status')
  const keyword = searchParams.get('keyword')
  const follower = searchParams.get('follower')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const sourceType = searchParams.get('sourceType')

  // 构建筛选条件
  const where: Record<string, unknown> = {}

  if (status) {
    where.status = status
  }

  if (follower) {
    where.follower = follower
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
            follower: true,
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
            quantity: true,
            status: true,
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

    // 2. 如果委托单本身没有跟单人，尝试从报价单获取 (合同暂无跟单人字段，或者需要确认) - Quotation has follower
    if (!item.follower) {
      if (item.quotation?.follower) {
        item.follower = item.quotation.follower
      }
      // Contract model might not have follower directly exposed or named differently, checking schema...
      // Schema check: Quotation has `follower`. Contract does NOT have `follower` based on previous schema view (lines 359-438).
      // So only fallback to Quotation for follower.
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

  // 详细日志
  console.log('[Entrustment Create] Received data:', JSON.stringify(data, null, 2))

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
  let inheritedFollower = data.follower || null

  // 如果从报价单生成
  if (data.quotationId && (!inheritedDeadline || !inheritedFollower)) {
    const quotation = await prisma.quotation.findUnique({
      where: { id: data.quotationId },
      select: { clientReportDeadline: true, follower: true, clientContactPerson: true, clientPhone: true, clientEmail: true, clientAddress: true }
    })
    if (!inheritedDeadline && quotation?.clientReportDeadline) inheritedDeadline = quotation.clientReportDeadline
    if (!inheritedFollower && quotation?.follower) inheritedFollower = quotation.follower
    data.contactPerson = data.contactPerson || quotation?.clientContactPerson
    data.contactPhone = data.contactPhone || quotation?.clientPhone
    data.contactEmail = data.contactEmail || quotation?.clientEmail
    data.clientAddress = data.clientAddress || quotation?.clientAddress
  }

  // 如果从合同生成
  if (data.contractNo && (!inheritedDeadline || !inheritedFollower)) {
    const contract = await prisma.contract.findUnique({
      where: { contractNo: data.contractNo },
      select: { clientReportDeadline: true, follower: true, partyAContact: true, partyATel: true, partyAEmail: true, partyAAddress: true }
    })
    if (!inheritedDeadline && contract?.clientReportDeadline) inheritedDeadline = contract.clientReportDeadline
    if (!inheritedFollower && contract?.follower) inheritedFollower = contract.follower
    data.contactPerson = data.contactPerson || contract?.partyAContact
    data.contactPhone = data.contactPhone || contract?.partyATel
    data.contactEmail = data.contactEmail || contract?.partyAEmail
    data.clientAddress = data.clientAddress || contract?.partyAAddress
  }

  // 只提取 schema 中存在的字段（移除sampleName等不存在的字段）
  const createData: any = {
    entrustmentNo,
    contractNo: data.contractNo || null,
    quotation: data.quotationId ? { connect: { id: data.quotationId } } : undefined,
    client: data.clientId ? { connect: { id: data.clientId } } : undefined,
    contactPerson: data.contactPerson || null,
    contactPhone: data.contactPhone || null,
    contactEmail: data.contactEmail || null,
    clientAddress: data.clientAddress || null,
    sampleDate: data.sampleDate ? new Date(data.sampleDate) : new Date(),
    // 优先使用手动提供的值，否则继承
    clientReportDeadline: inheritedDeadline,
    follower: inheritedFollower,
    isSampleReturn: data.isSampleReturn || false,
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
          type: sample.model,
          specification: sample.model,
          material: sample.material,
          quantity: String(sample.quantity || 1),
          status: 'received',
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
