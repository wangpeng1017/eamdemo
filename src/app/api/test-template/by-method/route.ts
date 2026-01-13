
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { success } from '@/lib/api-handler'

// GET /api/test-template/by-method?method=GB/T%203354-2014
// 通过检测方法模糊匹配查找模版
export const GET = async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const method = searchParams.get('method')

  if (!method) {
    return success({ list: [] })
  }

  // 模糊匹配检测方法（MySQL 默认不区分大小写）
  const templates = await prisma.testTemplate.findMany({
    where: {
      method: {
        contains: method
      },
      status: 'active'
    },
    orderBy: {
      updatedAt: 'desc' // 最新的优先
    },
    select: {
      id: true,
      code: true,
      name: true,
      category: true,
      method: true,
      schema: true,
      status: true
    }
  })

  return success({ list: templates })
}
