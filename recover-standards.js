const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function recoverStandards() {
    console.log('开始从检测模板恢复检测标准...')

    try {
        // 1. 获取所有检测模板
        const templates = await prisma.testTemplate.findMany({
            select: {
                method: true,
                name: true
            }
        })

        console.log(`获取到 ${templates.length} 个模板`)

        // 2. 提取唯一的标准（通过 method 字段）
        const standardMap = new Map()
        templates.forEach(t => {
            if (t.method && t.method.trim()) {
                const standardNo = t.method.trim()
                // 如果该标准号还没记录，或者记录的名称不如当前的（有些模板名称可能更完整）
                if (!standardMap.has(standardNo)) {
                    standardMap.set(standardNo, {
                        standardNo: standardNo,
                        name: t.name || '自动恢复的标准',
                        validity: 'valid'
                    })
                }
            }
        })

        console.log(`提取到 ${standardMap.size} 个唯一标准`)

        // 3. 写入数据库
        let count = 0
        for (const std of standardMap.values()) {
            // 检查是否已存在（由于用户说是全部删除了，理论上都不存在，但为了安全做个 check）
            const existing = await prisma.inspectionStandard.findUnique({
                where: { standardNo: std.standardNo }
            })

            if (!existing) {
                await prisma.inspectionStandard.create({
                    data: std
                })
                console.log(`✅ 已恢复标准: ${std.standardNo}`)
                count++
            } else {
                console.log(`ℹ️ 标准已存在，跳过: ${std.standardNo}`)
            }
        }

        console.log(`\n数据恢复完成！成功恢复 ${count} 条记录。`)

    } catch (error) {
        console.error('恢复过程中发生错误:', error)
    } finally {
        await prisma.$disconnect()
    }
}

recoverStandards()
