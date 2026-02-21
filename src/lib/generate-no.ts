import { prisma } from './prisma'

/**
 * 编号前缀配置
 * 统一使用中文拼音首字母缩写
 * 格式: 前缀 + YYYYMMDD + 0001（4位递增序号）
 */
export const NumberPrefixes = {
  CONSULTATION: 'ZX',    // 咨询单
  QUOTATION: 'BJ',       // 报价单
  CONTRACT: 'HT',        // 合同
  ENTRUSTMENT: 'WT',     // 委托单
  SAMPLE: 'YP',          // 样品
  TASK: 'RW',            // 任务
  REPORT: 'RWBG',        // 任务报告（内部）
  CLIENT_REPORT: 'BG',   // 客户报告
  RECEIVABLE: 'AR',      // 应收
  INVOICE: 'INV',        // 发票
  REPAIR: 'WX',          // 维修
  PAYMENT: 'PM',         // 收款
  STOCK_IN: 'RK',        // 入库
  STOCK_OUT: 'CK',       // 出库
  OUTSOURCE: 'WW',       // 委外订单
  PROCESSING: 'PRC',     // 样品加工
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
 * 统一格式: 前缀 + 日期(YYYYMMDD) + 序号(4位)
 *
 * @param prefix 编号前缀
 * @param padLength 序号位数，默认4位
 * @returns 生成的编号
 *
 * @example
 * generateNo('ZX') => 'ZX202602130001'
 * generateNo('WT') => 'WT202602130001'
 * generateNo('YP') => 'YP202602130001'
 */
export async function generateNo(
  prefix: NumberPrefix,
  padLength: number = 4
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
    case 'YP':
      count = await prisma.sample.count({
        where: { sampleNo: { startsWith: searchPattern } }
      })
      break
    case 'RW':
      count = await prisma.testTask.count({
        where: { taskNo: { startsWith: searchPattern } }
      })
      break
    case 'RWBG':
      count = await prisma.testReport.count({
        where: { reportNo: { startsWith: searchPattern } }
      })
      break
    case 'BG':
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
    case 'WW':
      count = await prisma.outsourceOrder.count({
        where: { orderNo: { startsWith: searchPattern } }
      })
      break
    case 'PRC':
      count = await prisma.sampleProcessing.count({
        where: { processNo: { startsWith: searchPattern } }
      })
      break
    default:
      count = 0
  }

  return `${prefix}${today}${String(count + 1).padStart(padLength, '0')}`
}

/**
 * 生成任务报告编号（内部报告）
 * 格式: RWBG + YYYYMMDD + NNNN
 *
 * @example 'RWBG202602130001'
 */
export async function generateReportNo(): Promise<string> {
  return generateNo(NumberPrefixes.REPORT)
}

/**
 * 生成客户报告编号
 * 格式: BG + YYYYMMDD + NNNN
 *
 * @example 'BG202602130001'
 */
export async function generateClientReportNo(): Promise<string> {
  return generateNo(NumberPrefixes.CLIENT_REPORT)
}

/**
 * 生成客户报告子编号
 * 用于同一委托单下多个客户报告的编号
 *
 * @param baseNo 基础报告编号（如 BG202602130001）
 * @param subIndex 子序号（从1开始）
 * @returns 带子编号的报告编号（如 BG202602130001-001）
 *
 * @example
 * generateClientReportSubNo('BG202602130001', 1) => 'BG202602130001-001'
 * generateClientReportSubNo('BG202602130001', 2) => 'BG202602130001-002'
 */
export function generateClientReportSubNo(
  baseNo: string,
  subIndex: number
): string {
  return `${baseNo}-${String(subIndex).padStart(3, '0')}`
}

/**
 * 生成应收编号
 * 格式: AR + YYYYMMDD + NNNN
 *
 * @example 'AR202602130001'
 */
export async function generateReceivableNo(): Promise<string> {
  return generateNo(NumberPrefixes.RECEIVABLE)
}

/**
 * 生成发票编号
 * 格式: INV + YYYYMMDD + NNNN
 *
 * @example 'INV202602130001'
 */
export async function generateInvoiceNo(): Promise<string> {
  return generateNo(NumberPrefixes.INVOICE)
}
