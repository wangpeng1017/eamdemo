/**
 * @file inspection-item/[id]/route.ts
 * @desc 检测项目 CRUD API - PUT/DELETE
 * @input InspectionItem 模型
 * @output 更新/删除结果
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

/**
 * PUT /api/inspection-item/[id]
 * 更新检测项目
 */
export async function PUT(
 request: NextRequest,
 { params }: { params: Promise<{ id: string }> }
) {
 try {
 const { id } = await params
  const body = await request.json()
  const { standardId, name, method, unit, requirement, remark, sort, status } = body

 const updateData: Record<string, unknown> = {}
 if (standardId !== undefined) updateData.standardId = standardId
 if (name !== undefined) updateData.name = name
 if (method !== undefined) updateData.method = method
 if (unit !== undefined) updateData.unit = unit
 if (requirement !== undefined) updateData.requirement = requirement
 if (remark !== undefined) updateData.remark = remark
 if (sort !== undefined) updateData.sort = sort
 if (status !== undefined) updateData.status = status

 const item = await prisma.inspectionItem.update({
 where: { id },
  data: updateData,
 include: {
  standard: {
   select: {
   id: true,
  standardNo: true,
  name: true,
 category: true,
  },
  },
  },
  })

 return NextResponse.json({
  success: true,
  data: item,
  })
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
 */
export async function DELETE(
 request: NextRequest,
 { params }: { params: Promise<{ id: string }> }
) {
 try {
 const { id } = await params

 await prisma.inspectionItem.delete({
 where: { id },
 })

 return NextResponse.json({
  success: true,
 data: { id },
 })
 } catch (error: unknown) {
 console.error('DELETE /api/inspection-item/[id] error:', error)
 return NextResponse.json({
  success: false,
  error: error instanceof Error ? error.message : '删除检测项目失败',
 }, { status: 500 })
 }
}
