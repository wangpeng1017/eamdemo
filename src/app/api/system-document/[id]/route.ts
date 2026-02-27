/**
 * @file route.ts
 * @desc 体系文件管理 API - 单条查询、更新、删除
 */

import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withAuth, success, error } from '@/lib/api-handler'

// GET: 获取单条体系文件
export const GET = withAuth(async (request: NextRequest, user, context) => {
    const { id } = await context!.params as { id: string }

    const doc = await prisma.systemDocument.findUnique({ where: { id } })
    if (!doc) return error('NOT_FOUND', '文件不存在', 404)

    return success(doc)
})

// PUT: 更新体系文件
export const PUT = withAuth(async (request: NextRequest, user, context) => {
    const { id } = await context!.params as { id: string }
    const data = await request.json()

    const doc = await prisma.systemDocument.update({
        where: { id },
        data: {
            title: data.title,
            category: data.category || null,
            version: data.version || null,
            content: data.content ? (typeof data.content === 'string' ? data.content : JSON.stringify(data.content)) : null,
        },
    })

    return success(doc)
})

// DELETE: 删除体系文件 - 需要管理员权限，且已发布文件不可删除
export const DELETE = withAuth(async (request: NextRequest, user, context) => {
    const { id } = await context!.params as { id: string }

    const doc = await prisma.systemDocument.findUnique({ where: { id } })
    if (!doc) return error('NOT_FOUND', '文件不存在', 404)

    // 已发布的体系文件不允许删除（status=2 表示已发布）
    if (doc.status === 2) {
        return error('FORBIDDEN', '已发布的体系文件不允许删除，请先下架', 400)
    }

    await prisma.systemDocument.delete({ where: { id } })

    return success({ deleted: true })
})
