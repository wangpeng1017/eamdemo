import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

// 获取模板列表
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const status = searchParams.get('status') || 'active'

    const where: any = {}
    if (category) where.category = category
    if (status) where.status = status

    const templates = await prisma.reportTemplate.findMany({
        where,
        orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
        success: true,
        data: { list: templates, total: templates.length }
    })
}

// 创建模板
export async function POST(request: NextRequest) {
    const session = await auth()
    if (!session?.user) {
        return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json()
    const { name, fileUrl, remark, coverConfig, backCoverConfig,
        coverTitle, coverSubtitle, coverLogo, coverShowDate,
        backCoverStatement, backCoverCustomText,
        stampImageUrl, stampPosition,
        testStandards, xrfScreeningConfig } = body

    if (!name) {
        return NextResponse.json({ error: '缺少模板名称' }, { status: 400 })
    }

    // 自动生成模板编码
    const code = body.code || `CTPL-${Date.now()}`
    const category = body.category || 'client_report'

    // 检查编码是否重复
    const existing = await prisma.reportTemplate.findUnique({
        where: { code }
    })
    if (existing) {
        return NextResponse.json({ error: '模板编码已存在' }, { status: 400 })
    }

    const template = await prisma.reportTemplate.create({
        data: {
            name,
            code,
            category,
            fileUrl: fileUrl || '',
            uploader: session.user.name || session.user.id || '系统',
            remark,
            coverConfig,
            backCoverConfig,
            coverTitle,
            coverSubtitle,
            coverLogo,
            coverShowDate: coverShowDate ?? true,
            backCoverStatement,
            backCoverCustomText,
            stampImageUrl,
            stampPosition,
            testStandards: testStandards ? (typeof testStandards === 'string' ? testStandards : JSON.stringify(testStandards)) : null,
            xrfScreeningConfig: xrfScreeningConfig ? (typeof xrfScreeningConfig === 'string' ? xrfScreeningConfig : JSON.stringify(xrfScreeningConfig)) : null,
        }
    })

    return NextResponse.json({
        success: true,
        data: template,
        message: '模板创建成功'
    })
}
