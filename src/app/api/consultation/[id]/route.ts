import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withErrorHandler, success, notFound } from '@/lib/api-handler'
import fs from 'fs-extra'
import path from 'path'

const UPLOAD_DIR = path.join(process.cwd(), 'uploads/consultation')

export const GET = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params
  const consultation = await prisma.consultation.findUnique({
    where: { id },
    include: {
      followUps: { orderBy: { date: 'desc' } },
      client: true,
    },
  })

  if (!consultation) notFound('咨询单不存在')

  // 手动查询样品检测项（多态关联）
  const sampleTestItems = await prisma.sampleTestItem.findMany({
    where: {
      bizType: 'consultation',
      bizId: id,
    },
    orderBy: { sortOrder: 'asc' }
  })

  return success({
    ...consultation,
    testItems: consultation.testItems ? JSON.parse(consultation.testItems) : [],
    attachments: consultation.attachments ? JSON.parse(consultation.attachments) : [],
    sampleTestItems,
  })
})

export const PUT = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params
  const data = await request.json()

  // 提取样品检测项数据
  const sampleTestItems = data.sampleTestItems || []

  // 准备咨询单更新数据
  const updateData: any = {}
  Object.keys(data).forEach(key => {
    if (!['sampleTestItems', 'samples'].includes(key)) {
      updateData[key] = data[key]
    }
  })

  if (Array.isArray(data.testItems)) {
    updateData.testItems = JSON.stringify(data.testItems)
  }

  // 处理附件更新
  if (data.attachments !== undefined) {
    const newAttachments = data.attachments || []

    // 获取现有附件
    const existing = await prisma.consultation.findUnique({
      where: { id },
      select: { attachments: true },
    })

    let oldAttachments: any[] = []
    if (existing?.attachments) {
      try {
        oldAttachments = JSON.parse(existing.attachments)
      } catch (e) {
        console.error('Failed to parse old attachments:', e)
      }
    }

    // 找出需要删除的附件（旧有但新列表中没有的）
    const oldFileIds = oldAttachments.map((f: any) => f.id)
    const newFileIds = newAttachments.map((f: any) => f.id)
    const toDelete = oldAttachments.filter((f: any) => !newFileIds.includes(f.id))

    // 删除旧文件
    for (const file of toDelete) {
      const filePath = path.join(UPLOAD_DIR, id, file.fileName)
      if (await fs.pathExists(filePath)) {
        await fs.remove(filePath)
      }
    }

    // 移动新上传的文件（从temp到正式目录）
    const tempDir = path.join(UPLOAD_DIR, 'temp')
    const finalDir = path.join(UPLOAD_DIR, id)
    await fs.ensureDir(finalDir)

    const updatedAttachments = await Promise.all(
      newAttachments.map(async (file: any) => {
        const tempPath = path.join(tempDir, file.fileName)
        const finalPath = path.join(finalDir, file.fileName)

        // 如果文件在temp目录存在（新上传），则移动
        if (await fs.pathExists(tempPath)) {
          await fs.move(tempPath, finalPath, { overwrite: true })
        }

        // 更新文件URL
        return {
          ...file,
          fileUrl: `/uploads/consultation/${id}/${file.fileName}`,
        }
      })
    )

    updateData.attachments = JSON.stringify(updatedAttachments)
  }

  // 移除旧字段
  delete updateData.samples
  delete updateData.consultationSamples

  // 使用事务更新咨询单和样品检测项
  const consultation = await prisma.$transaction(async (tx) => {
    // 1. 更新咨询单
    const updatedConsultation = await tx.consultation.update({
      where: { id },
      data: updateData
    })

    // 2. 删除旧的样品检测项
    await tx.sampleTestItem.deleteMany({
      where: {
        bizType: 'consultation',
        bizId: id,
      },
    })

    // 3. 批量创建新的样品检测项
    if (sampleTestItems.length > 0) {
      await Promise.all(
        sampleTestItems.map((item: any) =>
          tx.sampleTestItem.create({
            data: {
              bizType: 'consultation',
              bizId: id,
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

    return updatedConsultation
  })

  return success({
    ...consultation,
    testItems: consultation.testItems ? JSON.parse(consultation.testItems) : [],
    attachments: consultation.attachments ? JSON.parse(consultation.attachments) : [],
  })
})

// 删除咨询记录
export const DELETE = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params
  console.log(`[API] DELETE /api/consultation/${id} requested`)

  try {
    const existing = await prisma.consultation.findUnique({ where: { id } })
    if (!existing) {
      console.warn(`[API] Consultation not found: ${id}`)
      notFound('咨询记录不存在')
    }

    // 删除关联的附件文件
    const consultationDir = path.join(UPLOAD_DIR, id)
    if (await fs.pathExists(consultationDir)) {
      await fs.remove(consultationDir)
    }

    await prisma.consultation.delete({ where: { id } })
    console.log(`[API] DELETE /api/consultation/${id} success`)
    return success({ success: true })
  } catch (error) {
    console.error(`[API] DELETE /api/consultation/${id} failed:`, error)
    throw error
  }
})
