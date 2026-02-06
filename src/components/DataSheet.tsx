'use client'

import { useMemo } from "react"
import { Workbook, WorkbookInstance } from "@fortune-sheet/react"
import "@fortune-sheet/react/dist/index.css"

interface DataSheetProps {
  data?: any[]
  onChange?: (data: any) => void
  readonly?: boolean
  height?: number | string
}

/**
 * 数据规范化工具：确保始终使用 celldata 格式
 *
 * Fortune-sheet 有两种数据格式：
 * - celldata: 稀疏数组格式 [{r, c, v}, ...]，用于初始化
 * - data: 2D 数组格式，用于运行时（会导致崩溃）
 *
 * 本函数确保所有数据都是 celldata 格式
 */
function ensureCelldataFormat(data: any[]): any[] {
  if (!data || data.length === 0) {
    return []
  }

  const firstSheet = data[0]
  if (!firstSheet) {
    return []
  }

  // 已经是 celldata 格式
  if (firstSheet.celldata && Array.isArray(firstSheet.celldata)) {
    return data
  }

  // 需要从 data 格式转换为 celldata
  if (firstSheet.data && Array.isArray(firstSheet.data)) {
    const celldata: any[] = []

    for (let r = 0; r < firstSheet.data.length; r++) {
      const row = firstSheet.data[r]
      if (!row) continue

      for (let c = 0; c < row.length; c++) {
        const cell = row[c]
        if (cell === null || cell === undefined) continue

        if (typeof cell === 'object') {
          celldata.push({ r, c, v: cell })
        } else {
          celldata.push({ r, c, v: { v: cell, ct: { fa: "General", t: "g" } } })
        }
      }
    }

    return [{ ...firstSheet, celldata, data: undefined }]
  }

  return data
}

/**
 * DataSheet - 完全受控组件
 *
 * 设计原则：
 * 1. 组件本身无状态（no useState）
 * 2. 所有数据来自 props
 * 3. onChange 只通知父组件，不更新内部状态
 * 4. 数据转换由父组件负责
 */
export default function DataSheet({ data, onChange, readonly = false, height = 500 }: DataSheetProps) {
  // 🔑 关键：使用 useMemo 确保数据格式正确，但不创建状态
  const normalizedData = useMemo(() => ensureCelldataFormat(data), [data])

  // 🔑 关键：handleChange 只通知父组件，不做任何转换
  const handleChange = (changedData: any) => {
    // 直接传递原始数据，让父组件决定如何处理
    onChange?.(changedData)
  }

  return (
    <div className="border border-gray-200 rounded" style={{ height: typeof height === 'number' ? `${height}px` : height }}>
      <Workbook
        data={normalizedData}
        onChange={handleChange}
        allowEdit={!readonly}
        showToolbar={true}
        showFormulaBar={true}
        showSheetTabs={true}
      />
    </div>
  )
}

export function getDefaultData() {
  const headers = ["检测项目", "检测方法", "技术要求", "实测值", "单项判定", "备注"]
  const celldata: any[] = []

  headers.forEach((header, col) => {
    celldata.push({
      r: 0,
      c: col,
      v: { v: header, ct: { fa: "General", t: "g" }, bl: 1 }
    })
  })

  return [{
    name: "Sheet1",
    row: 30,
    column: 15,
    celldata,
    config: {
      columnlen: {
        0: 150, 1: 150, 2: 150, 3: 100, 4: 100, 5: 100,
      }
    }
  }]
}

// 工具函数：生成表格数据
export function generateSheetData(headers: string[], rows: any[][]) {
  const celldata: any[] = []
  headers.forEach((header, col) => {
    celldata.push({ r: 0, c: col, v: { v: header, ct: { fa: "General", t: "g" } } })
  })
  rows.forEach((row, rowIdx) => {
    row.forEach((cell, col) => {
      celldata.push({ r: rowIdx + 1, c: col, v: { v: cell ?? "", ct: { fa: "General", t: "g" } } })
    })
  })
  return [{ name: "Sheet1", celldata }]
}

// 工具函数：提取表格数据为二维数组
export function extractSheetData(sheetData: any) {
  if (!sheetData || sheetData.length === 0) return []
  const sheet = sheetData[0]
  const celldata = sheet.celldata || []
  let maxRow = 0, maxCol = 0
  celldata.forEach((cell: any) => {
    maxRow = Math.max(maxRow, cell.r)
    maxCol = Math.max(maxCol, cell.c)
  })
  const rows: any[][] = []
  for (let r = 0; r <= maxRow; r++) {
    const row: any[] = []
    for (let c = 0; c <= maxCol; c++) {
      const cell = celldata.find((item: any) => item.r === r && item.c === c)
      row.push(cell?.v?.v ?? "")
    }
    rows.push(row)
  }
  return rows
}

// 工具函数：转换 data 格式为 celldata
export function convertDataToCelldata(sheetData: any[]): any[] {
  return ensureCelldataFormat(sheetData)
}
