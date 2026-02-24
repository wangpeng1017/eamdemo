/**
 * Fortune-sheet 数据解析工具
 * 支持 data（2D 数组）和 celldata（稀疏）两种格式，以及合并单元格
 */

export interface CellInfo {
    text: string
    rowSpan?: number
    colSpan?: number
    hidden?: boolean
}

export interface ParsedSheetData {
    headers: string[]
    rows: CellInfo[][]
}

/**
 * 从 Fortune-sheet 数据提取为行列数据（支持合并单元格）
 */
export function parseSheetData(sheetDataStr: any): ParsedSheetData {
    try {
        const sd = typeof sheetDataStr === 'string' ? JSON.parse(sheetDataStr) : sheetDataStr
        if (!Array.isArray(sd) || sd.length === 0) return { headers: [], rows: [] }

        const sheet = sd[0]
        const mergeConfig = sheet.config?.merge || {}

        const getCellText = (cell: any): string => {
            if (cell === null || cell === undefined) return ''
            if (typeof cell === 'object') return String(cell.m || cell.v || '')
            return String(cell)
        }

        // 构建合并映射
        const mergeMap: Record<string, { rowSpan: number; colSpan: number } | 'hidden'> = {}
        for (const key in mergeConfig) {
            const m = mergeConfig[key]
            mergeMap[`${m.r}_${m.c}`] = { rowSpan: m.rs, colSpan: m.cs }
            for (let dr = 0; dr < m.rs; dr++) {
                for (let dc = 0; dc < m.cs; dc++) {
                    if (dr === 0 && dc === 0) continue
                    mergeMap[`${m.r + dr}_${m.c + dc}`] = 'hidden'
                }
            }
        }

        // 收集哪些行属于合并区域
        const mergedRows = new Set<number>()
        for (const key in mergeConfig) {
            const m = mergeConfig[key]
            for (let dr = 0; dr < m.rs; dr++) {
                mergedRows.add(m.r + dr)
            }
        }

        // 提取原始单元格文本
        const allCells: Record<number, Record<number, string>> = {}
        let maxRow = 0, maxCol = 0

        if (sheet.data && Array.isArray(sheet.data) && sheet.data.length > 0) {
            maxRow = sheet.data.length - 1
            maxCol = (sheet.data[0]?.length || 1) - 1
            for (let r = 0; r <= maxRow; r++) {
                allCells[r] = {}
                if (!sheet.data[r]) continue
                for (let c = 0; c <= maxCol; c++) {
                    allCells[r][c] = getCellText(sheet.data[r][c])
                }
            }
        } else if (sheet.celldata && Array.isArray(sheet.celldata) && sheet.celldata.length > 0) {
            sheet.celldata.forEach((c: any) => {
                if (c.r > maxRow) maxRow = c.r
                if (c.c > maxCol) maxCol = c.c
                if (!allCells[c.r]) allCells[c.r] = {}
                allCells[c.r][c.c] = getCellText(c.v)
            })
        } else {
            return { headers: [], rows: [] }
        }

        const rowhidden = sheet.config?.rowhidden || {}

        // 第0行为表头
        const headers: string[] = []
        for (let c = 0; c <= maxCol; c++) {
            headers.push(allCells[0]?.[c] || '')
        }

        // 数据行
        const rows: CellInfo[][] = []
        for (let r = 1; r <= maxRow; r++) {
            if (rowhidden[r]) continue
            const row: CellInfo[] = []
            let hasData = false
            for (let c = 0; c <= maxCol; c++) {
                const key = `${r}_${c}`
                const merge = mergeMap[key]
                if (merge === 'hidden') {
                    row.push({ text: '', hidden: true })
                } else {
                    const text = allCells[r]?.[c] || ''
                    if (text.trim()) hasData = true
                    const cellInfo: CellInfo = { text }
                    if (merge && typeof merge === 'object') {
                        cellInfo.rowSpan = merge.rowSpan
                        cellInfo.colSpan = merge.colSpan
                    }
                    row.push(cellInfo)
                }
            }
            if (hasData || mergedRows.has(r)) rows.push(row)
        }
        // 裁掉尾部空列（表头为空且所有行该列无数据）
        let effectiveCols = headers.length
        while (effectiveCols > 0) {
            const ci = effectiveCols - 1
            if (headers[ci].trim()) break
            const hasColData = rows.some(row => row[ci] && !row[ci].hidden && row[ci].text.trim())
            if (hasColData) break
            effectiveCols--
        }
        if (effectiveCols < headers.length) {
            headers.length = effectiveCols
            for (const row of rows) {
                row.length = effectiveCols
            }
        }

        // 裁掉尾部空行（整行无可见文本）
        while (rows.length > 0) {
            const lastRow = rows[rows.length - 1]
            const hasText = lastRow.some(c => !c.hidden && c.text.trim())
            if (hasText) break
            rows.pop()
        }

        return { headers, rows }
    } catch (e) {
        console.error('[parseSheetData] 解析失败:', e)
        return { headers: [], rows: [] }
    }
}
