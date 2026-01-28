// @file: 咨询附件文件访问API
// @desc: 提供附件文件的访问服务

import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs-extra'
import path from 'path'
import mime from 'mime-types'

const UPLOAD_DIR = path.join(process.cwd(), 'uploads/consultation')

export async function GET(
  request: NextRequest,
  { params }: { params: { consultationId: string; fileName: string } }
) {
  try {
    const { consultationId, fileName } = params
    const filePath = path.join(UPLOAD_DIR, consultationId, fileName)

    // 检查文件是否存在
    if (!(await fs.pathExists(filePath))) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '文件不存在' } },
        { status: 404 }
      )
    }

    // 读取文件
    const fileBuffer = await fs.readFile(filePath)
    const mimeType = mime.lookup(fileName) || 'application/octet-stream'

    // 返回文件
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(fileName)}"`,
      },
    })
  } catch (error: any) {
    console.error('File access error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'ACCESS_ERROR',
          message: error.message || '文件访问失败',
        },
      },
      { status: 500 }
    )
  }
}
