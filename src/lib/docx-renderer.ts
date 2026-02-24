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
                // /uploads/ 开头的路径拼 public 前缀
                let imgPath = tagValue
                if (tagValue.startsWith('/uploads/')) {
                    imgPath = path.join(process.cwd(), 'public', tagValue)
                }
                // 文件路径
                if (fs.existsSync(imgPath)) {
                    return fs.readFileSync(imgPath)
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

    // 后处理：对 results 表格添加垂直合并（序号列）
    if (data.results && data.results.length > 1) {
        postProcessResultsMerge(doc.getZip(), data.results)
    }

    // 后处理：插入样品照片（替代 ImageModule 方式）
    if (data.samplePhoto) {
        insertSamplePhoto(doc.getZip(), data.samplePhoto)
    }

    // 生成输出
    const buf = doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
    })

    return buf
}

/**
 * 后处理：对 results 表格中序号列添加 vMerge（垂直合并）
 * 找到渲染后的 results 行，对相同 seq 值的连续行合并序号列
 */
function postProcessResultsMerge(zip: any, results: Array<{ seq: string;[k: string]: string }>) {
    try {
        const docXml = zip.file('word/document.xml').asText()

        // 找到包含第一个 result seq 值的表格行区域
        // 策略：找到第一个 testItem 文本（如 "Pb"），定位其所在表格
        const firstItem = results[0]?.testItem
        if (!firstItem) return

        const itemIdx = docXml.indexOf(`>${firstItem}<`)
        if (itemIdx < 0) return

        // 往前找表格开始 <w:tbl
        const tblStart = docXml.lastIndexOf('<w:tbl', itemIdx)
        const tblEnd = docXml.indexOf('</w:tbl>', itemIdx) + 8
        if (tblStart < 0 || tblEnd < 8) return

        let tableXml = docXml.substring(tblStart, tblEnd)

        // 提取所有数据行（跳过表头行）
        const trRegex = /<w:tr[\s>][\s\S]*?<\/w:tr>/g
        const allRows: Array<{ match: string; index: number }> = []
        let m: RegExpExecArray | null
        while ((m = trRegex.exec(tableXml)) !== null) {
            allRows.push({ match: m[0], index: m.index })
        }

        // 表头行是第一行，数据行从第二行开始
        if (allRows.length < 2) return

        // 从 results 数组获取 seq 分组信息
        let prevSeq = ''
        const dataRows = allRows.slice(1) // 跳过表头

        for (let i = 0; i < Math.min(dataRows.length, results.length); i++) {
            const currentSeq = results[i].seq || ''
            let rowXml = dataRows[i].match

            if (currentSeq && currentSeq === prevSeq) {
                // 续行：添加 vMerge（无 val，表示继续合并）+ 清空序号文本
                rowXml = addVMergeToFirstCell(rowXml, false)
            } else if (currentSeq && i > 0) {
                // 新组起始行：添加 vMerge restart
                rowXml = addVMergeToFirstCell(rowXml, true)
            } else if (i === 0 && results.filter(r => r.seq === currentSeq).length > 1) {
                // 第一行且有后续相同 seq：添加 vMerge restart
                rowXml = addVMergeToFirstCell(rowXml, true)
            }

            if (rowXml !== dataRows[i].match) {
                tableXml = tableXml.replace(dataRows[i].match, rowXml)
            }
            prevSeq = currentSeq
        }

        // 写回
        const newDocXml = docXml.substring(0, tblStart) + tableXml + docXml.substring(tblEnd)
        zip.file('word/document.xml', newDocXml)
    } catch (e) {
        console.warn('[docx-renderer] 后处理合并失败:', e)
    }
}

/**
 * 在行的第一个单元格的 tcPr 中添加 vMerge 属性
 */
function addVMergeToFirstCell(rowXml: string, isRestart: boolean): string {
    // 找第一个 <w:tc>
    const tcStart = rowXml.indexOf('<w:tc>')
    const tcStartAlt = rowXml.indexOf('<w:tc ')
    const tcPos = tcStart >= 0 && tcStartAlt >= 0 ? Math.min(tcStart, tcStartAlt)
        : tcStart >= 0 ? tcStart : tcStartAlt

    if (tcPos < 0) return rowXml

    const vMerge = isRestart
        ? '<w:vMerge w:val="restart"/>'
        : '<w:vMerge/>'

    // 检查是否已有 <w:tcPr>
    const tcPrStart = rowXml.indexOf('<w:tcPr>', tcPos)
    const nextTcEnd = rowXml.indexOf('</w:tc>', tcPos)

    if (tcPrStart >= 0 && tcPrStart < nextTcEnd) {
        // 已有 tcPr，在其内部添加 vMerge
        return rowXml.substring(0, tcPrStart + 8) + vMerge + rowXml.substring(tcPrStart + 8)
    } else {
        // 无 tcPr，在 <w:tc> 后添加
        const tcEndTag = rowXml.indexOf('>', tcPos) + 1
        return rowXml.substring(0, tcEndTag) + `<w:tcPr>${vMerge}</w:tcPr>` + rowXml.substring(tcEndTag)
    }
}

