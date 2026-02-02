// @input: NextRequest, Prisma Client
// @output: JSON - 咨询列表/创建结果
// @pos: 委托咨询API，处理咨询记录的CRUD

import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withAuth, success } from '@/lib/api-handler'
import fs from 'fs-extra'
import path from 'path'

const UPLOAD_DIR = path.join(process.cwd(), 'uploads/consultation')

// 获取咨询列表 - 需要登录
export const GET = withAuth(async (request: NextRequest, user) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const status = searchParams.get('status')
  const follower = searchParams.get('follower')
  const keyword = searchParams.get('keyword')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  const where: Record<string, unknown> = {}

  if (status) where.status = status
  if (follower) where.follower = follower
  if (keyword) {
    where.OR = [
      { client: { name: { contains: keyword } } },
      { clientContactPerson: { contains: keyword } },
      { consultationNo: { contains: keyword } },
    ]
  }
  if (startDate || endDate) {
    where.createdAt = {}
    if (startDate) (where.createdAt as Record<string, Date>).gte = new Date(startDate)
    if (endDate) (where.createdAt as Record<string, Date>).lte = new Date(endDate)
  }

  const [list, total] = await Promise.all([
    prisma.consultation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        followUps: { orderBy: { date: 'desc' }, take: 1 },
        client: true,
      },
    }),
    prisma.consultation.count({ where }),
  ])

  const parsedList = list.map((item: any) => ({
    ...item,
    testItems: item.testItems ? JSON.parse(item.testItems as string) : [],
    attachments: item.attachments ? JSON.parse(item.attachments as string) : [],
  }))

  return success({ list: parsedList, total, page, pageSize })
})

// 创建咨询 - 需要登录
export const POST = withAuth(async (request: NextRequest, user) => {
  const data = await request.json()

  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const prefix = `ZX${todayStr}`

  // 查找当天最后一个单号
  const lastConsultation = await prisma.consultation.findFirst({
    where: { consultationNo: { startsWith: prefix } },
    orderBy: { consultationNo: 'desc' },
    select: { consultationNo: true }
  })

  let seq = 1
  if (lastConsultation?.consultationNo) {
    // 提取最后4位数字
    const lastSeq = parseInt(lastConsultation.consultationNo.slice(-4))
    if (!isNaN(lastSeq)) {
      seq = lastSeq + 1
    }
  }

  const consultationNo = `${prefix}${String(seq).padStart(4, '0')}`

  // 提取样品检测项数据
  const sampleTestItems = data.sampleTestItems || []

  // v2: 根据样品检测项是否有评估人自动判定初始状态
  const hasAssessors = sampleTestItems.some((item: any) => item.assessorId)
  const assessorCount = sampleTestItems.filter((item: any) => item.assessorId).length

  // 准备咨询单创建数据
  const createData: any = {
    consultationNo,
    status: hasAssessors ? 'assessing' : 'following',
    // v2: 自动设置评估计数
    ...(hasAssessors ? {
      assessmentVersion: 'v2',
      assessmentTotalCount: assessorCount,
      assessmentPendingCount: assessorCount,
      assessmentPassedCount: 0,
      assessmentFailedCount: 0,
    } : {}),
  }

  // 明确指定允许的字段
  const allowedFields = [
    'clientId',
    'clientContactPerson',
    'expectedDeadline',
    'clientReportDeadline',
    'budgetRange',
    'follower',
    'feasibility',
    'feasibilityNote',
    'quotationId',
    'quotationNo',
    'clientRequirement',
    'assessmentVersion',
    'assessmentTotalCount',
    'assessmentPassedCount',
    'assessmentFailedCount',
    'assessmentPendingCount',
    'estimatedQuantity',
  ]

  // 只复制允许的字段
  allowedFields.forEach(field => {
    if (data[field] !== undefined) {
      createData[field] = data[field]
    }
  })

  // 处理 testItems（旧字段,保持兼容）
  createData.testItems = Array.isArray(data.testItems) ? JSON.stringify(data.testItems) : '[]'

  // 处理 estimatedQuantity
  if (data.estimatedQuantity != null) {
    createData.estimatedQuantity = parseInt(data.estimatedQuantity, 10) || 0
  }

  // 暂时不处理附件,等咨询单创建后再处理
  const attachments = data.attachments || []

  // 使用事务创建咨询单和样品检测项
  const consultation = await prisma.$transaction(async (tx) => {
    // 1. 创建咨询单
    const newConsultation = await tx.consultation.create({
      data: createData
    })

    // 2. 批量创建样品检测项
    if (sampleTestItems.length > 0) {
      await Promise.all(
        sampleTestItems.map((item: any) =>
          tx.sampleTestItem.create({
            data: {
              bizType: 'consultation',
              bizId: newConsultation.id,
              sampleName: item.sampleName,
              batchNo: item.batchNo || null,
              material: item.material || null,
              appearance: item.appearance || null,
              quantity: item.quantity || 1,
              testTemplateId: item.testTemplateId || null,
              testItemName: item.testItemName || '',
              testStandard: item.testStandard || null,
              judgmentStandard: item.judgmentStandard || null,
              // 评估人信息
              currentAssessorId: item.assessorId || null,
              currentAssessorName: item.assessorName || null,
              // 如果分配了评估人，状态设为 assessing，否则为 pending
              assessmentStatus: item.assessorId ? 'assessing' : 'pending',
              sortOrder: 0,
            },
          })
        )
      )
    }

    return newConsultation
  })

  // 处理附件：将文件从temp/移动到{consultationId}/
  if (attachments && attachments.length > 0) {
    const tempDir = path.join(UPLOAD_DIR, 'temp')
    const finalDir = path.join(UPLOAD_DIR, consultation.id)
    await fs.ensureDir(finalDir)

    const updatedAttachments = await Promise.all(
      attachments.map(async (file: any) => {
        if (!file || !file.fileName) {
          console.warn('[Consultation API] 跳过无效附件:', file)
          return null
        }
        const tempPath = path.join(tempDir, file.fileName)
        const finalPath = path.join(finalDir, file.fileName)

        // 如果文件在temp目录存在，则移动
        if (await fs.pathExists(tempPath)) {
          await fs.move(tempPath, finalPath, { overwrite: true })
        }

        // 更新文件URL
        return {
          ...file,
          fileUrl: `/uploads/consultation/${consultation.id}/${file.fileName}`,
        }
      })
    ).then(results => results.filter(item => item !== null))

    // 更新数据库中的附件信息
    await prisma.consultation.update({
      where: { id: consultation.id },
      data: {
        attachments: JSON.stringify(updatedAttachments),
      },
    })

    return success({
      ...consultation,
      testItems: consultation.testItems ? JSON.parse(consultation.testItems as string) : [],
      attachments: updatedAttachments,
    })
  }

  return success({
    ...consultation,
    testItems: consultation.testItems ? JSON.parse(consultation.testItems as string) : [],
    attachments: [],
  })
})
