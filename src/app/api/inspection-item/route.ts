/**
 * @file inspection-item/route.ts
 * @desc 检测项目 CRUD API - GET/POST
 * @input InspectionItem 模型
 * @output 检测项目列表/创建结果
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

/**
 * GET /api/inspection-item?standardId=xxx
 * 获取检测项目列表，支持按 standardId 过滤
 */
export async function GET(request: NextRequest) {
 try {
  const searchParams = request.nextUrl.searchParams
 const standardId = searchParams.get('standardId')

  const where = standardId ? { standardId } : {}

  const items = await prisma.inspectionItem.findMany({
  where,
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
  orderBy: {
  sort: 'asc',
  },
  })

  return NextResponse.json({
  success: true,
  data: items,
 })
 } catch (error: unknown) {
 console.error('GET /api/inspection-item error:', error)
 return NextResponse.json(
  {
 success: false,
 error: error instanceof Error ? error.message : '获取检测项目列表失败',
  },
 { status: 500 }
 )
  }
}

/**
 * POST /api/inspection-item
 * 创建检测项目
 */
export async function POST(request: NextRequest) {
 try {
 const body = await request.json()
  const { standardId, name, method, unit, requirement, remark, sort, status } = body

 if (!standardId) {
  return NextResponse.json(
  { success: false, error: 'standardId 为必填项' },
 { status: 400 }
 )
 }

 if (!name) {
 return NextResponse.json(
  { success: false, error: 'name 为必填项' },
 { status: 400 }
   )
 }

  const item = await prisma.inspectionItem.create({
  data: {
  standardId,
 name,
 method,
   unit,
  requirement,
  remark,
  sort: sort ?? 0,
 status: status ?? 1,
 },
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
 console.error('POST /api/inspection-item error:', error)
 return NextResponse.json(
 {
 success: false,
 error: error instanceof Error ? error.message : '创建检测项目失败',
 },
 { status: 500 }
 )
 }
}
