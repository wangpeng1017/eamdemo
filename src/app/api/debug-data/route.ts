
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        const users = await prisma.user.findMany({
            select: { id: true, username: true, name: true }
        })

        const approvals = await prisma.approvalInstance.findMany({
            take: 20,
            orderBy: { createdAt: 'desc' },
            include: {
                quotation: { select: { quotationNo: true } }
            }
        })

        return NextResponse.json({
            users,
            approvals
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
