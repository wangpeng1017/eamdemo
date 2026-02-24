import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { generateClientReportNo } from '@/lib/generate-no'

// 生成客户报告（整合多个任务报告）
export async function POST(request: NextRequest) {
    const session = await auth()
    if (!session?.user) {
        return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    let body: any
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ error: '请求参数格式错误' }, { status: 400 })
    }

    const {
        entrustmentId,
        taskIds,
        templateId,
        coverData,
        backCoverData,
        clientName,
        projectName,
        sampleName,
        overallConclusion
    } = body

    if (!entrustmentId || !Array.isArray(taskIds) || taskIds.length === 0) {
        return NextResponse.json({ error: '缺少必填字段（entrustmentId, taskIds）' }, { status: 400 })
    }

    // taskIds 可能是报告 ID 或任务 ID，先尝试按报告 ID 查询
    let taskReports = await prisma.testReport.findMany({
        where: { id: { in: taskIds } },
        select: { id: true, reportNo: true, taskId: true, sampleName: true }
    })

    // 如果按报告 ID 没找到，尝试按任务 ID 查询
    if (taskReports.length === 0) {
        taskReports = await prisma.testReport.findMany({
            where: { taskId: { in: taskIds } },
            select: { id: true, reportNo: true, taskId: true, sampleName: true }
        })
    }

    // 获取关联的任务
    const actualTaskIds = taskReports.map(r => r.taskId).filter(Boolean) as string[]
    const tasks = await prisma.testTask.findMany({
        where: { id: { in: actualTaskIds } },
        include: {
            testData: true,
            entrustmentProject: {
                select: { name: true, method: true }
            }
        }
    })

    if (taskReports.length === 0) {
        return NextResponse.json({ error: '未找到对应的任务报告' }, { status: 400 })
    }

    // 整合检测项目和检测依据
    const testItems: string[] = []
    const testStandards: string[] = []

    tasks.forEach(task => {
        task.testData?.forEach((data: any) => {
            if (data.parameter && !testItems.includes(data.parameter)) {
                testItems.push(data.parameter)
            }
        })
        const method = (task as any).entrustmentProject?.method
        if (method && !testStandards.includes(method)) {
            testStandards.push(method)
        }
    })

    // 获取委托单和样品信息
    const entrustment = await prisma.entrustment.findUnique({
        where: { id: entrustmentId },
        include: { client: true, samples: true }
    })
    const sample = entrustment?.samples?.[0]

    // 自动获取：clientName 从委托单，sampleName 从报告汇总
    const finalClientName = clientName || (entrustment?.client as any)?.name || ''
    const finalSampleName = sampleName || taskReports.map(r => r.sampleName).filter(Boolean).join('、') || ''

    // 创建客户报告
    const report = await prisma.clientReport.create({
        data: {
            reportNo: await generateClientReportNo(),
            entrustmentId,
            projectName: projectName || '',
            clientName: finalClientName,
            clientAddress: (entrustment?.client as any)?.address || entrustment?.clientAddress || null,
            sampleName: finalSampleName,
            sampleNo: sample?.sampleNo || null,
            specification: sample?.specification || null,
            sampleQuantity: sample?.quantity || null,
            receivedDate: sample?.receiptDate || null,
            taskReportNos: JSON.stringify(taskReports.map(r => r.reportNo)),
            testItems: JSON.stringify(testItems),
            testStandards: JSON.stringify(testStandards),
            overallConclusion: overallConclusion || null,
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

    // 回写委托单报告状态
    await prisma.entrustment.update({
        where: { id: entrustmentId },
        data: { reportStatus: 'generated' }
    })

    return NextResponse.json({
        success: true,
        data: report,
        message: '客户报告生成成功'
    })
}
