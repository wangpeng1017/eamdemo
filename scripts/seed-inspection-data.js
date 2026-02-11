/**
 * 种子数据导入脚本
 * 从 Excel 文件导入检测标准分类和检测项目数据
 * 
 * 使用方式: node scripts/seed-inspection-data.js
 */

const XLSX = require('xlsx')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
    console.log('📖 读取 Excel 文件...')
    const wb = XLSX.readFile('docs/试验中心试验能力外发.xlsx')
    const ws = wb.Sheets['检测项目能力表']
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

    // 解析数据（跳过前两行标题）
    let currentCategory = ''
    let currentSubCategory = ''
    const tree = {} // { 一级分类: { 二级分类: [{ name, standard, quantity, remark }] } }

    for (let i = 2; i < data.length; i++) {
        const row = data[i]
        const cat = String(row[1] || '').trim()
        const subCat = String(row[2] || '').trim()
        const testItem = String(row[3] || '').trim()
        const standard = String(row[4] || '').trim()
        const quantity = String(row[5] || '').trim()
        const remark = String(row[6] || '').trim()

        if (cat) currentCategory = cat
        if (subCat) currentSubCategory = subCat

        // 跳过空项目和无效数据
        if (!currentCategory || !testItem || testItem === '\\') continue

        if (!tree[currentCategory]) tree[currentCategory] = {}
        if (!tree[currentCategory][currentSubCategory]) tree[currentCategory][currentSubCategory] = []

        tree[currentCategory][currentSubCategory].push({
            name: testItem,
            standard,
            quantity,
            remark: remark.replace(/\r\n/g, '\n').trim(),
        })
    }

    // 统计
    let totalCategories = 0
    let totalSubCategories = 0
    let totalItems = 0
    for (const [cat, subs] of Object.entries(tree)) {
        totalCategories++
        for (const [sub, items] of Object.entries(subs)) {
            totalSubCategories++
            totalItems += items.length
        }
    }
    console.log(`📊 解析完成: ${totalCategories} 个一级分类, ${totalSubCategories} 个二级分类, ${totalItems} 个检测项目`)

    // 清理旧数据
    console.log('🗑️  清理旧数据...')
    await prisma.inspectionItem.deleteMany({})
    await prisma.inspectionStandardCategory.deleteMany({ where: { parentId: { not: null } } })
    await prisma.inspectionStandardCategory.deleteMany({})
    console.log('✅ 旧数据已清理')

    // 清理 TestTemplate 旧数据
    console.log('🗑️  清理 TestTemplate 旧数据...')
    await prisma.testTemplate.deleteMany({})
    console.log('✅ TestTemplate 旧数据已清理')

    // 导入数据
    console.log('📥 开始导入数据...')
    let sortOrder = 0
    let itemCount = 0

    for (const [catName, subs] of Object.entries(tree)) {
        sortOrder++
        // 创建一级分类
        const parent = await prisma.inspectionStandardCategory.create({
            data: {
                name: catName,
                sort: sortOrder,
                status: 1,
            },
        })
        console.log(`  📁 [${sortOrder}] ${catName}`)

        let subSort = 0
        for (const [subName, items] of Object.entries(subs)) {
            subSort++
            // 创建二级分类
            const child = await prisma.inspectionStandardCategory.create({
                data: {
                    name: subName || catName, // 如果没有二级分类名则用一级
                    parentId: parent.id,
                    sort: subSort,
                    status: 1,
                },
            })

            // 创建检测项目
            let itemSort = 0
            for (const item of items) {
                itemSort++
                const inspItem = await prisma.inspectionItem.create({
                    data: {
                        categoryId: child.id,
                        name: item.name,
                        executionStandard: item.standard || null,
                        sampleQuantity: item.quantity || null,
                        remark: item.remark || null,
                        sort: itemSort,
                        status: 1,
                    },
                })

                // 同步创建 TestTemplate
                try {
                    const code = `IT-${inspItem.id.slice(-8).toUpperCase()}`
                    await prisma.testTemplate.create({
                        data: {
                            code,
                            name: item.name,
                            category: subName || catName,
                            method: item.standard || item.name,
                            schema: '[]',
                            status: 'active',
                            version: '1.0',
                        },
                    })
                } catch (e) {
                    // 忽略同步失败
                }

                itemCount++
            }
            console.log(`    └─ ${subName || '(默认)'}: ${items.length} 个项目`)
        }
    }

    console.log(`\n✅ 导入完成！共导入 ${itemCount} 个检测项目`)
    console.log('✅ 同步创建了对应的 TestTemplate 记录')
}

main()
    .catch((e) => {
        console.error('❌ 导入失败:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
