import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { withAuth, success, notFound, badRequest } from '@/lib/api-handler'

// 获取用户详情 - 需要登录
export const GET = withAuth(async (
  request: NextRequest,
  user,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params
  const targetUser = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, username: true, name: true, phone: true, email: true,
      status: true, createdAt: true, deptId: true, dept: true,
      roles: { include: { role: true } }
    }
  })

  if (!targetUser) {
    notFound('用户不存在')
  }

  return success(targetUser)
})

// 更新用户 - 需要登录
export const PUT = withAuth(async (
  request: NextRequest,
  user,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params
  const data = await request.json()

  const updateData: Record<string, unknown> = {
    name: data.name,
    phone: data.phone,
    email: data.email,
    status: data.status,
    deptId: data.deptId,
  }

  if (data.password) {
    // 密码复杂度验证
    if (data.password.length < 6) {
      badRequest('密码至少6个字符')
    }
    updateData.password = await bcrypt.hash(data.password, 10)
  }

  const updatedUser = await prisma.user.update({ where: { id }, data: updateData })
  return success(updatedUser)
})

// 删除用户 - 需要登录，检查关联数据
export const DELETE = withAuth(async (
  request: NextRequest,
  user,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params

  // 不能删除自己
  if (id === user.id) {
    badRequest('不能删除当前登录用户')
  }

  // 检查用户是否存在
  const targetUser = await prisma.user.findUnique({
    where: { id },
    select: { id: true, username: true }
  })

  if (!targetUser) {
    notFound('用户不存在')
  }

  try {
    // 按顺序删除所有关联数据
    // 1. 删除人员能力评审记录
    await prisma.capabilityReview.deleteMany({ where: { userId: id } })

    // 2. 删除人员能力记录
    await prisma.personnelCapability.deleteMany({ where: { userId: id } })

    // 3. 删除待办事项
    await prisma.todo.deleteMany({ where: { userId: id } })

    // 4. 删除审批记录
    await prisma.approvalLog.deleteMany({ where: { userId: id } })

    // 5. 删除委托合同（创建的）
    await prisma.contract.deleteMany({ where: { createdBy: id } })

    // 6. 删除报价单（创建的）
    await prisma.quotation.deleteMany({ where: { createdBy: id } })

    // 7. 删除委托单位（创建的）
    await prisma.client.deleteMany({ where: { createdBy: id } })

    // 8. 删除样品（创建的）
    await prisma.sample.deleteMany({ where: { createdBy: id } })

    // 9. 删除检测任务（分配的）
    await prisma.testTask.deleteMany({ where: { assignedToId: id } })

    // 10. 删除委托单（创建的）
    await prisma.entrustment.deleteMany({ where: { createdBy: id } })

    // 11. 删除用户角色关联
    await prisma.userRole.deleteMany({ where: { userId: id } })

    // 12. 最后删除用户
    await prisma.user.delete({ where: { id } })

    return success({ success: true, message: '用户已删除' })
  } catch (error: any) {
    // 详细日志
    console.error('删除用户错误:', {
      userId: id,
      errorCode: error.code,
      errorType: error.constructor?.name,
      message: error.message,
      meta: error.meta,
    })

    // 如果是 Prisma 已知错误
    if (error.code === 'P2025') {
      notFound('用户不存在')
    }
    if (error.code?.startsWith('P')) {
      badRequest(`删除失败: ${error.message || '有关联数据无法删除'}`)
    }
    throw error
  }
})
