import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

// 创建普通用户角色并迁移业务角色用户
export async function POST() {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ success: false, message: '未授权' }, { status: 401 })
    }

    // 1. 创建"普通用户"角色
    const userRole = await prisma.role.upsert({
      where: { code: 'user' },
      update: {
        name: '普通用户',
        description: '系统普通用户，具有基本操作权限',
        dataScope: 'self',
      },
      create: {
        name: '普通用户',
        code: 'user',
        description: '系统普通用户，具有基本操作权限',
        dataScope: 'self',
        status: true,
      },
    })

    // 2. 查询业务角色的用户
    const businessRoleCodes = ['sales_manager', 'sales', 'lab_director', 'tester', 'finance', 'sample_admin']

    const usersWithBusinessRoles = await prisma.user.findMany({
      where: {
        roles: {
          some: {
            role: {
              code: {
                in: businessRoleCodes,
              },
            },
          },
        },
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    })

    // 3. 迁移用户到"普通用户"角色
    let migratedCount = 0
    for (const user of usersWithBusinessRoles) {
      // 删除业务角色关联
      await prisma.userRole.deleteMany({
        where: {
          userId: user.id,
          role: {
            code: {
              in: businessRoleCodes,
            },
          },
        },
      })

      // 添加"普通用户"角色
      await prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId: user.id,
            roleId: userRole.id,
          },
        },
        update: {},
        create: {
          userId: user.id,
          roleId: userRole.id,
        },
      })

      migratedCount++
    }

    // 4. 查询业务角色列表（显示可删除的）
    const businessRoles = await prisma.role.findMany({
      where: {
        code: {
          in: businessRoleCodes,
        },
      },
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        userRole,
        migratedCount,
        usersMigrated: usersWithBusinessRoles.length,
        businessRoles: businessRoles.map(r => ({
          id: r.id,
          name: r.name,
          code: r.code,
          userCount: r._count.users,
          canDelete: r._count.users === 0,
        })),
      },
    })
  } catch (error) {
    console.error('角色迁移失败:', error)
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    )
  }
}
