/**
 * 检测标准数据迁移脚本
 * 
 * 功能：
 * 1. 创建两级混合分类（来源+材料类型）
 * 2. 将无分类的检测标准分配到正确分类
 * 3. 为每条标准创建检测项目（从检测模板中提取）
 * 
 * 使用方式：在服务器上运行 node scripts/migrate-standards.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// 两级混合分类定义：来源 + 材料类型
const CATEGORIES = [
    { name: '国家标准-复合材料', code: 'GB-COMPOSITE', description: '中国国家标准中复合材料相关检测标准', sort: 1 },
    { name: '国家标准-力学性能', code: 'GB-MECHANICAL', description: '中国国家标准中力学性能相关检测标准', sort: 2 },
    { name: '国家标准-硬度试验', code: 'GB-HARDNESS', description: '中国国家标准中硬度试验相关检测标准', sort: 3 },
    { name: '美国标准-复合材料', code: 'ASTM-COMPOSITE', description: 'ASTM国际标准中复合材料相关检测标准', sort: 4 },
]

// 标准编号 → 分类编码 + 检测项目 的映射
const STANDARD_MAPPING = {
    'GB/T 3354-2014': {
        categoryCode: 'GB-COMPOSITE',
        name: '定向纤维增强聚合物基复合材料拉伸性能试验方法',
        items: [
            { name: '拉伸强度', unit: 'MPa', method: '拉伸试验', sort: 1 },
            { name: '拉伸弹性模量', unit: 'GPa', method: '拉伸试验', sort: 2 },
            { name: '泊松比', unit: '-', method: '拉伸试验', sort: 3 },
            { name: '断裂延伸率', unit: '%', method: '拉伸试验', sort: 4 },
        ]
    },
    'GB/T 1449-2005': {
        categoryCode: 'GB-COMPOSITE',
        name: '纤维增强塑料弯曲性能试验方法',
        items: [
            { name: '弯曲强度', unit: 'MPa', method: '三点弯曲试验', sort: 1 },
            { name: '弯曲弹性模量', unit: 'GPa', method: '三点弯曲试验', sort: 2 },
            { name: '弯曲断裂挠度', unit: 'mm', method: '三点弯曲试验', sort: 3 },
        ]
    },
    'GB/T 228.1-2021': {
        categoryCode: 'GB-MECHANICAL',
        name: '金属材料拉伸试验 第1部分：室温试验方法',
        items: [
            { name: '抗拉强度 Rm', unit: 'MPa', method: '拉伸试验', sort: 1 },
            { name: '屈服强度 Rp0.2', unit: 'MPa', method: '拉伸试验', sort: 2 },
            { name: '断后伸长率 A', unit: '%', method: '拉伸试验', sort: 3 },
            { name: '断面收缩率 Z', unit: '%', method: '拉伸试验', sort: 4 },
            { name: '弹性模量 E', unit: 'GPa', method: '拉伸试验', sort: 5 },
        ]
    },
    'GB/T 231.1-2018': {
        categoryCode: 'GB-HARDNESS',
        name: '金属材料布氏硬度试验 第1部分：试验方法',
        items: [
            { name: '布氏硬度 HBW', unit: 'HBW', method: '布氏硬度试验', sort: 1 },
            { name: '压痕直径 d', unit: 'mm', method: '布氏硬度试验', sort: 2 },
        ]
    },
    'ASTM D3039/D3039M-17': {
        categoryCode: 'ASTM-COMPOSITE',
        name: 'Standard Test Method for Tensile Properties of Polymer Matrix Composite Materials',
        items: [
            { name: '极限拉伸强度', unit: 'MPa', method: 'Tensile Test', sort: 1 },
            { name: '拉伸弹性模量', unit: 'GPa', method: 'Tensile Test', sort: 2 },
            { name: '泊松比', unit: '-', method: 'Tensile Test', sort: 3 },
            { name: '极限拉伸应变', unit: '%', method: 'Tensile Test', sort: 4 },
        ]
    },
    'ASTM D6641/D6641M-23': {
        categoryCode: 'ASTM-COMPOSITE',
        name: 'Standard Test Method for Compressive Properties of Polymer Matrix Composite Materials Using a Combined Loading Compression (CLC) Test Fixture',
        items: [
            { name: '压缩强度', unit: 'MPa', method: 'CLC压缩试验', sort: 1 },
            { name: '压缩弹性模量', unit: 'GPa', method: 'CLC压缩试验', sort: 2 },
            { name: '压缩应变', unit: '%', method: 'CLC压缩试验', sort: 3 },
        ]
    },
    'ASTM D7264/D7264M-21': {
        categoryCode: 'ASTM-COMPOSITE',
        name: 'Standard Test Method for Flexural Properties of Polymer Matrix Composite Materials',
        items: [
            { name: '弯曲强度', unit: 'MPa', method: '三点弯曲试验', sort: 1 },
            { name: '弯曲弹性模量', unit: 'GPa', method: '三点弯曲试验', sort: 2 },
            { name: '最大弯曲应变', unit: '%', method: '三点弯曲试验', sort: 3 },
        ]
    },
    'ASTM D5766/D5766M-23': {
        categoryCode: 'ASTM-COMPOSITE',
        name: 'Standard Test Method for Open-Hole Tensile Strength of Polymer Matrix Composite Laminates',
        items: [
            { name: '开孔拉伸强度', unit: 'MPa', method: '开孔拉伸试验', sort: 1 },
            { name: '开孔拉伸应力', unit: 'MPa', method: '开孔拉伸试验', sort: 2 },
        ]
    },
    'ASTM D3518/D3518M-18': {
        categoryCode: 'ASTM-COMPOSITE',
        name: 'Standard Test Method for In-Plane Shear Response of Polymer Matrix Composite Materials by Tensile Test of a ±45° Laminate',
        items: [
            { name: '面内剪切强度', unit: 'MPa', method: '±45°拉伸试验', sort: 1 },
            { name: '面内剪切模量', unit: 'GPa', method: '±45°拉伸试验', sort: 2 },
            { name: '面内剪切应变', unit: '%', method: '±45°拉伸试验', sort: 3 },
        ]
    },
    'ASTM D2344/D2344M-22': {
        categoryCode: 'ASTM-COMPOSITE',
        name: 'Standard Test Method for Short-Beam Strength of Polymer Matrix Composite Materials and Their Laminates',
        items: [
            { name: '短梁剪切强度', unit: 'MPa', method: '短梁剪切试验', sort: 1 },
        ]
    },
}

async function migrate() {
    console.log('🚀 开始检测标准数据迁移...\n')

    // 第一步：创建/更新分类
    console.log('📁 第一步：创建两级混合分类')
    const categoryMap = {} // code → id
    for (const cat of CATEGORIES) {
        const existing = await prisma.inspectionStandardCategory.findUnique({
            where: { code: cat.code }
        })
        if (existing) {
            console.log(`  ⏭ 分类 "${cat.name}" 已存在 (${existing.id})`)
            categoryMap[cat.code] = existing.id
        } else {
            const created = await prisma.inspectionStandardCategory.create({
                data: cat
            })
            console.log(`  ✅ 创建分类 "${cat.name}" (${created.id})`)
            categoryMap[cat.code] = created.id
        }
    }
    console.log()

    // 第二步：更新检测标准的分类和名称
    console.log('🔗 第二步：将检测标准分配到分类并补充全称')
    for (const [standardNo, mapping] of Object.entries(STANDARD_MAPPING)) {
        const standard = await prisma.inspectionStandard.findUnique({
            where: { standardNo }
        })
        if (!standard) {
            console.log(`  ⚠️ 标准 "${standardNo}" 不存在，跳过`)
            continue
        }

        const categoryId = categoryMap[mapping.categoryCode]
        if (!categoryId) {
            console.log(`  ⚠️ 分类 "${mapping.categoryCode}" 未找到，跳过 ${standardNo}`)
            continue
        }

        // 更新分类和描述
        await prisma.inspectionStandard.update({
            where: { id: standard.id },
            data: {
                categoryId,
                description: mapping.name, // 用标准全称作为描述
            }
        })
        console.log(`  ✅ ${standardNo} → ${mapping.categoryCode} (${mapping.name.substring(0, 30)}...)`)
    }
    console.log()

    // 第三步：为每条标准创建检测项目
    console.log('🧪 第三步：创建检测项目')
    let totalItems = 0
    for (const [standardNo, mapping] of Object.entries(STANDARD_MAPPING)) {
        const standard = await prisma.inspectionStandard.findUnique({
            where: { standardNo },
            include: { _count: { select: { items: true } } }
        })
        if (!standard) continue

        // 检查是否已有检测项目
        if (standard._count.items > 0) {
            console.log(`  ⏭ ${standardNo} 已有 ${standard._count.items} 个检测项，跳过`)
            continue
        }

        // 批量创建检测项目
        const items = mapping.items.map(item => ({
            ...item,
            standardId: standard.id,
            status: 1,
        }))

        await prisma.inspectionItem.createMany({ data: items })
        totalItems += items.length
        console.log(`  ✅ ${standardNo}: 创建 ${items.length} 个检测项 (${mapping.items.map(i => i.name).join(', ')})`)
    }
    console.log()

    // 第四步：处理重复标准 GB/T 228.1-2021-V2
    console.log('🔄 第四步：处理重复标准')
    const v2Standard = await prisma.inspectionStandard.findUnique({
        where: { standardNo: 'GB/T 228.1-2021-V2' },
        include: { items: true }
    })
    if (v2Standard) {
        // 如果已分类到"国家标准"，更新为新的"国家标准-力学性能"
        const mechCatId = categoryMap['GB-MECHANICAL']
        if (mechCatId) {
            await prisma.inspectionStandard.update({
                where: { id: v2Standard.id },
                data: {
                    categoryId: mechCatId,
                    description: '金属材料拉伸试验 第1部分：室温试验方法（V2版）',
                }
            })
            console.log(`  ✅ GB/T 228.1-2021-V2 → GB-MECHANICAL`)
        }
    }
    console.log()

    // 汇总
    console.log('='.repeat(50))
    console.log('✅ 迁移完成！')
    console.log(`  📁 分类: ${Object.keys(categoryMap).length} 个`)
    console.log(`  📋 标准: ${Object.keys(STANDARD_MAPPING).length} 条已分配分类`)
    console.log(`  🧪 检测项: 新增 ${totalItems} 个`)
    console.log('='.repeat(50))

    await prisma.$disconnect()
}

migrate().catch(err => {
    console.error('❌ 迁移失败:', err)
    prisma.$disconnect()
    process.exit(1)
})
