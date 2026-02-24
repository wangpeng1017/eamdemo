/**
 * @file docx-renderer.test.ts
 * @desc 报告模板渲染 - 单元测试
 *       测试 prepareOriginalRecordData / prepareClientReportData / renderDocx
 *
 * 重构说明：所有数据提取改用 sheet-extractor 语义提取，
 * 测试 fixtures 需要包含 sheetData 来模拟实际数据流。
 */

import {
  prepareOriginalRecordData,
  prepareClientReportData,
  renderDocx,
} from '../docx-renderer'

// ==================== 测试数据 fixtures ====================

const mockEntrustment = {
  entrustmentNo: 'WT-20260214-001',
  clientName: '奇瑞汽车股份有限公司',
  clientAddress: '安徽省芜湖市经济技术开发区',
  client: {
    name: '奇瑞汽车股份有限公司',
    address: '安徽省芜湖市经济技术开发区',
  },
}

const mockSample = {
  sampleNo: 'YP-20260214-001',
  name: '汽车线束端子',
  receiptDate: new Date('2026-02-10'),
  receiptPerson: '张三',
  sampleCondition: '固态，银白色金属件',
  specification: 'XYZ-123',
  quantity: '3',
}

/** 含 sheetData（带 columnSemantics 语义映射）的任务 */
const mockTask = {
  sampleName: '汽车线束端子',
  completedAt: new Date('2026-02-14'),
  assignedTo: { name: '李四' },
  metadata: JSON.stringify({
    temperature: '23',
    humidity: '50',
    reviewer: '王五',
  }),
  sheetData: JSON.stringify([{
    name: 'Sheet1',
    config: {
      columnSemantics: {
        0: 'seq',
        1: 'sampleNo',
        2: 'testItem',
        3: 'test1',
        4: 'test2',
        5: 'avgResult',
        6: 'chemResult',
        7: 'standardReq',
        8: 'conclusion',
        9: 'remark',
      }
    },
    data: [
      [{ v: '序号' }, { v: '样品编号' }, { v: '检测项目' }, { v: 'XRF测试1' }, { v: 'XRF测试2' }, { v: '平均值' }, { v: '化学验证结果' }, { v: '标准要求' }, { v: '结论' }, { v: '备注' }],
      [{ v: '1' }, { v: 'YP-001' }, { v: 'Pb' }, { v: 'P' }, { v: 'P' }, { v: 'P' }, { v: '——' }, { v: '≤0.1%' }, { v: '合格' }, { v: '' }],
      [{ v: '2' }, { v: 'YP-001' }, { v: 'Hg' }, { v: 'P' }, { v: 'P' }, { v: 'P' }, { v: '——' }, { v: '≤0.1%' }, { v: '合格' }, { v: '' }],
      [{ v: '3' }, { v: 'YP-001' }, { v: 'Cd' }, { v: 'P' }, { v: 'P' }, { v: 'P' }, { v: '——' }, { v: '≤0.01%' }, { v: '合格' }, { v: '' }],
      [{ v: '4' }, { v: 'YP-001' }, { v: 'Cr6+' }, { v: 'P' }, { v: 'P' }, { v: 'P' }, { v: '——' }, { v: '≤0.1%' }, { v: '合格' }, { v: '' }],
      [{ v: '5' }, { v: 'YP-001' }, { v: 'PBBs' }, { v: 'P' }, { v: 'P' }, { v: 'P' }, { v: '——' }, { v: '≤0.1%' }, { v: '合格' }, { v: '' }],
      [{ v: '6' }, { v: 'YP-001' }, { v: 'PBDEs' }, { v: 'P' }, { v: 'P' }, { v: 'P' }, { v: '——' }, { v: '≤0.1%' }, { v: '合格' }, { v: '' }],
    ],
  }]),
  testReports: [
    {
      reportNo: 'RPT-20260214-001',
      testResults: JSON.stringify([
        { parameter: 'Pb', value: 'P', standard: '≤0.1%', result: '合格' },
        { parameter: 'Hg', value: 'P', standard: '≤0.1%', result: '合格' },
        { parameter: 'Cd', value: 'P', standard: '≤0.01%', result: '合格' },
        { parameter: 'Cr6+', value: 'P', standard: '≤0.1%', result: '合格' },
        { parameter: 'PBBs', value: 'P', standard: '≤0.1%', result: '合格' },
        { parameter: 'PBDEs', value: 'P', standard: '≤0.1%', result: '合格' },
      ]),
    },
  ],
  sample: { sampleNo: 'YP-20260214-001' },
}

