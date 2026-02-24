/**
 * @file sheet-extractor.test.ts
 * @desc 统一 SheetData 数据提取模块 - 单元测试
 *       验证三级降级策略：columnSemantics → 列头文本匹配 → 位置回退
 */

import {
    extractStructuredData,
    extractForTestReport,
    extractForOriginalRecord,
    extractForClientReport,
} from '../sheet-extractor'

// ==================== 策略1：columnSemantics 语义映射 ====================

describe('extractStructuredData - 策略1: columnSemantics', () => {
    const sheetDataWithSemantics = JSON.stringify([{
        name: 'Sheet1',
        config: {
            columnSemantics: { 0: 'testItem', 1: 'standardReq', 2: 'value', 3: 'result' }
        },
        data: [
            [{ v: '检测项目' }, { v: '技术要求' }, { v: '实测值' }, { v: '单项判定' }],
            [{ v: 'Pb' }, { v: '≤0.1%' }, { v: 'P' }, { v: '合格' }],
            [{ v: 'Hg' }, { v: '≤0.1%' }, { v: 'N' }, { v: '不合格' }],
        ],
    }])

    it('应使用 semantics 策略', () => {
        const result = extractStructuredData(sheetDataWithSemantics)
        expect(result.strategy).toBe('semantics')
    })

    it('应正确提取数据行', () => {
        const result = extractStructuredData(sheetDataWithSemantics)
        expect(result.rows.length).toBe(2)
        expect(result.rows[0].testItem).toBe('Pb')
        expect(result.rows[0].standardReq).toBe('≤0.1%')
        expect(result.rows[0].value).toBe('P')
        expect(result.rows[0].result).toBe('合格')
    })

    it('应正确构建 columnMap', () => {
        const result = extractStructuredData(sheetDataWithSemantics)
        expect(result.columnMap.testItem).toBe(0)
        expect(result.columnMap.value).toBe(2)
    })
})

// ==================== 策略2：列头文本匹配 ====================

describe('extractStructuredData - 策略2: 列头文本匹配', () => {
    const sheetDataWithHeaders = JSON.stringify([{
        name: 'Sheet1',
        data: [
            [{ v: '检测项目' }, { v: '检测方法' }, { v: '技术要求' }, { v: '实测值' }, { v: '单项判定' }],
            [{ v: 'Pb' }, { v: 'XRF' }, { v: '≤0.1%' }, { v: '0.05%' }, { v: '合格' }],
            [{ v: 'Cd' }, { v: 'XRF' }, { v: '≤0.01%' }, { v: '0.003%' }, { v: '合格' }],
        ],
    }])

    it('应使用 header-text 策略', () => {
        const result = extractStructuredData(sheetDataWithHeaders)
        expect(result.strategy).toBe('header-text')
    })

    it('应正确匹配列语义', () => {
        const result = extractStructuredData(sheetDataWithHeaders)
        expect(result.rows[0].testItem).toBe('Pb')
        expect(result.rows[0].testMethod).toBe('XRF')
        expect(result.rows[0].standardReq).toBe('≤0.1%')
        expect(result.rows[0].value).toBe('0.05%')
    })
})

// ==================== 策略3：位置回退 ====================

describe('extractStructuredData - 策略3: 位置回退', () => {
    const sheetDataPlain = JSON.stringify([{
        name: 'Sheet1',
        data: [
            [{ v: '项目A' }, { v: '标准B' }, { v: '值C' }, { v: '结果D' }],
            [{ v: 'X' }, { v: 'Y' }, { v: 'Z' }, { v: 'W' }],
        ],
    }])

    it('应使用 position-fallback 策略', () => {
        const result = extractStructuredData(sheetDataPlain)
        expect(result.strategy).toBe('position-fallback')
    })

    it('应按默认列位置提取', () => {
        const result = extractStructuredData(sheetDataPlain)
        expect(result.rows[0].testItem).toBe('X')
        expect(result.rows[0].standardReq).toBe('Y')
        expect(result.rows[0].value).toBe('Z')
    })
})

// ==================== celldata 格式测试 ====================

