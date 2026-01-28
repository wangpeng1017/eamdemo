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

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const count = await prisma.consultation.count({
    where: { consultationNo: { startsWith: `ZX${today}` } }
  })
  const consultationNo = `ZX${today}${String(count + 1).padStart(4, '0')}`

  const createData: any = { ...data, consultationNo }
  createData.testItems = Array.isArray(data.testItems) ? JSON.stringify(data.testItems) : '[]'

  // 移除旧字段处理，或者保留兼容
  if (data.estimatedQuantity != null) {
    createData.estimatedQuantity = parseInt(data.estimatedQuantity, 10) || 0
  }

  // 移除 samples 字段避免顶层写入错误
  delete createData.samples

  // 暂时不处理附件，等咨询单创建后再处理
  const attachments = data.attachments || []
  delete createData.attachments

  const consultation = await prisma.consultation.create({
    data: createData
  })

  // 处理附件：将文件从temp/移动到{consultationId}/
  if (attachments && attachments.length > 0) {
    const tempDir = path.join(UPLOAD_DIR, 'temp')
    const finalDir = path.join(UPLOAD_DIR, consultation.id)
    await fs.ensureDir(finalDir)

    const updatedAttachments = await Promise.all(
      attachments.map(async (file: any) => {
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
    )

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