/** 含列头文本（无 columnSemantics）的任务 —— 测试列头文本匹配策略 */
const mockTaskWithHeaderText = {
  sampleName: '汽车线束端子',
  completedAt: new Date('2026-02-14'),
  assignedTo: { name: '李四' },
  sheetData: JSON.stringify([{
    name: 'Sheet1',
    data: [
      [{ v: '检测项目' }, { v: '技术要求' }, { v: '实测值' }, { v: '单项判定' }],
      [{ v: 'Pb' }, { v: '≤0.1%' }, { v: 'P' }, { v: '合格' }],
      [{ v: 'Hg' }, { v: '≤0.1%' }, { v: 'P' }, { v: '合格' }],
      [{ v: 'Cd' }, { v: '≤0.01%' }, { v: 'P' }, { v: '合格' }],
    ],
  }]),
}

const mockClientReport = {
  reportNo: 'CR-20260214-001',
}

// ==================== prepareOriginalRecordData 测试 ====================

describe('prepareOriginalRecordData', () => {
  it('应正确组装委托编号和接样日期', () => {
    const data = prepareOriginalRecordData(mockTask, mockEntrustment, mockSample)
    expect(data.entrustmentNo).toBe('WT-20260214-001')
    expect(data.receivedDate).toContain('2026')
  })

  it('应正确组装样品信息', () => {
    const data = prepareOriginalRecordData(mockTask, mockEntrustment, mockSample)
    expect(data.sampleNo).toBe('YP-20260214-001')
    expect(data.sampleName).toBe('汽车线束端子')
    expect(data.receiver).toBe('张三')
    expect(data.sampleDesc).toBe('固态，银白色金属件')
  })

  it('应正确组装检测人员', () => {
    const data = prepareOriginalRecordData(mockTask, mockEntrustment, mockSample)
    expect(data.tester).toBe('李四')
  })

  it('应包含检测日期', () => {
    const data = prepareOriginalRecordData(mockTask, mockEntrustment, mockSample)
    expect(data.testDate).toContain('2026')
  })

  it('应从 sheetData 提取检测结果摘要文本', () => {
    const data = prepareOriginalRecordData(mockTask, mockEntrustment, mockSample)
    expect(data.testResultText).toContain('Pb')
    expect(data.testResultText).toContain('Hg')
  })

  it('应从 metadata 提取温湿度和复核人', () => {
    const data = prepareOriginalRecordData(mockTask, mockEntrustment, mockSample)
    expect(data.temperature).toBe('23')
    expect(data.humidity).toBe('50')
    expect(data.reviewer).toBe('王五')
  })

  it('传入空 task 应返回空字符串字段而非崩溃', () => {
    const data = prepareOriginalRecordData(null, null, null)
    expect(data.entrustmentNo).toBe('')
    expect(data.sampleNo).toBe('')
    expect(data.tester).toBe('')
    expect(data.testResultText).toBe('')
  })

  it('传入空样品应容错', () => {
    const data = prepareOriginalRecordData(mockTask, mockEntrustment, null)
    expect(data.sampleNo).toBe('')
    expect(data.receivedDate).toBe('')
  })
})

// ==================== prepareClientReportData 测试 ====================