describe('extractStructuredData - celldata 格式', () => {
    const sheetDataCelldata = JSON.stringify([{
        name: 'Sheet1',
        config: {
            columnSemantics: { 0: 'testItem', 1: 'value' }
        },
        celldata: [
            { r: 0, c: 0, v: { v: '检测项目' } },
            { r: 0, c: 1, v: { v: '实测值' } },
            { r: 1, c: 0, v: { v: 'Pb' } },
            { r: 1, c: 1, v: { v: '0.05%' } },
        ],
    }])

    it('应支持 celldata 格式', () => {
        const result = extractStructuredData(sheetDataCelldata)
        expect(result.rows.length).toBe(1)
        expect(result.rows[0].testItem).toBe('Pb')
        expect(result.rows[0].value).toBe('0.05%')
    })
})

// ==================== 空值/异常测试 ====================

describe('extractStructuredData - 边界情况', () => {
    it('null 输入应返回空结果', () => {
        const result = extractStructuredData(null)
        expect(result.rows.length).toBe(0)
        expect(result.strategy).toBe('position-fallback')
    })

    it('空字符串应返回空结果', () => {
        const result = extractStructuredData('')
        expect(result.rows.length).toBe(0)
    })

    it('无效 JSON 应返回空结果', () => {
        const result = extractStructuredData('not valid json')
        expect(result.rows.length).toBe(0)
    })

    it('空数组应返回空结果', () => {
        const result = extractStructuredData('[]')
        expect(result.rows.length).toBe(0)
    })
})

// ==================== 便捷函数测试 ====================

describe('extractForTestReport', () => {
    const sheetData = JSON.stringify([{
        name: 'Sheet1',
        data: [
            [{ v: '检测项目' }, { v: '技术要求' }, { v: '实测值' }, { v: '单项判定' }, { v: '备注' }],
            [{ v: 'Pb' }, { v: '≤0.1%' }, { v: 'P' }, { v: '合格' }, { v: '' }],
        ],
    }])

    it('应返回 TestReport 格式数据', () => {
        const results = extractForTestReport(sheetData)
        expect(results.length).toBe(1)
        expect(results[0].parameter).toBe('Pb')
        expect(results[0].standard).toBe('≤0.1%')
        expect(results[0].value).toBe('P')
        expect(results[0].result).toBe('合格')
    })
})

describe('extractForOriginalRecord', () => {
    const sheetData = JSON.stringify([{
        name: 'Sheet1',
        config: {
            columnSemantics: { 0: 'testItem', 1: 'test1', 2: 'test2', 3: 'avgResult' }
        },
        data: [
            [{ v: '检测项目' }, { v: 'XRF测试1' }, { v: 'XRF测试2' }, { v: '平均值' }],
            [{ v: 'Pb' }, { v: 'P' }, { v: 'P' }, { v: 'P' }],
        ],
    }])

    it('应返回原始记录格式数据', () => {
        const results = extractForOriginalRecord(sheetData, 'YP-001')
        expect(results.length).toBe(1)
        expect(results[0].testItem).toBe('Pb')
        expect(results[0].test1).toBe('P')
        expect(results[0].sampleNo).toBe('YP-001')
    })
})

describe('extractForClientReport', () => {
    const sheetData = JSON.stringify([{
        name: 'Sheet1',
        config: {
            columnSemantics: { 0: 'testItem', 1: 'avgResult', 2: 'chemResult', 3: 'standardReq', 4: 'conclusion' }
        },
        data: [
            [{ v: '检测项目' }, { v: '平均值' }, { v: '化学验证' }, { v: '标准要求' }, { v: '结论' }],
            [{ v: 'Pb' }, { v: 'P' }, { v: '——' }, { v: '≤0.1%' }, { v: '合格' }],
        ],
    }])

    it('应返回客户报告格式数据', () => {
        const results = extractForClientReport(sheetData, 'YP-001', '端子')
        expect(results.length).toBe(1)
        expect(results[0].testItem).toBe('Pb')
        expect(results[0].xrfResult).toBe('P')
        expect(results[0].chemResult).toBe('——')
        expect(results[0].standardReq).toBe('≤0.1%')
        expect(results[0].sampleName).toBe('端子')
    })
})
