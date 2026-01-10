const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    // 查找最新的待审批报价单
    const quotation = await prisma.quotation.findFirst({
        where: { status: 'pending_sales' },
        orderBy: { updatedAt: 'desc' },
        include: {
            approvalInstance: true
        }
    })

    if (quotation) {
        console.log('✅ 发现待审批报价单:', quotation.quotationNo)
        console.log('🔗 关联审批实例ID:', quotation.approvalInstanceId)
        if (quotation.approvalInstanceId) {
            const instance = await prisma.approvalInstance.findUnique({
                where: { id: quotation.approvalInstanceId }
            })
            console.log('📊 审批实例状态:', instance ? instance.status : '未找到相关实例')
        }
    } else {
        console.log('ℹ️ 未发现待审批报价单，请在页面手动提交一个报价单进行验证。')
    }
}

main().finally(() => prisma.$disconnect())
