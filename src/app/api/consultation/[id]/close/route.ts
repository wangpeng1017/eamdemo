import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withAuth, success, notFound } from '@/lib/api-handler'

/**
 * POST /api/consultation/[id]/close
 * 关闭咨询单
 */
export const POST = withAuth(async (
  request: NextRequest,
  user,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params
  const data = await request.json()

  // 查询咨询单
  const consultation = await prisma.consultation.findUnique({
    where: { id }
  })

  if (!consultation) {
    notFound('咨询单不存在')
  }

  // 更新咨询单状态为关闭
  const updateData: any = {
    status: 'closed'
  }

  // 如果提供了关闭原因，追加到备注
  if (data.closeReason) {
    const existingNote = consultation.feasibilityNote || ''
    updateData.feasibilityNote = existingNote 
      ? \`\${existingNote}\\n\\n[关闭原因] \${data.closeReason}\`
      : \`[关闭原因] \${data.closeReason}\`
  }

  await prisma.consultation.update({
    where: { id },
    data: updateData
  })

  return success({
    message: '咨询单已关闭'
  })
})
