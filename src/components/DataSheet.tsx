
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

/**
 * 规范化数据：确保 celldata 字段总是存在且有效
 *
 * 支持3种输入格式：
 * 1. celldata 格式（初始化格式）- 直接返回
 * 2. data 格式（Fortune-sheet onChange 返回格式）- 转换为 celldata
 * 3. 无效数据 - 返回默认数据
 */
function normalizeSheetData(data: any[]): any[] {
  console.log("[normalizeSheetData] Called")

  if (!data || data.length === 0) {
    console.warn("[normalizeSheetData] Empty data, returning default")
    return getDefaultData()
  }

  const firstSheet = data[0]
  if (!firstSheet) {
    console.warn("[normalizeSheetData] No first sheet, returning default")
    return getDefaultData()
  }

  // 情况1：已经有 celldata - 直接返回
  if (firstSheet.celldata && Array.isArray(firstSheet.celldata) && firstSheet.celldata.length > 0) {
    console.log("[normalizeSheetData] Already has celldata, returning as-is")
    return data
  }

  // 情况2：有 data 字段 - 转换为 celldata
  if (firstSheet.data && Array.isArray(firstSheet.data)) {
    console.log("[normalizeSheetData] Converting data -> celldata")
    const celldata: any[] = []

    for (let r = 0; r < firstSheet.data.length; r++) {
      const row = firstSheet.data[r]
      if (!row) continue

      for (let c = 0; c < row.length; c++) {
        const cell = row[c]
        if (cell === null || cell === undefined) continue

        // data 格式中的 cell 可能是对象或简单值
        if (typeof cell === 'object') {
          celldata.push({ r, c, v: cell })
        } else {
          celldata.push({ r, c, v: { v: cell, ct: { fa: "General", t: "g" } } })
        }
      }
    }

    console.log("[normalizeSheetData] Converted", celldata.length, "cells")
    return [{ ...firstSheet, celldata, data: undefined }]
  }

  console.warn("[normalizeSheetData] No valid data, returning default")
  return getDefaultData()
}

export default function DataSheet({ data, onChange, readonly = false, height = 500 }: DataSheetProps) {
  const workbookRef = useRef<WorkbookInstance>(null)

  // ⚠️⚠️⚠️ 核心变化：使用内部 state 而不是直接使用 props
  const [internalSheetData, setInternalSheetData] = useState<any[]>(() => {
    console.log("[DataSheet Init] Initializing with data prop")
    return normalizeSheetData(data)
  })

  // 编辑锁：标记用户正在编辑
  const isEditingRef = useRef(false)
  // 卸载锁
  const isUnmountingRef = useRef(false)

  // ⚠️⚠️⚠️ 关键逻辑：外部 data 变化时，只在非编辑状态下同步
  useEffect(() => {
    // 如果正在编辑，忽略外部变化（避免崩溃）
    if (isEditingRef.current) {
      console.log("[DataSheet] External data changed, but SKIPPING because user is editing")
      return
    }

    console.log("[DataSheet] External data changed, synchronizing internal state")
    const normalized = normalizeSheetData(data)
    setInternalSheetData(normalized)
  }, [data])

  // ⚠️⚠️⚠️ 关键逻辑：onChange 时只更新内部状态，不触发外部更新
  const handleChange = useCallback((changedData: any) => {
    if (!changedData || !Array.isArray(changedData) || changedData.length === 0) {
      console.warn("[DataSheet onChange] Invalid data, ignoring")
      return
    }

    const firstSheet = changedData[0]
    if (!firstSheet) return

    console.log("[DataSheet onChange] Called")
    console.log("[DataSheet onChange] Data format:", firstSheet.data ? 'data (2D array)' : 'celldata')

    // 1. 标记正在编辑
    isEditingRef.current = true

    // 2. 更新内部状态（触发重新渲染）
    setInternalSheetData(changedData)

    // 3. 向上通知（但父组件不应该更新 data prop）
    onChange?.(changedData)

    // 4. 100ms 后释放编辑锁
    setTimeout(() => {
      isEditingRef.current = false
      console.log("[DataSheet onChange] Edit lock released")
    }, 100)
  }, [onChange])

  console.log("[DataSheet Render] internal state:", internalSheetData[0]?.celldata?.length || internalSheetData[0]?.data?.length, "cells")

  return (
    <div className="border border-gray-200 rounded" style={{ height: typeof height === 'number' ? `${height}px` : height }}>
      <Workbook
        ref={workbookRef}
        data={internalSheetData}  // ← 使用内部 state
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

// 工具函数保持不变
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

export function convertDataToCelldata(sheetData: any[]): any[] {
  return normalizeSheetData(sheetData)
}
