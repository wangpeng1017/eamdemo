import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { withErrorHandler, success, notFound } from '@/lib/api-handler'

interface RouteParams {
  params: Promise<{ id: string }>
}

// 获取单个委托单详情
export const GET = withErrorHandler(async (request: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
  const { params } = context!
  const { id } = await params
  const entrustment = await prisma.entrustment.findUnique({
    where: { id },
    include: {
      client: true,
      contract: true,
      projects: true,
      samples: true,
    }
  })

  if (!entrustment) {
    return notFound('委托单不存在')
  }

  return success(entrustment)
})

// 更新委托单（含检测项目和样品）
export const PUT = withErrorHandler(async (request: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
  const { params } = context!
  const { id } = await params
  const data = await request.json()
  const session = await auth() // Ensure we have session for createdById if needed

  // 分离检测项目和样品数据
  const { projects, samples, ...entrustmentData } = data

  // 更新委托单基本信息
  await prisma.entrustment.update({
    where: { id },
    data: {
      ...entrustmentData,
      sampleDate: entrustmentData.sampleDate ? new Date(entrustmentData.sampleDate) : undefined,
    }
  })

  // 处理检测项目
  if (projects && Array.isArray(projects)) {
    // 获取现有项目
    const existingProjects = await prisma.entrustmentProject.findMany({
      where: { entrustmentId: id }
    })
    const existingIds = existingProjects.map((p: any) => p.id)

    // 分类处理
    const toUpdate = projects.filter((p: any) => p.id && existingIds.includes(p.id))
    const toCreate = projects.filter((p: any) => !p.id && p.name)
    const toDeleteIds = existingIds.filter((eid: string) => !projects.some((p: { id?: string }) => p.id === eid))

    // 删除不再需要的项目
    if (toDeleteIds.length > 0) {
      await prisma.entrustmentProject.deleteMany({
        where: { id: { in: toDeleteIds } }
      })
    }

    // 更新现有项目
    for (const p of toUpdate) {
      await prisma.entrustmentProject.update({
        where: { id: p.id },
        data: {
          name: p.name,
          testItems: typeof p.testItems === 'string' ? p.testItems : JSON.stringify(p.testItems || []),
          method: p.method || null,
          standard: p.standard || null,
        }
      })
    }

    // 创建新项目
    if (toCreate.length > 0) {
      await prisma.entrustmentProject.createMany({
        data: toCreate.map((p: { name: string; testItems?: string | string[]; method?: string; standard?: string }) => ({
          entrustmentId: id,
          name: p.name,
          testItems: typeof p.testItems === 'string' ? p.testItems : JSON.stringify(p.testItems || []),
          method: p.method || null,
          standard: p.standard || null,
          status: 'pending',
        }))
      })
    }
  }

  // 处理样品 (智能更新：更新现有、创建新增、删除移除)
  if (samples && Array.isArray(samples)) {
    const existingSamples = await prisma.sample.findMany({ where: { entrustmentId: id } })
    const existingSampleIds = existingSamples.map((s: any) => s.id)

    // 分类处理
    const toUpdate = samples.filter((s: any) => s.id && existingSampleIds.includes(s.id))
    const toCreate = samples.filter((s: any) => !s.id && s.name)
    const toDeleteIds = existingSampleIds.filter((eid: string) => !samples.some((s: { id?: string }) => s.id === eid))

    // 检查要删除的样品是否有关联的任务
    if (toDeleteIds.length > 0) {
      const linkedTasks = await prisma.testTask.findMany({
        where: { sampleId: { in: toDeleteIds } },
        select: { id: true, taskNo: true, sampleId: true }
      })

      if (linkedTasks.length > 0) {
        // 有关联任务的样品不能删除，只删除没有关联的
        const linkedSampleIds = linkedTasks.map(t => t.sampleId).filter(Boolean)
        const safeToDeleteIds = toDeleteIds.filter((id: string) => !linkedSampleIds.includes(id))

        if (safeToDeleteIds.length > 0) {
          await prisma.sample.deleteMany({
            where: { id: { in: safeToDeleteIds } }
          })
        }
        // 记录警告：部分样品因关联任务无法删除
        console.warn(`样品 ${linkedSampleIds.join(', ')} 因关联检测任务无法删除`)
      } else {
        // 没有关联任务，可以安全删除
        await prisma.sample.deleteMany({
          where: { id: { in: toDeleteIds } }
        })
      }
    }

    // 更新现有样品
    for (const sample of toUpdate) {
      await prisma.sample.update({
        where: { id: sample.id },
        data: {
          name: sample.name,
          specification: sample.model,
          material: sample.material,
          partNo: sample.partNo || null,
          color: sample.color || null,
          weight: sample.weight || null,
          supplier: sample.supplier || null,
          oem: sample.oem || null,
          vehicleModel: sample.vehicleModel || null,
          manufactureDate: sample.manufactureDate ? new Date(sample.manufactureDate) : undefined,
          manufactureLotNo: sample.manufactureLotNo || null,
          packingDate: sample.packingDate ? new Date(sample.packingDate) : undefined,
          projectDeadline: sample.projectDeadline ? new Date(sample.projectDeadline) : undefined,
          sampleCondition: sample.sampleCondition || null,
          quantity: String(sample.quantity || 1),
          remark: sample.remark || null,
        }
      })
    }

    // 创建新样品
    const { generateNo, NumberPrefixes } = await import('@/lib/generate-no')
    for (const sample of toCreate) {
      const sampleNo = await generateNo(NumberPrefixes.SAMPLE, 4)
      await prisma.sample.create({
        data: {
          sampleNo,
          entrustmentId: id,
          name: sample.name,
          specification: sample.model,
          material: sample.material,
          partNo: sample.partNo || null,
          color: sample.color || null,
          weight: sample.weight || null,
          supplier: sample.supplier || null,
          oem: sample.oem || null,
          vehicleModel: sample.vehicleModel || null,
          manufactureDate: sample.manufactureDate ? new Date(sample.manufactureDate) : null,
          manufactureLotNo: sample.manufactureLotNo || null,
          packingDate: sample.packingDate ? new Date(sample.packingDate) : null,
          projectDeadline: sample.projectDeadline ? new Date(sample.projectDeadline) : null,
          sampleCondition: sample.sampleCondition || null,
          quantity: String(sample.quantity || 1),
          status: 'received',
          remark: sample.remark || null,
          createdById: session?.user?.id,
        }
      })
    }
  }

  // 同步客户报告编号（当 reportGrouping 变更时）
  if (entrustmentData.reportGrouping !== undefined) {
    const { generateClientReportsForEntrustment } = await import('@/lib/generate-client-reports')
    // 删除旧的草稿报告（已审批/签发的报告保留）
    await prisma.clientReport.deleteMany({
      where: { entrustmentId: id, status: 'draft' },
    })

    if (entrustmentData.reportGrouping) {
      const currentSamples = await prisma.sample.findMany({
        where: { entrustmentId: id },
        select: { id: true, name: true },
      })
      const currentProjects = await prisma.entrustmentProject.findMany({
        where: { entrustmentId: id },
        select: { id: true, name: true },
      })
      const ent = await prisma.entrustment.findUnique({
        where: { id },
        include: { client: { select: { name: true } } },
      })

      await generateClientReportsForEntrustment({
        entrustmentId: id,
        reportGrouping: entrustmentData.reportGrouping,
        reportCopies: entrustmentData.reportCopies || 1,
        samples: currentSamples,
        projects: currentProjects,
        clientName: ent?.client?.name || '',
      })
    }
  }

  // 返回更新后的完整数据
  const result = await prisma.entrustment.findUnique({
    where: { id },
    include: {
      client: true,
      contract: true,
      projects: true,
      samples: true,
    }
  })

  return success(result)
})

