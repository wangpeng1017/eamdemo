import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

// 获取客户报告列表
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')
    const status = searchParams.get('status')

    const where: any = {}
    if (status) where.status = status

    const [list, total] = await Promise.all([
        prisma.clientReport.findMany({
            where,
            skip: (page - 1) * pageSize,
            take: pageSize,
            orderBy: { createdAt: 'desc' }
        }),
        prisma.clientReport.count({ where })
    ])

    return NextResponse.json({
        success: true,
        data: { list, total, page, pageSize }
    })
}
