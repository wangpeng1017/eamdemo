/**
 * @file route.ts
 * @desc 体系文件管理 API - 列表查询和新增
 */

import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withAuth, success, error } from '@/lib/api-handler'

// GET: 获取体系文件列表
export const GET = withAuth(async (request: NextRequest) => {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')
    const keyword = searchParams.get('keyword') || ''

    const where = keyword ? {
        OR: [
            { title: { contains: keyword } },
            { category: { contains: keyword } },
        ]
    } : {}

    const [list, total] = await Promise.all([
        prisma.systemDocument.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        prisma.systemDocument.count({ where }),
    ])

    return success({ list, total, page, pageSize })
})

// POST: 新增体系文件
export const POST = withAuth(async (request: NextRequest, user) => {
    const data = await request.json()

    if (!data.title) {
        return error('MISSING_TITLE', '文件名称为必填项')
    }

    const doc = await prisma.systemDocument.create({
        data: {
            title: data.title,
            category: data.category || null,
            version: data.version || null,
            // content 字段存储附件信息 JSON
            content: data.content ? (typeof data.content === 'string' ? data.content : JSON.stringify(data.content)) : null,
            status: 1,
        },
    })

    return success(doc)
})
