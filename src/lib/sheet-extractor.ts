/**
 * 统一的 SheetData 数据提取模块
 * 从 Fortune-sheet 数据中按语义标识提取结构化检测数据
 * 
 * 三级降级策略：
 * 1. columnSemantics（模板初始化时写入的 dataIndex 映射）
 * 2. 列头文本匹配（根据中文列名推断语义）
 * 3. 位置假设（兼容旧数据的回退方案）
 */

// ==================== 类型定义 ====================

export interface ExtractedRow {
    [key: string]: string
}

export interface ExtractionResult {
    /** 列语义映射：dataIndex → 列号 */
    columnMap: Record<string, number>
    /** 提取的数据行（每行按 dataIndex 键值对） */
    rows: ExtractedRow[]
    /** 列头文字数组 */
    headerRow: string[]
    /** 使用的提取策略 */
    strategy: 'semantics' | 'header-text' | 'position-fallback'
}

// ==================== 列头文本映射表 ====================

/** 列头显示文本 → 语义标识 dataIndex */
const HEADER_TEXT_MAP: Record<string, string> = {
    // 通用字段
    '序号': 'seq',
    '样品编号': 'sampleNo',
    '检测项目': 'testItem',
    '检测方法': 'testMethod',
    '技术要求': 'standardReq',
    '标准要求': 'standardReq',
    '限值要求': 'standardReq',
    '实测值': 'value',
    '单项判定': 'result',
    '结论': 'conclusion',
    '备注': 'remark',

    // QCT 专用字段
    'XRF测试1': 'test1',
    'XRF筛选结果': 'test1',
    '测试1': 'test1',
    'XRF测试2': 'test2',
    '测试2': 'test2',
    '平均值': 'avgResult',
    '化学验证结果': 'chemResult',
}

/** 位置回退方案的默认映射（兼容旧数据） */
const DEFAULT_POSITION_MAP: Record<number, string> = {
    0: 'testItem',    // 第一列：检测项目
    1: 'standardReq', // 第二列：技术要求
    2: 'value',       // 第三列：实测值
    3: 'result',      // 第四列：单项判定
    4: 'remark',      // 第五列：备注
}

// ==================== 核心提取函数 ====================

/**
 * 从 Fortune-sheet sheetData 中提取结构化数据
 * 自动选择最优提取策略（三级降级）
 */
export function extractStructuredData(sheetData: string | null): ExtractionResult {
    const emptyResult: ExtractionResult = {
        columnMap: {},
        rows: [],
        headerRow: [],
        strategy: 'position-fallback',
    }

    if (!sheetData) return emptyResult

    try {
        const parsed = typeof sheetData === 'string' ? JSON.parse(sheetData) : sheetData
        if (!Array.isArray(parsed) || parsed.length === 0) return emptyResult

        const sheet = parsed[0]

        // 尝试策略1：从 config.columnSemantics 读取语义映射
        const semantics = sheet?.config?.columnSemantics
        if (semantics && typeof semantics === 'object' && Object.keys(semantics).length > 0) {
            return extractWithSemantics(sheet, semantics)
        }

        // 尝试策略2：从列头文本匹配
        const headerResult = extractWithHeaderText(sheet)
        if (headerResult) return headerResult

        // 策略3：位置回退
        return extractWithPositionFallback(sheet)

    } catch (error) {
        console.error('[sheet-extractor] 解析 sheetData 失败:', error)
        return emptyResult
    }
}

// ==================== 策略1：语义映射提取 ====================

function extractWithSemantics(
    sheet: any,
    semantics: Record<string | number, string>
): ExtractionResult {
    // 构建 dataIndex → 列号 映射
    const columnMap: Record<string, number> = {}
    for (const [colStr, dataIndex] of Object.entries(semantics)) {
        columnMap[dataIndex] = Number(colStr)
    }

    const { rows: rawRows, headerRow } = getRawRows(sheet)

    const rows: ExtractedRow[] = []
    // 跳过列头行（第0行），从第1行开始
    for (let i = 1; i < rawRows.length; i++) {
        const raw = rawRows[i]
        if (!raw || raw.length === 0) continue

        const row: ExtractedRow = {}
        let hasData = false
        for (const [dataIndex, colIdx] of Object.entries(columnMap)) {
            const val = getCellText(raw[colIdx], rawRows)
            if (val) hasData = true
            row[dataIndex] = val
        }
        if (hasData) rows.push(row)
    }

    return { columnMap, rows, headerRow, strategy: 'semantics' }
}

