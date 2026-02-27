import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withAuth, success } from '@/lib/api-handler'

// 获取设备列表（用于下拉选择）- 需要登录
export const GET = withAuth(async (request: NextRequest, user) => {
  const devices = await prisma.device.findMany({
    where: {
      status: { not: 'scrapped' }
    },
    select: {
      id: true,
      deviceNo: true,
      name: true,
    },
    orderBy: { deviceNo: 'asc' },
  })

  return success({ list: devices })
})
