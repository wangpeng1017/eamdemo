import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
    renderDocx,
    prepareOriginalRecordData,
    prepareClientReportData,
} from '@/lib/docx-renderer'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth()
    if (!session?.user) {
        return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'original'

    if (type !== 'original' && type !== 'client') {
        return NextResponse.json(
            { error: 'type 参数必须是 original 或 client' },
            { status: 400 }
        )
    }

    // 加载检测任务及关联数据
    const task = await prisma.testTask.findUnique({
        where: { id },
        include: {
            sample: true,
            assignedTo: { select: { name: true } },
            entrustmentProject: {
                select: {
                    name: true,
                    method: true,
                    entrustmentId: true,
                    testTemplateId: true,
                },
            },
            reports: true,
        },
    })

    if (!task) {
        return NextResponse.json({ error: '任务不存在' }, { status: 404 })
    }

    // 从 TestTemplate 获取配置的模板路径
    let templateConfig: { originalRecordTemplateUrl: string | null; clientReportTemplateUrl: string | null } | null = null
    if (task.entrustmentProject?.testTemplateId) {
        templateConfig = await prisma.testTemplate.findUnique({
            where: { code: task.entrustmentProject.testTemplateId },
            select: {
                originalRecordTemplateUrl: true,
                clientReportTemplateUrl: true,
            },
        })
    }

    // 加载委托单（通过 entrustmentId 或 entrustmentProject）
    const entrustmentId =
        task.entrustmentId || task.entrustmentProject?.entrustmentId
    let entrustment = null
    if (entrustmentId) {
        entrustment = await prisma.entrustment.findUnique({
            where: { id: entrustmentId },
            include: { client: true },
        })
    }

    // 准备模板数据并渲染
    let data: Record<string, any>
    let templateFile: string
    let filenamePrefix: string

    if (type === 'original') {
        data = prepareOriginalRecordData(task, entrustment, task.sample, (task as any).metadata)
        templateFile = templateConfig?.originalRecordTemplateUrl || 'qct-original-record.docx'
        filenamePrefix = `原始记录_${task.taskNo || id}`
    } else {
        const clientReport = task.reports?.[0]
        data = prepareClientReportData(
            task,
            entrustment,
            task.sample,
            clientReport,
            (task as any).metadata
        )
        templateFile = templateConfig?.clientReportTemplateUrl || 'qct-client-report.docx'
        filenamePrefix = `检测报告_${task.taskNo || id}`
    }

    const buffer = renderDocx(templateFile, data)
    const filename = encodeURIComponent(`${filenamePrefix}.docx`)

    return new Response(new Uint8Array(buffer), {
        headers: {
            'Content-Type':
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${filename}`,
        },
    })
}
