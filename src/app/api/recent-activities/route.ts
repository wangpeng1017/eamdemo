import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withErrorHandler, success } from '@/lib/api-handler'
import dayjs from 'dayjs'

// 获取最近活动列表
export const GET = withErrorHandler(async (request: NextRequest) => {
    const { searchParams } = new URL(request.url)
    const pageSize = parseInt(searchParams.get('pageSize') || '10')

    const activities: any[] = []

    // 1. 最近的委托单
    const recentEntrustments = await prisma.entrustment.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            entrustmentNo: true,
            clientName: true,
            status: true,
            createdAt: true,
        },
    })
    recentEntrustments.forEach(e => {
        activities.push({
            id: `entrustment-${e.id}`,
            type: 'entrustment',
            no: e.entrustmentNo,
            client: e.clientName,
            status: e.status,
            createdAt: dayjs(e.createdAt).format('YYYY-MM-DD HH:mm'),
        })
    })

    // 2. 最近的报价单
    const recentQuotations = await prisma.quotation.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { client: true },
    })
    recentQuotations.forEach(q => {
        activities.push({
            id: `quotation-${q.id}`,
            type: 'quotation',
            no: q.quotationNo,
            client: q.client?.name,
            status: q.status,
            createdAt: dayjs(q.createdAt).format('YYYY-MM-DD HH:mm'),
        })
    })

    // 3. 最近的合同
    const recentContracts = await prisma.contract.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            contractNo: true,
            clientName: true,
            status: true,
            createdAt: true,
        },
    })
    recentContracts.forEach(c => {
        activities.push({
            id: `contract-${c.id}`,
            type: 'contract',
            no: c.contractNo,
            client: c.clientName,
            status: c.status,
            createdAt: dayjs(c.createdAt).format('YYYY-MM-DD HH:mm'),
        })
    })

    // 按创建时间排序并限制数量
    const sortedActivities = activities
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, pageSize)

    return success({
        list: sortedActivities,
        total: activities.length,
    })
})
