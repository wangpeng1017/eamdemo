
/**
 * 模版 Schema 转换工具
 * 用于在 TemplateSchema 和 Fortune-sheet 数据格式之间转换
 */

// ==================== 类型定义 ====================

export interface ColumnConfig {
  title: string
  dataIndex: string
  width: number
  dataType: 'string' | 'number' | 'date' | 'select'
  required?: boolean
  options?: string[]
  validation?: {
    min?: number
    max?: number
    pattern?: string
  }
}

export interface StatisticsConfig {
  type: 'avg' | 'std' | 'cv' | 'custom'
  column: string
  label: string
}

export interface TemplateSchema {
  title: string
  header: {
    methodBasis?: string
    sampleType?: string
  }
  columns: ColumnConfig[]
  statistics: StatisticsConfig[]
  environment: boolean
  equipment: boolean
  personnel: boolean
  defaultRows: number
}

export interface SheetData {
  name: string
  row: number
  column: number
  celldata: any[]
  config: {
    columnlen?: Record<number, number>
    rowlen?: Record<number, number>
  }
}

// ==================== 转换函数 ====================

/**
 * 将 TemplateSchema 转换为 Fortune-sheet 预览数据
 */
export function convertSchemaToPreviewData(schema: TemplateSchema): SheetData[] {
  console.log("[convertSchemaToPreviewData] processing schema:", {
    title: schema?.title,
    titleType: typeof schema?.title,
    columnsCount: schema?.columns?.length
  });
  const columns = schema.columns || []
  const defaultRows = schema.defaultRows || 5

  const celldata: any[] = []
  let currentRow = 0

  // 标题行
  if (schema.title) {
    celldata.push({
      r: currentRow,
      c: 0,
      v: {
        v: schema.title,
        ct: { fa: "General", t: "g" },
        bl: 1,
        fs: 14
      }
    })
    currentRow++
  }

  // 检测依据行
  if (schema.header?.methodBasis) {
    celldata.push({
      r: currentRow,
      c: 0,
      v: { v: `检测依据：${schema.header.methodBasis}` }
    })
    currentRow++
  }

  // 样品类型行（如果有）
  if (schema.header?.sampleType) {
    celldata.push({
      r: currentRow,
      c: 0,
      v: { v: `样品类型：${schema.header.sampleType}` }
    })
    currentRow++
  }

  // 环境条件行
  let headerRow = currentRow
  if (schema.environment) {
    celldata.push({
      r: currentRow,
      c: 0,
      v: { v: "环境条件：温度      ℃    湿度      %RH" }
    })
    currentRow++
    headerRow = currentRow
  }

  // 设备信息行
  if (schema.equipment) {
    celldata.push({
      r: currentRow,
      c: 0,
      v: { v: "检测设备：" }
    })
    currentRow++
    headerRow = currentRow
  }

  // 人员信息行
  if (schema.personnel) {
    celldata.push({
      r: currentRow,
      c: 0,
      v: { v: "检测人员：" }
    })
    currentRow++
    headerRow = currentRow
  }

  // 列标题行
  columns.forEach((col, idx) => {
    celldata.push({
      r: headerRow,
      c: idx,
      v: {
        v: col.title,
        ct: { fa: "General", t: "g" },
        bl: 1,
        bg: { rgb: "E7E6E6" }
      },
      meta: {
        columnIndex: idx
      }
    })
  })
  currentRow++

  // 数据行
  for (let r = 0; r < defaultRows; r++) {
    columns.forEach((_col, c) => {
      celldata.push({
        r: currentRow + r,
        c: c,
        v: { v: "", ct: { fa: "General", t: "g" } }
      })
    })
  }
  currentRow += defaultRows

  // 统计行
  if (schema.statistics && schema.statistics.length > 0) {
    currentRow++ // 空行
    celldata.push({
      r: currentRow,
      c: 0,
      v: { v: "统计", bl: 1 }
    })

    schema.statistics.forEach((stat) => {
      const colIndex = columns.findIndex(c => c.dataIndex === stat.column)
      celldata.push({
        r: currentRow + 1,
        c: 0,
        v: { v: stat.label }
      })
      if (colIndex >= 0) {
        celldata.push({
          r: currentRow + 1,
          c: colIndex,
          v: {
            v: getFormulaDisplay(stat.type, colIndex, headerRow + 2, headerRow + 1 + defaultRows),
            ct: { fa: "General", t: "f" },
            f: getFormula(stat.type, colIndex, headerRow + 2, headerRow + 1 + defaultRows)
          }
        })
      }
      currentRow++
    })
  }

  return [{
    name: "Sheet1",
    row: Math.max(currentRow + 5, 30),
    column: Math.max(columns.length, 10),
    celldata,
    config: {
      columnlen: columns.reduce((acc, col, idx) => {
        acc[idx] = col.width || 120
        return acc
      }, {} as Record<number, number>),
      rowlen: {}
    }
  }]
}

