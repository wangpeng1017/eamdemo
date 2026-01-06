import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 开始初始化数据...')

  // ==================== 清理现有数据（开发环境） ====================
  if (process.env.NODE_ENV === 'development') {
    console.log('🧹 清理现有数据...')
    // 注意：由于外键约束，需要按特定顺序删除
    await prisma.testReportApproval.deleteMany({})
    await prisma.testReport.deleteMany({})
    await prisma.testData.deleteMany({})
    await prisma.testTask.deleteMany({})
    await prisma.sampleRequisition.deleteMany({})
    await prisma.sample.deleteMany({})
    await prisma.entrustmentProject.deleteMany({})
    await prisma.entrustment.deleteMany({})
    await prisma.quotationApproval.deleteMany({})
    await prisma.quotationItem.deleteMany({})
    await prisma.quotation.deleteMany({})
    await prisma.contract.deleteMany({})
    await prisma.consultationFollowUp.deleteMany({})
    await prisma.consultation.deleteMany({})
    await prisma.financePayment.deleteMany({})
    await prisma.financeInvoice.deleteMany({})
    await prisma.financeReceivable.deleteMany({})
    await prisma.consumableTransaction.deleteMany({})
    await prisma.consumable.deleteMany({})
    await prisma.outsourceOrder.deleteMany({})
    await prisma.supplierEvaluation.deleteMany({})
    await prisma.supplier.deleteMany({})
    await prisma.deviceCalibration.deleteMany({})
    await prisma.deviceRepair.deleteMany({})
    await prisma.deviceMaintenance.deleteMany({})
    await prisma.device.deleteMany({})
    await prisma.todo.deleteMany({})
    await prisma.approvalLog.deleteMany({})
    await prisma.approvalFlow.deleteMany({})
    await prisma.userRole.deleteMany({})
    await prisma.role.deleteMany({})
    await prisma.user.deleteMany({})
    await prisma.dept.deleteMany({})
    await prisma.permission.deleteMany({})
    await prisma.client.deleteMany({})
  }

  // ==================== 部门 ====================
  console.log('📁 创建部门...')
  const departments = await Promise.all([
    prisma.dept.create({
      data: { name: '管理层', code: 'MGT', sort: 1 },
    }),
    prisma.dept.create({
      data: { name: '销售部', code: 'SALES', sort: 2 },
    }),
    prisma.dept.create({
      data: { name: '检测部', code: 'LAB', sort: 3 },
    }),
    prisma.dept.create({
      data: { name: '财务部', code: 'FINANCE', sort: 4 },
    }),
    prisma.dept.create({
      data: { name: '设备部', code: 'DEVICE', sort: 5 },
    }),
  ])

  // ==================== 角色 ====================
  console.log('👥 创建角色...')
  const roles = await Promise.all([
    prisma.role.create({
      data: { name: '管理员', code: 'admin', description: '系统管理员，拥有所有权限' },
    }),
    prisma.role.create({
      data: { name: '销售经理', code: 'sales_manager', description: '销售部门经理' },
    }),
    prisma.role.create({
      data: { name: '销售人员', code: 'sales', description: '销售部门员工' },
    }),
    prisma.role.create({
      data: { name: '实验室负责人', code: 'lab_director', description: '检测实验室负责人' },
    }),
    prisma.role.create({
      data: { name: '检测人员', code: 'tester', description: '检测实验室员工' },
    }),
    prisma.role.create({
      data: { name: '财务人员', code: 'finance', description: '财务部门员工' },
    }),
    prisma.role.create({
      data: { name: '样品管理员', code: 'sample_admin', description: '样品库管理员' },
    }),
  ])

  // ==================== 用户 ====================
  console.log('👤 创建用户...')
  const users = await Promise.all([
    // 管理员
    prisma.user.create({
      data: {
        username: 'admin',
        password: await bcrypt.hash('admin123', 10),
        name: '系统管理员',
        phone: '13800000001',
        email: 'admin@lims.com',
        deptId: departments[0].id,
        status: 1,
      },
    }),
    // 销售人员
    prisma.user.create({
      data: {
        username: 'zhangxin',
        password: await bcrypt.hash('123456', 10),
        name: '张馨',
        phone: '15952575002',
        email: 'zhangxin@lims.com',
        deptId: departments[1].id,
        status: 1,
      },
    }),
    // 销售经理
    prisma.user.create({
      data: {
        username: 'wangmanager',
        password: await bcrypt.hash('123456', 10),
        name: '王经理',
        phone: '13800000002',
        email: 'wang@lims.com',
        deptId: departments[1].id,
        status: 1,
      },
    }),
    // 实验室负责人
    prisma.user.create({
      data: {
        username: 'lidirector',
        password: await bcrypt.hash('123456', 10),
        name: '李主任',
        phone: '13800000003',
        email: 'li@lims.com',
        deptId: departments[2].id,
        status: 1,
      },
    }),
    // 检测人员
    prisma.user.create({
      data: {
        username: 'zhangsan',
        password: await bcrypt.hash('123456', 10),
        name: '张三',
        phone: '13800000004',
        email: 'zhangsan@lims.com',
        deptId: departments[2].id,
        status: 1,
      },
    }),
    prisma.user.create({
      data: {
        username: 'lisi',
        password: await bcrypt.hash('123456', 10),
        name: '李四',
        phone: '13800000005',
        email: 'lisi@lims.com',
        deptId: departments[2].id,
        status: 1,
      },
    }),
    // 财务人员
    prisma.user.create({
      data: {
        username: 'caiwu',
        password: await bcrypt.hash('123456', 10),
        name: '王会计',
        phone: '13800000006',
        email: 'finance@lims.com',
        deptId: departments[3].id,
        status: 1,
      },
    }),
    // 样品管理员
    prisma.user.create({
      data: {
        username: 'sampleadmin',
        password: await bcrypt.hash('123456', 10),
        name: '赵样品',
        phone: '13800000007',
        email: 'sample@lims.com',
        deptId: departments[2].id,
        status: 1,
      },
    }),
  ])

  // 分配角色
  await Promise.all([
    prisma.userRole.create({ data: { userId: users[0].id, roleId: roles[0].id } }), // admin
    prisma.userRole.create({ data: { userId: users[1].id, roleId: roles[2].id } }), // 销售人员
    prisma.userRole.create({ data: { userId: users[2].id, roleId: roles[1].id } }), // 销售经理
    prisma.userRole.create({ data: { userId: users[3].id, roleId: roles[3].id } }), // 实验室负责人
    prisma.userRole.create({ data: { userId: users[4].id, roleId: roles[4].id } }), // 检测人员
    prisma.userRole.create({ data: { userId: users[5].id, roleId: roles[4].id } }), // 检测人员
    prisma.userRole.create({ data: { userId: users[6].id, roleId: roles[5].id } }), // 财务人员
    prisma.userRole.create({ data: { userId: users[7].id, roleId: roles[6].id } }), // 样品管理员
  ])

  // ==================== 客户单位 ====================
  console.log('🏢 创建客户单位...')
  const clients = await Promise.all([
    prisma.client.create({
      data: {
        name: '奇瑞汽车股份有限公司',
        shortName: '奇瑞汽车',
        type: '企业',
        contact: '李工',
        phone: '13800138000',
        email: 'ligong@chery.com',
        address: '安徽省芜湖市经济技术开发区长春路8号',
        creditCode: '91340200713920435C',
        invoiceAddress: '安徽省芜湖市经济技术开发区长春路8号',
        invoicePhone: '0553-5961111',
        bankName: '中国工商银行芜湖分行',
        bankAccount: '1307023009022100123',
        status: 'approved',
        creator: 'admin',
      },
    }),
    prisma.client.create({
      data: {
        name: '比亚迪股份有限公司',
        shortName: '比亚迪',
        type: '企业',
        contact: '张经理',
        phone: '13900139000',
        email: 'zhang@byd.com',
        address: '广东省深圳市坪山区比亚迪路3009号',
        creditCode: '914403007175306000',
        status: 'approved',
        creator: 'admin',
      },
    }),
    prisma.client.create({
      data: {
        name: '上海汽车集团股份有限公司',
        shortName: '上汽集团',
        type: '企业',
        contact: '王总',
        phone: '13700137000',
        email: 'wang@saicmotor.com',
        address: '上海市杨浦区军工路2500号',
        status: 'approved',
        creator: 'admin',
      },
    }),
    prisma.client.create({
      data: {
        name: '某机械制造有限公司',
        shortName: '某机械',
        type: '企业',
        contact: '刘工',
        phone: '13600136000',
        status: 'approved',
        creator: 'admin',
      },
    }),
  ])

  // ==================== 咨询 ====================
  console.log('📝 创建咨询记录...')
  const consultations = await Promise.all([
    prisma.consultation.create({
      data: {
        consultationNo: 'ZX20250105001',
        clientId: clients[0].id,
        clientCompany: '奇瑞汽车股份有限公司',
        clientContact: '李工',
        clientTel: '13800138000',
        clientEmail: 'ligong@chery.com',
        clientAddress: '安徽省芜湖市经济技术开发区长春路8号',
        sampleName: '莱尼 K01',
        sampleModel: 'K01-2023',
        sampleMaterial: '合金钢',
        estimatedQuantity: 5,
        testItems: JSON.stringify(['拉伸强度测试', '金相分析', '硬度测试']),
        testPurpose: 'quality_inspection',
        expectedDeadline: new Date('2025-01-15'),
        clientRequirements: '需要加急处理，5天内出具报告',
        budgetRange: '3000-5000',
        status: 'quoted',
        follower: '张馨',
        feasibility: 'feasible',
        feasibilityNote: '实验室具备相关检测能力，设备齐全',
        estimatedPrice: 3500,
        quotationNo: 'BJ20250105001',
      },
    }),
    prisma.consultation.create({
      data: {
        consultationNo: 'ZX20250104001',
        clientId: clients[1].id,
        clientCompany: '比亚迪股份有限公司',
        clientContact: '张经理',
        clientTel: '13900139000',
        sampleName: '动力电池结构件',
        sampleModel: 'EV-BAT-001',
        testItems: JSON.stringify(['化学成分分析', '硬度测试', '盐雾试验']),
        testPurpose: 'product_certification',
        status: 'following',
        follower: '张馨',
      },
    }),
    prisma.consultation.create({
      data: {
        consultationNo: 'ZX20250103001',
        clientId: clients[2].id,
        clientCompany: '上海汽车集团股份有限公司',
        clientContact: '王总',
        clientTel: '13700137000',
        sampleName: 'C30混凝土试块',
        sampleModel: '150*150*150mm',
        testItems: JSON.stringify(['抗压强度']),
        testPurpose: 'quality_inspection',
        status: 'closed',
        follower: '张馨',
      },
    }),
  ])

  // 咨询跟进记录
  await Promise.all([
    prisma.consultationFollowUp.create({
      data: {
        consultationId: consultations[0].id,
        date: new Date('2025-01-05 09:00:00'),
        type: 'phone',
        content: '客户咨询检测项目，初步沟通需求',
        nextAction: '准备报价方案',
        operator: '张馨',
      },
    }),
    prisma.consultationFollowUp.create({
      data: {
        consultationId: consultations[0].id,
        date: new Date('2025-01-05 14:00:00'),
        type: 'email',
        content: '发送报价单给客户',
        nextAction: '等待客户反馈',
        operator: '张馨',
      },
    }),
  ])

  // ==================== 报价单 ====================
  console.log('💰 创建报价单...')
  const quotations = await Promise.all([
    // 已批准 - 客户已确认
    prisma.quotation.create({
      data: {
        quotationNo: 'BJ20250105001',
        clientId: clients[0].id,
        clientCompany: '奇瑞汽车股份有限公司',
        clientContact: '李工',
        clientTel: '13800138000',
        clientEmail: 'ligong@chery.com',
        clientAddress: '安徽省芜湖市经济技术开发区长春路8号',
        serviceCompany: '江苏国轻检测技术有限公司',
        serviceContact: '张馨',
        serviceTel: '15952575002',
        sampleName: '莱尼 K01',
        clientRemark: '需要加急处理',
        subtotal: 3100,
        taxTotal: 3286,
        discountTotal: 3000,
        status: 'approved',
        clientStatus: 'ok',
        consultationNo: 'ZX20250105001',
      },
    }),
    // 草稿状态
    prisma.quotation.create({
      data: {
        quotationNo: 'BJ20250106001',
        clientId: clients[1].id,
        clientCompany: '比亚迪股份有限公司',
        clientContact: '张经理',
        clientTel: '13900139000',
        serviceCompany: '江苏国轻检测技术有限公司',
        serviceContact: '张馨',
        serviceTel: '15952575002',
        sampleName: '动力电池结构件',
        subtotal: 5000,
        taxTotal: 5300,
        discountTotal: 4800,
        status: 'draft',
      },
    }),
    // 待销售审批
    prisma.quotation.create({
      data: {
        quotationNo: 'BJ20250106002',
        clientId: clients[2].id,
        clientCompany: '上海汽车集团股份有限公司',
        clientContact: '王总',
        clientTel: '13700137000',
        serviceCompany: '江苏国轻检测技术有限公司',
        serviceContact: '张馨',
        serviceTel: '15952575002',
        sampleName: '变速箱齿轮',
        subtotal: 8000,
        taxTotal: 8480,
        discountTotal: 7500,
        status: 'pending_sales',
      },
    }),
    // 待财务审批
    prisma.quotation.create({
      data: {
        quotationNo: 'BJ20250106003',
        clientId: clients[3].id,
        clientCompany: '某机械制造有限公司',
        clientContact: '刘工',
        clientTel: '13600136000',
        serviceCompany: '江苏国轻检测技术有限公司',
        serviceContact: '张馨',
        serviceTel: '15952575002',
        sampleName: '液压缸活塞杆',
        subtotal: 2500,
        taxTotal: 2650,
        discountTotal: 2400,
        status: 'pending_finance',
      },
    }),
  ])

  // 报价明细
  await Promise.all([
    prisma.quotationItem.create({
      data: {
        quotationId: quotations[0].id,
        serviceItem: '拉伸强度测试',
        methodStandard: 'GB/T 228.1-2021',
        quantity: 3,
        unitPrice: 500,
        totalPrice: 1500,
      },
    }),
    prisma.quotationItem.create({
      data: {
        quotationId: quotations[0].id,
        serviceItem: '金相分析',
        methodStandard: 'GB/T 13298-2015',
        quantity: 2,
        unitPrice: 800,
        totalPrice: 1600,
      },
    }),
  ])

  // 报价审批记录
  await Promise.all([
    prisma.quotationApproval.create({
      data: {
        quotationId: quotations[0].id,
        level: 1,
        role: 'sales_manager',
        approver: '王经理',
        action: 'approve',
        comment: '同意报价',
        timestamp: new Date('2025-01-05 10:00:00'),
      },
    }),
    prisma.quotationApproval.create({
      data: {
        quotationId: quotations[0].id,
        level: 2,
        role: 'finance',
        approver: '王会计',
        action: 'approve',
        comment: '价格合理',
        timestamp: new Date('2025-01-05 11:00:00'),
      },
    }),
    prisma.quotationApproval.create({
      data: {
        quotationId: quotations[0].id,
        level: 3,
        role: 'lab_director',
        approver: '李主任',
        action: 'approve',
        comment: '同意，检测能力满足要求',
        timestamp: new Date('2025-01-05 12:00:00'),
      },
    }),
  ])

  // ==================== 合同 ====================
  console.log('📄 创建合同...')
  const contracts = await Promise.all([
    // 已签订 - 执行中
    prisma.contract.create({
      data: {
        contractNo: 'HT20250105001',
        contractName: '检测服务合同-奇瑞汽车',
        clientId: clients[0].id,
        quotationId: quotations[0].id,
        partyACompany: '奇瑞汽车股份有限公司',
        partyAContact: '李工',
        partyATel: '13800138000',
        partyAAddress: '安徽省芜湖市经济技术开发区长春路8号',
        partyATaxId: '91340200713920435C',
        partyBCompany: '江苏国轻检测技术有限公司',
        partyBContact: '张馨',
        partyBTel: '15952575002',
        partyBAddress: '扬州市邗江区金山路99号',
        contractAmount: 3000,
        sampleName: '莱尼 K01',
        hasAdvancePayment: true,
        advancePaymentAmount: 1500,
        signDate: new Date('2025-01-05'),
        effectiveDate: new Date('2025-01-05'),
        expiryDate: new Date('2025-12-31'),
        status: 'executing',
        termsPaymentTerms: '合同签订后预付50%，检测完成后付清余款',
        termsDeliveryTerms: '检测完成后5个工作日内交付报告',
      },
    }),
    // 草稿状态
    prisma.contract.create({
      data: {
        contractNo: 'HT20250106001',
        contractName: '检测服务合同-比亚迪',
        clientId: clients[1].id,
        partyACompany: '比亚迪股份有限公司',
        partyAContact: '张经理',
        partyATel: '13900139000',
        partyBCompany: '江苏国轻检测技术有限公司',
        partyBContact: '张馨',
        partyBTel: '15952575002',
        contractAmount: 4800,
        sampleName: '动力电池结构件',
        status: 'draft',
      },
    }),
    // 已签订
    prisma.contract.create({
      data: {
        contractNo: 'HT20250104001',
        contractName: '检测服务合同-上汽集团',
        clientId: clients[2].id,
        partyACompany: '上海汽车集团股份有限公司',
        partyAContact: '王总',
        partyATel: '13700137000',
        partyBCompany: '江苏国轻检测技术有限公司',
        partyBContact: '张馨',
        partyBTel: '15952575002',
        contractAmount: 7500,
        sampleName: '变速箱齿轮',
        signDate: new Date('2025-01-04'),
        effectiveDate: new Date('2025-01-04'),
        expiryDate: new Date('2025-06-30'),
        status: 'signed',
      },
    }),
    // 已完成
    prisma.contract.create({
      data: {
        contractNo: 'HT20241220001',
        contractName: '检测服务合同-某机械',
        clientId: clients[3].id,
        partyACompany: '某机械制造有限公司',
        partyAContact: '刘工',
        partyATel: '13600136000',
        partyBCompany: '江苏国轻检测技术有限公司',
        partyBContact: '张馨',
        partyBTel: '15952575002',
        contractAmount: 2000,
        sampleName: '液压缸活塞杆',
        signDate: new Date('2024-12-20'),
        effectiveDate: new Date('2024-12-20'),
        expiryDate: new Date('2025-01-20'),
        status: 'completed',
      },
    }),
  ])

  // ==================== 委托单 ====================
  console.log('📋 创建委托单...')
  const entrustments = await Promise.all([
    prisma.entrustment.create({
      data: {
        entrustmentNo: 'WT20250105001',
        contractNo: contracts[0].contractNo,
        clientId: clients[0].id,
        clientName: '奇瑞汽车股份有限公司',
        contactPerson: '李工',
        sampleDate: new Date('2025-01-05'),
        follower: '张馨',
        sampleName: '莱尼 K01',
        sampleModel: 'K01-2023',
        sampleMaterial: '合金钢',
        sampleQuantity: 5,
        isSampleReturn: false,
        sourceType: 'contract',
        status: 'testing',
        createdById: users[0].id,
      },
    }),
  ])

  // 委托单检测项目
  await Promise.all([
    prisma.entrustmentProject.create({
      data: {
        entrustmentId: entrustments[0].id,
        name: '莱尼K01检测项目',
        testItems: JSON.stringify(['拉伸强度', '断面收缩率', '断后伸长率']),
        method: 'GB/T 228.1-2021',
        standard: '产品技术规范',
        status: 'assigned',
        assignTo: '张三',
        deadline: new Date('2025-01-10'),
      },
    }),
  ])

  // ==================== 样品 ====================
  console.log('🧪 创建样品...')
  await Promise.all([
    // 检测中
    prisma.sample.create({
      data: {
        sampleNo: 'S20250105001',
        entrustmentId: entrustments[0].id,
        name: '莱尼 K01',
        type: '金属制品',
        specification: 'K01-2023',
        quantity: '5',
        totalQuantity: '5',
        unit: '个',
        receiptDate: new Date('2025-01-05'),
        receiptPerson: '赵样品',
        storageLocation: 'A区-01-01',
        remainingQuantity: '5',
        status: '检测中',
        createdById: users[7].id,
      },
    }),
    // 已完成
    prisma.sample.create({
      data: {
        sampleNo: 'S20250104001',
        name: 'C30混凝土试块',
        type: '混凝土制品',
        specification: '150*150*150mm',
        quantity: '3',
        totalQuantity: '3',
        unit: '个',
        receiptDate: new Date('2025-01-04'),
        receiptPerson: '赵样品',
        storageLocation: 'B区-02-01',
        remainingQuantity: '3',
        status: '已完成',
        createdById: users[7].id,
      },
    }),
    // 待收样
    prisma.sample.create({
      data: {
        sampleNo: 'S20250106001',
        name: '动力电池结构件',
        type: '金属制品',
        specification: 'EV-BAT-001',
        quantity: '10',
        totalQuantity: '10',
        unit: '件',
        storageLocation: 'C区-01-01',
        remainingQuantity: '10',
        status: '待收样',
        createdById: users[7].id,
      },
    }),
    // 已收样
    prisma.sample.create({
      data: {
        sampleNo: 'S20250106002',
        name: '变速箱齿轮',
        type: '金属制品',
        specification: 'GR-2023-A',
        quantity: '6',
        totalQuantity: '6',
        unit: '个',
        receiptDate: new Date('2025-01-06'),
        receiptPerson: '赵样品',
        storageLocation: 'A区-02-03',
        remainingQuantity: '6',
        status: '已收样',
        createdById: users[7].id,
      },
    }),
  ])

  // ==================== 设备 ====================
  console.log('🔧 创建设备...')
  const devices = await Promise.all([
    prisma.device.create({
      data: {
        deviceNo: 'ALTCCS-2022001',
        name: '火花源原子发射光谱仪',
        model: 'SPECTRO MAXx',
        manufacturer: 'SPECTRO',
        serialNumber: 'SN2022001',
        assetType: 'instrument',
        status: 'Running',
        location: '光谱室',
        department: '检测部',
        purchaseDate: new Date('2022-01-15'),
        commissioningDate: new Date('2022-02-01'),
        lastCalibrationDate: new Date('2024-02-01'),
        nextCalibrationDate: new Date('2025-02-01'),
        responsiblePerson: '张三',
        utilization: 30,
        operatingHours: 1200,
      },
    }),
    prisma.device.create({
      data: {
        deviceNo: 'ALTCCS-2022002',
        name: '万能材料试验机',
        model: 'WDW-100E',
        manufacturer: '济南试金集团',
        serialNumber: 'WDW2022002',
        assetType: 'instrument',
        status: 'Running',
        location: '力学实验室',
        department: '检测部',
        purchaseDate: new Date('2022-03-01'),
        commissioningDate: new Date('2022-03-15'),
        nextCalibrationDate: new Date('2025-03-15'),
        responsiblePerson: '李四',
        utilization: 45,
        operatingHours: 2100,
      },
    }),
    prisma.device.create({
      data: {
        deviceNo: 'ALTCCS-2022003',
        name: '金相显微镜',
        model: 'Axio Observer',
        manufacturer: 'ZEISS',
        serialNumber: 'ZEISS2022003',
        assetType: 'instrument',
        status: 'Idle',
        location: '金相室',
        department: '检测部',
        purchaseDate: new Date('2022-05-01'),
        commissioningDate: new Date('2022-05-15'),
        responsiblePerson: '张三',
        utilization: 15,
        operatingHours: 600,
      },
    }),
  ])

  // ==================== 检测任务 ====================
  console.log('📊 创建检测任务...')
  await Promise.all([
    // 进行中
    prisma.testTask.create({
      data: {
        taskNo: 'T20250105001',
        entrustmentId: entrustments[0].id,
        sampleId: (await prisma.sample.findFirst({ where: { sampleNo: 'S20250105001' } }))!.id,
        sampleName: '莱尼 K01',
        parameters: JSON.stringify(['拉伸强度', '断面收缩率', '断后伸长率']),
        testMethod: 'GB/T 228.1-2021',
        deviceId: devices[0].id,
        assignedToId: users[4].id, // 张三
        plannedDate: new Date('2025-01-06'),
        dueDate: new Date('2025-01-10'),
        status: '进行中',
        progress: 30,
      },
    }),
    // 待开始
    prisma.testTask.create({
      data: {
        taskNo: 'T20250106001',
        sampleName: '动力电池结构件',
        parameters: JSON.stringify(['化学成分分析', '硬度测试']),
        testMethod: 'GB/T 4336-2016',
        deviceId: devices[0].id,
        assignedToId: users[5].id, // 李四
        plannedDate: new Date('2025-01-08'),
        dueDate: new Date('2025-01-15'),
        status: '待开始',
        progress: 0,
      },
    }),
    // 已完成
    prisma.testTask.create({
      data: {
        taskNo: 'T20250104001',
        sampleName: 'C30混凝土试块',
        parameters: JSON.stringify(['抗压强度']),
        testMethod: 'GB/T 50081-2019',
        deviceId: devices[1].id,
        assignedToId: users[4].id, // 张三
        plannedDate: new Date('2025-01-04'),
        dueDate: new Date('2025-01-05'),
        actualDate: new Date('2025-01-05'),
        status: '已完成',
        progress: 100,
      },
    }),
  ])

  // ==================== 财务应收 ====================
  console.log('💵 创建财务数据...')
  await Promise.all([
    // 部分收款
    prisma.financeReceivable.create({
      data: {
        receivableNo: 'AR-20250105-001',
        entrustmentId: entrustments[0].id,
        clientId: clients[0].id,
        clientName: '奇瑞汽车股份有限公司',
        amount: 3000,
        receivedAmount: 1500,
        status: 'partial',
        dueDate: new Date('2025-01-20'),
        reportNos: JSON.stringify(['RPT-20250105-001']),
      },
    }),
    // 未收款
    prisma.financeReceivable.create({
      data: {
        receivableNo: 'AR-20250106-001',
        clientId: clients[1].id,
        clientName: '比亚迪股份有限公司',
        amount: 4800,
        receivedAmount: 0,
        status: 'pending',
        dueDate: new Date('2025-01-25'),
      },
    }),
    // 已收款
    prisma.financeReceivable.create({
      data: {
        receivableNo: 'AR-20241220-001',
        clientId: clients[3].id,
        clientName: '某机械制造有限公司',
        amount: 2000,
        receivedAmount: 2000,
        status: 'completed',
        dueDate: new Date('2025-01-10'),
      },
    }),
  ])

  // ==================== 供应商 ====================
  console.log('🏭 创建供应商...')
  await Promise.all([
    // 启用
    prisma.supplier.create({
      data: {
        name: 'SGS通标标准技术服务有限公司',
        code: 'SGS001',
        type: '检测机构',
        contact: '李经理',
        phone: '021-12345678',
        email: 'li@sgs.com',
        address: '上海市闵行区',
        qualification: JSON.stringify({ scope: ['金属材料检测', '非金属材料检测'] }),
        status: 1,
      },
    }),
    // 启用
    prisma.supplier.create({
      data: {
        name: '中国检验认证集团',
        code: 'CCIC001',
        type: '检测机构',
        contact: '王主任',
        phone: '010-87654321',
        email: 'wang@ccic.com',
        address: '北京市朝阳区',
        qualification: JSON.stringify({ scope: ['产品认证', '体系认证'] }),
        status: 1,
      },
    }),
    // 禁用
    prisma.supplier.create({
      data: {
        name: '某地方检测中心',
        code: 'LOCAL001',
        type: '检测机构',
        contact: '张工',
        phone: '0512-12345678',
        email: 'zhang@local.com',
        address: '江苏省苏州市',
        status: 0,
      },
    }),
  ])

  // ==================== 权限 ====================
  console.log('🔐 创建权限...')
  const permissions = [
    // 委托管理
    { name: '委托咨询', code: 'entrustment:consultation', type: 1, sort: 1 },
    { name: '新建咨询', code: 'entrustment:consultation:create', type: 2, sort: 2 },
    { name: '报价管理', code: 'entrustment:quotation', type: 1, sort: 3 },
    { name: '合同管理', code: 'entrustment:contract', type: 1, sort: 4 },
    { name: '委托单管理', code: 'entrustment:list', type: 1, sort: 5 },
    { name: '客户管理', code: 'entrustment:client', type: 1, sort: 6 },
    // 样品管理
    { name: '收样登记', code: 'sample:receipt', type: 1, sort: 10 },
    { name: '样品明细', code: 'sample:details', type: 1, sort: 11 },
    { name: '我的样品', code: 'sample:my-samples', type: 1, sort: 12 },
    // 任务管理
    { name: '全部任务', code: 'task:all-tasks', type: 1, sort: 20 },
    { name: '我的任务', code: 'task:my-tasks', type: 1, sort: 21 },
    // 检测管理
    { name: '数据录入', code: 'test:data-entry', type: 1, sort: 30 },
    { name: '检测报告', code: 'test:report', type: 1, sort: 31 },
    // 报告管理
    { name: '客户报告', code: 'report:client-reports', type: 1, sort: 40 },
    { name: '报告审批', code: 'report:approval', type: 1, sort: 41 },
    // 财务管理
    { name: '应收账款', code: 'finance:receivables', type: 1, sort: 50 },
    { name: '收款记录', code: 'finance:payment-records', type: 1, sort: 51 },
    { name: '开票管理', code: 'finance:invoices', type: 1, sort: 52 },
    // 设备管理
    { name: '设备台账', code: 'device:info', type: 1, sort: 60 },
    { name: '保养计划', code: 'device:maintenance', type: 1, sort: 61 },
    // 系统管理
    { name: '用户管理', code: 'system:users', type: 1, sort: 70 },
    { name: '角色管理', code: 'system:roles', type: 1, sort: 71 },
    { name: '部门管理', code: 'system:departments', type: 1, sort: 72 },
  ]

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: {},
      create: perm,
    })
  }

  console.log('')
  console.log('✅ 数据初始化完成！')
  console.log('')
  console.log('📋 测试账号：')
  console.log('   管理员: admin / admin123 (所有权限)')
  console.log('   销售: zhangxin / 123456')
  console.log('   销售经理: wangmanager / 123456')
  console.log('   实验室负责人: lidirector / 123456')
  console.log('   检测人员: zhangsan / 123456')
  console.log('   检测人员: lisi / 123456')
  console.log('   财务: caiwu / 123456')
  console.log('   样品管理员: sampleadmin / 123456')
}

main()
  .catch((e) => {
    console.error('❌ 数据初始化失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