// 删除委托单
export const DELETE = withErrorHandler(async (request: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
  const { params } = context!
  const { id } = await params

  // 检查是否有关联的检测任务
  const linkedTasks = await prisma.testTask.findMany({
    where: { entrustmentId: id },
    select: { id: true, taskNo: true, status: true }
  })

  if (linkedTasks.length > 0) {
    // 检查是否有进行中或已完成的任务
    const activeTasks = linkedTasks.filter(t => t.status !== 'pending')
    if (activeTasks.length > 0) {
      return notFound(`无法删除：委托单有 ${activeTasks.length} 个进行中或已完成的检测任务`)
    }
    // 删除待处理的任务
    await prisma.testTask.deleteMany({
      where: { entrustmentId: id, status: 'pending' }
    })
  }

  // 检查并删除关联的样品
  const linkedSamples = await prisma.sample.findMany({
    where: { entrustmentId: id },
    select: { id: true }
  })

  if (linkedSamples.length > 0) {
    // 检查样品是否有关联的任务（非本委托单的任务）
    const sampleIds = linkedSamples.map(s => s.id)
    const externalTasks = await prisma.testTask.findMany({
      where: {
        sampleId: { in: sampleIds },
        entrustmentId: { not: id }
      }
    })

    if (externalTasks.length > 0) {
      return notFound('无法删除：样品被其他委托单的任务引用')
    }

    // 安全删除样品
    await prisma.sample.deleteMany({
      where: { entrustmentId: id }
    })
  }

  // 删除关联的检测项目
  await prisma.entrustmentProject.deleteMany({
    where: { entrustmentId: id }
  })

  // 删除委托单
  await prisma.entrustment.delete({ where: { id } })

  return success({ message: '删除成功' })
})