/**
 * 后处理：在 "样品照片" 区域插入实际图片
 */
function insertSamplePhoto(zip: any, photoPath: string) {
    try {
        // 解析图片路径
        let fullPath = photoPath
        if (photoPath.startsWith('/uploads/')) {
            fullPath = path.join(process.cwd(), 'public', photoPath)
        }
        if (!fs.existsSync(fullPath)) {
            console.warn('[docx-renderer] 样品照片不存在:', fullPath)
            return
        }

        const imgBuffer = fs.readFileSync(fullPath)
        const ext = path.extname(fullPath).toLowerCase().replace('.', '')
        const contentType = ext === 'png' ? 'image/png' : 'image/jpeg'

        // 添加图片到 docx 包
        const rId = 'rIdSamplePhoto'
        zip.file(`word/media/samplePhoto.${ext}`, imgBuffer)

        // 在 word/_rels/document.xml.rels 中添加关系
        const relsPath = 'word/_rels/document.xml.rels'
        let relsXml = zip.file(relsPath).asText()
        const relEntry = `<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/samplePhoto.${ext}"/>`
        relsXml = relsXml.replace('</Relationships>', relEntry + '</Relationships>')
        zip.file(relsPath, relsXml)

        // 在 [Content_Types].xml 中添加类型（如果不存在）
        const ctPath = '[Content_Types].xml'
        let ctXml = zip.file(ctPath).asText()
        if (!ctXml.includes(`Extension="${ext}"`)) {
            ctXml = ctXml.replace('</Types>', `<Default Extension="${ext}" ContentType="${contentType}"/></Types>`)
            zip.file(ctPath, ctXml)
        }

        // 在 document.xml 的 "样品照片" 区域插入图片
        let docXml = zip.file('word/document.xml').asText()
        const photoAreaIdx = docXml.indexOf('样品照片')
        if (photoAreaIdx < 0) return

        // 找 "图1" 文本
        const fig1Idx = docXml.indexOf('图', photoAreaIdx + 10)
        if (fig1Idx < 0) return

        // 在 "图1" 段落前插入图片段落
        const paraStart = docXml.lastIndexOf('<w:p ', fig1Idx)
        if (paraStart < 0) return

        // 图片尺寸（英寸转 EMU，1英寸=914400 EMU）
        const cx = 4 * 914400 // 4英寸宽
        const cy = 3 * 914400 // 3英寸高

        const imgPara = `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr/><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="100" name="SamplePhoto"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="samplePhoto.${ext}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rId}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`

        docXml = docXml.substring(0, paraStart) + imgPara + docXml.substring(paraStart)
        zip.file('word/document.xml', docXml)
    } catch (e) {
        console.warn('[docx-renderer] 插入样品照片失败:', e)
    }
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

        // 表1: 检测结果行循环（flat 格式，兼容通用模板）
        results,

        // 表1: QCT 专用 — 按样品分组（6个元素一组，保留合并结构）
        samples: groupResultsBySample(results),

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
                // 检测数据是否损坏（包含 [object Object]）
                const hasCorruptData = parsed.some((r: any) =>
                    r.parameter === '[object Object]' || r.remark === '[object Object]'
                )
                if (!hasCorruptData) {
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
                console.warn('[docx-renderer] testResults 数据损坏，回退到 sheetData 提取')
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

/**
 * 将 flat results 按样品分组为 QCT 模板格式
 * QCT 固定6个元素: Pb, Hg, Cd, Cr6+, PBBs, PBDEs
 * 每组映射为 per-element 变量名（如 pb_xrf, hg_chem 等）
 */
function groupResultsBySample(results: Array<{
    seq: string
    testItem: string
    xrfResult: string
    chemResult: string
    standardReq: string
    conclusion: string
    [key: string]: string
}>): Array<Record<string, string>> {
    // QCT 元素映射: testItem → 变量前缀
    const ELEMENT_MAP: Record<string, string> = {
        'Pb': 'pb', 'pb': 'pb',
        'Hg': 'hg', 'hg': 'hg',
        'Cd': 'cd', 'cd': 'cd',
        'Cr6+': 'cr', 'cr6+': 'cr', 'Cr': 'cr',
        'PBBs': 'pbbs', 'pbbs': 'pbbs',
        'PBDEs': 'pbdes', 'pbdes': 'pbdes',
    }

    // 按 seq 分组
    const groups: Record<string, Record<string, string>> = {}
    let currentSeq = '1'

    for (const row of results) {
        // 更新当前序号（合并行可能 seq 为空）
        if (row.seq && row.seq !== '0') {
            currentSeq = row.seq
        }

        if (!groups[currentSeq]) {
            groups[currentSeq] = { seq: currentSeq }
        }

        const prefix = ELEMENT_MAP[row.testItem] || ''
        if (prefix) {
            groups[currentSeq][`${prefix}_xrf`] = row.xrfResult || ''
            groups[currentSeq][`${prefix}_chem`] = row.chemResult || '——'
            groups[currentSeq][`${prefix}_std`] = row.standardReq || ''
            groups[currentSeq][`${prefix}_conc`] = row.conclusion || ''
        }
    }

    return Object.values(groups)
}
