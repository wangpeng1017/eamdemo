/**
 * @file 易耗品分类详情 API
 * @desc 提供单个分类的 GET/PUT/DELETE 操作
 */

import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withAuth, success, badRequest } from '@/lib/api-handler'

// 获取单个分类
export const GET = withAuth(async (request: NextRequest, user, { params }: any) => {
    const { id } = await params
    const category = await prisma.consumableCategory.findUnique({
        where: { id },
        include: {
            children: { where: { status: 1 }, orderBy: { sort: 'asc' } },
            _count: { select: { consumables: true } },
        },
    })

    if (!category) {
        badRequest('分类不存在')
    }

    return success(category)
})

// 更新分类
export const PUT = withAuth(async (request: NextRequest, user, { params }: any) => {
    const { id } = await params
    const data = await request.json()

    const category = await prisma.consumableCategory.update({
        where: { id },
        data: {
            name: data.name,
            code: data.code,
            description: data.description || null,
            sort: data.sort ?? 0,
        },
    })

    return success(category)
})

// 删除分类
export const DELETE = withAuth(async (request: NextRequest, user, { params }: any) => {
    const { id } = await params

    // 检查是否有子分类
    const childCount = await prisma.consumableCategory.count({ where: { parentId: id } })
    if (childCount > 0) {
        badRequest('该分类下有子分类，请先删除子分类')
    }

    // 检查是否有关联耗材
    const consumableCount = await prisma.consumable.count({ where: { categoryId: id } })
    if (consumableCount > 0) {
        badRequest('该分类下有耗材，请先转移或删除耗材')
    }

    await prisma.consumableCategory.delete({ where: { id } })
    return success({ message: '删除成功' })
})
