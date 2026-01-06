/**
 * @file numberGenerator
 * @desc 单号生成工具函数
 */

import { NUMBER_PREFIXES } from './constants'

/**
 * 获取今天的日期字符串（格式：YYYYMMDD）
 */
export function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '')
}

/**
 * 格式化日期为 YYYYMMDD
 */
export function formatDateToNumberString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

/**
 * 生成单号
 * @param type 单号类型
 * @param count 当日已有序号数量
 * @param padding 序号位数
 */
export function generateNumber(
  type: keyof typeof NUMBER_PREFIXES,
  count: number,
  padding: number = 4
): string {
  const prefix = NUMBER_PREFIXES[type]
  const today = getTodayDateString()
  const serial = String(count + 1).padStart(padding, '0')

  // 报告、应收、发票使用特殊格式：PREFIX-YYYYMMDD-XXX
  if (['report', 'receivable', 'invoice'].includes(type)) {
    return `${prefix}-${today}-${serial.padStart(3, '0')}`
  }

  return `${prefix}${today}${serial}`
}

/**
 * 生成咨询单号
 * ZX + 年月日 + 序号
 */
export async function generateConsultationNo(prisma: any): Promise<string> {
  const today = getTodayDateString()
  const prefix = NUMBER_PREFIXES.consultation

  const count = await prisma.consultation.count({
    where: {
      consultationNo: {
        startsWith: `${prefix}${today}`
      }
    }
  })

  return generateNumber('consultation', count)
}

/**
 * 生成报价单号
 * BJ + 年月日 + 序号
 */
export async function generateQuotationNo(prisma: any): Promise<string> {
  const today = getTodayDateString()
  const prefix = NUMBER_PREFIXES.quotation

  const count = await prisma.quotation.count({
    where: {
      quotationNo: {
        startsWith: `${prefix}${today}`
      }
    }
  })

  return generateNumber('quotation', count)
}

/**
 * 生成合同编号
 * HT + 年月日 + 序号
 */
export async function generateContractNo(prisma: any): Promise<string> {
  const today = getTodayDateString()
  const prefix = NUMBER_PREFIXES.contract

  const count = await prisma.contract.count({
    where: {
      contractNo: {
        startsWith: `${prefix}${today}`
      }
    }
  })

  return generateNumber('contract', count)
}

/**
 * 生成委托单号
 * WT + 年月日 + 序号
 */
export async function generateEntrustmentNo(prisma: any): Promise<string> {
  const today = getTodayDateString()
  const prefix = NUMBER_PREFIXES.entrustment

  const count = await prisma.entrustment.count({
    where: {
      entrustmentNo: {
        startsWith: `${prefix}${today}`
      }
    }
  })

  return generateNumber('entrustment', count)
}

/**
 * 生成样品编号
 * S + 年月日 + 序号
 */
export async function generateSampleNo(prisma: any): Promise<string> {
  const today = getTodayDateString()
  const prefix = NUMBER_PREFIXES.sample

  const count = await prisma.sample.count({
    where: {
      sampleNo: {
        startsWith: `${prefix}${today}`
      }
    }
  })

  return generateNumber('sample', count)
}

/**
 * 生成任务编号
 * T + 年月日 + 序号
 */
export async function generateTaskNo(prisma: any): Promise<string> {
  const today = getTodayDateString()
  const prefix = NUMBER_PREFIXES.task

  const count = await prisma.testTask.count({
    where: {
      taskNo: {
        startsWith: `${prefix}${today}`
      }
    }
  })

  return generateNumber('task', count)
}

/**
 * 生成报告编号
 * RPT-YYYYMMDD-XXX
 */
export async function generateReportNo(prisma: any): Promise<string> {
  const today = getTodayDateString()
  const prefix = NUMBER_PREFIXES.report

  const count = await prisma.testReport.count({
    where: {
      reportNo: {
        startsWith: `${prefix}-${today}`
      }
    }
  })

  return generateNumber('report', count, 3)
}

/**
 * 生成应收编号
 * AR-YYYYMMDD-XXX
 */
export async function generateReceivableNo(prisma: any): Promise<string> {
  const today = getTodayDateString()
  const prefix = NUMBER_PREFIXES.receivable

  const count = await prisma.financeReceivable.count({
    where: {
      receivableNo: {
        startsWith: `${prefix}-${today}`
      }
    }
  })

  return generateNumber('receivable', count, 3)
}

/**
 * 生成发票号
 * INV-YYYYMMDD-XXX
 */
export async function generateInvoiceNo(prisma: any): Promise<string> {
  const today = getTodayDateString()
  const prefix = NUMBER_PREFIXES.invoice

  const count = await prisma.financeInvoice.count({
    where: {
      invoiceNo: {
        startsWith: `${prefix}-${today}`
      }
    }
  })

  return generateNumber('invoice', count, 3)
}

/**
 * 生成样品领用单号
 * LR + 年月日 + 序号
 */
export async function generateSampleRequisitionNo(prisma: any): Promise<string> {
  const today = getTodayDateString()
  const prefix = NUMBER_PREFIXES.sampleRequisition

  const count = await prisma.sampleRequisition.count({
    where: {
      requisitionNo: {
        startsWith: `${prefix}${today}`
      }
    }
  })

  return generateNumber('sampleRequisition' as any, count)
}

/**
 * 生成外包单号
 * OS + 年月日 + 序号
 */
export async function generateOutsourceOrderNo(prisma: any): Promise<string> {
  const today = getTodayDateString()
  const prefix = NUMBER_PREFIXES.outsource

  const count = await prisma.outsourceOrder.count({
    where: {
      orderNo: {
        startsWith: `${prefix}${today}`
      }
    }
  })

  return generateNumber('outsource' as any, count)
}

/**
 * 生成易耗品出入库单号
 * CT + 年月日 + 序号
 */
export async function generateConsumableTransactionNo(prisma: any): Promise<string> {
  const today = getTodayDateString()
  const prefix = NUMBER_PREFIXES.consumableTransaction

  const count = await prisma.consumableTransaction.count({
    where: {
      transactionNo: {
        startsWith: `${prefix}${today}`
      }
    }
  })

  return generateNumber('consumableTransaction' as any, count)
}
