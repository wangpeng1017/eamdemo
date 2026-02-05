import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

// 获取单个模板
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params

    const template = await prisma.reportTemplate.findUnique({
        where: { id }
    })

    if (!template) {
        return NextResponse.json({ error: '模板不存在' }, { status: 404 })
    }

    return NextResponse.json({
        success: true,
        data: template
    })
}

// 更新模板
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth()
    if (!session?.user) {
        return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, category, fileUrl, status, remark, coverConfig, backCoverConfig } = body

    const template = await prisma.reportTemplate.update({
        where: { id },
        data: {
            ...(name && { name }),
            ...(category && { category }),
            ...(fileUrl && { fileUrl }),
            ...(status && { status }),
            ...(remark !== undefined && { remark }),
            ...(coverConfig !== undefined && { coverConfig }),
            ...(backCoverConfig !== undefined && { backCoverConfig })
        }
    })

    return NextResponse.json({
        success: true,
        data: template,
        message: '模板更新成功'
    })
}

// 删除模板
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth()
    if (!session?.user) {
        return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { id } = await params

    await prisma.reportTemplate.delete({
        where: { id }
    })

    return NextResponse.json({
        success: true,
        message: '模板删除成功'
    })
}
