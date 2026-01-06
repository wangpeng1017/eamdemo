import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

// 保存/更新测试数据
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  const body = await request.json()
  const { id } = await params
  const { sheetData, status, summary, conclusion } = body

  // 更新任务
  const updateData: any = {
    testData: sheetData || {},
  }

  if (status) {
    updateData.status = status
    if (status === 'completed') {
      updateData.progress = 100
      updateData.completedAt = new Date()
    } else if (status === 'in_progress' && !updateData.progress) {
      updateData.progress = 50
    }
  }

  if (summary) updateData.summary = summary
  if (conclusion) updateData.conclusion = conclusion

  const task = await prisma.testTask.update({
    where: { id },
    data: updateData,
  })

  return NextResponse.json(task)
}
