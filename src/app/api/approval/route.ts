/**
 * @file route.ts
 * @desc 统一审批 API - 提交审批
 * @method POST
 */

import { NextRequest } from 'next/server'
import { approvalEngine } from '@/lib/approval/engine'
import { withErrorHandler, success, validateRequired } from '@/lib/api-handler'

/**
 * 提交审批
 * POST /api/approval
 *
 * @body {
 *   bizType: string      // 业务类型 (quotation/contract/client)
 *   bizId: string        // 业务ID
 *   flowCode: string     // 流程编码
 *   submitterId: string  // 提交人ID
 *   submitterName: string // 提交人姓名
 * }
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const data = await request.json()

  validateRequired(data, ['bizType', 'bizId', 'flowCode', 'submitterId', 'submitterName'])

  const instance = await approvalEngine.submit({
    bizType: data.bizType,
    bizId: data.bizId,
    flowCode: data.flowCode,
    submitterId: data.submitterId,
    submitterName: data.submitterName,
  })

  return success(instance)
})
