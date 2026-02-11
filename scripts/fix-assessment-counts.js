/**
 * 修复所有咨询单的评估计数器
 * 根据 sampleTestItem 的实际 assessmentStatus 重新计算
 */
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    // 查找所有有评估计数的咨询单
    const consultations = await prisma.consultation.findMany({
        where: { assessmentTotalCount: { gt: 0 } },
        select: {
            id: true,
            consultationNo: true,
            assessmentTotalCount: true,
            assessmentPassedCount: true,
            assessmentFailedCount: true,
            assessmentPendingCount: true,
        },
    })

    console.log(`共找到 ${consultations.length} 条有评估数据的咨询单\n`)

    let fixedCount = 0

    for (const c of consultations) {
        // 实时查询该咨询单的所有检测项评估状态
        const items = await prisma.sampleTestItem.findMany({
            where: { bizId: c.id, bizType: 'consultation' },
            select: { assessmentStatus: true },
        })

        const totalCount = items.length
        let passedCount = 0
        let failedCount = 0
        let pendingCount = 0

        for (const item of items) {
            if (item.assessmentStatus === 'passed') passedCount++
            else if (item.assessmentStatus === 'failed') failedCount++
            else pendingCount++
        }

        // 检查是否需要修复
        const needsFix =
            c.assessmentTotalCount !== totalCount ||
            c.assessmentPassedCount !== passedCount ||
            c.assessmentFailedCount !== failedCount ||
            c.assessmentPendingCount !== pendingCount

        if (needsFix) {
            console.log(`❌ ${c.consultationNo} 计数不一致:`)
            console.log(`   Total:   ${c.assessmentTotalCount} → ${totalCount}`)
            console.log(`   Passed:  ${c.assessmentPassedCount} → ${passedCount}`)
            console.log(`   Failed:  ${c.assessmentFailedCount} → ${failedCount}`)
            console.log(`   Pending: ${c.assessmentPendingCount} → ${pendingCount}`)

            await prisma.consultation.update({
                where: { id: c.id },
                data: {
                    assessmentTotalCount: totalCount,
                    assessmentPassedCount: passedCount,
                    assessmentFailedCount: failedCount,
                    assessmentPendingCount: pendingCount,
                },
            })
            console.log(`   ✅ 已修复\n`)
            fixedCount++
        } else {
            console.log(`✅ ${c.consultationNo} 计数正确`)
        }
    }

    console.log(`\n修复完成，共修复 ${fixedCount} 条记录`)
    await prisma.$disconnect()
}

main().catch(e => {
    console.error(e)
    prisma.$disconnect()
    process.exit(1)
})
