import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// 获取样品关联委托单中已分配/分包的检测人员列表
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params

    try {
        // 1. 查询样品的 entrustmentId
        const sample = await prisma.sample.findUnique({
            where: { id },
            select: { id: true, entrustmentId: true }
        })

        if (!sample) {
            return NextResponse.json({ error: '样品不存在' }, { status: 404 })
        }

        if (!sample.entrustmentId) {
            return NextResponse.json({
                entrustmentNo: null,
                clientName: null,
                assignees: []
            })
        }

        // 2. 查询关联的委托单及其项目和任务
        const entrustment = await prisma.entrustment.findUnique({
            where: { id: sample.entrustmentId },
            select: {
                entrustmentNo: true,
                client: { select: { name: true } },
                projects: {
                    select: {
                        name: true,
                        assignTo: true,
                        subcontractAssignee: true,
                        testTasks: {
                            select: {
                                assignedTo: { select: { id: true, name: true } }
                            }
                        }
                    }
                }
            }
        })

        if (!entrustment) {
            return NextResponse.json({
                entrustmentNo: null,
                clientName: null,
                assignees: []
            })
        }

        // 3. 收集所有已分配的人员（去重）
        const assigneeMap = new Map<string, { id: string; name: string; source: string }>()

        // 查询所有用户用于匹配 assignTo（assignTo 存的是用户名）
        const allUsers = await prisma.user.findMany({
            select: { id: true, name: true }
        })
        const userByName = new Map(allUsers.map(u => [u.name, u]))

        for (const project of entrustment.projects) {
            // 从 EntrustmentProject.assignTo（存用户名）
            if (project.assignTo) {
                const user = userByName.get(project.assignTo)
                if (user && !assigneeMap.has(user.id)) {
                    assigneeMap.set(user.id, {
                        id: user.id,
                        name: user.name,
                        source: `分配 - ${project.name}`
                    })
                } else if (!user) {
                    const key = `name:${project.assignTo}`
                    if (!assigneeMap.has(key)) {
                        assigneeMap.set(key, {
                            id: project.assignTo,
                            name: project.assignTo,
                            source: `分配 - ${project.name}`
                        })
                    }
                }
            }

            // 从 TestTask.assignedTo
            for (const task of project.testTasks) {
                if (task.assignedTo && !assigneeMap.has(task.assignedTo.id)) {
                    assigneeMap.set(task.assignedTo.id, {
                        id: task.assignedTo.id,
                        name: task.assignedTo.name,
                        source: `任务 - ${project.name}`
                    })
                }
            }

            // 从分包人
            if (project.subcontractAssignee) {
                const user = userByName.get(project.subcontractAssignee)
                if (user && !assigneeMap.has(user.id)) {
                    assigneeMap.set(user.id, {
                        id: user.id,
                        name: user.name,
                        source: `分包 - ${project.name}`
                    })
                }
            }
        }

        return NextResponse.json({
            entrustmentNo: entrustment.entrustmentNo,
            clientName: entrustment.client?.name || null,
            assignees: Array.from(assigneeMap.values())
        })
    } catch (e: any) {
        console.error('[GET /api/sample/[id]/assignees] Error:', e)
        return NextResponse.json({ error: e.message || '查询失败' }, { status: 500 })
    }
}
