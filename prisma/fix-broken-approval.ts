import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🔍 开始检查审批数据一致性...')

    // 1. 查找所有处于 pending 状态的报价单审批实例
    const instances = await prisma.approvalInstance.findMany({
        where: {
            bizType: 'quotation',
            status: 'pending'
        }
    })

    console.log(`Found ${instances.length} pending quotation approval instances.`)

    let fixedCount = 0

    for (const instance of instances) {
        // 2. 检查对应的报价单状态
        const quotation = await prisma.quotation.findUnique({
            where: { id: instance.bizId }
        })

        if (!quotation) {
            console.log(`⚠️ Quotation ${instance.bizId} not found. Deleting orphan instance...`)
            await prisma.approvalInstance.delete({ where: { id: instance.id } })
            fixedCount++
            continue
        }

        // 3. 如果报价单是 draft，说明状态不一致，需要清理审批实例
        if (quotation.status === 'draft') {
            console.log(`⚠️ Inconsistency found: Quotation ${quotation.quotationNo} is DRAFT but has PENDING approval instance.`)
            console.log(`   Deleting approval instance ${instance.id}...`)
            await prisma.approvalInstance.delete({ where: { id: instance.id } })
            fixedCount++
        }
    }

    console.log(`✅ 修复完成，共清理 ${fixedCount} 个异常审批实例。`)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
