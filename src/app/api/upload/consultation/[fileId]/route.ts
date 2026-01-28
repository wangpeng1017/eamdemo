// @file: 业务咨询附件删除API
// @desc: 删除指定附件文件

import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs-extra'
import path from 'path'
import { prisma } from '@/lib/prisma'

const UPLOAD_DIR = path.join(process.cwd(), 'uploads/consultation')

export async function DELETE(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const { fileId } = params
    const { searchParams } = new URL(request.url)
    const consultationId = searchParams.get('consultationId')

    if (!consultationId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'MISSING_ID', message: '缺少咨询单ID' },
        },
        { status: 400 }
      )
    }

    // 查询咨询单
    const consultation = await prisma.consultation.findUnique({
      where: { id: consultationId },
      select: { attachments: true },
    })

    if (!consultation) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: '咨询单不存在' },
        },
        { status: 404 }
      )
    }

    // 解析附件数据
    let attachments: any[] = []
    if (consultation.attachments) {
      try {
        attachments = JSON.parse(consultation.attachments)
      } catch (e) {
        console.error('Failed to parse attachments:', e)
      }
    }

    // 查找要删除的附件
    const attachment = attachments.find((a: any) => a.id === fileId)
    if (!attachment) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'FILE_NOT_FOUND', message: '附件不存在' },
        },
        { status: 404 }
      )
    }

    // 物理删除文件
    const filePath = path.join(UPLOAD_DIR, consultationId, attachment.fileName)
    if (await fs.pathExists(filePath)) {
      await fs.remove(filePath)
    }

    // 从数组中移除该附件
    const updatedAttachments = attachments.filter((a: any) => a.id !== fileId)

    // 更新数据库
    await prisma.consultation.update({
      where: { id: consultationId },
      data: {
        attachments: JSON.stringify(updatedAttachments),
      },
    })

    return NextResponse.json({
      success: true,
      data: { message: '文件已删除' },
    })
  } catch (error: any) {
    console.error('File deletion error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'DELETE_ERROR',
          message: error.message || '文件删除失败',
        },
      },
      { status: 500 }
    )
  }
}
