import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import fs from 'fs'
import path from 'path'

/**
 * POST /api/upload
 * 通用文件上传接口
 */
export async function POST(request: NextRequest) {
    const session = await auth()
    if (!session?.user) {
        return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    try {
        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: '缺少文件' }, { status: 400 })
        }

        // 创建上传目录 - 兼容 standalone 模式
        const baseDir = fs.existsSync('/root/lims-next/public')
            ? '/root/lims-next/public'
            : path.join(process.cwd(), 'public')
        const uploadDir = path.join(baseDir, 'uploads', 'templates')
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true })
        }

        // 生成唯一文件名
        const ext = path.extname(file.name) || '.docx'
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`
        const filePath = path.join(uploadDir, fileName)

        // 写入文件
        const buffer = Buffer.from(await file.arrayBuffer())
        fs.writeFileSync(filePath, buffer)

        // 返回访问 URL
        const url = `/uploads/templates/${fileName}`

        return NextResponse.json({
            success: true,
            url,
            data: { url }
        })
    } catch (error: any) {
        console.error('[upload] 上传失败:', error)
        return NextResponse.json({ error: '上传失败' }, { status: 500 })
    }
}
