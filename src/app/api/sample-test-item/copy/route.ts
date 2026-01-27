/**
 * @file 样品检测项复制 API
 * @desc 从源业务单据复制样品检测项到目标业务单据
 * @see PRD: docs/plans/2026-01-27-sample-test-item-design.md
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'

// 有效的业务类型
const VALID_BIZ_TYPES = ['consultation', 'quotation', 'contract', 'entrustment', 'sample_receipt']

/**
 * POST /api/sample-test-item/copy
 * 从源业务单据复制样品检测项到目标业务单据
 * @body sourceBizType - 源业务类型
 * @body sourceBizId - 源业务单据ID
 * @body targetBizType - 目标业务类型
 * @body targetBizId - 目标业务单据ID
 */
export const POST = withAuth(async (req: NextRequest, session) => {
  try {
    const body = await req.json()
    const { sourceBizType, sourceBizId, targetBizType, targetBizId } = body

    // 参数验证
    if (!sourceBizType || !sourceBizId || !targetBizType || !targetBizId) {
      return NextResponse.json(
        { success: false, error: { message: '缺少必要参数' } },
        { status: 400 }
      )
    }

    if (!VALID_BIZ_TYPES.includes(sourceBizType) || !VALID_BIZ_TYPES.includes(targetBizType)) {
      return NextResponse.json(
        { success: false, error: { message: '无效的业务类型' } },
        { status: 400 }
      )
    }

    // 查询源数据
    const sourceItems = await prisma.sampleTestItem.findMany({
      where: { bizType: sourceBizType, bizId: sourceBizId },
      orderBy: { sortOrder: 'asc' },
    })

    if (sourceItems.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        message: '源单据没有样品检测项数据'
      })
    }

    // 使用事务：先删除目标的旧数据，再插入复制的数据
    const result = await prisma.$transaction(async (tx) => {
      // 删除目标业务单据的所有旧数据
      await tx.sampleTestItem.deleteMany({
        where: { bizType: targetBizType, bizId: targetBizId },
      })

      // 复制数据到目标
      const createData = sourceItems.map((item, index) => ({
        bizType: targetBizType,
        bizId: targetBizId,
        sampleName: item.sampleName,
        batchNo: item.batchNo,
        material: item.material,
        appearance: item.appearance,
        quantity: item.quantity,
        testTemplateId: item.testTemplateId,
        testItemName: item.testItemName,
        testStandard: item.testStandard,
        judgmentStandard: item.judgmentStandard,
        sortOrder: index,
      }))

      await tx.sampleTestItem.createMany({ data: createData })

      // 返回新数据
      return tx.sampleTestItem.findMany({
        where: { bizType: targetBizType, bizId: targetBizId },
        orderBy: { sortOrder: 'asc' },
      })
    })

    return NextResponse.json({
      success: true,
      data: result,
      message: `成功复制 ${result.length} 条样品检测项`
    })
  } catch (error) {
    console.error('复制样品检测项失败:', error)
    return NextResponse.json(
      { success: false, error: { message: '复制失败' } },
      { status: 500 }
    )
  }
})
