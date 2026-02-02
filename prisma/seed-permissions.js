
const { PrismaClient } = require('@prisma/client')
try { require('dotenv').config() } catch (e) { }

const prisma = new PrismaClient()

const menuTree = [
    {
        name: '工作台', path: 'dashboard', icon: 'dashboard', children: []
    },
    {
        name: '业务管理', path: 'entrustment', icon: 'file-text', children: [
            { name: '业务咨询', path: 'consultation' },
            { name: '检测报价', path: 'quotation' },
            { name: '检测合同', path: 'contract' },
            { name: '检测委托单', path: 'list' }, // "list" is a bit generic, maybe use entrustment:list
            { name: '业务单位', path: 'client' },
        ]
    },
    {
        name: '样品管理', path: 'sample', icon: 'experiment', children: [
            { name: '收样登记', path: 'receipt' },
            { name: '样品明细', path: 'details' },
            { name: '我的样品', path: 'my' },
        ]
    },
    {
        name: '检测任务', path: 'task', icon: 'experiment', children: [
            { name: '全部任务', path: 'all' },
            { name: '我的任务', path: 'my' },
        ]
    },
    {
        name: '报告管理', path: 'report', icon: 'file-text', children: [
            { name: '任务报告生成', path: 'task-generate' },
            { name: '客户报告生成', path: 'client-generate' },
            { name: '客户报告模板', path: 'client-template' },
        ]
    },
    {
        name: '设备管理', path: 'device', icon: 'tool', children: [
            { name: '设备台账', path: 'list' }, // root /device mapped to list
            { name: '保养计划', path: 'maintenance-plan' },
            { name: '定检计划', path: 'calibration-plan' },
            { name: '维护记录', path: 'maintenance' },
        ]
    },
    {
        name: '外包管理', path: 'outsource', icon: 'bank', children: [
            { name: '供应商', path: 'supplier' },
            { name: '外包订单', path: 'order' },
        ]
    },
    {
        name: '财务管理', path: 'finance', icon: 'audit', children: [
            { name: '应收款', path: 'receivable' },
            { name: '发票管理', path: 'invoice' },
        ]
    },
    {
        name: '统计报表', path: 'statistics', icon: 'bar-chart', children: [] // No sub-children in layout
    },
    {
        name: '基础数据配置', path: 'basic-data', icon: 'database', children: [
            { name: '检测项目', path: 'test-templates' },
            { name: '检查标准/依据', path: 'inspection-standards' },
            { name: '报告分类', path: 'report-categories' },
            { name: '人员资质', path: 'personnel-capability' },
            { name: '能力评审', path: 'capability-review' },
        ]
    },
    {
        name: '系统设置', path: 'system', icon: 'setting', children: [
            { name: '用户管理', path: 'user' },
            { name: '角色管理', path: 'role' },
            { name: '审批流程', path: 'approval-flow' },
            { name: '权限配置', path: 'permission' },
        ]
    },
]

// Standard buttons for most lists
const standardButtons = [
    { name: '查看', code: 'view' },
    { name: '新增', code: 'add' },
    { name: '编辑', code: 'edit' },
    { name: '删除', code: 'delete' },
    { name: '导出', code: 'export' },
]

async function upsertPermission(name, code, type, parentId, sort) {
    const existing = await prisma.permission.findUnique({
        where: { code }
    })

    // We upsert by code. If parentId changes (moved), we update it.
    if (existing) {
        if (existing.name !== name || existing.parentId !== parentId || existing.sort !== sort) {
            console.log(`Updating ${code} (${name})...`)
            return await prisma.permission.update({
                where: { id: existing.id },
                data: { name, type, parentId, sort }
            })
        }
        return existing
    } else {
        console.log(`Creating ${code} (${name})...`)
        return await prisma.permission.create({
            data: { name, code, type, parentId, sort }
        })
    }
}

async function main() {
    console.log('Starting Permission Sync...')

    let sortOrder = 0

    for (const rootMenu of menuTree) {
        sortOrder += 10
        const rootCode = `menu:${rootMenu.path}`

        // 1. Create Root Menu
        const rootNode = await upsertPermission(
            rootMenu.name,
            rootCode,
            1, // type: menu
            null,
            sortOrder
        )

        // 2. Process Children
        if (rootMenu.children && rootMenu.children.length > 0) {
            let subSort = 0
            for (const child of rootMenu.children) {
                subSort += 10
                const childCode = `menu:${rootMenu.path}:${child.path}`

                // Create Sub Menu
                const childNode = await upsertPermission(
                    child.name,
                    childCode,
                    1, // type: menu
                    rootNode.id,
                    subSort
                )

                // 3. Create Buttons for Leaf Menu
                // (Assuming all leaf menus need buttons for now)
                let btnSort = 0
                for (const btn of standardButtons) {
                    btnSort += 10
                    // e.g. menu:system:user:add -> could be shortened to system:user:add for logical code?
                    // Let's keep it strictly hierarchical: menu:system:user:button:add to avoid collision? 
                    // Or just system:user:add. Let's use `btn:${rootMenu.path}:${child.path}:${btn.code}` to be safe and distinct from menu codes
                    const btnCode = `btn:${rootMenu.path}:${child.path}:${btn.code}`

                    await upsertPermission(
                        btn.name,
                        btnCode,
                        2, // type: button
                        childNode.id,
                        btnSort
                    )
                }
            }
        } else {
            // Root menu is a leaf (e.g. Dashboard, Statistics)
            // Add buttons directly? Dashboard usually readonly, but Statistics might need export
            // Skipping buttons for top-level leaves for now unless requested
        }
    }

    console.log('Permission Sync Completed.')
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
