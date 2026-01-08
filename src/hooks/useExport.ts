/**
 * @file useExport.ts
 * @desc 数据导出 Hook，支持导出 Excel
 */

import { message } from 'antd'
import { saveAs } from 'file-saver'

/**
 * 导出数据为 CSV
 * @param data 数据数组
 * @param filename 文件名
 * @param columns 列配置
 */
export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  columns?: { title: string; dataIndex: keyof T }[]
) {
  if (!data || data.length === 0) {
    message.warning('暂无数据可导出')
    return
  }

  try {
    // 确定要导出的列
    const keys = columns
      ? columns.map((col) => col.dataIndex)
      : (Object.keys(data[0]) as Array<keyof T>)

    const headers = columns
      ? columns.map((col) => col.title)
      : (keys as string[])

    // 生成 CSV 内容
    const csvContent = [
      headers.join(','),
      ...data.map((row) =>
        keys.map((key) => {
          const value = row[key]
          // 处理包含逗号或引号的值
          const stringValue = String(value ?? '')
          if (stringValue.includes(',') || stringValue.includes('"')) {
            return `"${stringValue.replace(/"/g, '""')}"`
          }
          return stringValue
        }).join(',')
      ),
    ].join('\n')

    // 添加 BOM 以支持 Excel 正确显示中文
    const blob = new Blob(['\ufeff' + csvContent], {
      type: 'text/csv;charset=utf-8',
    })

    saveAs(blob, `${filename}.csv`)
    message.success('导出成功')
  } catch (error) {
    message.error('导出失败')
  }
}

/**
 * 导出数据为 Excel（使用 xlsx 库）
 * 注意：需要安装 xlsx 和 file-saver
 * npm install xlsx file-saver
 * npm install --save-dev @types/file-saver
 */
export async function exportToExcel<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  columns?: { title: string; dataIndex: keyof T }[]
) {
  if (!data || data.length === 0) {
    message.warning('暂无数据可导出')
    return
  }

  try {
    // 动态导入 xlsx
    const XLSX = await import('xlsx')

    // 确定要导出的列
    const keys = columns
      ? columns.map((col) => col.dataIndex as string)
      : (Object.keys(data[0]) as string[])

    const headers = columns
      ? columns.map((col) => col.title)
      : keys

    // 构建工作表数据
    const worksheetData = [
      headers,
      ...data.map((row) =>
        keys.map((key) => {
          const value = (row as any)[key]
          return value ?? ''
        })
      ),
    ]

    // 创建工作表
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)

    // 设置列宽
    const colWidths = headers.map((h) => ({
      wch: Math.max(String(h).length, 15),
    }))
    worksheet['!cols'] = colWidths

    // 创建工作簿
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')

    // 导出文件
    XLSX.writeFile(workbook, `${filename}.xlsx`)
    message.success('导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    message.error('导出失败，请检查是否安装 xlsx 库')
  }
}
