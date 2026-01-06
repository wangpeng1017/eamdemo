// 添加委托单测试数据
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  // 生成委托单号
  const today = new Date()
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')

  const testData = [
    {
      entrustmentNo: `WT${dateStr}0001`,
      clientName: '江苏钢铁集团有限公司',
      contactPerson: '张经理',
      sampleName: '钢板样品',
      sampleModel: 'Q235B',
      sampleMaterial: '碳素结构钢',
      sampleQuantity: 5,
      isSampleReturn: false,
      follower: '王工',
      status: 'pending',
      sampleDate: new Date(),
      projects: {
        create: [
          { name: '拉伸试验', testItems: '["抗拉强度","屈服强度","断后伸长率"]', method: 'GB/T 228.1-2021', standard: 'GB/T 700-2006', status: 'pending' },
          { name: '冲击试验', testItems: '["冲击吸收能量"]', method: 'GB/T 229-2020', standard: 'GB/T 700-2006', status: 'pending' },
        ]
      }
    },
    {
      entrustmentNo: `WT${dateStr}0002`,
      clientName: '上海汽车零部件有限公司',
      contactPerson: '李总',
      sampleName: '铝合金轮毂',
      sampleModel: 'AL6061-T6',
      sampleMaterial: '铝合金',
      sampleQuantity: 3,
      isSampleReturn: true,
      follower: '赵工',
      status: 'accepted',
      sampleDate: new Date(Date.now() - 86400000),
      projects: {
        create: [
          { name: '化学成分分析', testItems: '["Si","Fe","Cu","Mn","Mg","Zn"]', method: 'GB/T 7999-2015', standard: 'GB/T 3190-2020', status: 'assigned', assignTo: '检测员A' },
        ]
      }
    },
    {
      entrustmentNo: `WT${dateStr}0003`,
      clientName: '浙江机械制造有限公司',
      contactPerson: '陈主任',
      sampleName: '不锈钢管',
      sampleModel: '304',
      sampleMaterial: '奥氏体不锈钢',
      sampleQuantity: 10,
      isSampleReturn: false,
      follower: '王工',
      status: 'testing',
      sampleDate: new Date(Date.now() - 172800000),
      projects: {
        create: [
          { name: '金相分析', testItems: '["晶粒度","夹杂物"]', method: 'GB/T 13298-2015', standard: 'GB/T 13296-2013', status: 'assigned', assignTo: '检测员B' },
          { name: '硬度测试', testItems: '["布氏硬度","洛氏硬度"]', method: 'GB/T 231.1-2018', standard: 'GB/T 13296-2013', status: 'subcontracted', subcontractor: '外包检测公司A' },
        ]
      }
    },
    {
      entrustmentNo: `WT${dateStr}0004`,
      clientName: '北京航空材料研究院',
      contactPerson: '刘博士',
      sampleName: '钛合金板材',
      sampleModel: 'TC4',
      sampleMaterial: '钛合金',
      sampleQuantity: 2,
      isSampleReturn: true,
      follower: '赵工',
      status: 'testing',
      sampleDate: new Date(Date.now() - 259200000),
      projects: {
        create: [
          { name: '疲劳试验', testItems: '["疲劳极限","疲劳寿命"]', method: 'GB/T 3075-2008', standard: 'GB/T 3621-2007', status: 'completed' },
          { name: '断裂韧性', testItems: '["KIC"]', method: 'GB/T 4161-2007', standard: 'GB/T 3621-2007', status: 'assigned', assignTo: '检测员C' },
        ]
      }
    },
    {
      entrustmentNo: `WT${dateStr}0005`,
      clientName: '广东电子科技有限公司',
      contactPerson: '黄经理',
      sampleName: '铜合金线材',
      sampleModel: 'H62',
      sampleMaterial: '黄铜',
      sampleQuantity: 20,
      isSampleReturn: false,
      follower: '王工',
      status: 'completed',
      sampleDate: new Date(Date.now() - 604800000),
      projects: {
        create: [
          { name: '导电率测试', testItems: '["电阻率","导电率"]', method: 'GB/T 351-2019', standard: 'GB/T 5231-2012', status: 'completed' },
          { name: '拉伸试验', testItems: '["抗拉强度","延伸率"]', method: 'GB/T 228.1-2021', standard: 'GB/T 5231-2012', status: 'completed' },
        ]
      }
    },
  ]

  console.log('开始添加委托单测试数据...')

  for (const data of testData) {
    try {
      // 检查是否已存在
      const existing = await prisma.entrustment.findUnique({
        where: { entrustmentNo: data.entrustmentNo }
      })

      if (existing) {
        console.log(`跳过已存在: ${data.entrustmentNo}`)
        continue
      }

      const result = await prisma.entrustment.create({
        data,
        include: { projects: true }
      })
      console.log(`创建成功: ${result.entrustmentNo} - ${result.clientName} (${result.status}) - ${result.projects.length}个检测项目`)
    } catch (e) {
      console.error(`创建失败: ${data.entrustmentNo}`, e.message)
    }
  }

  console.log('测试数据添加完成!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
