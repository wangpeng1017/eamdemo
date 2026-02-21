/**
 * 生成 QCT 禁限用物质分析 docx 模板文件
 * 模板包含 docxtemplater 占位符 {tag} 和循环 {#list}...{/list}
 */
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, HeadingLevel } = require('docx')
const fs = require('fs')
const path = require('path')

const outDir = path.join(__dirname, '..', 'public', 'templates')
fs.mkdirSync(outDir, { recursive: true })

// 通用样式
const cellBorders = {
  top: { style: BorderStyle.SINGLE, size: 1 },
  bottom: { style: BorderStyle.SINGLE, size: 1 },
  left: { style: BorderStyle.SINGLE, size: 1 },
  right: { style: BorderStyle.SINGLE, size: 1 },
}

function cell(text, opts = {}) {
  return new TableCell({
    children: [new Paragraph({
      children: [new TextRun({ text, size: 20, ...opts })],
      alignment: opts.alignment || AlignmentType.CENTER,
    })],
    borders: cellBorders,
    width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    columnSpan: opts.columnSpan,
  })
}

function headerCell(text, opts = {}) {
  return cell(text, { bold: true, ...opts })
}

// ============ 1. QCT 原始记录模板 ============
async function createOriginalRecord() {
  const doc = new Document({
    sections: [{
      children: [
        // 标题
        new Paragraph({
          children: [new TextRun({ text: 'XRF 荧光光谱筛选法检测原始记录', bold: true, size: 28 })],
          alignment: AlignmentType.CENTER,
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 200 },
        }),

        // 基本信息表
        new Table({
          rows: [
            new TableRow({ children: [
              headerCell('委托编号'), cell('{entrustmentNo}', { width: 3000 }),
              headerCell('接样日期'), cell('{receivedDate}', { width: 3000 }),
            ]}),
            new TableRow({ children: [
              headerCell('样品编号'), cell('{sampleNo}'),
              headerCell('样品名称'), cell('{sampleName}'),
            ]}),
            new TableRow({ children: [
              headerCell('接样人'), cell('{receiver}'),
              headerCell('检测日期'), cell('{testDate}'),
            ]}),
            new TableRow({ children: [
              headerCell('样品描述'), cell('{sampleDesc}', { columnSpan: 3 }),
            ]}),
            new TableRow({ children: [
              headerCell('温度'), cell('{temperature}'),
              headerCell('湿度'), cell('{humidity}'),
            ]}),
          ],
          width: { size: 9000, type: WidthType.DXA },
        }),

        new Paragraph({ spacing: { before: 200, after: 200 } }),

        // 检测设备（固定文字）
        new Paragraph({
          children: [new TextRun({ text: '检测设备: XRF EDX3800PLUS    检测标准: QC/T 941~944', size: 20 })],
        }),

        new Paragraph({ spacing: { before: 200, after: 100 } }),

        // 检测结果表标题
        new Paragraph({
          children: [new TextRun({ text: '检测结果', bold: true, size: 24 })],
          alignment: AlignmentType.CENTER,
        }),

        // 检测结果表 - 表头
        new Table({
          rows: [
            new TableRow({ children: [
              headerCell('序号'), headerCell('样品编号'), headerCell('检测项目'),
              headerCell('测试1'), headerCell('测试2'), headerCell('平均值'), headerCell('备注'),
            ]}),
            // docxtemplater 循环行
            new TableRow({ children: [
              cell('{#results}{seq}'), cell('{sampleNo}'), cell('{testItem}'),
              cell('{test1}'), cell('{test2}'), cell('{avgResult}'), cell('{remark}{/results}'),
            ]}),
          ],
          width: { size: 9000, type: WidthType.DXA },
        }),

        new Paragraph({ spacing: { before: 200, after: 100 } }),

        // 纯文本检测结果（兼容）
        new Paragraph({
          children: [new TextRun({ text: '{testResultText}', size: 20 })],
        }),

        new Paragraph({ spacing: { before: 300 } }),

        // 签名区
        new Table({
          rows: [
            new TableRow({ children: [
              headerCell('检测人'), cell('{tester}'),
              headerCell('复核人'), cell('{reviewer}'),
            ]}),
            new TableRow({ children: [
              headerCell('检测日期'), cell('{testDateSign}'),
              headerCell('复核日期'), cell('{reviewDate}'),
            ]}),
          ],
          width: { size: 9000, type: WidthType.DXA },
        }),

        new Paragraph({ spacing: { before: 200 } }),

        // 固定注释文字
        new Paragraph({
          children: [new TextRun({
            text: '注: P=通过(低于筛选限值), F=未通过(高于筛选限值), 需进一步化学法确认',
            size: 18, italics: true,
          })],
        }),
      ],
    }],
  })

  const buf = await Packer.toBuffer(doc)
  const filePath = path.join(outDir, 'qct-original-record.docx')
  fs.writeFileSync(filePath, buf)
  console.log('Created:', filePath, `(${buf.length} bytes)`)
}

