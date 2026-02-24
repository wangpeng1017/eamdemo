import { NextRequest, NextResponse } from 'next/server'
import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import fs from 'fs'
import path from 'path'

// 系统自动填充字段（不需要用户编辑）
const AUTO_FIELDS: Record<string, string> = {
    reportNo: '报告编号',
    sampleName: '样品名称',
    sampleNo: '样品编号',
    clientName: '客户名称',
    clientAddress: '客户地址',
    entrustmentNo: '委托编号',
    receivedDate: '收样日期',
    testDate: '检测日期',
    issuedDate: '发证日期',
    reportDate: '报告日期',
    specification: '规格型号',
    sampleDesc: '样品状态',
    sampleQuantity: '样品数量',
    preparer: '编制人',
    reviewer: '审核人',
    approver: '批准人',
    temperature: '温度',
    humidity: '湿度',
    overallConclusion: '综合结论',
    testProject: '检测项目',
    projectName: '项目名称',
}

// 循环标签（表格区域）
const LOOP_FIELDS: Record<string, string> = {
    results: '表1：检测结果数据',
    xrfTable: '表2：XRF初筛判定范围',
    standards: '检测依据列表',
}

/**
 * POST /api/report-template/extract
 * 从 docx 模板文件中提取所有占位符标签
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { fileUrl } = body

        if (!fileUrl) {
            return NextResponse.json({ error: '缺少 fileUrl' }, { status: 400 })
        }

        // 读取 docx 文件
        let fullPath = fileUrl
        if (!path.isAbsolute(fileUrl)) {
            fullPath = path.join(process.cwd(), 'public', fileUrl)
        }

        if (!fs.existsSync(fullPath)) {
            return NextResponse.json({ error: '模板文件不存在' }, { status: 404 })
        }

        const content = fs.readFileSync(fullPath, 'binary')
        const zip = new PizZip(content)

        // 用 InspectModule 模式提取标签
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            nullGetter: () => '',
        })

        // 从模板 XML 中提取占位符
        const xmlContent = zip.file('word/document.xml')?.asText() || ''
        const headerXml = zip.files['word/header1.xml']?.asText() || ''
        const footerXml = zip.files['word/footer1.xml']?.asText() || ''
        const allXml = xmlContent + headerXml + footerXml

        // 匹配 {tag} 和 {#tag}...{/tag} 模式
        const simpleTagRegex = /\{([^#/}][^}]*)\}/g
        const loopStartRegex = /\{#([^}]+)\}/g

        const simpleTags = new Set<string>()
        const loopTags = new Set<string>()

        let match
        while ((match = simpleTagRegex.exec(allXml)) !== null) {
            const tag = match[1].trim()
            if (tag && !tag.startsWith('.') && !tag.startsWith('@')) {
                simpleTags.add(tag)
            }
        }
        while ((match = loopStartRegex.exec(allXml)) !== null) {
            loopTags.add(match[1].trim())
        }

        // 分类
        const autoFields: { tag: string; label: string }[] = []
        const editableFields: { tag: string; label: string }[] = []
        const loopFields: { tag: string; label: string }[] = []

        simpleTags.forEach(tag => {
            // 去掉循环内部子字段（如 results 循环中的 name）
            if (AUTO_FIELDS[tag]) {
                autoFields.push({ tag, label: AUTO_FIELDS[tag] })
            } else {
                editableFields.push({ tag, label: tag })
            }
        })

        loopTags.forEach(tag => {
            loopFields.push({
                tag,
                label: LOOP_FIELDS[tag] || `循环区域: ${tag}`
            })
        })

        return NextResponse.json({
            success: true,
            data: {
                autoFields,
                editableFields,
                loopFields,
                totalTags: simpleTags.size + loopTags.size,
            }
        })
    } catch (error: any) {
        console.error('[extract] 提取占位符失败:', error)
        return NextResponse.json({
            error: '提取占位符失败: ' + error.message
        }, { status: 500 })
    }
}
