'use client'

import { useState, useRef, useEffect, useCallback } from "react"
import { Workbook, WorkbookInstance } from "@fortune-sheet/react"
import "@fortune-sheet/react/dist/index.css"

interface DataSheetProps {
  data?: any[]
  onChange?: (data: any) => void
  readonly?: boolean
  height?: number | string
}

export default function DataSheet({ data, onChange, readonly = false, height = 500 }: DataSheetProps) {
  const workbookRef = useRef<WorkbookInstance>(null)

  // 用于强制重新渲染的 key
  const [sheetKey, setSheetKey] = useState(() => Date.now())

  // 内部数据状态
  const [sheetData, setSheetData] = useState<any[]>(() => {
    console.log("[DataSheet Init] data prop:", data?.length, "items")
    if (data && data.length > 0) {
      console.log("[DataSheet Init] Using provided data, celldata length:", data[0]?.celldata?.length)
      return data
    }
    console.log("[DataSheet Init] Using default data")
    return getDefaultData()
  })

  // 标记是否是内部编辑导致的变化
  const isInternalEditRef = useRef(false)

  // 当外部 data 变化时更新
  useEffect(() => {
    const incomingCelldataLength = data?.[0]?.celldata?.length;
    console.log("[DataSheet useEffect] data prop changed. isInternalEdit:", isInternalEditRef.current, "new celldata length:", incomingCelldataLength);

    // 如果是内部编辑导致的变化，跳过
    if (isInternalEditRef.current) {
      console.log("[DataSheet useEffect] Skipping - internal edit");
      isInternalEditRef.current = false;
      return;
    }

    // 只有当有新的有效数据时才更新
    if (data && data.length > 0 && incomingCelldataLength !== undefined) {
      // 深度比较：如果 celldata 长度和内容核心没变（比如只是 title 变了），尽量不重置 Key
      // 这里简单通过长度判断，作为第一道防线
      console.log("[DataSheet useEffect] Updating sheetData");
      setSheetData(data);

      // 强制更新 key 会导致 Fortune-sheet 彻底重新挂载（DOM 销毁）
      // 如果不是因为数据结构变化（由外部同步进来），尽量减少此操作
      // 目前逻辑保留，但在 TemplateEditor 中将通过防抖减少触发频率
      setSheetKey(prev => prev + 1);
    }
  }, [data])

  const handleChange = useCallback((changedData: any) => {
    // 强制防御：进入时立即检查基本结构
    if (!changedData || !Array.isArray(changedData) || changedData.length === 0) {
      console.warn("[DataSheet onChange] Ignored empty or invalid changedData");
      return;
    }

    const firstSheet = changedData[0];
    const celldata = firstSheet?.celldata;

    console.log("[DataSheet onChange] Called, celldata length:", celldata?.length);

    // 关键拦截：如果 celldata 缺失或不是数组，阻断后续流程，防止下游 convertSheetDataToSchema 报错
    if (!celldata || !Array.isArray(celldata)) {
      console.warn("[DataSheet onChange] Ignored invalid data change (missing/invalid celldata)");
      return;
    }

    // 标记为内部编辑
    isInternalEditRef.current = true;
    setSheetData(changedData);
    onChange?.(changedData);
  }, [onChange])

  console.log("[DataSheet Render] sheetKey:", sheetKey, "sheetData length:", sheetData?.length, "celldata:", sheetData?.[0]?.celldata?.length)

  return (
    <div className="border border-gray-200 rounded" style={{ height: typeof height === 'number' ? `${height}px` : height }}>
      <Workbook
        key={sheetKey}
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

export function getDefaultData() {
  // 使用 celldata 格式（稀疏数组）
  // Fortune-sheet 在初始化时需要 celldata 格式才能正确渲染
  const headers = ["检测项目", "检测方法", "技术要求", "实测值", "单项判定", "备注"]

  // 创建 celldata 格式的表头
  const celldata: any[] = []
  headers.forEach((header, col) => {
    celldata.push({
      r: 0,
      c: col,
      v: { v: header, ct: { fa: "General", t: "g" }, bl: 1 }
    })
  })

  return [
    {
      name: "Sheet1",
      row: 30,
      column: 15,
      celldata: celldata,
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

// 将 data 格式（二维数组）转换为 celldata 格式（稀疏数组）
// Fortune-sheet 在初始化时需要 celldata 格式才能正确渲染
export function convertDataToCelldata(sheetData: any[]): any[] {
  if (!sheetData || sheetData.length === 0) return sheetData

  const sheet = sheetData[0]

  // 如果已经有 celldata，直接返回
  if (sheet.celldata && sheet.celldata.length > 0) {
    console.log("[convertDataToCelldata] Already has celldata, returning as-is")
    return sheetData
  }

  // 如果没有 data，返回原数据
  if (!sheet.data || sheet.data.length === 0) {
    console.log("[convertDataToCelldata] No data to convert")
    return sheetData
  }

  console.log("[convertDataToCelldata] Converting data format to celldata format")

  // 将 data 格式转换为 celldata 格式
  const celldata: any[] = []
  const data = sheet.data

  for (let r = 0; r < data.length; r++) {
    const row = data[r]
    if (!row) continue

    for (let c = 0; c < row.length; c++) {
      const cell = row[c]
      // 只添加非空单元格
      if (cell !== null && cell !== undefined) {
        celldata.push({
          r,
          c,
          v: cell
        })
      }
    }
  }

  console.log("[convertDataToCelldata] Converted", celldata.length, "cells")

  // 返回新的 sheet 数据，使用 celldata 格式
  return [{
    ...sheet,
    celldata,
    data: undefined  // 移除 data，使用 celldata
  }]
}
