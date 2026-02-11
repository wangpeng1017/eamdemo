/**
 * @file 检验材料 PDF 文件下载/预览 API
 * @desc 返回指定文件内容
 */

import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs-extra'
import path from 'path'

const UPLOAD_DIR = path.join(process.cwd(), 'uploads/inspection-material')

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ fileName: string }> }
) {
    try {
        const { fileName } = await params
        const filePath = path.join(UPLOAD_DIR, fileName)

        // 安全检查：防止路径穿越
        if (!filePath.startsWith(UPLOAD_DIR)) {
            return NextResponse.json(
                { success: false, error: '非法路径' },
                { status: 400 }
            )
        }

        if (!(await fs.pathExists(filePath))) {
            return NextResponse.json(
                { success: false, error: '文件不存在' },
                { status: 404 }
            )
        }

        const fileBuffer = await fs.readFile(filePath)
        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="${fileName}"`,
            },
        })
    } catch (error: any) {
        console.error('文件读取失败:', error)
        return NextResponse.json(
            { success: false, error: '文件读取失败' },
            { status: 500 }
        )
    }
}
