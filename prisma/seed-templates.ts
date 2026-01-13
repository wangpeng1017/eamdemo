
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface TemplateSeed {
  name: string
  method: string
  category: string
  unit?: string
}

const templates: TemplateSeed[] = [
  { name: '拉伸强度', method: 'GB/T 228.1-2021', category: '物理性能', unit: 'MPa' },
  { name: '断后伸长率', method: 'GB/T 228.1-2021', category: '物理性能', unit: '%' },
  { name: '断面收缩率', method: 'GB/T 228.1-2021', category: '物理性能', unit: '%' },
  { name: '硬度测试(布氏)', method: 'GB/T 231.1-2018', category: '物理性能', unit: 'HBW' },
  { name: '硬度测试(洛氏)', method: 'GB/T 230.1-2018', category: '物理性能', unit: 'HRC' },
  { name: '冲击试验', method: 'GB/T 229-2020', category: '物理性能', unit: 'J' },
  { name: '弯曲试验', method: 'GB/T 232-2010', category: '物理性能', unit: '无' },
  { name: '金相分析', method: 'GB/T 13298-2015', category: '金相分析', unit: '无' },
  { name: '化学成分分析', method: 'GB/T 223', category: '化学成分', unit: '%' },
  { name: '盐雾试验', method: 'GB/T 10125-2021', category: '环境测试', unit: 'h' },
]

async function main() {
  console.log('开始预置检测项目数据...')

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  let count = 0

  for (const t of templates) {
    // 检查是否存在同名项目
    const existing = await prisma.testTemplate.findFirst({
      where: { name: t.name }
    })

    if (!existing) {
      count++
      const code = `MB${today}${String(count).padStart(3, '0')}`

      await prisma.testTemplate.create({
        data: {
          code,
          name: t.name,
          category: t.category,
          method: t.method,
          status: 'active',
          schema: JSON.stringify({
            header: { methodBasis: t.method },
            items: []
          }), // 简化的 schema
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
      console.log(`已创建: ${t.name}`)
    } else {
      console.log(`已存在: ${t.name} (跳过)`)
      // 可选：更新 method
      // await prisma.testTemplate.update({ where: { id: existing.id }, data: { ... } })
    }
  }

  console.log('检测项目数据预置完成！')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
