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
 * 数据规范化工具：处理 Fortune-sheet 的多种数据格式
 *
 * Fortune-sheet 数据格式说明：
 * - celldata: 稀疏数组格式 [{r, c, v}, ...]，适合初始化
 * - data: 2D 数组格式，运行时使用（onChange 返回此格式）
 *
 * 关键修复：
 * 1. onChange 返回的数据包含完整的内部状态（包括 inlineStr 等）
 * 2. 强制转换会丢失这些内部状态，导致渲染错误
 * 3. 因此：初始化时转换为 celldata，但 onChange 直接使用原始数据
 */
function ensureCelldataFormat(data: any[]): any[] {
  if (!data || data.length === 0) {
    return []
  }

  const firstSheet = data[0]
  if (!firstSheet) {
    return []
  }

  // 已经是 celldata 格式（初始化场景）
  if (firstSheet.celldata && Array.isArray(firstSheet.celldata)) {
    return data
  }

  // 从 data 格式转换为 celldata（仅用于初始化）
  if (firstSheet.data && Array.isArray(firstSheet.data)) {
    const celldata: any[] = []

    for (let r = 0; r < firstSheet.data.length; r++) {
      const row = firstSheet.data[r]
      if (!row) continue

      for (let c = 0; c < row.length; c++) {
        const cell = row[c]
        if (cell === null || cell === undefined) continue

        // 保留完整的单元格对象结构（包括 ct.s 等内部格式）
        if (typeof cell === 'object' && cell !== null) {
          celldata.push({ r, c, v: cell })
        } else {
          // 基本值创建最小结构
          celldata.push({
            r, c,
            v: { v: cell, ct: { fa: "General", t: "g" } }
          })
        }
      }
    }

    return [{
      ...firstSheet,
      celldata,
      // 保留原始 data 引用，避免丢失信息
      data: firstSheet.data
    }]
  }

  return data
}

/**
 * DataSheet - 完全受控组件（修复 indexOf 错误版本）
 *
 * 设计原则：
 * 1. 组件本身无状态（no useState）
 * 2. 所有数据来自 props
 * 3. onChange 直接传递 Fortune-sheet 返回的原始数据
 * 4. 只在初始化时进行格式转换，编辑循环中保持原始格式
 *
 * 关键修复：
 * - Fortune-sheet 的 onChange 返回包含完整内部状态的数据
 * - 强制转换为 celldata 会丢失 inlineStr 等格式，导致渲染错误
 * - 解决方案：初始化用 celldata，编辑后直接使用 onChange 返回的 data 格式
 */
export default function DataSheet({ data, onChange, readonly = false, height = 500 }: DataSheetProps) {
  // 🔑 关键：只在初始化或数据格式变化时转换
  // 编辑循环中 onChange 返回的数据已经是正确格式，无需转换
  const normalizedData = useMemo(() => {
    // 如果数据已有 data 属性（2D 数组），说明是 onChange 返回的，直接使用
    if (data && data.length > 0 && data[0]?.data && Array.isArray(data[0].data)) {
      return data
    }
    // 否则是初始化数据，转换为 celldata 格式
    return ensureCelldataFormat(data)
  }, [data])

  // 🔑 关键：handleChange 直接传递原始数据，不做任何转换
  const handleChange = (changedData: any) => {
    // Fortune-sheet onChange 返回的数据已经是可用格式
    // 父组件直接保存，下次渲染时会被上面的 useMemo 识别为 "已有 data 属性" 而直接使用
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

// 模板列定义类型（从 template-converter 简化引入）
interface TemplateColumn {
  title: string
  dataIndex: string
  width?: number
}

interface TemplateSchemaForInit {
  columns: TemplateColumn[]
  defaultData?: Record<string, string>[]  // 预填数据行（按 dataIndex 映射）
  defaultRows?: number
}

/**
 * 生成表格初始数据
 * @param templateSchema 可选的模板列结构。提供时按模板列定义生成列头（列头锁定不可编辑）
 */
export function getDefaultData(templateSchema?: TemplateSchemaForInit) {
  // 有模板时：按模板列定义生成（混合模式 —— 列头锁定，数据行可编辑）
  if (templateSchema?.columns?.length) {
    const cols = templateSchema.columns
    const celldata: any[] = []

    // 第0行：列头（锁定不可编辑）
    cols.forEach((col, idx) => {
      celldata.push({
        r: 0,
        c: idx,
        v: {
          v: col.title,
          ct: { fa: "General", t: "g" },
          bl: 1,                   // 加粗
          bg: "#E7E6E6",           // 灰色背景标记列头
          fc: "#000000",           // 黑色字体
          lo: 0,                   // 🔒 锁定：列头不可编辑
        }
      })
    })

    // 预填数据行（从 defaultData 生成）
    if (templateSchema.defaultData?.length) {
      // 构建 dataIndex → 列索引映射
      const idxMap: Record<string, number> = {}
      cols.forEach((col, i) => { idxMap[col.dataIndex] = i })

      templateSchema.defaultData.forEach((rowData, rowIdx) => {
        Object.entries(rowData).forEach(([key, value]) => {
          const colIdx = idxMap[key]
          if (colIdx !== undefined && value) {
            celldata.push({
              r: rowIdx + 1,  // 从第1行开始（第0行是列头）
              c: colIdx,
              v: {
                v: value,
                ct: { fa: "General", t: "g" },
              }
            })
          }
        })
      })
    }

    // 构建列语义映射（列号 → dataIndex），用于报告生成时按语义提取数据
    const columnSemantics: Record<number, string> = {}
    cols.forEach((col, idx) => {
      columnSemantics[idx] = col.dataIndex
    })

    const totalRows = Math.max(
      templateSchema.defaultRows || 30,
      (templateSchema.defaultData?.length || 0) + 5
    )

    return [{
      name: "Sheet1",
      row: totalRows,
      column: Math.max(cols.length, 15),
      celldata,
      config: {
        columnlen: Object.fromEntries(cols.map((col, i) => [i, col.width || 120])),
        columnSemantics,  // 自定义字段：列语义映射，报告生成时读取
      }
    }]
  }

  // 无模板时：保持原有默认列（向后兼容）
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
