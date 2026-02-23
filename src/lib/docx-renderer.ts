/**
 * docx 模板渲染服务
 * 使用 docxtemplater 加载 docx 模板，替换占位符生成最终文档
 */

import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import fs from 'fs'
import path from 'path'

/**
 * 渲染 docx 模板
 * @param templatePath 模板文件的绝对路径或相对于 public/templates 的路径
 * @param data 要填充到模板的数据
 * @returns 渲染后的 docx Buffer
 */
export function renderDocx(templatePath: string, data: Record<string, any>): Buffer {
    // 解析模板路径
    let fullPath = templatePath
    if (!path.isAbsolute(templatePath)) {
        fullPath = path.join(process.cwd(), 'public', 'templates', templatePath)
    }

    // 读取模板文件
    const templateContent = fs.readFileSync(fullPath, 'binary')

    // 创建 PizZip 实例
    const zip = new PizZip(templateContent)

    // 创建 Docxtemplater 实例
    const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        // 遇到未定义的标签不报错，直接留空
        nullGetter: () => '',
    })

    // 填充数据
    doc.render(data)

    // 生成输出
    const buf = doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
    })

    return buf
}

/**
 * 为 QCT 原始记录准备数据
 * 从检测任务和关联信息中组装模板数据
 */
export function prepareOriginalRecordData(task: any, entrustment: any, sample: any): Record<string, any> {
    return {
        // 委托信息
        entrustmentNo: entrustment?.entrustmentNo || '',
        receivedDate: sample?.receiptDate
            ? new Date(sample.receiptDate).toLocaleDateString('zh-CN')
            : '',

        // 样品信息
        sampleNo: sample?.sampleNo || '',
        sampleName: task?.sampleName || sample?.name || '',
        receiver: sample?.receiptPerson || '',
        testDate: task?.completedAt
            ? new Date(task.completedAt).toLocaleDateString('zh-CN')
            : new Date().toLocaleDateString('zh-CN'),
        sampleDesc: sample?.sampleCondition || '',
        temperature: '',  // 需要检测人员填写
        humidity: '',     // 需要检测人员填写

        // 检测结果（从 sheetData 或 testResults 提取）
        testResultText: extractResultText(task),

        // 结构化检测结果（用于 docx 模板 {#results}...{/results} 循环）
        results: extractOriginalRecordResults(task),

        // 人员
        tester: task?.assignedTo?.name || '',
        reviewer: '',
        testDateSign: task?.completedAt
            ? new Date(task.completedAt).toLocaleDateString('zh-CN')
            : '',
        reviewDate: '',
    }
}

/**
 * 为 QCT 客户报告准备数据
 */
export function prepareClientReportData(
    task: any,
    entrustment: any,
    sample: any,
    clientReport?: any
): Record<string, any> {
    // 从 testResults 提取结果行
    const results = extractTestResults(task)

    return {
        // 封面信息
        reportNo: clientReport?.reportNo || task?.testReports?.[0]?.reportNo || '',
        sampleName: task?.sampleName || sample?.name || '',
        testProject: '禁限用物质分析',
        clientName: entrustment?.clientName || entrustment?.client?.name || '',
        clientAddress: entrustment?.clientAddress || entrustment?.client?.address || '',

        // 基础信息表
        sampleNo: sample?.sampleNo || '',
        specification: sample?.specification || '',
        sampleDesc: sample?.sampleCondition || '',
        sampleQuantity: sample?.quantity || '1',
        receivedDate: sample?.receiptDate
            ? new Date(sample.receiptDate).toLocaleDateString('zh-CN')
            : '',
        entrustmentNo: entrustment?.entrustmentNo || '',
        testDate: task?.completedAt
            ? new Date(task.completedAt).toLocaleDateString('zh-CN')
            : '',

        // 表1: 检测结果行循环
        results,

        // 人员签名
        preparer: task?.assignedTo?.name || '',
        reviewer: '',
        approver: '',
    }
}

/**
 * 从 task 中提取结果文本（用于原始记录）
 */
