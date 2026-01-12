import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

// 生成客户报告编号
function generateReportNo() {
    const date = new Date()
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `CR${y}${m}${d}${random}`
}

// 生成客户报告（整合多个任务报告）
export async function POST(request: NextRequest) {
    const session = await auth()
    if (!session?.user) {
        return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json()
    const { entrustmentId, taskIds, clientName, projectName, sampleName, overallConclusion } = body

    if (!entrustmentId || !taskIds || taskIds.length === 0 || !clientName || !sampleName) {
        return NextResponse.json({ error: '缺少必填字段' }, { status: 400 })
    }

    // 获取相关任务和任务报告
    const tasks = await prisma.testTask.findMany({
        where: {
            id: { in: taskIds },
            status: 'completed'
        },
        include: {
            testData: true
        }
    })

    if (tasks.length === 0) {
        return NextResponse.json({ error: '未找到已完成的任务' }, { status: 400 })
    }

    // 获取任务报告编号
    const taskReportNos = await prisma.testReport.findMany({
        where: {
            taskId: { in: taskIds }
        },
        select: {
            reportNo: true,
            taskId: true
        }
    })

    // 整合检测项目和依据
    const testItems: string[] = []
    const testStandards: string[] = []

    tasks.forEach(task => {
        task.testData?.forEach((data: any) => {
            if (data.parameter && !testItems.includes(data.parameter)) {
                testItems.push(data.parameter)
            }
            if (data.standard && !testStandards.includes(data.standard)) {
                testStandards.push(data.standard)
            }
        })
    })

    // 创建客户报告
    const report = await prisma.clientReport.create({
        data: {
            reportNo: generateReportNo(),
            entrustmentId,
            projectName,
            clientName,
            sampleName,
            taskReportNos: JSON.stringify(taskReportNos.map(r => r.reportNo)),
            testItems: JSON.stringify(testItems),
            testStandards: JSON.stringify(testStandards),
            overallConclusion,
            preparer: session.user.name || session.user.id || '系统',
            status: 'draft'
        }
    })

    return NextResponse.json({
        success: true,
        data: report,
        message: '客户报告生成成功'
    })
}