// ============ 2. QCT 客户报告模板 ============
async function createClientReport() {
  const doc = new Document({
    sections: [{
      children: [
        // 封面
        new Paragraph({ spacing: { before: 2000 } }),
        new Paragraph({
          children: [new TextRun({ text: '检 测 报 告', bold: true, size: 44 })],
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({ spacing: { before: 400 } }),
        new Paragraph({
          children: [new TextRun({ text: 'INSPECTION REPORT', bold: true, size: 28 })],
          alignment: AlignmentType.CENTER,
        }),

        new Paragraph({ spacing: { before: 600 } }),

        // 封面信息
        new Table({
          rows: [
            new TableRow({ children: [
              headerCell('报告编号', { width: 2500 }), cell('{reportNo}', { width: 6500 }),
            ]}),
            new TableRow({ children: [
              headerCell('样品名称'), cell('{sampleName}'),
            ]}),
            new TableRow({ children: [
              headerCell('检测项目'), cell('{testProject}'),
            ]}),
            new TableRow({ children: [
              headerCell('委托单位'), cell('{clientName}'),
            ]}),
            new TableRow({ children: [
              headerCell('委托地址'), cell('{clientAddress}'),
            ]}),
          ],
          width: { size: 9000, type: WidthType.DXA },
        }),

        // 分页 - 正文
        new Paragraph({ spacing: { before: 600, after: 200 } }),

        // 样品基础信息
        new Paragraph({
          children: [new TextRun({ text: '一、样品信息', bold: true, size: 24 })],
        }),

        new Table({
          rows: [
            new TableRow({ children: [
              headerCell('样品编号'), cell('{sampleNo}'),
              headerCell('规格型号'), cell('{specification}'),
            ]}),
            new TableRow({ children: [
              headerCell('样品描述'), cell('{sampleDesc}'),
              headerCell('样品数量'), cell('{sampleQuantity}'),
            ]}),
            new TableRow({ children: [
              headerCell('接样日期'), cell('{receivedDate}'),
              headerCell('委托编号'), cell('{entrustmentNo}'),
            ]}),
            new TableRow({ children: [
              headerCell('检测日期'), cell('{testDate}', { columnSpan: 3 }),
            ]}),
          ],
          width: { size: 9000, type: WidthType.DXA },
        }),

        new Paragraph({ spacing: { before: 300, after: 200 } }),

        // 检测结果
        new Paragraph({
          children: [new TextRun({ text: '二、检测结果', bold: true, size: 24 })],
        }),

        new Table({
          rows: [
            new TableRow({ children: [
              headerCell('序号'), headerCell('样品编号'), headerCell('样品名称'),
              headerCell('检测项目'), headerCell('XRF结果'), headerCell('化学法结果'),
              headerCell('标准要求'), headerCell('结论'),
            ]}),
            // docxtemplater 循环
            new TableRow({ children: [
              cell('{#results}{seq}'), cell('{sampleNo}'), cell('{sampleName}'),
              cell('{testItem}'), cell('{xrfResult}'), cell('{chemResult}'),
              cell('{standardReq}'), cell('{conclusion}{/results}'),
            ]}),
          ],
          width: { size: 9000, type: WidthType.DXA },
        }),

        new Paragraph({ spacing: { before: 300, after: 200 } }),

        // 固定文字: 筛选限值表说明
        new Paragraph({
          children: [new TextRun({
            text: '注: XRF筛选限值依据 IEC 62321 标准, P=通过, F=未通过需化学法确认',
            size: 18, italics: true,
          })],
        }),

        new Paragraph({ spacing: { before: 400 } }),

        // 签名
        new Table({
          rows: [
            new TableRow({ children: [
              headerCell('编制人'), cell('{preparer}'),
              headerCell('审核人'), cell('{reviewer}'),
              headerCell('批准人'), cell('{approver}'),
            ]}),
          ],
          width: { size: 9000, type: WidthType.DXA },
        }),

        new Paragraph({ spacing: { before: 300 } }),

        // 声明（固定文字）
        new Paragraph({
          children: [new TextRun({
            text: '声明: 本报告仅对所送样品负责,未经本实验室同意不得复制(全文复制除外)。',
            size: 18,
          })],
        }),
      ],
    }],
  })

  const buf = await Packer.toBuffer(doc)
  const filePath = path.join(outDir, 'qct-client-report.docx')
  fs.writeFileSync(filePath, buf)
  console.log('Created:', filePath, `(${buf.length} bytes)`)
}

// 执行
async function main() {
  await createOriginalRecord()
  await createClientReport()
  console.log('All templates created successfully!')
}

main().catch(e => { console.error(e); process.exit(1) })
