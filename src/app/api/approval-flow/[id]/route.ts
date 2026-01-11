import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withErrorHandler, success, notFound, badRequest } from '@/lib/api-handler'

// 获取单个审批流程
export const GET = withErrorHandler(async (
    request: NextRequest,
    context?: { params: Promise<Record<string, string>> }
) => {
    const { id } = await context!.params

    const flow = await prisma.approvalFlow.findUnique({
        where: { id },
    })

    if (!flow) {
        notFound('审批流程不存在')
    }

    return success({
        ...flow,
        nodes: flow.nodes ? JSON.parse(flow.nodes as string) : [],
    })
})

// 更新审批流程
export const PUT = withErrorHandler(async (
    request: NextRequest,
    context?: { params: Promise<Record<string, string>> }
) => {
    const { id } = await context!.params
    const data = await request.json()

    const existing = await prisma.approvalFlow.findUnique({ where: { id } })
    if (!existing) {
        notFound('审批流程不存在')
    }

    // 检查编码唯一性 (如果修改了编码)
    if (data.code && data.code !== existing.code) {
        const duplicate = await prisma.approvalFlow.findUnique({ where: { code: data.code } })
        if (duplicate) {
            badRequest('流程编码已存在')
        }
    }

    const flow = await prisma.approvalFlow.update({
        where: { id },
        data: {
            name: data.name,
            code: data.code,
            businessType: data.businessType,
            description: data.description,
            status: data.status,
            // 如果传递了 nodes，更新它；否则保持不变
            nodes: data.nodes ? JSON.stringify(data.nodes) : undefined,
        },
    })

    return success({
        ...flow,
        nodes: flow.nodes ? JSON.parse(flow.nodes as string) : [],
    })
})

// 删除审批流程
export const DELETE = withErrorHandler(async (
    request: NextRequest,
    context?: { params: Promise<Record<string, string>> }
) => {
    const { id } = await context!.params

    // 检查是否有关联数据 (如果有)
    // 目前没有强制关联检查，直接删除

    await prisma.approvalFlow.delete({ where: { id } })

    return success({ success: true })
})
