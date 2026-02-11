/**
 * @file 检验材料 PDF 上传 API
 * @desc 处理检验材料 PDF 文件上传
 */

import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs-extra'
import path from 'path'
import { createId } from '@paralleldrive/cuid2'

const UPLOAD_DIR = path.join(process.cwd(), 'uploads/inspection-material')
const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB

async function ensureDir() {
    await fs.ensureDir(UPLOAD_DIR)
}

export async function POST(request: NextRequest) {
    try {
        await ensureDir()

        const formData = await request.formData()
        const file = formData.get('file') as File | null

        if (!file) {
            return NextResponse.json(
                { success: false, error: '未找到上传文件' },
                { status: 400 }
            )
        }

        // 验证文件大小
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { success: false, error: '文件大小超过20MB限制' },
                { status: 400 }
            )
        }

        // 只允许 PDF
        if (file.type !== 'application/pdf') {
            return NextResponse.json(
                { success: false, error: '仅支持 PDF 格式文件' },
                { status: 400 }
            )
        }

        // 生成文件名
        const fileId = createId()
        const newFileName = `${fileId}.pdf`
        const finalPath = path.join(UPLOAD_DIR, newFileName)

        // 保存文件
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        await fs.writeFile(finalPath, buffer)

        const fileUrl = `/api/upload/inspection-material/${newFileName}`

        return NextResponse.json({
            success: true,
            data: {
                id: fileId,
                originalName: file.name,
                fileName: newFileName,
                fileSize: file.size,
                fileUrl,
            },
        })
    } catch (error: any) {
        console.error('检验材料上传失败:', error)
        return NextResponse.json(
            { success: false, error: error.message || '文件上传失败' },
            { status: 500 }
        )
    }
}
