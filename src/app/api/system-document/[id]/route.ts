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

// DELETE: 删除体系文件
export const DELETE = withAuth(async (request: NextRequest, user, context) => {
    const { id } = await context!.params as { id: string }

    await prisma.systemDocument.delete({ where: { id } })

    return success({ deleted: true })
})
