/**
 * docx 模板渲染服务
 * 使用 docxtemplater 加载 docx 模板，替换占位符生成最终文档
 * 
 * 重构说明：所有数据提取统一走 sheet-extractor 模块的语义提取逻辑，
 * 不再在此文件中按固定列位置硬编码提取。
 */

import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import fs from 'fs'
import path from 'path'
import https from 'https'
import http from 'http'
import {
    extractStructuredData,
    extractForOriginalRecord,
    extractForClientReport,
} from '@/lib/sheet-extractor'

// 图片模块（用于在 docx 模板中插入图片）
let ImageModule: any = null
try {
    ImageModule = require('docxtemplater-image-module-free')
} catch (e) {
    console.warn('[docx-renderer] docxtemplater-image-module-free 未安装，图片功能不可用')
}

/**
 * 渲染 docx 模板
 * @param templatePath 模板文件的绝对路径或相对于 public/templates 的路径
 * @param data 要填充到模板的数据
 * @returns 渲染后的 docx Buffer
 */
export function renderDocx(templatePath: string, data: Record<string, any>): Buffer {
    // 解析模板路径
    let fullPath = templatePath
    if (templatePath.startsWith('/uploads/')) {
        // 数据库存的 fileUrl 如 /uploads/templates/xxx.docx，实际文件在 public/uploads/...
        fullPath = path.join(process.cwd(), 'public', templatePath)
    } else if (!path.isAbsolute(templatePath)) {
        fullPath = path.join(process.cwd(), 'public', 'templates', templatePath)
    }

    // 读取模板文件
    const templateContent = fs.readFileSync(fullPath, 'binary')

    // 创建 PizZip 实例
    const zip = new PizZip(templateContent)

    // 构建模块列表
    const modules: any[] = []

    // 如果有图片模块且数据中有图片，启用图片支持
    if (ImageModule) {
        const imageModule = new ImageModule({
            centered: false,
            getImage: (tagValue: string) => {
                // tagValue 是图片的路径或 base64
                if (tagValue.startsWith('data:')) {
                    // base64 图片
                    const base64 = tagValue.split(',')[1]
                    return Buffer.from(base64, 'base64')
                }
                // 文件路径
                if (fs.existsSync(tagValue)) {
                    return fs.readFileSync(tagValue)
                }
                // URL（返回空 buffer）
                return Buffer.alloc(0)
            },
            getSize: () => [400, 300], // 默认 400x300
        })
        modules.push(imageModule)
    }

    // 创建 Docxtemplater 实例
    const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        nullGetter: () => '',
        modules,
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
 * 解析 metadata JSON 字符串为对象
 */
function parseMetadata(metadata: any): Record<string, string> {
    if (!metadata) return {}
    try {
        return typeof metadata === 'string' ? JSON.parse(metadata) : metadata
    } catch {
        return {}
    }
}

/**
 * 为原始记录准备数据
 * 从检测任务和关联信息中组装模板数据
 */
export function prepareOriginalRecordData(
    task: any,
    entrustment: any,
    sample: any,
    metadata?: any
): Record<string, any> {
    const meta = parseMetadata(metadata || task?.metadata)

    // 从 sheetData 提取结构化结果（使用语义提取）
    const results = extractForOriginalRecord(
        task?.sheetData,
        sample?.sampleNo
    )

    // 从结果生成文本摘要
    const testResultText = results
        .map(r => `${r.testItem}: ${r.avgResult || r.test1 || ''}`)
        .filter(s => s.length > 3)
        .join('\n')

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

        // 检测条件（从 metadata 获取）
        temperature: meta.temperature || '',
        humidity: meta.humidity || '',

        // 检测结果
        testResultText,
        results,

        // 人员
        tester: task?.assignedTo?.name || '',
        reviewer: meta.reviewer || '',
        testDateSign: task?.completedAt
            ? new Date(task.completedAt).toLocaleDateString('zh-CN')
            : '',
        reviewDate: '',
    }
}

/**
 * 为客户报告准备数据
 */
export function prepareClientReportData(
    task: any,
    entrustment: any,
    sample: any,
    clientReport?: any,
    metadata?: any,
    reportTemplate?: any,
): Record<string, any> {
    const meta = parseMetadata(metadata || task?.metadata)

    // 从 sheetData 或 testResults 提取结构化结果
    const results = extractClientReportResults(task, sample)

    // 检测标准列表（从模板配置获取）
    let testStandards: string[] = []
    if (reportTemplate?.testStandards) {
        try {
            const parsed = typeof reportTemplate.testStandards === 'string'
                ? reportTemplate.testStandards : JSON.stringify(reportTemplate.testStandards)
            // 按行分割（每行一条标准）
            testStandards = parsed.split('\n').filter((s: string) => s.trim())
        } catch (e) {
            testStandards = []
        }
    }

    // XRF 筛选表（从模板配置获取）
    let xrfTable: any[] = []
    if (reportTemplate?.xrfScreeningConfig) {
        try {
            xrfTable = typeof reportTemplate.xrfScreeningConfig === 'string'
                ? JSON.parse(reportTemplate.xrfScreeningConfig)
                : reportTemplate.xrfScreeningConfig
        } catch (e) {
            xrfTable = []
        }
    }

    // 样品照片（从 metadata 获取第一张）
    const samplePhotoUrl = meta.samplePhotos?.[0] || ''

    return {
        // 封面信息
        reportNo: clientReport?.reportNo || task?.testReports?.[0]?.reportNo || '',
        sampleName: task?.sampleName || sample?.name || '',
        testProject: task?.entrustmentProject?.name || '检测分析',
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

        // 检测条件
        temperature: meta.temperature || '',
        humidity: meta.humidity || '',

        // 检测依据（动态标准列表）
        standards: testStandards.map((s: string) => ({ name: s })),
        standardsText: testStandards.join('\n'),

        // 表1: 检测结果行循环
        results,

        // 表2: XRF 筛选表循环
        xrfTable,

        // 样品照片（如果有图片模块支持）
        samplePhoto: samplePhotoUrl,

        // 人员签名
        preparer: task?.assignedTo?.name || '',
        reviewer: meta.reviewer || '',
        approver: '',

        // 报告备注
        reportRemark: '',
    }
}

/**
 * 从 task 提取客户报告结果
 * 优先使用 testResults（已生成的报告数据），回退到 sheetData 语义提取
 */
function extractClientReportResults(task: any, sample: any): Array<{
    seq: string
    sampleNo: string
    sampleName: string
    testItem: string
    xrfResult: string
    chemResult: string
    standardReq: string
    conclusion: string
}> {
    // 优先从 testResults 提取（已有报告数据）
    try {
        const testResults = task?.testReports?.[0]?.testResults || task?.testResults
        if (testResults) {
            const parsed = typeof testResults === 'string' ? JSON.parse(testResults) : testResults
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed.map((r: any, i: number) => ({
                    seq: String(i + 1),
                    sampleNo: task?.sample?.sampleNo || sample?.sampleNo || '',
                    sampleName: task?.sampleName || sample?.name || '',
                    testItem: r.parameter || r.testItem || '',
                    xrfResult: r.value || r.xrfResult || r.avgResult || '',
                    chemResult: r.chemResult || '——',
                    standardReq: r.standard || r.standardReq || '',
                    conclusion: r.result || r.conclusion || '',
                }))
            }
        }
    } catch (e) {
        console.error('[docx-renderer] 解析 testResults 失败:', e)
    }

    // 回退：从 sheetData 语义提取
    return extractForClientReport(
        task?.sheetData,
        sample?.sampleNo,
        task?.sampleName || sample?.name
    )
}
