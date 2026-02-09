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
    const {
        entrustmentId,
        taskIds,
        templateId, // 需求2：模板ID
        coverData,  // 需求2：封面数据
        backCoverData, // 需求2：封底数据
        clientName,
        projectName,
        sampleName,
        overallConclusion
    } = body

    if (!entrustmentId || !taskIds || taskIds.length === 0 || !clientName || !sampleName) {
        return NextResponse.json({ error: '缺少必填字段' }, { status: 400 })
    }

    // 获取相关任务和任务报告
    // 需求2：需要建立 ClientReport -> TestReport 的关联
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

    // 获取任务报告 (用于关联和 JSON 存储兼容)
    const taskReports = await prisma.testReport.findMany({
        where: {
            taskId: { in: taskIds }
        },
        select: {
            id: true, // 获取 ID 用于 connect
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

    // 获取委托单和样品信息，自动带出字段
    const entrustment = await prisma.entrustment.findUnique({
        where: { id: entrustmentId },
        include: { client: true, samples: true }
    })
    const sample = entrustment?.samples?.[0]

    // 创建客户报告
    const report = await prisma.clientReport.create({
        data: {
            reportNo: generateReportNo(),
            entrustmentId,
            projectName,
            clientName,
            clientAddress: (entrustment?.client as any)?.address || entrustment?.clientAddress || null,
            sampleName,
            sampleNo: sample?.sampleNo || null,
            specification: sample?.specification || null,
            sampleQuantity: sample?.quantity || null,
            receivedDate: sample?.receiptDate || null,
            taskReportNos: JSON.stringify(taskReports.map(r => r.reportNo)),
            testItems: JSON.stringify(testItems),
            testStandards: JSON.stringify(testStandards),
            overallConclusion,
            preparer: session.user.name || session.user.id || '系统',
            status: 'draft',

            // 新增字段
            templateId: templateId || null,
            coverData: coverData ? JSON.stringify(coverData) : null,
            backCoverData: backCoverData ? JSON.stringify(backCoverData) : null,

            // 建立关联
            tasks: {
                connect: taskReports.map(r => ({ id: r.id }))
            }
        }
    })

    return NextResponse.json({
        success: true,
        data: report,
        message: '客户报告生成成功'
    })
}
