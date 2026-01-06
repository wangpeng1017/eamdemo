import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// 获取设备列表（用于下拉选择）
export async function GET(request: NextRequest) {
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

  return NextResponse.json({ list: devices })
}
