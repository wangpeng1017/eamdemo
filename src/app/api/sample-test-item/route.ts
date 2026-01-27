/**
 * @file 样品检测项 API
 * @desc 统一管理业务单据中的样品+检测项目组合
 * @see PRD: docs/plans/2026-01-27-sample-test-item-design.md
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'

// 有效的业务类型
const VALID_BIZ_TYPES = ['consultation', 'quotation', 'contract', 'entrustment', 'sample_receipt']

/**
 * GET /api/sample-test-item
 * 查询样品检测项列表
 * @query bizType - 业务类型
 * @query bizId - 业务单据ID
 */
export const GET = withAuth(async (req: NextRequest, session) => {
  try {
    const { searchParams } = new URL(req.url)
    const bizType = searchParams.get('bizType')
    const bizId = searchParams.get('bizId')

    // 参数验证
    if (!bizType || !bizId) {
      return NextResponse.json(
        { success: false, error: { message: '缺少必要参数 bizType 或 bizId' } },
        { status: 400 }
      )
    }

    if (!VALID_BIZ_TYPES.includes(bizType)) {
      return NextResponse.json(
        { success: false, error: { message: `无效的业务类型: ${bizType}` } },
        { status: 400 }
      )
    }

    const items = await prisma.sampleTestItem.findMany({
      where: { bizType, bizId },
      orderBy: { sortOrder: 'asc' },
    })

    return NextResponse.json({ success: true, data: items })
  } catch (error) {
    console.error('查询样品检测项失败:', error)
    return NextResponse.json(
      { success: false, error: { message: '查询失败' } },
      { status: 500 }
    )
  }
})

/**
 * POST /api/sample-test-item
 * 批量保存样品检测项（先删除旧数据，再插入新数据）
 * @body bizType - 业务类型
 * @body bizId - 业务单据ID
 * @body items - 样品检测项数组
 */
export const POST = withAuth(async (req: NextRequest, session) => {
  try {
    const body = await req.json()
    const { bizType, bizId, items } = body

    // 参数验证
    if (!bizType || !bizId) {
      return NextResponse.json(
        { success: false, error: { message: '缺少必要参数 bizType 或 bizId' } },
        { status: 400 }
      )
    }

    if (!VALID_BIZ_TYPES.includes(bizType)) {
      return NextResponse.json(
        { success: false, error: { message: `无效的业务类型: ${bizType}` } },
        { status: 400 }
      )
    }

    if (!Array.isArray(items)) {
      return NextResponse.json(
        { success: false, error: { message: 'items 必须是数组' } },
        { status: 400 }
      )
    }

    // 验证每个 item 的必填字段
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (!item.sampleName || !item.sampleName.trim()) {
        return NextResponse.json(
          { success: false, error: { message: `第 ${i + 1} 行: 样品名称不能为空` } },
          { status: 400 }
        )
      }
      if (!item.testItemName || !item.testItemName.trim()) {
        return NextResponse.json(
          { success: false, error: { message: `第 ${i + 1} 行: 检测项目不能为空` } },
          { status: 400 }
        )
      }
      if (!item.quantity || item.quantity < 1) {
        return NextResponse.json(
          { success: false, error: { message: `第 ${i + 1} 行: 样品数量必须大于0` } },
          { status: 400 }
        )
      }
    }

    // 使用事务：先删除旧数据，再插入新数据
    const result = await prisma.$transaction(async (tx) => {
      // 删除该业务单据的所有旧数据
      await tx.sampleTestItem.deleteMany({
        where: { bizType, bizId },
      })

      // 插入新数据
      if (items.length > 0) {
        const createData = items.map((item: any, index: number) => ({
          bizType,
          bizId,
          sampleName: item.sampleName.trim(),
          batchNo: item.batchNo?.trim() || null,
          material: item.material?.trim() || null,
          appearance: item.appearance?.trim() || null,
          quantity: parseInt(item.quantity) || 1,
          testTemplateId: item.testTemplateId || null,
          testItemName: item.testItemName.trim(),
          testStandard: item.testStandard?.trim() || null,
          judgmentStandard: item.judgmentStandard?.trim() || null,
          sortOrder: index,
        }))

        await tx.sampleTestItem.createMany({ data: createData })
      }

      // 返回新数据
      return tx.sampleTestItem.findMany({
        where: { bizType, bizId },
        orderBy: { sortOrder: 'asc' },
      })
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('保存样品检测项失败:', error)
    return NextResponse.json(
      { success: false, error: { message: '保存失败' } },
      { status: 500 }
    )
  }
})
