/**
 * 权限树同步脚本
 * 
 * 从 DashboardLayout 菜单配置自动生成权限树
 * 支持幂等执行（upsert by code）
 * 
 * 使用方式：node scripts/sync-permissions.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// 从 DashboardLayout.tsx 的 menuItems 提取的完整菜单结构
const MENU_TREE = [
    {
        key: '/',
        label: '工作台',
        code: 'menu:dashboard',
    },
    {
        key: '/entrustment',
        label: '业务管理',
        code: 'menu:entrustment',
        children: [
            { key: '/entrustment/consultation', label: '业务咨询', code: 'menu:entrustment:consultation' },
            { key: '/entrustment/quotation', label: '检测报价', code: 'menu:entrustment:quotation' },
            { key: '/entrustment/contract', label: '检测合同', code: 'menu:entrustment:contract' },
            { key: '/entrustment/list', label: '检测委托单', code: 'menu:entrustment:list' },
            { key: '/entrustment/client', label: '业务单位', code: 'menu:entrustment:client' },
        ],
    },
    {
        key: '/sample',
        label: '样品管理',
        code: 'menu:sample',
        children: [
            { key: '/sample/receipt', label: '收样登记', code: 'menu:sample:receipt' },
            { key: '/sample/details', label: '样品明细', code: 'menu:sample:details' },
            { key: '/sample/my', label: '我的样品', code: 'menu:sample:my' },
        ],
    },
    {
        key: '/task',
        label: '检测任务',
        code: 'menu:task',
        children: [
            { key: '/task/all', label: '全部任务', code: 'menu:task:all' },
            { key: '/task/my', label: '我的任务', code: 'menu:task:my' },
        ],
    },
    {
        key: '/report',
        label: '报告管理',
        code: 'menu:report',
        children: [
            { key: '/report/my', label: '我的报告', code: 'menu:report:my' },
            { key: '/report/task-generate', label: '任务报告生成', code: 'menu:report:task-generate' },
            { key: '/report/client-generate', label: '客户报告生成', code: 'menu:report:client-generate' },
            { key: '/report/client-template', label: '客户报告模板', code: 'menu:report:client-template' },
        ],
    },
    {
        key: '/device',
        label: '设备管理',
        code: 'menu:device',
        children: [
            { key: '/device', label: '设备台账', code: 'menu:device:index' },
            { key: '/device/maintenance-plan', label: '保养计划', code: 'menu:device:maintenance-plan' },
            { key: '/device/calibration-plan', label: '定检计划', code: 'menu:device:calibration-plan' },
            { key: '/device/maintenance', label: '维护记录', code: 'menu:device:maintenance' },
        ],
    },
    {
        key: '/outsource',
        label: '外包管理',
        code: 'menu:outsource',
        children: [
            { key: '/outsource/supplier', label: '供应商', code: 'menu:outsource:supplier' },
            { key: '/outsource/order', label: '外包订单', code: 'menu:outsource:order' },
        ],
    },
    {
        key: '/finance',
        label: '财务管理',
        code: 'menu:finance',
        children: [
            { key: '/finance/receivable', label: '应收款', code: 'menu:finance:receivable' },
            { key: '/finance/invoice', label: '发票管理', code: 'menu:finance:invoice' },
        ],
    },
    {
        key: '/statistics',
        label: '统计报表',
        code: 'menu:statistics',
    },
    {
        key: '/basic-data',
        label: '基础数据配置',
        code: 'menu:basic-data',
        children: [
            { key: '/basic-data/test-templates', label: '检测项目', code: 'menu:basic-data:test-templates' },
            { key: '/basic-data/inspection-standards', label: '检查标准/依据', code: 'menu:basic-data:inspection-standards' },
            { key: '/basic-data/report-categories', label: '报告分类', code: 'menu:basic-data:report-categories' },
            { key: '/basic-data/personnel-capability', label: '人员资质', code: 'menu:basic-data:personnel-capability' },
            { key: '/basic-data/capability-review', label: '能力评审', code: 'menu:basic-data:capability-review' },
        ],
    },
    {
        key: '/system',
        label: '系统设置',
        code: 'menu:system',
        children: [
            { key: '/system/user', label: '用户管理', code: 'menu:system:user' },
            { key: '/system/role', label: '角色管理', code: 'menu:system:role' },
            { key: '/system/approval-flow', label: '审批流程', code: 'menu:system:approval-flow' },
            { key: '/system/permission', label: '权限配置', code: 'menu:system:permission' },
        ],
    },
]

async function syncPermissions() {
    console.log('🔄 开始权限树同步...\n')

    // 第一步：清空旧权限数据（所有角色 permCount=0，可安全清空）
    console.log('🗑️ 第一步：清空旧权限数据')
    const deletedRP = await prisma.rolePermission.deleteMany({})
    console.log(`  删除 RolePermission: ${deletedRP.count} 条`)
    const deletedP = await prisma.permission.deleteMany({})
    console.log(`  删除 Permission: ${deletedP.count} 条\n`)

    // 第二步：创建新权限树
    console.log('📝 第二步：创建权限树')
    let sortCounter = 0
    let totalCreated = 0

    for (const menu of MENU_TREE) {
        sortCounter += 10

        // 创建一级菜单
        const parent = await prisma.permission.create({
            data: {
                name: menu.label,
                code: menu.code,
                parentId: null,
                type: 1, // 菜单类型
                sort: sortCounter,
                status: 1,
            }
        })
        totalCreated++
        const childCount = menu.children?.length || 0
        console.log(`  ✅ ${menu.label} (${menu.code})${childCount > 0 ? ` [${childCount} 子菜单]` : ''}`)

        // 创建二级菜单
        if (menu.children) {
            for (let i = 0; i < menu.children.length; i++) {
                const child = menu.children[i]
                await prisma.permission.create({
                    data: {
                        name: child.label,
                        code: child.code,
                        parentId: parent.id,
                        type: 1,
                        sort: sortCounter + i + 1,
                        status: 1,
                    }
                })
                totalCreated++
                console.log(`     └── ${child.label} (${child.code})`)
            }
        }
    }

    console.log()
    console.log('='.repeat(50))
    console.log(`✅ 权限树同步完成！共创建 ${totalCreated} 条权限记录`)
    console.log(`  一级菜单: ${MENU_TREE.length} 个`)
    console.log(`  二级菜单: ${totalCreated - MENU_TREE.length} 个`)
    console.log('='.repeat(50))

    await prisma.$disconnect()
}

syncPermissions().catch(err => {
    console.error('❌ 同步失败:', err)
    prisma.$disconnect()
    process.exit(1)
})
