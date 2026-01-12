import ExcelJS from 'exceljs'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth()
    if (!session?.user) {
        return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { id } = await params

    // 获取报告数据
    const report = await prisma.testReport.findUnique({
        where: { id }
    })

    if (!report) {
        return NextResponse.json({ error: '报告不存在' }, { status: 404 })
    }

    // 解析检测数据
    let testData: any[] = []
    try {
        testData = report.testResults ? JSON.parse(report.testResults) : []
    } catch (e) {
        console.error('解析检测数据失败', e)
    }

    // 创建工作簿
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'LIMS系统'
    workbook.created = new Date()

    const sheet = workbook.addWorksheet('检测报告')

    // 设置列宽
    sheet.columns = [
        { width: 8 },   // A - 序号
        { width: 25 },  // B - 检测项目
        { width: 20 },  // C - 技术要求
        { width: 15 },  // D - 实测值
        { width: 12 },  // E - 单项判定
        { width: 20 },  // F - 备注
    ]

    // 标题
    sheet.mergeCells('A1:F1')
    const titleCell = sheet.getCell('A1')
    titleCell.value = '检 测 报 告'
    titleCell.font = { size: 18, bold: true }
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
    sheet.getRow(1).height = 35

    // 报告编号
    sheet.mergeCells('A2:F2')
    const reportNoCell = sheet.getCell('A2')
    reportNoCell.value = `报告编号：${report.reportNo}`
    reportNoCell.alignment = { horizontal: 'right' }
    sheet.getRow(2).height = 20

    // 空行
    sheet.addRow([])

    // 基本信息
    const infoStartRow = 4
    sheet.getCell(`A${infoStartRow}`).value = '客户名称'
    sheet.getCell(`B${infoStartRow}`).value = report.clientName || '-'
    sheet.getCell(`D${infoStartRow}`).value = '样品名称'
    sheet.getCell(`E${infoStartRow}`).value = report.sampleName || '-'

    sheet.getCell(`A${infoStartRow + 1}`).value = '样品编号'
    sheet.getCell(`B${infoStartRow + 1}`).value = report.sampleNo || '-'
    sheet.getCell(`D${infoStartRow + 1}`).value = '样品规格'
    sheet.getCell(`E${infoStartRow + 1}`).value = report.specification || '-'

    sheet.getCell(`A${infoStartRow + 2}`).value = '样品数量'
    sheet.getCell(`B${infoStartRow + 2}`).value = report.sampleQuantity || '-'
    sheet.getCell(`D${infoStartRow + 2}`).value = '收样日期'
    sheet.getCell(`E${infoStartRow + 2}`).value = report.receivedDate
        ? new Date(report.receivedDate).toLocaleDateString('zh-CN')
        : '-'

    // 设置基本信息标签样式
    for (let i = 0; i < 3; i++) {
        sheet.getCell(`A${infoStartRow + i}`).font = { bold: true }
        sheet.getCell(`D${infoStartRow + i}`).font = { bold: true }
    }

    // 空行
    sheet.addRow([])

    // 检测数据表头
    const dataHeaderRow = sheet.addRow(['序号', '检测项目', '技术要求', '实测值', '单项判定', '备注'])
    dataHeaderRow.eachCell((cell) => {
        cell.font = { bold: true }
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE6E6FA' }
        }
        cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        }
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
    })
    dataHeaderRow.height = 25

    // 检测数据
    testData.forEach((item: any, index: number) => {
        const row = sheet.addRow([
            index + 1,
            item.parameter || '-',
            item.standard || '-',
            item.value || '-',
            item.result || '-',
            item.remark || ''
        ])
        row.eachCell((cell) => {
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            }
            cell.alignment = { vertical: 'middle' }
        })
    })

    // 空行
    sheet.addRow([])

    // 检测结论
    const conclusionLabelRow = sheet.addRow(['检测结论'])
    conclusionLabelRow.getCell(1).font = { bold: true }

    sheet.mergeCells(`A${sheet.rowCount + 1}:F${sheet.rowCount + 1}`)
    const conclusionRow = sheet.addRow([report.overallConclusion || '暂无结论'])
    conclusionRow.height = 40
    conclusionRow.getCell(1).alignment = { wrapText: true, vertical: 'top' }

    // 空行
    sheet.addRow([])
    sheet.addRow([])

    // 签名区域
    const signRow = sheet.addRow(['检测人', report.tester || '', '', '报告日期', new Date(report.createdAt).toLocaleDateString('zh-CN')])
    signRow.getCell(1).font = { bold: true }
    signRow.getCell(4).font = { bold: true }

    // 生成 Buffer
    const buffer = await workbook.xlsx.writeBuffer()

    // 处理文件名编码
    const filename = encodeURIComponent(`检测报告_${report.reportNo}.xlsx`)

    return new NextResponse(buffer, {
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${filename}`
        }
    })
}
