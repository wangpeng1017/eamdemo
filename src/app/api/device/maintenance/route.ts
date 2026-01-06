import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// 获取设备维修记录
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const type = searchParams.get('type')
  const status = searchParams.get('status')

  const where: any = {}
  if (type) where.repairType = type
  if (status) where.status = status

  const [list, total] = await Promise.all([
    prisma.deviceRepair.findMany({
      where,
      include: {
        device: {
          select: {
            deviceNo: true,
            name: true,
          }
        }
      },
      orderBy: { faultDate: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.deviceRepair.count({ where }),
  ])

  // Format the response to match expected interface
  const formattedList = list.map((item: any) => ({
    id: item.id,
    device: item.device,
    maintenanceType: item.repairType,
    maintenanceDate: item.faultDate,
    maintainer: item.repairBy,
    cost: item.repairCost ? Number(item.repairCost) : null,
    status: item.status,
    description: item.faultDesc,
  }))

  return NextResponse.json({ list: formattedList, total, page, pageSize })
}

// 创建维修记录
export async function POST(request: NextRequest) {
  const data = await request.json()

  // Generate repair number
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const count = await prisma.deviceRepair.count({
    where: { repairNo: { startsWith: 'RX' + today } }
  })
  const repairNo = 'RX' + today + String(count + 1).padStart(3, '0')

  const repair = await prisma.deviceRepair.create({
    data: {
      deviceId: data.deviceId,
      repairNo,
      repairType: data.maintenanceType,
      faultDate: new Date(data.maintenanceDate),
      faultDesc: data.description,
      repairBy: data.maintainer,
      repairCost: data.cost ? parseFloat(data.cost) : null,
      status: data.status || 'pending',
      remark: data.nextDate ? `下次维护: ${data.nextDate}` : null,
    }
  })

  return NextResponse.json(repair)
}