function extractResultText(task: any): string {
    if (!task) return ''

    try {
        // 优先从 testResults 提取
        const testResults = task.testReports?.[0]?.testResults || task.testResults
        if (testResults) {
            const parsed = typeof testResults === 'string' ? JSON.parse(testResults) : testResults
            if (Array.isArray(parsed)) {
                return parsed
                    .map((r: any) => `${r.parameter || r.testItem || ''}: ${r.value || r.result || ''}`)
                    .join('\n')
            }
        }

        // 从 sheetData 提取
        if (task.sheetData) {
            const sheets = typeof task.sheetData === 'string' ? JSON.parse(task.sheetData) : task.sheetData
            if (Array.isArray(sheets) && sheets[0]?.data) {
                const rows = sheets[0].data
                return rows
                    .slice(1) // 跳过标题行
                    .filter((row: any) => row && row[0]?.v)
                    .map((row: any) => {
                        const param = row[0]?.v || ''
                        const value = row[2]?.v || ''
                        const result = row[3]?.v || ''
                        return `${param}: ${value} ${result}`
                    })
                    .join('\n')
            }
        }
    } catch (e) {
        console.error('[docx-renderer] 提取检测结果失败:', e)
    }

    return ''
}

/**
 * 从 task 中提取结构化结果（用于客户报告表格循环）
 */
function extractTestResults(task: any): Array<{
    seq: string
    sampleNo: string
    sampleName: string
    testItem: string
    xrfResult: string
    chemResult: string
    standardReq: string
    conclusion: string
}> {
    try {
        const testResults = task?.testReports?.[0]?.testResults || task?.testResults
        if (testResults) {
            const parsed = typeof testResults === 'string' ? JSON.parse(testResults) : testResults
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed.map((r: any, i: number) => ({
                    seq: String(i + 1),
                    sampleNo: task?.sample?.sampleNo || '',
                    sampleName: task?.sampleName || '',
                    testItem: r.parameter || r.testItem || '',
                    xrfResult: r.value || r.xrfResult || '',
                    chemResult: r.chemResult || '——',
                    standardReq: r.standard || r.standardReq || '',
                    conclusion: r.result || r.conclusion || '',
                }))
            }
        }
    } catch (e) {
        console.error('[docx-renderer] 提取结构化结果失败:', e)
    }

    // 无数据时返回空数组（不再返回硬编码的 QCT 默认数据）
    return []
}

/**
 * 从 task 中提取原始记录用的结构化结果
 * 用于原始记录模板的 {#results}...{/results} 循环
 * 包含 test1/test2/avgResult 字段（对应测试1/测试2/平均值）
 */
function extractOriginalRecordResults(task: any): Array<{
    seq: string
    sampleNo: string
    testItem: string
    test1: string
    test2: string
    avgResult: string
    remark: string
}> {
    try {
        const testResults = task?.testReports?.[0]?.testResults || task?.testResults
        if (testResults) {
            const parsed = typeof testResults === 'string' ? JSON.parse(testResults) : testResults
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed.map((r: any, i: number) => ({
                    seq: String(i + 1),
                    sampleNo: task?.sample?.sampleNo || '',
                    testItem: r.parameter || r.testItem || '',
                    test1: r.test1 || r.value || '',
                    test2: r.test2 || '',
                    avgResult: r.avgResult || r.value || '',
                    remark: r.remark || '',
                }))
            }
        }

        // 从 sheetData 提取
        if (task?.sheetData) {
            const sheets = typeof task.sheetData === 'string' ? JSON.parse(task.sheetData) : task.sheetData
            if (Array.isArray(sheets) && sheets[0]?.data) {
                const rows = sheets[0].data
                return rows
                    .slice(1)
                    .filter((row: any) => row && row[0]?.v)
                    .map((row: any, i: number) => ({
                        seq: String(i + 1),
                        sampleNo: '',
                        testItem: row[0]?.v || '',
                        test1: row[1]?.v || '',
                        test2: row[2]?.v || '',
                        avgResult: row[3]?.v || '',
                        remark: row[4]?.v || '',
                    }))
            }
        }
    } catch (e) {
        console.error('[docx-renderer] 提取原始记录结构化结果失败:', e)
    }

    // 无数据时返回空数组（不再返回硬编码的 QCT 默认数据）
    return []
}