describe('prepareClientReportData', () => {
  it('应正确组装封面信息', () => {
    const data = prepareClientReportData(
      mockTask,
      mockEntrustment,
      mockSample,
      mockClientReport
    )
    expect(data.reportNo).toBe('CR-20260214-001')
    expect(data.sampleName).toBe('汽车线束端子')
    expect(data.clientName).toBe('奇瑞汽车股份有限公司')
  })

  it('应正确组装样品基础信息', () => {
    const data = prepareClientReportData(
      mockTask,
      mockEntrustment,
      mockSample
    )
    expect(data.sampleNo).toBe('YP-20260214-001')
    expect(data.specification).toBe('XYZ-123')
    expect(data.sampleQuantity).toBe('3')
  })

  it('应返回结构化的 results 数组', () => {
    const data = prepareClientReportData(
      mockTask,
      mockEntrustment,
      mockSample
    )
    expect(Array.isArray(data.results)).toBe(true)
    expect(data.results.length).toBe(6)
  })

  it('results 中每项应包含 testItem/xrfResult/standardReq/conclusion', () => {
    const data = prepareClientReportData(
      mockTask,
      mockEntrustment,
      mockSample
    )
    const firstItem = data.results[0]
    expect(firstItem).toHaveProperty('testItem')
    expect(firstItem).toHaveProperty('xrfResult')
    expect(firstItem).toHaveProperty('standardReq')
    expect(firstItem).toHaveProperty('conclusion')
  })

  it('Pb 的标准要求应为 ≤0.1%', () => {
    const data = prepareClientReportData(
      mockTask,
      mockEntrustment,
      mockSample
    )
    const pb = data.results.find((r: any) => r.testItem === 'Pb')
    expect(pb).toBeDefined()
    expect(pb.standardReq).toBe('≤0.1%')
  })

  it('Cd 的标准要求应为 ≤0.01%', () => {
    const data = prepareClientReportData(
      mockTask,
      mockEntrustment,
      mockSample
    )
    const cd = data.results.find((r: any) => r.testItem === 'Cd')
    expect(cd).toBeDefined()
    expect(cd.standardReq).toBe('≤0.01%')
  })

  it('无 clientReport 时应从 testReports 取 reportNo', () => {
    const data = prepareClientReportData(
      mockTask,
      mockEntrustment,
      mockSample
    )
    expect(data.reportNo).toBe('RPT-20260214-001')
  })

  it('传入空 task 应返回空 results', () => {
    const data = prepareClientReportData(null, null, null)
    expect(data.results.length).toBe(0)
  })

  it('应包含人员签名字段', () => {
    const data = prepareClientReportData(
      mockTask,
      mockEntrustment,
      mockSample
    )
    expect(data).toHaveProperty('preparer')
    expect(data).toHaveProperty('reviewer')
    expect(data).toHaveProperty('approver')
    expect(data.preparer).toBe('李四')
    expect(data.reviewer).toBe('王五')
  })
})

// ==================== 原始记录结构化 results ====================

describe('prepareOriginalRecordData - 结构化结果', () => {
  it('应返回结构化的 results 数组用于 docx 循环', () => {
    const data = prepareOriginalRecordData(mockTask, mockEntrustment, mockSample)
    expect(Array.isArray(data.results)).toBe(true)
    expect(data.results.length).toBeGreaterThan(0)
  })

  it('results 每项应包含 testItem/test1/test2/avgResult', () => {
    const data = prepareOriginalRecordData(mockTask, mockEntrustment, mockSample)
    const first = data.results[0]
    expect(first).toHaveProperty('testItem')
    expect(first).toHaveProperty('test1')
    expect(first).toHaveProperty('test2')
    expect(first).toHaveProperty('avgResult')
  })

  it('应包含 Pb/Hg/Cd 等检测项目', () => {
    const data = prepareOriginalRecordData(mockTask, mockEntrustment, mockSample)
    const items = data.results.map((r: any) => r.testItem)
    expect(items).toContain('Pb')
    expect(items).toContain('Hg')
    expect(items).toContain('Cd')
  })
})

// ==================== 列头文本匹配策略测试 ====================

describe('prepareOriginalRecordData - 列头文本匹配', () => {
  it('无 columnSemantics 时应通过列头文本推断列语义', () => {
    const data = prepareOriginalRecordData(mockTaskWithHeaderText, mockEntrustment, mockSample)
    expect(data.results.length).toBe(3)
    expect(data.results[0].testItem).toBe('Pb')
  })
})

// ==================== renderDocx 模板渲染 ====================

describe('renderDocx', () => {
  it('应在模板文件不存在时抛出错误', () => {
    expect(() => {
      renderDocx('non-existent-template.docx', {})
    }).toThrow()
  })

  it('应成功渲染 QCT 原始记录模板', () => {
    const data = prepareOriginalRecordData(mockTask, mockEntrustment, mockSample)
    const buf = renderDocx('qct-original-record.docx', data)
    expect(buf).toBeInstanceOf(Buffer)
    expect(buf.length).toBeGreaterThan(0)
  })

  it('应成功渲染 QCT 客户报告模板', () => {
    const data = prepareClientReportData(mockTask, mockEntrustment, mockSample, mockClientReport)
    const buf = renderDocx('qct-client-report.docx', data)
    expect(buf).toBeInstanceOf(Buffer)
    expect(buf.length).toBeGreaterThan(0)
  })
})
