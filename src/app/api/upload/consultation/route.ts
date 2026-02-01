// @file: 业务咨询附件上传API
// @desc: 处理文件上传,保存到临时目录,返回文件信息

import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs-extra'
import path from 'path'
import { createId } from '@paralleldrive/cuid2'
import mime from 'mime-types'

const UPLOAD_DIR = path.join(process.cwd(), 'uploads/consultation')
const TEMP_DIR = path.join(UPLOAD_DIR, 'temp')
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

// 确保目录存在
async function ensureDirectories() {
  await fs.ensureDir(TEMP_DIR)
}

export async function POST(request: NextRequest) {
  try {
    await ensureDirectories()

    // 获取查询参数
    const { searchParams } = new URL(request.url)
    const consultationId = searchParams.get('consultationId')

    // 解析 FormData
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_FILE', message: '未找到上传文件' } },
        { status: 400 }
      )
    }

    // 验证文件大小
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'FILE_TOO_LARGE', message: '文件大小超过5MB限制' },
        },
        { status: 400 }
      )
    }

    // 验证文件类型
    const mimeType = file.type || mime.lookup(file.name) || ''
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_TYPE', message: '不支持的文件类型' },
        },
        { status: 400 }
      )
    }

    // 生成文件ID和新文件名
    const fileId = createId()
    const ext = path.extname(file.name)
    const newFileName = `${fileId}${ext}`

    // 确定最终目录
    let finalDir = TEMP_DIR
    if (consultationId) {
      finalDir = path.join(UPLOAD_DIR, consultationId)
      await fs.ensureDir(finalDir)
    }

    // 保存文件
    const finalPath = path.join(finalDir, newFileName)
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    await fs.writeFile(finalPath, buffer)

    // 构建文件URL
    const fileUrl = consultationId
      ? `/uploads/consultation/${consultationId}/${newFileName}`
      : `/uploads/consultation/temp/${newFileName}`

    // 返回文件信息
    const fileInfo = {
      id: fileId,
      originalName: file.name,
      fileName: newFileName,
      fileSize: file.size,
      mimeType: mimeType,
      fileUrl: fileUrl,
      uploadedAt: new Date().toISOString(),
    }

    return NextResponse.json({
      success: true,
      data: fileInfo,
    })
  } catch (error: any) {
    console.error('File upload error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'UPLOAD_ERROR',
          message: error.message || '文件上传失败',
        },
      },
      { status: 500 }
    )
  }
}
