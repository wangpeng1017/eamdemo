/**
 * 设置检测标准审批流程 + 更新已有数据为现行有效
 * 运行: node scripts/setup-inspection-approval.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log('🔧 设置检测标准审批流程...\n')

    // 1. 查找秦兴国用户ID
    const qxg = await prisma.user.findFirst({
        where: { OR: [{ name: '秦兴国' }, { username: 'qinxingguo' }] }
    })

    if (!qxg) {
        console.log('⚠️ 未找到秦兴国用户，将使用角色审批模式')
    } else {
        console.log(`✅ 找到秦兴国: ID=${qxg.id}, 用户名=${qxg.username}`)
    }

    // 2. 创建或更新审批流程
    const flowCode = 'FLOW_INSPECTION_ITEM'
    const nodes = qxg
        ? [{ step: 1, name: '秦兴国审批', type: 'user', targetId: qxg.id, targetName: '秦兴国' }]
        : [{ step: 1, name: '实验室主任审批', type: 'role', targetId: 'lab_director', targetName: '实验室主任' }]

    const existing = await prisma.approvalFlow.findUnique({ where: { code: flowCode } })
    if (existing) {
        await prisma.approvalFlow.update({
            where: { code: flowCode },
            data: {
                name: '检测标准审批',
                businessType: 'inspection_item',
                description: '检测标准新增/编辑/删除审批，由秦兴国审批',
                nodes: JSON.stringify(nodes),
                status: true,
            },
        })
        console.log('✅ 审批流程已更新')
    } else {
        await prisma.approvalFlow.create({
            data: {
                code: flowCode,
                name: '检测标准审批',
                businessType: 'inspection_item',
                description: '检测标准新增/编辑/删除审批，由秦兴国审批',
                nodes: JSON.stringify(nodes),
                status: true,
            },
        })
        console.log('✅ 审批流程已创建')
    }
    console.log(`   流程编码: ${flowCode}`)
    console.log(`   审批节点: ${JSON.stringify(nodes)}`)

    // 3. 更新已有 170 条检测项目为"现行有效"
    const result = await prisma.inspectionItem.updateMany({
        where: { approvalStatus: 'draft' },
        data: { approvalStatus: 'effective' },
    })
    console.log(`\n✅ 已将 ${result.count} 条检测项目状态更新为"现行有效"`)

    console.log('\n🎉 设置完成！')
}

main()
    .catch(e => { console.error('❌ 设置失败:', e); process.exit(1) })
    .finally(() => prisma.$disconnect())