/**
 * 将 Fortune-sheet 数据转换回 TemplateSchema
 */
export function convertSheetDataToSchema(sheetData: SheetData[]): TemplateSchema {
  const sheet = sheetData[0]
  const celldata = sheet.celldata || []

  const schema: TemplateSchema = {
    title: '',
    header: {},
    columns: [],
    statistics: [],
    environment: false,
    equipment: false,
    personnel: false,
    defaultRows: 5
  }

  // 解析标题行
  const titleCell = celldata.find(c => c.r === 0 && c.c === 0)
  const titleVal = String(titleCell?.v?.v || '')
  if (titleVal && !titleVal.includes('：')) {
    schema.title = titleVal
  }

  // 解析检测依据行
  const methodCell = celldata.find(c => String(c.v?.v || '').includes('检测依据：'))
  if (methodCell) {
    schema.header.methodBasis = String(methodCell.v.v).replace('检测依据：', '')
  }

  // 解析样品类型行
  const sampleTypeCell = celldata.find(c => String(c.v?.v || '').includes('样品类型：'))
  if (sampleTypeCell) {
    schema.header.sampleType = String(sampleTypeCell.v.v).replace('样品类型：', '')
  }

  // 查找列标题行
  let headerRowIndex = 1
  const envCell = celldata.find(c => String(c.v?.v || '').includes('环境条件'))
  if (envCell) {
    schema.environment = true
    headerRowIndex = Math.max(headerRowIndex, envCell.r + 1)
  }

  const equipCell = celldata.find(c => String(c.v?.v || '').includes('检测设备'))
  if (equipCell) {
    schema.equipment = true
    headerRowIndex = Math.max(headerRowIndex, equipCell.r + 1)
  }

  const personCell = celldata.find(c => String(c.v?.v || '').includes('检测人员'))
  if (personCell) {
    schema.personnel = true
    headerRowIndex = Math.max(headerRowIndex, personCell.r + 1)
  }

  // 解析列定义
  const headerCells = celldata.filter(c => c.r === headerRowIndex && c.v?.bg?.rgb === "E7E6E6")
  schema.columns = headerCells.map((cell, idx) => ({
    title: cell.v.v,
    dataIndex: cell.v.meta?.columnIndex || `column${idx}`,
    width: sheet.config.columnlen?.[idx] || 120,
    dataType: 'string' as const
  }))

  // 统计数据行数
  const dataCells = celldata.filter(c => c.r > headerRowIndex && !c.v?.bl)
  const rowIndices = new Set(dataCells.map(c => c.r))
  schema.defaultRows = rowIndices.size

  return schema
}

// ==================== 工具函数 ====================

/**
 * 获取列字母 (0 -> A, 1 -> B, ...)
 */
function getColumnLetter(index: number): string {
  let letter = ''
  while (index >= 0) {
    letter = String.fromCharCode((index % 26) + 65) + letter
    index = Math.floor(index / 26) - 1
  }
  return letter
}

/**
 * 获取统计公式
 */
function getFormula(type: string, colIndex: number, startRow: number, endRow: number): string {
  const col = getColumnLetter(colIndex)
  const range = `${col}${startRow}:${col}${endRow}`

  switch (type) {
    case 'avg':
      return `=AVERAGE(${range})`
    case 'std':
      return `=STDEV.S(${range})`
    case 'cv':
      return `=STDEV.S(${range})/AVERAGE(${range})*100`
    default:
      return ''
  }
}

/**
 * 获取公式显示文本
 */
function getFormulaDisplay(type: string, colIndex: number, startRow: number, endRow: number): string {
  const col = getColumnLetter(colIndex)
  const range = `${col}${startRow}:${col}${endRow}`

  switch (type) {
    case 'avg':
      return `=AVERAGE(${range})`
    case 'std':
      return `=STDEV.S(${range})`
    case 'cv':
      return `=STDEV.S(${range})/AVERAGE(${range})*100`
    default:
      return ''
  }
}

/**
 * 获取默认 Schema
 */
export function getDefaultSchema(): TemplateSchema {
  return {
    title: '新建检测项目',
    header: {},
    columns: [
      { title: '样品序号', dataIndex: 'sampleNo', width: 120, dataType: 'string' },
      { title: '检测项目', dataIndex: 'testItem', width: 150, dataType: 'string' },
      { title: '实测值', dataIndex: 'testValue', width: 120, dataType: 'number' },
    ],
    statistics: [],
    environment: true,
    equipment: false,
    personnel: false,
    defaultRows: 5
  }
}
