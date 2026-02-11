/**
 * @file inspection-item/[id]/route.ts
 * @desc 检测项目 CRUD API - PUT/DELETE
 *       更新/删除时同步 TestTemplate，支持审批状态管理
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApprovalEngine } from '@/lib/approval/engine'

/**
 * PUT /api/inspection-item/[id]
 * 更新检测项目（编辑现行有效的项目→变为草稿）
 */
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await request.json()
        const { categoryId, name, executionStandard, sampleQuantity, materialFile, method, unit, requirement, remark, sort, status } = body

        // 查询当前项目状态
        const current = await prisma.inspectionItem.findUnique({ where: { id } })
        if (!current) {
            return NextResponse.json({ success: false, error: '检测项目不存在' }, { status: 404 })
        }

        const updateData: Record<string, unknown> = {}
        if (categoryId !== undefined) updateData.categoryId = categoryId
        if (name !== undefined) updateData.name = name
        if (executionStandard !== undefined) updateData.executionStandard = executionStandard
        if (sampleQuantity !== undefined) updateData.sampleQuantity = sampleQuantity
        if (materialFile !== undefined) updateData.materialFile = materialFile
        if (method !== undefined) updateData.method = method
        if (unit !== undefined) updateData.unit = unit
        if (requirement !== undefined) updateData.requirement = requirement
        if (remark !== undefined) updateData.remark = remark
        if (sort !== undefined) updateData.sort = sort
        if (status !== undefined) updateData.status = status

        // 编辑现行有效的项目→自动变为草稿，需重新提交审批
        if (current.approvalStatus === 'effective') {
            updateData.approvalStatus = 'draft'
        }
        // 前端显式传 approvalStatus 时也处理
        if (body.approvalStatus !== undefined) {
            updateData.approvalStatus = body.approvalStatus
        }

        const item = await prisma.inspectionItem.update({
            where: { id },
            data: updateData,
            include: {
                category: { select: { id: true, name: true, parentId: true } },
            },
        })

        // 同步更新 TestTemplate（通过 code 匹配）
        try {
            const code = `IT-${id.slice(-8).toUpperCase()}`
            const existingTemplate = await prisma.testTemplate.findUnique({ where: { code } })
            if (existingTemplate) {
                const templateUpdate: Record<string, unknown> = {}
                if (name !== undefined) templateUpdate.name = name
                if (executionStandard !== undefined) templateUpdate.method = executionStandard
                if (Object.keys(templateUpdate).length > 0) {
                    await prisma.testTemplate.update({ where: { code }, data: templateUpdate })
                }
            }
        } catch (syncError) {
            console.error('同步更新 TestTemplate 失败:', syncError)
        }

        return NextResponse.json({ success: true, data: item })
    } catch (error: unknown) {
        console.error('PUT /api/inspection-item/[id] error:', error)
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : '更新检测项目失败',
            },
            { status: 500 }
        )
    }
}

/**
 * DELETE /api/inspection-item/[id]
 * 删除检测项目
 * - 草稿状态：直接删除
 * - 现行有效：发起删除审批（前端已处理，这里做兜底）
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        // 查询当前项目状态
        const current = await prisma.inspectionItem.findUnique({ where: { id } })
        if (!current) {
            return NextResponse.json({ success: false, error: '检测项目不存在' }, { status: 404 })
        }

        // 现行有效或审批中的项目不能直接删除
        if (current.approvalStatus === 'effective' || current.approvalStatus === 'pending' || current.approvalStatus === 'pending_delete') {
            return NextResponse.json(
                { success: false, error: '现行有效或审批中的项目不能直接删除，请通过审批流程操作' },
                { status: 400 }
            )
        }

        await prisma.inspectionItem.delete({ where: { id } })

        // 同步删除 TestTemplate
        try {
            const code = `IT-${id.slice(-8).toUpperCase()}`
            const existingTemplate = await prisma.testTemplate.findUnique({ where: { code } })
            if (existingTemplate) {
                await prisma.testTemplate.delete({ where: { code } })
            }
        } catch (syncError) {
            console.error('同步删除 TestTemplate 失败:', syncError)
        }

        return NextResponse.json({ success: true, data: { id } })
    } catch (error: unknown) {
        console.error('DELETE /api/inspection-item/[id] error:', error)
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : '删除检测项目失败',
            },
            { status: 500 }
        )
    }
}

