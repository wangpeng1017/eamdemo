/**
 * @file 易耗品分类 API
 * @desc 提供易耗品分类的 CRUD 操作
 */

import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withAuth, success } from '@/lib/api-handler'

// 获取分类列表（树形结构）
export const GET = withAuth(async (request: NextRequest, user) => {
    // 只查询顶级分类，子分类通过 include 自动加载
    const list = await prisma.consumableCategory.findMany({
        where: { status: 1, parentId: null },
        include: {
            children: {
                where: { status: 1 },
                orderBy: { sort: 'asc' },
                include: {
                    _count: { select: { consumables: true } },
                },
            },
            _count: { select: { consumables: true } },
        },
        orderBy: { sort: 'asc' },
    })

    return success({ list })
})

// 创建分类
export const POST = withAuth(async (request: NextRequest, user) => {
    const data = await request.json()

    // code 为 unique 字段，未提供时自动生成
    const code = data.code || `CC${Date.now().toString(36).toUpperCase()}`

    const category = await prisma.consumableCategory.create({
        data: {
            name: data.name,
            code,
            parentId: data.parentId || null,
            description: data.description || null,
            sort: data.sort || 0,
            status: data.status ?? 1,
        },
    })

    return success(category)
})
