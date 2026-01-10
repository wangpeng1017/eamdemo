import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

// 一次性 API：创建快捷登录测试用户
export async function POST() {
    const results: string[] = []

    try {
        // 获取部门
        const salesDept = await prisma.dept.findFirst({ where: { code: 'SALES' } })
        const labDept = await prisma.dept.findFirst({ where: { code: 'LAB' } })
        const financeDept = await prisma.dept.findFirst({ where: { code: 'FINANCE' } })

        // 获取角色
        const salesMgrRole = await prisma.role.findFirst({ where: { code: 'sales_manager' } })
        const financeRole = await prisma.role.findFirst({ where: { code: 'finance' } })
        const labDirRole = await prisma.role.findFirst({ where: { code: 'lab_director' } })
        const testerRole = await prisma.role.findFirst({ where: { code: 'tester' } })

        // 测试用户配置
        const testUsers = [
            { username: 'sales_mgr', password: 'sales123', name: '销售负责人', deptId: salesDept?.id, roleId: salesMgrRole?.id },
            { username: 'finance_mgr', password: 'finance123', name: '财务负责人', deptId: financeDept?.id, roleId: financeRole?.id },
            { username: 'lab_director', password: 'lab123', name: '实验室主任', deptId: labDept?.id, roleId: labDirRole?.id },
            { username: 'tester', password: 'test123', name: '检测员', deptId: labDept?.id, roleId: testerRole?.id },
        ]

        for (const user of testUsers) {
            // 检查用户是否已存在
            const existing = await prisma.user.findFirst({ where: { username: user.username } })
            if (existing) {
                results.push(`⏭️ 用户 ${user.username} 已存在`)
                continue
            }

            // 创建用户
            const newUser = await prisma.user.create({
                data: {
                    username: user.username,
                    password: await bcrypt.hash(user.password, 10),
                    name: user.name,
                    deptId: user.deptId || undefined,
                    status: 1,
                },
            })

            // 分配角色
            if (user.roleId) {
                await prisma.userRole.create({
                    data: { userId: newUser.id, roleId: user.roleId },
                })
            }

            results.push(`✅ 创建用户: ${user.username} (${user.name})`)
        }

        return NextResponse.json({ success: true, results })
    } catch (error) {
        console.error('Create test users error:', error)
        return NextResponse.json({ error: String(error), results }, { status: 500 })
    }
}
