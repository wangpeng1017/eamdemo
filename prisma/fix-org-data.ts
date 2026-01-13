
import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

// 部门定义
const targetDepts = [
    { name: '试验中心', code: 'TEST_CENTER' },
    { name: '业务部', code: 'SALES_DEPT' },
    { name: '质量部', code: 'QUALITY_DEPT' },
    { name: '检测部', code: 'TEST_DEPT' },
]

// 角色定义
const roles = [
    { name: '检测部主任', code: 'TEST_DIRECTOR' },
    { name: '业务经理', code: 'SALES_MANAGER' },
    { name: '质量负责人', code: 'QUALITY_MANAGER' },
    { name: '产品检测负责人', code: 'PRODUCT_TEST_LEAD' },
    { name: '材料检测负责人', code: 'MATERIAL_TEST_LEAD' },
    { name: '化学组组长', code: 'CHEM_GROUP_LEAD' },
    { name: '化学测试工程师', code: 'CHEM_TEST_ENGINEER' },
    { name: '物理性能工程师', code: 'PHYS_TEST_ENGINEER' },
    { name: '机械性能工程师', code: 'MECH_TEST_ENGINEER' },
    { name: '测试工程师', code: 'TEST_ENGINEER' },
    { name: '腐蚀测试工程师', code: 'CORROSION_TEST_ENGINEER' },
    { name: '电池测试工程师', code: 'BATTERY_TEST_ENGINEER' },
]

// 用户数据
const users = [
    { name: '秦兴国', phone: '18086538595', dept: '试验中心', role: '检测部主任' },
    { name: '张馨', phone: '15952575002', dept: '业务部', role: '业务经理' }, // 兼 质量部 质量负责人
    { name: '姜艺玺', phone: '15588392383', dept: '业务部', role: '业务经理' },
    { name: '王璐', phone: '17605280797', dept: '业务部', role: '业务经理' },
    { name: '刘丽愉', phone: '13478251400', dept: '检测部', role: '产品检测负责人' },
    { name: '严秋平', phone: '18890041215', dept: '检测部', role: '材料检测负责人' },
    { name: '王学九', phone: '18796613768', dept: '检测部', role: '化学组组长' },
    { name: '欧晴', phone: '18552552535', dept: '检测部', role: '化学测试工程师' },
    { name: '周承强', phone: '13816717872', dept: '检测部', role: '物理性能工程师' },
    { name: '吴凡', phone: '17315367348', dept: '检测部', role: '机械性能工程师' },
    { name: '武基勇', phone: '18652535583', dept: '检测部', role: '测试工程师' },
    { name: '胡长伟', phone: '19975077219', dept: '检测部', role: '腐蚀测试工程师' },
    { name: '刘宇航', phone: '13773369674', dept: '检测部', role: '电池测试工程师' },
    { name: '杨朕', phone: '18932362327', dept: '检测部', role: '电池测试工程师' },
]

async function main() {
    console.log('开始清理和修复组织架构数据...')

    // 1. 理清部门
    const allDepts = await prisma.dept.findMany()
    const keepDeptCodes = targetDepts.map(d => d.code)

    // 找出需要删除的部门
    const deptsToDelete = allDepts.filter(d => !keepDeptCodes.includes(d.code || ''))

    console.log(`发现 ${deptsToDelete.length} 个需要删除的部门`)

    // 先把所有非 admin 用户的 deptId 置空
    await prisma.user.updateMany({
        where: {
            username: { not: 'admin' }
        },
        data: { deptId: null }
    })
    console.log('已重置所有用户（除admin）的部门归属')

    // 删除多余部门
    for (const getOut of deptsToDelete) {
        try {
            await prisma.dept.delete({ where: { id: getOut.id } })
            console.log(`已删除部门: ${getOut.name}`)
        } catch (e) {
            console.error(`删除部门 ${getOut.name} 失败:`, e)
        }
    }

    // 2. 确保目标部门存在
    const deptMap = new Map<string, string>()
    for (const target of targetDepts) {
        const dept = await prisma.dept.upsert({
            where: { code: target.code },
            update: { name: target.name, status: 1 },
            create: {
                name: target.name,
                code: target.code,
                status: 1
            }
        })
        deptMap.set(target.name, dept.id)
        console.log(`部门确认: ${dept.name}`)
    }

    // 3. 确保角色存在
    const roleMap = new Map<string, string>()
    for (const r of roles) {
        const role = await prisma.role.upsert({
            where: { code: r.code },
            update: { name: r.name, status: 1 },
            create: {
                name: r.name,
                code: r.code,
                status: 1,
                dataScope: 'self'
            }
        })
        roleMap.set(r.name, role.id)
    }
    console.log(`角色确认完成`)

    // 4. 处理用户
    for (const u of users) {
        const userPassword = await hash(u.phone, 12)

        // 查找或创建用户
        const user = await prisma.user.upsert({
            where: { username: u.phone },
            update: {
                name: u.name,
                phone: u.phone,
                deptId: deptMap.get(u.dept),
                status: 1
            },
            create: {
                username: u.phone,
                name: u.name,
                phone: u.phone,
                password: userPassword,
                deptId: deptMap.get(u.dept),
                status: 1
            }
        })

        // 分配角色
        await prisma.userRole.deleteMany({ where: { userId: user.id } })

        const roleId = roleMap.get(u.role)
        if (roleId) {
            await prisma.userRole.create({
                data: {
                    userId: user.id,
                    roleId: roleId
                }
            })
        }

        // 特殊处理张馨：添加质量负责人角色
        if (u.name === '张馨') {
            const qualityRoleId = roleMap.get('质量负责人')
            if (qualityRoleId && qualityRoleId !== roleId) {
                await prisma.userRole.create({
                    data: {
                        userId: user.id,
                        roleId: qualityRoleId
                    }
                })
                console.log(`为张馨添加了额外角色: 质量负责人`)
            }
        }

        console.log(`用户处理完成: ${u.name}`)
    }

    console.log('数据清理和修复完成！')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
