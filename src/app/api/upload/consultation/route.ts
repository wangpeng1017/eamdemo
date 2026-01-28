// @file: 业务咨询附件上传API
// @desc: 处理文件上传，保存到临时目录，返回文件信息

import { NextRequest, NextResponse } from 'next/server'
import formidable from 'formidable'
import fs from 'fs-extra'
import path from 'path'
import { createId } from '@paralleldrive/cuid2'
import mime from 'mime-types'
import { Readable } from 'stream'

export const config = {
  api: {
    bodyParser: false,
  },
}

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

// 将 NextRequest body 转换为 Node.js stream
async function convertToNodeStream(request: NextRequest) {
  const reader = request.body?.getReader()
  if (!reader) {
    throw new Error('Request body is null')
  }

  const stream = new Readable({
    async read() {
      const { done, value } = await reader.read()
      if (done) {
        this.push(null)
      } else {
        this.push(Buffer.from(value))
      }
    },
  })

  return stream
}

export async function POST(request: NextRequest) {
  try {
    await ensureDirectories()

    // 获取查询参数
    const { searchParams } = new URL(request.url)
    const consultationId = searchParams.get('consultationId')

    // 将 NextRequest 转换为 Node.js stream
    const nodeStream = await convertToNodeStream(request)

    // 配置 formidable
    const form = formidable({
      maxFileSize: MAX_FILE_SIZE,
      uploadDir: TEMP_DIR,
      keepExtensions: true,
      filename: (name, ext) => {
        return `${createId()}${ext}`
      },
    })

    // 解析表单数据
    const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>(
      (resolve, reject) => {
        form.parse(nodeStream as any, (err, fields, files) => {
          if (err) reject(err)
          else resolve([fields, files])
        })
      }
    )

    // 获取上传的文件
    const fileArray = files.file
    if (!fileArray || fileArray.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_FILE', message: '未找到上传文件' } },
        { status: 400 }
      )
    }

    const file = Array.isArray(fileArray) ? fileArray[0] : fileArray

    // 验证文件类型
    const mimeType = file.mimetype || mime.lookup(file.originalFilename || '') || ''
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      // 删除已上传的文件
      await fs.remove(file.filepath)
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_TYPE', message: '不支持的文件类型' },
        },
        { status: 400 }
      )
    }

    // 验证文件大小
    if (file.size > MAX_FILE_SIZE) {
      await fs.remove(file.filepath)
      return NextResponse.json(
        {
          success: false,
          error: { code: 'FILE_TOO_LARGE', message: '文件大小超过5MB限制' },
        },
        { status: 400 }
      )
    }

    // 生成文件ID和新文件名
    const fileId = createId()
    const ext = path.extname(file.originalFilename || '')
    const newFileName = `${fileId}${ext}`

    // 移动文件到最终位置
    let finalDir = TEMP_DIR
    if (consultationId) {
      finalDir = path.join(UPLOAD_DIR, consultationId)
      await fs.ensureDir(finalDir)
    }

    const finalPath = path.join(finalDir, newFileName)
    await fs.move(file.filepath, finalPath, { overwrite: true })

    // 构建文件URL
    const fileUrl = consultationId
      ? `/uploads/consultation/${consultationId}/${newFileName}`
      : `/uploads/consultation/temp/${newFileName}`

    // 返回文件信息
    const fileInfo = {
      id: fileId,
      originalName: file.originalFilename || 'unknown',
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
