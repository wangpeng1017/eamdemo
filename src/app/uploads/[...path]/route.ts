import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

/**
 * GET /uploads/[...path]
 * 静态文件代理 - 用于 standalone 模式下 serve public/uploads 中的文件
 */
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ path: string[] }> }
) {
    const { path: segments } = await context.params
    const filePath = segments.join('/')

    // 安全检查：防止目录遍历
    if (filePath.includes('..')) {
        return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }

    // 查找文件 - 兼容 standalone 模式
    const baseDir = fs.existsSync('/root/lims-next/public')
        ? '/root/lims-next/public'
        : path.join(process.cwd(), 'public')
    const fullPath = path.join(baseDir, 'uploads', filePath)

    if (!fs.existsSync(fullPath)) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // 读取文件并返回
    const fileBuffer = fs.readFileSync(fullPath)
    const ext = path.extname(fullPath).toLowerCase()

    // MIME 类型映射
    const mimeTypes: Record<string, string> = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
        '.pdf': 'application/pdf',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }

    const contentType = mimeTypes[ext] || 'application/octet-stream'

    return new NextResponse(fileBuffer, {
        headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=31536000, immutable',
        },
    })
}
