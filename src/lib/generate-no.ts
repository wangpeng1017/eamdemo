import { prisma } from './prisma'

/**
 * 编号前缀配置
 */
export const NumberPrefixes = {
  CONSULTATION: 'ZX',    // 咨询单
  QUOTATION: 'BJ',       // 报价单
  CONTRACT: 'HT',        // 合同
  ENTRUSTMENT: 'WT',     // 委托单
  SAMPLE: 'S',           // 样品
  TASK: 'T',             // 任务
  REPORT: 'RPT',         // 报告
  CLIENT_REPORT: 'CR',   // 客户报告
  RECEIVABLE: 'AR',      // 应收
  INVOICE: 'INV',        // 发票
  REPAIR: 'WX',          // 维修
  PAYMENT: 'PM',         // 收款
  STOCK_IN: 'RK',        // 入库
  STOCK_OUT: 'CK',       // 出库
} as const

export type NumberPrefix = typeof NumberPrefixes[keyof typeof NumberPrefixes]

/**
 * 生成今日日期字符串 YYYYMMDD
 */
function getTodayString(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

/**
 * 编号计数器模型配置
 * 使用单独的计数器表来保证并发安全
 */
interface NumberCounter {
  prefix: string
  date: string
  counter: number
}

/**
 * 原子递增获取下一个编号
 * 使用数据库事务保证并发安全
 */
async function getNextCounter(prefix: string, date: string): Promise<number> {
  // 使用 Prisma 原生 SQL 实现原子递增
  // 如果记录不存在则创建，如果存在则递增
  const result = await prisma.$executeRaw`
    INSERT INTO sys_number_counter (prefix, date, counter)
    VALUES (${prefix}, ${date}, 1)
    ON DUPLICATE KEY UPDATE counter = counter + 1
  `

  // 查询当前值
  const record = await prisma.$queryRaw<{ counter: number }[]>`
    SELECT counter FROM sys_number_counter
    WHERE prefix = ${prefix} AND date = ${date}
  `

  return record[0]?.counter || 1
}

/**
 * 生成业务编号
 * 格式: 前缀 + 日期(YYYYMMDD) + 序号(3-4位)
 *
 * @param prefix 编号前缀
 * @param padLength 序号位数，默认3位
 * @returns 生成的编号
 *
 * @example
 * generateNo('ZX') => 'ZX20260105001'
 * generateNo('WT', 4) => 'WT202601050001'
 */
export async function generateNo(
  prefix: NumberPrefix,
  padLength: number = 3
): Promise<string> {
  const today = getTodayString()

  try {
    // 尝试使用计数器表（原子操作）
    const counter = await getNextCounter(prefix, today)
    return `${prefix}${today}${String(counter).padStart(padLength, '0')}`
  } catch {
    // 如果计数器表不存在，降级到 count 方式（非原子，仅用于开发环境）
    console.warn('[generateNo] 计数器表不可用，使用降级方案')
    return generateNoFallback(prefix, padLength)
  }
}

/**
 * 降级方案：基于 count 生成编号
 * 注意：此方案在高并发下可能产生重复编号
 */
async function generateNoFallback(
  prefix: NumberPrefix,
  padLength: number
): Promise<string> {
  const today = getTodayString()
  const searchPattern = `${prefix}${today}`

  // 根据前缀查询对应的表
  let count = 0

  switch (prefix) {
    case 'ZX':
      count = await prisma.consultation.count({
        where: { consultationNo: { startsWith: searchPattern } }
      })
      break
    case 'BJ':
      count = await prisma.quotation.count({
        where: { quotationNo: { startsWith: searchPattern } }
      })
      break
    case 'HT':
      count = await prisma.contract.count({
        where: { contractNo: { startsWith: searchPattern } }
      })
      break
    case 'WT':
      count = await prisma.entrustment.count({
        where: { entrustmentNo: { startsWith: searchPattern } }
      })
      break
    case 'S':
      count = await prisma.sample.count({
        where: { sampleNo: { startsWith: searchPattern } }
      })
      break
    case 'T':
      count = await prisma.testTask.count({
        where: { taskNo: { startsWith: searchPattern } }
      })
      break
    case 'RPT':
      count = await prisma.testReport.count({
        where: { reportNo: { startsWith: searchPattern } }
      })
      break
    case 'CR':
      count = await prisma.clientReport.count({
        where: { reportNo: { startsWith: searchPattern } }
      })
      break
    case 'AR':
      count = await prisma.financeReceivable.count({
        where: { receivableNo: { startsWith: searchPattern } }
      })
      break
    case 'INV':
      count = await prisma.financeInvoice.count({
        where: { invoiceNo: { startsWith: searchPattern } }
      })
      break
    case 'WX':
      count = await prisma.deviceRepair.count({
        where: { repairNo: { startsWith: searchPattern } }
      })
      break
    case 'PM':
      // FinancePayment 没有单独的编号字段，使用记录数
      count = await prisma.financePayment.count()
      break
    default:
      count = 0
  }

  return `${prefix}${today}${String(count + 1).padStart(padLength, '0')}`
}

/**
 * 生成报告编号
 * 格式: RPT-YYYYMMDD-XXX
 */
export async function generateReportNo(): Promise<string> {
  const today = getTodayString()
  const searchPattern = `RPT-${today}`

  try {
    const counter = await getNextCounter('RPT', today)
    return `RPT-${today}-${String(counter).padStart(3, '0')}`
  } catch {
    const count = await prisma.testReport.count({
      where: { reportNo: { startsWith: searchPattern } }
    })
    return `RPT-${today}-${String(count + 1).padStart(3, '0')}`
  }
}

/**
 * 生成客户报告编号
 * 格式: CR-YYYYMMDD-XXX
 */
export async function generateClientReportNo(): Promise<string> {
  const today = getTodayString()
  const searchPattern = `CR-${today}`

  try {
    const counter = await getNextCounter('CR', today)
    return `CR-${today}-${String(counter).padStart(3, '0')}`
  } catch {
    const count = await prisma.clientReport.count({
      where: { reportNo: { startsWith: searchPattern } }
    })
    return `CR-${today}-${String(count + 1).padStart(3, '0')}`
  }
}

/**
 * 生成应收编号
 * 格式: AR-YYYYMMDD-XXX
 */
export async function generateReceivableNo(): Promise<string> {
  const today = getTodayString()
  const searchPattern = `AR-${today}`

  try {
    const counter = await getNextCounter('AR', today)
    return `AR-${today}-${String(counter).padStart(3, '0')}`
  } catch {
    const count = await prisma.financeReceivable.count({
      where: { receivableNo: { startsWith: searchPattern } }
    })
    return `AR-${today}-${String(count + 1).padStart(3, '0')}`
  }
}

/**
 * 生成发票编号
 * 格式: INV-YYYYMMDD-XXX
 */
export async function generateInvoiceNo(): Promise<string> {
  const today = getTodayString()
  const searchPattern = `INV-${today}`

  try {
    const counter = await getNextCounter('INV', today)
    return `INV-${today}-${String(counter).padStart(3, '0')}`
  } catch {
    const count = await prisma.financeInvoice.count({
      where: { invoiceNo: { startsWith: searchPattern } }
    })
    return `INV-${today}-${String(count + 1).padStart(3, '0')}`
  }
}