// ==================== 策略2：列头文本匹配 ====================

function extractWithHeaderText(sheet: any): ExtractionResult | null {
    const { rows: rawRows, headerRow } = getRawRows(sheet)
    if (headerRow.length === 0) return null

    // 尝试匹配列头文本
    const columnMap: Record<string, number> = {}
    let matchCount = 0
    headerRow.forEach((text, idx) => {
        const trimmed = text.trim()
        const dataIndex = HEADER_TEXT_MAP[trimmed]
        if (dataIndex) {
            columnMap[dataIndex] = idx
            matchCount++
        }
    })

    // 至少匹配到2个列头才认为有效
    if (matchCount < 2) return null

    const rows: ExtractedRow[] = []
    for (let i = 1; i < rawRows.length; i++) {
        const raw = rawRows[i]
        if (!raw || raw.length === 0) continue

        const row: ExtractedRow = {}
        let hasData = false
        for (const [dataIndex, colIdx] of Object.entries(columnMap)) {
            const val = getCellText(raw[colIdx], rawRows)
            if (val) hasData = true
            row[dataIndex] = val
        }
        if (hasData) rows.push(row)
    }

    return { columnMap, rows, headerRow, strategy: 'header-text' }
}

// ==================== 策略3：位置回退 ====================

function extractWithPositionFallback(sheet: any): ExtractionResult {
    const columnMap = { ...DEFAULT_POSITION_MAP }
    const columnMapByName: Record<string, number> = {}
    for (const [colStr, dataIndex] of Object.entries(columnMap)) {
        columnMapByName[dataIndex] = Number(colStr)
    }

    const { rows: rawRows, headerRow } = getRawRows(sheet)

    const rows: ExtractedRow[] = []
    for (let i = 1; i < rawRows.length; i++) {
        const raw = rawRows[i]
        if (!raw || raw.length === 0) continue

        const row: ExtractedRow = {}
        let hasData = false
        for (const [colStr, dataIndex] of Object.entries(columnMap)) {
            const val = getCellText(raw[Number(colStr)], rawRows)
            if (val) hasData = true
            row[dataIndex] = val
        }
        if (hasData) rows.push(row)
    }

    return { columnMap: columnMapByName, rows, headerRow, strategy: 'position-fallback' }
}

// ==================== 辅助函数 ====================

/** 从 sheet 中获取所有行的原始数据（统一 data/celldata 两种格式） */
function getRawRows(sheet: any): { rows: any[][]; headerRow: string[] } {
    // data 格式（2D 数组）
    if (sheet.data && Array.isArray(sheet.data) && sheet.data.length > 0) {
        const headerRow = (sheet.data[0] || []).map((cell: any) => getCellText(cell))
        return { rows: sheet.data, headerRow }
    }

    // celldata 格式（稀疏数组 [{r, c, v}, ...]）
    if (sheet.celldata && Array.isArray(sheet.celldata) && sheet.celldata.length > 0) {
        const celldata = sheet.celldata
        let maxRow = 0
        let maxCol = 0
        celldata.forEach((cell: any) => {
            if (cell.r > maxRow) maxRow = cell.r
            if (cell.c > maxCol) maxCol = cell.c
        })

        // 构建 2D 数组
        const rows: any[][] = []
        for (let r = 0; r <= maxRow; r++) {
            const row: any[] = new Array(maxCol + 1).fill(null)
            rows.push(row)
        }
        celldata.forEach((cell: any) => {
            rows[cell.r][cell.c] = cell.v
        })

        const headerRow = rows[0]?.map((cell: any) => getCellText(cell)) || []
        return { rows, headerRow }
    }

    return { rows: [], headerRow: [] }
}

