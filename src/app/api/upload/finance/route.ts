/**
 * @file route.ts
 * @desc 财务模块统一附件上传API（发票凭证/收款凭证）
 * @input 依赖: fs-extra, cuid2, mime-types
 * @output POST /api/upload/finance?module=invoice|payment&bizId=xxx
 */

import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs-extra'
import path from 'path'
import { createId } from '@paralleldrive/cuid2'
import mime from 'mime-types'

const UPLOAD_BASE = path.join(process.cwd(), 'uploads/finance')
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
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

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const module = searchParams.get('module') // invoice | payment
    const bizId = searchParams.get('bizId')

    if (!module || !['invoice', 'payment'].includes(module)) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_MODULE', message: 'module 参数必须为 invoice 或 payment' } },
        { status: 400 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_FILE', message: '未找到上传文件' } },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: { code: 'FILE_TOO_LARGE', message: '文件大小超过10MB限制' } },
        { status: 400 }
      )
    }

    const mimeType = file.type || mime.lookup(file.name) || ''
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_TYPE', message: '不支持的文件类型' } },
        { status: 400 }
      )
    }

    const fileId = createId()
    const ext = path.extname(file.name)
    const newFileName = `${fileId}${ext}`

    // 目录: uploads/finance/{module}/{bizId}/
    const dir = bizId
      ? path.join(UPLOAD_BASE, module, bizId)
      : path.join(UPLOAD_BASE, module, 'temp')
    await fs.ensureDir(dir)

    const finalPath = path.join(dir, newFileName)
    const arrayBuffer = await file.arrayBuffer()
    await fs.writeFile(finalPath, Buffer.from(arrayBuffer))

    const fileUrl = bizId
      ? `/uploads/finance/${module}/${bizId}/${newFileName}`
      : `/uploads/finance/${module}/temp/${newFileName}`

    return NextResponse.json({
      success: true,
      data: {
        id: fileId,
        originalName: file.name,
        fileName: newFileName,
        fileSize: file.size,
        mimeType,
        fileUrl,
        uploadedAt: new Date().toISOString(),
      },
    })
  } catch (err: any) {
    console.error('Finance file upload error:', err)
    return NextResponse.json(
      { success: false, error: { code: 'UPLOAD_ERROR', message: err.message || '文件上传失败' } },
      { status: 500 }
    )
  }
}
