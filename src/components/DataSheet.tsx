'use client'

import { useState, useRef, useEffect } from "react"
import { Workbook, WorkbookInstance } from "@fortune-sheet/react"
import "@fortune-sheet/react/dist/index.css"

interface DataSheetProps {
  data?: any[]
  onChange?: (data: any) => void
  readonly?: boolean
  height?: number | string
}

export default function DataSheet({ data, onChange, readonly = false, height = 500 }: DataSheetProps) {
  const [sheetData, setSheetData] = useState<any[]>(() => data || getDefaultData())
  const workbookRef = useRef<WorkbookInstance>(null)

  function getDefaultData() {
    return [
      {
        name: "Sheet1",
        row: 30,  // 设置行数
        column: 15,  // 设置列数
        celldata: [
          { r: 0, c: 0, v: { v: "检测项目", ct: { fa: "General", t: "g" }, bl: 1 } },
          { r: 0, c: 1, v: { v: "检测方法", ct: { fa: "General", t: "g" }, bl: 1 } },
          { r: 0, c: 2, v: { v: "技术要求", ct: { fa: "General", t: "g" }, bl: 1 } },
          { r: 0, c: 3, v: { v: "实测值", ct: { fa: "General", t: "g" }, bl: 1 } },
          { r: 0, c: 4, v: { v: "单项判定", ct: { fa: "General", t: "g" }, bl: 1 } },
          { r: 0, c: 5, v: { v: "备注", ct: { fa: "General", t: "g" }, bl: 1 } },
        ],
        config: {
          columnlen: {
            0: 150,
            1: 150,
            2: 150,
            3: 100,
            4: 100,
            5: 100,
          }
        }
      },
    ]
  }

  useEffect(() => {
    if (data && data.length > 0) {
      setSheetData(data)
    }
  }, [data])

  const handleChange = (changedData: any) => {
    setSheetData(changedData)
    onChange?.(changedData)
  }

  return (
    <div className="border border-gray-200 rounded" style={{ height: typeof height === 'number' ? `${height}px` : height }}>
      <Workbook
        ref={workbookRef}
        data={sheetData}
        onChange={handleChange}
        allowEdit={!readonly}
        showToolbar={true}
        showFormulaBar={true}
        showSheetTabs={true}
      />
    </div>
  )
}

// 用于从 JSON 数据生成 sheet 数据的工具函数
export function generateSheetData(headers: string[], rows: any[][]) {
  const celldata: any[] = []

  // 生成表头
  headers.forEach((header, col) => {
    celldata.push({
      r: 0,
      c: col,
      v: { v: header, ct: { fa: "General", t: "g" } },
    })
  })

  // 生成数据行
  rows.forEach((row, rowIdx) => {
    row.forEach((cell, col) => {
      celldata.push({
        r: rowIdx + 1,
        c: col,
        v: { v: cell ?? "", ct: { fa: "General", t: "g" } },
      })
    })
  })

  return [{ name: "Sheet1", celldata }]
}

// 用于从 sheet 数据提取为 JSON 的工具函数
export function extractSheetData(sheetData: any) {
  if (!sheetData || sheetData.length === 0) return []

  const sheet = sheetData[0]
  const celldata = sheet.celldata || []

  // 找出最大行列
  let maxRow = 0
  let maxCol = 0
  celldata.forEach((cell: any) => {
    maxRow = Math.max(maxRow, cell.r)
    maxCol = Math.max(maxCol, cell.c)
  })

  // 构建二维数组
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
