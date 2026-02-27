/**
 * 创建发票审批流配置
 * 运行: npx ts-node --compiler-options '{"module":"commonjs"}' prisma/seed-invoice-approval.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    // 查找秦兴国的用户 ID（用于指定审批人，但实际审批流用角色匹配）
    const qin = await prisma.user.findFirst({ where: { name: '秦兴国' } })
    console.log('秦兴国用户:', qin ? `${qin.id} (${qin.name})` : '未找到')

    // 创建发票审批流配置
    const flow = await prisma.approvalFlow.upsert({
        where: { code: 'INVOICE_APPROVAL' },
        update: {
            name: '发票开票审批',
            businessType: 'invoice',
            nodes: JSON.stringify([
                {
                    step: 1,
                    name: '开票审批',
                    type: 'role',
                    targetId: 'TEST_DIRECTOR',
                    targetName: '检测部主任（秦兴国）',
                }
            ]),
            status: true,
        },
        create: {
            code: 'INVOICE_APPROVAL',
            name: '发票开票审批',
            businessType: 'invoice',
            nodes: JSON.stringify([
                {
                    step: 1,
                    name: '开票审批',
                    type: 'role',
                    targetId: 'TEST_DIRECTOR',
                    targetName: '检测部主任（秦兴国）',
                }
            ]),
            status: true,
        }
    })

    console.log('✅ 发票审批流创建成功:', flow.code, flow.name)
}

main()
    .catch(e => { console.error(e); process.exit(1) })
    .finally(() => prisma.$disconnect())
