import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        const session = await auth()

        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: { message: '未登录' } },
                { status: 401 }
            )
        }

        // 获取用户详细信息,包括角色和权限
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: {
                roles: {
                    include: {
                        role: {
                            include: {
                                permissions: {
                                    include: { permission: true }
                                }
                            }
                        }
                    }
                }
            }
        })

        if (!user || user.status !== 1) {
            return NextResponse.json(
                { success: false, error: { message: '用户不存在或已禁用' } },
                { status: 404 }
            )
        }

        // 获取用户的角色代码
        const roles = user.roles.map(ur => ur.role.code)

        // 获取用户的所有权限代码
        const permissions = user.roles.flatMap(ur =>
            ur.role.permissions.map(rp => rp.permission.code)
        )

        // 去重权限
        const uniquePermissions = Array.from(new Set(permissions))

        // 计算最高数据权限级别
        const scopePriority: Record<string, number> = { all: 3, dept: 2, self: 1 }
        let maxDataScope = 'self'
        for (const ur of user.roles) {
            const scope = (ur.role as any).dataScope || 'self'
            if ((scopePriority[scope] || 0) > (scopePriority[maxDataScope] || 0)) {
                maxDataScope = scope
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                id: user.id,
                name: user.name,
                email: user.email,
                username: user.username,
                phone: user.phone,
                avatar: user.avatar,
                role: roles[0] || 'USER', // 主要角色
                roles, // 所有角色
                permissions: uniquePermissions,
                department: user.department,
                position: user.position,
                status: user.status,
                dataScope: maxDataScope,
            }
        })
    } catch (error) {
        console.error('获取用户信息失败:', error)
        return NextResponse.json(
            {
                success: false,
                error: {
                    message: '获取用户信息失败',
                    details: error instanceof Error ? error.message : String(error)
                }
            },
            { status: 500 }
        )
    }
}