/** 从单元格值中提取纯文本（支持合并单元格引用） */
function getCellText(cell: any, allRows?: any[][]): string {
    if (cell === null || cell === undefined) return ''
    if (typeof cell === 'string') return cell
    if (typeof cell === 'number') return String(cell)
    // Fortune-sheet 单元格对象格式
    if (typeof cell === 'object') {
        // 合并单元格指针 {mc: {r: 行, c: 列}} — 引用主单元格的值
        if (cell.mc && allRows) {
            const mainCell = allRows[cell.mc.r]?.[cell.mc.c]
            if (mainCell && mainCell !== cell) {
                return getCellText(mainCell) // 不再传 allRows 防止循环
            }
            return ''
        }
        // {v: "文本"} 或 {v: {v: "文本"}}
        if (cell.v !== undefined) {
            if (typeof cell.v === 'object' && cell.v !== null) {
                return String(cell.v.v ?? '')
            }
            return String(cell.v)
        }
        // celldata 格式的 v 字段
        if (cell.ct?.s) {
            // 富文本格式
            return cell.ct.s.map((s: any) => s.v || '').join('')
        }
        // Fortune-sheet 空值格式对象 {m: "", bl: 0, ...} — 用 m(显示文本) 的值
        if ('m' in cell) {
            return cell.m || ''
        }
        // 其他无法识别的对象，返回空字符串（避免 [object Object]）
        return ''
    }
    return String(cell)
}

// ==================== 便捷提取函数 ====================

/**
 * 提取为 TestReport 格式的数据（兼容旧格式）
 * 用于 /api/report/generate
 */
export function extractForTestReport(sheetData: string | null): Array<{
    id: string
    parameter: string
    standard: string | null
    value: string | null
    result: string | null
    remark: string | null
}> {
    const { rows } = extractStructuredData(sheetData)
    return rows.map((row, i) => ({
        id: `test-${i + 1}`,
        parameter: row.testItem || row.testMethod || '',
        standard: row.standardReq || null,
        value: row.value || row.avgResult || null,
        result: row.result || row.conclusion || null,
        remark: row.remark || null,
    }))
}

/**
 * 提取为原始记录格式（含 test1/test2/avgResult）
 * 用于 docx-renderer 的 extractOriginalRecordResults
 */
export function extractForOriginalRecord(sheetData: string | null, sampleNo?: string): Array<{
    seq: string
    sampleNo: string
    testItem: string
    test1: string
    test2: string
    avgResult: string
    remark: string
}> {
    const { rows } = extractStructuredData(sheetData)
    return rows.map((row, i) => ({
        seq: row.seq || String(i + 1),
        sampleNo: row.sampleNo || sampleNo || '',
        testItem: row.testItem || '',
        test1: row.test1 || row.value || '',
        test2: row.test2 || '',
        avgResult: row.avgResult || row.value || '',
        remark: row.remark || '',
    }))
}

/**
 * 提取为客户报告格式（含 xrfResult/chemResult/standardReq/conclusion）
 * 用于 docx-renderer 的 extractTestResults
 */
export function extractForClientReport(
    sheetData: string | null,
    sampleNo?: string,
    sampleName?: string
): Array<{
    seq: string
    sampleNo: string
    sampleName: string
    testItem: string
    xrfResult: string
    chemResult: string
    standardReq: string
    conclusion: string
}> {
    const { rows } = extractStructuredData(sheetData)
    return rows.map((row, i) => ({
        seq: row.seq || String(i + 1),
        sampleNo: row.sampleNo || sampleNo || '',
        sampleName: sampleName || '',
        testItem: row.testItem || '',
        xrfResult: row.xrfResult || row.avgResult || row.test1 || row.value || '',
        chemResult: row.chemResult || '——',
        standardReq: row.standardReq || '',
        conclusion: row.conclusion || row.result || '',
    }))
}
