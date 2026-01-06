// 添加样品和其他模块测试数据
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const today = new Date()
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')

  console.log('=== 开始添加测试数据 ===\n')

  // 1. 添加样品数据
  console.log('1. 添加样品数据...')
  const samples = [
    { sampleNo: `S${dateStr}0001`, name: '钢板试样A', type: '金属材料', specification: 'Q235B 10mm', quantity: '5件', unit: '件', status: 'received', storageLocation: 'A区-1-01', receiptPerson: '张三' },
    { sampleNo: `S${dateStr}0002`, name: '铝合金棒材', type: '金属材料', specification: '6061-T6 Φ20', quantity: '10根', unit: '根', status: 'testing', storageLocation: 'A区-1-02', receiptPerson: '李四' },
    { sampleNo: `S${dateStr}0003`, name: '不锈钢管', type: '金属材料', specification: '304 Φ50x3', quantity: '3根', unit: '根', status: 'completed', storageLocation: 'B区-2-01', receiptPerson: '王五' },
    { sampleNo: `S${dateStr}0004`, name: '铜合金板', type: '金属材料', specification: 'H62 2mm', quantity: '8片', unit: '片', status: 'returned', storageLocation: 'B区-2-02', receiptPerson: '张三' },
    { sampleNo: `S${dateStr}0005`, name: '钛合金试样', type: '金属材料', specification: 'TC4 5mm', quantity: '2件', unit: '件', status: 'received', storageLocation: 'C区-1-01', receiptPerson: '李四', isOutsourced: true },
  ]

  for (const s of samples) {
    const existing = await prisma.sample.findUnique({ where: { sampleNo: s.sampleNo } })
    if (existing) {
      console.log(`  跳过已存在: ${s.sampleNo}`)
      continue
    }
    await prisma.sample.create({
      data: {
        ...s,
        receiptDate: new Date(Date.now() - Math.random() * 7 * 86400000),
        remainingQuantity: s.quantity,
      }
    })
    console.log(`  创建成功: ${s.sampleNo} - ${s.name} (${s.status})`)
  }

  // 2. 添加样品领用记录
  console.log('\n2. 添加样品领用记录...')
  const sampleList = await prisma.sample.findMany({ take: 5 })
  const requisitions = [
    { requisitionNo: `LY${dateStr}0001`, requisitionBy: '检测员A', quantity: '2件', purpose: '拉伸试验', status: 'requisitioned' },
    { requisitionNo: `LY${dateStr}0002`, requisitionBy: '检测员B', quantity: '1根', purpose: '金相分析', status: 'returned' },
    { requisitionNo: `LY${dateStr}0003`, requisitionBy: '检测员C', quantity: '3片', purpose: '硬度测试', status: 'requisitioned' },
    { requisitionNo: `LY${dateStr}0004`, requisitionBy: '检测员A', quantity: '1件', purpose: '冲击试验', status: 'overdue' },
    { requisitionNo: `LY${dateStr}0005`, requisitionBy: '检测员D', quantity: '2根', purpose: '化学成分分析', status: 'returned' },
  ]

  for (let i = 0; i < requisitions.length && i < sampleList.length; i++) {
    const r = requisitions[i]
    const existing = await prisma.sampleRequisition.findUnique({ where: { requisitionNo: r.requisitionNo } })
    if (existing) {
      console.log(`  跳过已存在: ${r.requisitionNo}`)
      continue
    }
    await prisma.sampleRequisition.create({
      data: {
        ...r,
        sampleId: sampleList[i].id,
        requisitionDate: new Date(Date.now() - Math.random() * 5 * 86400000),
        expectedReturnDate: new Date(Date.now() + 7 * 86400000),
        actualReturnDate: r.status === 'returned' ? new Date() : null,
      }
    })
    console.log(`  创建成功: ${r.requisitionNo} - ${r.requisitionBy} (${r.status})`)
  }

  // 3. 添加检测任务
  console.log('\n3. 添加检测任务...')
  const tasks = [
    { taskNo: `T${dateStr}0001`, sampleName: '钢板试样A', parameters: '["抗拉强度","屈服强度"]', testMethod: 'GB/T 228.1-2021', status: 'pending', progress: 0 },
    { taskNo: `T${dateStr}0002`, sampleName: '铝合金棒材', parameters: '["化学成分"]', testMethod: 'GB/T 7999-2015', status: 'in_progress', progress: 50 },
    { taskNo: `T${dateStr}0003`, sampleName: '不锈钢管', parameters: '["金相组织","晶粒度"]', testMethod: 'GB/T 13298-2015', status: 'in_progress', progress: 80 },
    { taskNo: `T${dateStr}0004`, sampleName: '铜合金板', parameters: '["导电率","电阻率"]', testMethod: 'GB/T 351-2019', status: 'completed', progress: 100 },
    { taskNo: `T${dateStr}0005`, sampleName: '钛合金试样', parameters: '["疲劳极限"]', testMethod: 'GB/T 3075-2008', status: 'pending', progress: 0, isOutsourced: true },
  ]

  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i]
    const existing = await prisma.testTask.findUnique({ where: { taskNo: t.taskNo } })
    if (existing) {
      console.log(`  跳过已存在: ${t.taskNo}`)
      continue
    }
    await prisma.testTask.create({
      data: {
        ...t,
        sampleId: sampleList[i]?.id || null,
        plannedDate: new Date(Date.now() + Math.random() * 7 * 86400000),
        dueDate: new Date(Date.now() + 14 * 86400000),
      }
    })
    console.log(`  创建成功: ${t.taskNo} - ${t.sampleName} (${t.status})`)
  }

  // 4. 添加设备数据
  console.log('\n4. 添加设备数据...')
  const devices = [
    { deviceNo: 'EQ-2024-001', name: '万能材料试验机', model: 'WDW-100', manufacturer: '济南试金', status: 'Running', location: '力学实验室', department: '检测部' },
    { deviceNo: 'EQ-2024-002', name: '金相显微镜', model: 'DMI5000M', manufacturer: '徕卡', status: 'Running', location: '金相实验室', department: '检测部' },
    { deviceNo: 'EQ-2024-003', name: '直读光谱仪', model: 'ARL4460', manufacturer: '赛默飞', status: 'Maintenance', location: '化学分析室', department: '检测部' },
    { deviceNo: 'EQ-2024-004', name: '硬度计', model: 'HRS-150', manufacturer: '莱州华银', status: 'Running', location: '力学实验室', department: '检测部' },
    { deviceNo: 'EQ-2024-005', name: '冲击试验机', model: 'JB-300B', manufacturer: '济南试金', status: 'Idle', location: '力学实验室', department: '检测部' },
  ]

  for (const d of devices) {
    const existing = await prisma.device.findUnique({ where: { deviceNo: d.deviceNo } })
    if (existing) {
      console.log(`  跳过已存在: ${d.deviceNo}`)
      continue
    }
    await prisma.device.create({
      data: {
        ...d,
        purchaseDate: new Date('2024-01-15'),
        commissioningDate: new Date('2024-02-01'),
        lastCalibrationDate: new Date(Date.now() - 180 * 86400000),
        nextCalibrationDate: new Date(Date.now() + 180 * 86400000),
        responsiblePerson: '设备管理员',
        utilization: Math.floor(Math.random() * 100),
      }
    })
    console.log(`  创建成功: ${d.deviceNo} - ${d.name} (${d.status})`)
  }

  // 5. 添加供应商数据
  console.log('\n5. 添加供应商数据...')
  const suppliers = [
    { name: '上海检测技术有限公司', code: 'SUP-001', type: '检测外包', contact: '张经理', phone: '021-12345678', status: 1 },
    { name: '北京材料分析中心', code: 'SUP-002', type: '检测外包', contact: '李主任', phone: '010-87654321', status: 1 },
    { name: '广州仪器设备有限公司', code: 'SUP-003', type: '设备供应', contact: '王总', phone: '020-11112222', status: 1 },
    { name: '深圳试剂耗材公司', code: 'SUP-004', type: '耗材供应', contact: '陈经理', phone: '0755-33334444', status: 1 },
    { name: '南京标准物质研究所', code: 'SUP-005', type: '标准物质', contact: '刘博士', phone: '025-55556666', status: 0 },
  ]

  for (const s of suppliers) {
    const existing = await prisma.supplier.findFirst({ where: { code: s.code } })
    if (existing) {
      console.log(`  跳过已存在: ${s.code}`)
      continue
    }
    await prisma.supplier.create({ data: s })
    console.log(`  创建成功: ${s.code} - ${s.name}`)
  }

  // 6. 添加易耗品数据
  console.log('\n6. 添加易耗品数据...')
  const consumables = [
    { code: 'CON-001', name: '砂纸 400#', specification: '230x280mm', unit: '张', stockQuantity: 500, minStock: 100, location: '耗材库A' },
    { code: 'CON-002', name: '抛光膏', specification: '1kg/瓶', unit: '瓶', stockQuantity: 20, minStock: 5, location: '耗材库A' },
    { code: 'CON-003', name: '腐蚀液', specification: '500ml/瓶', unit: '瓶', stockQuantity: 15, minStock: 3, location: '化学品库' },
    { code: 'CON-004', name: '标准试块', specification: 'HRC60', unit: '块', stockQuantity: 10, minStock: 2, location: '标准件库' },
    { code: 'CON-005', name: '切割片', specification: 'Φ350x3', unit: '片', stockQuantity: 50, minStock: 10, location: '耗材库B' },
  ]

  for (const c of consumables) {
    const existing = await prisma.consumable.findUnique({ where: { code: c.code } })
    if (existing) {
      console.log(`  跳过已存在: ${c.code}`)
      continue
    }
    await prisma.consumable.create({ data: c })
    console.log(`  创建成功: ${c.code} - ${c.name}`)
  }

  // 7. 添加用户数据
  console.log('\n7. 添加用户数据...')
  const users = [
    { username: 'admin', password: '$2a$10$abcdefghijklmnopqrstuv', name: '系统管理员', phone: '13800000001', status: 1 },
    { username: 'zhangsan', password: '$2a$10$abcdefghijklmnopqrstuv', name: '张三', phone: '13800000002', status: 1 },
    { username: 'lisi', password: '$2a$10$abcdefghijklmnopqrstuv', name: '李四', phone: '13800000003', status: 1 },
    { username: 'wangwu', password: '$2a$10$abcdefghijklmnopqrstuv', name: '王五', phone: '13800000004', status: 1 },
    { username: 'zhaoliu', password: '$2a$10$abcdefghijklmnopqrstuv', name: '赵六', phone: '13800000005', status: 0 },
  ]

  for (const u of users) {
    const existing = await prisma.user.findUnique({ where: { username: u.username } })
    if (existing) {
      console.log(`  跳过已存在: ${u.username}`)
      continue
    }
    await prisma.user.create({ data: u })
    console.log(`  创建成功: ${u.username} - ${u.name}`)
  }

  console.log('\n=== 测试数据添加完成 ===')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
