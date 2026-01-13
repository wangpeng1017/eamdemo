import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('开始初始化数据...')
    console.log('Prisma keys:', Object.keys(prisma))
    // @ts-ignore
    console.log('Prisma models:', Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$')))

    // 1. 创建部门
    console.log('创建部门...')
    const depts = await Promise.all([
        prisma.dept.upsert({
            where: { code: 'TEST_CENTER' },
            update: {},
            create: { code: 'TEST_CENTER', name: '试验中心', sort: 1 }
        }),
        prisma.dept.upsert({
            where: { code: 'BUSINESS' },
            update: {},
            create: { code: 'BUSINESS', name: '业务部', sort: 2 }
        }),
        prisma.dept.upsert({
            where: { code: 'QUALITY' },
            update: {},
            create: { code: 'QUALITY', name: '质量部', sort: 3 }
        }),
        prisma.dept.upsert({
            where: { code: 'TESTING' },
            update: {},
            create: { code: 'TESTING', name: '检测部', sort: 4 }
        })
    ])
    console.log(`✓ 创建了 ${depts.length} 个部门`)

    // 2. 创建角色
    console.log('创建角色...')
    const roles = await Promise.all([
        prisma.role.upsert({
            where: { code: 'ADMIN' },
            update: {},
            create: { code: 'ADMIN', name: '系统管理员', description: '拥有所有权限' }
        }),
        prisma.role.upsert({
            where: { code: 'TEST_DIRECTOR' },
            update: {},
            create: { code: 'TEST_DIRECTOR', name: '检测部主任', description: '检测部门负责人' }
        }),
        prisma.role.upsert({
            where: { code: 'BUSINESS_MANAGER' },
            update: {},
            create: { code: 'BUSINESS_MANAGER', name: '业务经理', description: '业务部门经理' }
        }),
        prisma.role.upsert({
            where: { code: 'QUALITY_MANAGER' },
            update: {},
            create: { code: 'QUALITY_MANAGER', name: '质量负责人', description: '质量管理负责人' }
        }),
        prisma.role.upsert({
            where: { code: 'PRODUCT_TEST_MANAGER' },
            update: {},
            create: { code: 'PRODUCT_TEST_MANAGER', name: '产品检测负责人', description: '产品检测负责人' }
        }),
        prisma.role.upsert({
            where: { code: 'MATERIAL_TEST_MANAGER' },
            update: {},
            create: { code: 'MATERIAL_TEST_MANAGER', name: '材料检测负责人', description: '材料检测负责人' }
        }),
        prisma.role.upsert({
            where: { code: 'CHEMICAL_TEAM_LEADER' },
            update: {},
            create: { code: 'CHEMICAL_TEAM_LEADER', name: '化学组组长', description: '化学测试组长' }
        }),
        prisma.role.upsert({
            where: { code: 'TEST_ENGINEER' },
            update: {},
            create: { code: 'TEST_ENGINEER', name: '测试工程师', description: '各类测试工程师' }
        })
    ])
    console.log(`✓ 创建了 ${roles.length} 个角色`)

    // 3. 创建用户
    console.log('创建用户...')
    const hashedPassword = await bcrypt.hash('admin123', 10)

    const users = [
        { name: '秦兴国', phone: '18086538595', dept: 'TEST_CENTER', roles: ['ADMIN', 'TEST_DIRECTOR'] },
        { name: '张馨', phone: '15952575002', dept: 'BUSINESS', roles: ['BUSINESS_MANAGER', 'QUALITY_MANAGER'] },
        { name: '姜艺玺', phone: '15588392383', dept: 'BUSINESS', roles: ['BUSINESS_MANAGER'] },
        { name: '王璐', phone: '17605280797', dept: 'BUSINESS', roles: ['BUSINESS_MANAGER'] },
        { name: '刘丽愉', phone: '13478251400', dept: 'TESTING', roles: ['PRODUCT_TEST_MANAGER'] },
        { name: '严秋平', phone: '18890041215', dept: 'TESTING', roles: ['MATERIAL_TEST_MANAGER'] },
        { name: '王学九', phone: '18796613768', dept: 'TESTING', roles: ['CHEMICAL_TEAM_LEADER'] },
        { name: '欧晴', phone: '18552552535', dept: 'TESTING', roles: ['TEST_ENGINEER'] },
        { name: '周承强', phone: '13816717872', dept: 'TESTING', roles: ['TEST_ENGINEER'] },
        { name: '吴凡', phone: '17315367348', dept: 'TESTING', roles: ['TEST_ENGINEER'] },
        { name: '武基勇', phone: '18652535583', dept: 'TESTING', roles: ['TEST_ENGINEER'] },
        { name: '胡长伟', phone: '19975077219', dept: 'TESTING', roles: ['TEST_ENGINEER'] },
        { name: '刘宇航', phone: '13773369674', dept: 'TESTING', roles: ['TEST_ENGINEER'] },
        { name: '杨朕', phone: '18932362327', dept: 'TESTING', roles: ['TEST_ENGINEER'] }
    ]

    for (const userData of users) {
        const dept = depts.find(d => d.code === userData.dept)

        // 创建或更新用户
        const user = await prisma.user.upsert({
            where: { username: userData.phone }, // 使用 phone 作为 username
            update: {
                name: userData.name,
                phone: userData.phone,
                deptId: dept?.id,
                status: 1
            },
            create: {
                username: userData.phone, // username 也是 phone
                name: userData.name,
                phone: userData.phone,
                password: await bcrypt.hash(userData.phone, 10), // 默认密码为手机号
                deptId: dept?.id,
                status: 1
            }
        })

        // 分配角色
        for (const roleCode of userData.roles) {
            const role = roles.find(r => r.code === roleCode)
            if (role) {
                await prisma.userRole.upsert({
                    where: {
                        userId_roleId: {
                            userId: user.id,
                            roleId: role.id
                        }
                    },
                    update: {},
                    create: {
                        userId: user.id,
                        roleId: role.id
                    }
                })
            }
        }
        console.log(`✓ 创建用户: ${userData.name} (${userData.phone})`)
    }

    // 4. 创建 admin 账号（用于管理）
    const adminUser = await prisma.user.upsert({
        where: { username: 'admin' },
        update: {
            password: hashedPassword,
            status: 1
        },
        create: {
            username: 'admin',
            name: '系统管理员',
            phone: 'admin',
            password: hashedPassword,
            status: 1
        }
    })

    const adminRole = roles.find(r => r.code === 'ADMIN')
    if (adminRole) {
        await prisma.userRole.upsert({
            where: {
                userId_roleId: {
                    userId: adminUser.id,
                    roleId: adminRole.id
                }
            },
            update: {},
            create: {
                userId: adminUser.id,
                roleId: adminRole.id
            }
        })
    }
    console.log('✓ 创建管理员账号: admin / admin123')

    console.log('\n数据初始化完成！')
    console.log('\n可用账号：')
    console.log('- admin / admin123 (系统管理员)')
    users.forEach(u => {
        console.log(`- ${u.phone} / ${u.phone} (${u.name})`)
    })
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
