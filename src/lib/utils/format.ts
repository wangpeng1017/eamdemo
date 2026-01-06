/**
 * @file format
 * @desc 格式化工具函数
 */

/**
 * 格式化日期
 */
export function formatDate(date: Date | string | null | undefined, format: string = 'YYYY-MM-DD'): string {
  if (!date) return '-'

  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '-'

  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')

  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds)
}

/**
 * 格式化日期时间
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  return formatDate(date, 'YYYY-MM-DD HH:mm:ss')
}

/**
 * 格式化日期为中文格式
 */
export function formatDateCN(date: Date | string | null | undefined): string {
  if (!date) return '-'

  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '-'

  const year = d.getFullYear()
  const month = d.getMonth() + 1
  const day = d.getDate()

  return `${year}年${month}月${day}日`
}

/**
 * 格式化数字为千分位
 */
export function formatNumber(num: number | string | null | undefined, decimals: number = 2): string {
  if (num === null || num === undefined) return '-'

  const n = typeof num === 'string' ? parseFloat(num) : num
  if (isNaN(n)) return '-'

  return n.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * 格式化金额
 */
export function formatMoney(amount: number | string | null | undefined): string {
  return formatNumber(amount, 2)
}

/**
 * 格式化百分比
 */
export function formatPercent(value: number | string | null | undefined, decimals: number = 1): string {
  if (value === null || value === undefined) return '-'

  const n = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(n)) return '-'

  return `${n.toFixed(decimals)}%`
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) return '-'
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

/**
 * 格式化手机号（隐藏中间4位）
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '-'
  const match = phone.match(/^(\d{3})\d{4}(\d{4})$/)
  return match ? `${match[1]}****${match[2]}` : phone
}

/**
 * 格式化银行卡号（隐藏中间部分）
 */
export function formatBankCard(cardNo: string | null | undefined): string {
  if (!cardNo) return '-'
  if (cardNo.length <= 8) return cardNo

  const start = cardNo.slice(0, 4)
  const end = cardNo.slice(-4)
  const middle = '*'.repeat(cardNo.length - 8)

  return `${start}${middle}${end}
`
}

/**
 * 获取相对时间描述
 */
export function getRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return '-'

  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diff = now.getTime() - d.getTime()

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const months = Math.floor(days / 30)
  const years = Math.floor(days / 365)

  if (seconds < 60) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 30) return `${days}天前`
  if (months < 12) return `${months}个月前`
  return `${years}年前`
}

/**
 * 计算两个日期之间的天数差
 */
export function getDaysDiff(start: Date | string, end: Date | string): number {
  const startDate = typeof start === 'string' ? new Date(start) : start
  const endDate = typeof end === 'string' ? new Date(end) : end

  const diff = endDate.getTime() - startDate.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

/**
 * 检查日期是否过期
 */
export function isExpired(date: Date | string | null | undefined): boolean {
  if (!date) return false

  const d = typeof date === 'string' ? new Date(date) : date
  return d.getTime() < Date.now()
}

/**
 * 检查日期是否即将过期（7天内）
 */
export function isExpiringSoon(date: Date | string | null | undefined, days: number = 7): boolean {
  if (!date) return false

  const d = typeof date === 'string' ? new Date(date) : date
  const diff = d.getTime() - Date.now()
  const daysDiff = diff / (1000 * 60 * 60 * 24)

  return daysDiff >= 0 && daysDiff <= days
}

/**
 * 解析 JSON 字符串（安全）
 */
export function parseJSON<T = any>(str: string | null | undefined, defaultValue: T): T {
  if (!str) return defaultValue

  try {
    return JSON.parse(str) as T
  } catch {
    return defaultValue
  }
}

/**
 * 截断文本
 */
export function truncateText(text: string | null | undefined, maxLength: number = 50): string {
  if (!text) return '-'
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength)}...`
}

/**
 * 高亮搜索关键词（返回带HTML标记的字符串）
 */
export function highlightKeyword(text: string, keyword: string): string {
  if (!keyword) return text

  const regex = new RegExp('(' + keyword + ')', 'gi')
  return text.replace(regex, '<mark style="background-color: #fffb8f; padding: 0 2px;">$1</mark>')
}

/**
 * 生成随机颜色
 */
export function getRandomColor(): string {
  const colors = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16']
  return colors[Math.floor(Math.random() * colors.length)]
}

/**
 * 根据字符串生成固定颜色
 */
export function getStringColor(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }

  const colors = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16']
  const index = Math.abs(hash) % colors.length
  return colors[index]
}

/**
 * 下载文件
 */
export function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * 下载 JSON 为文件
 */
export function downloadJSON(data: any, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  downloadFile(blob, filename)
}

/**
 * 复制到剪贴板
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }

    // 降级方案
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()

    try {
      document.execCommand('copy')
      return true
    } catch {
      return false
    } finally {
      document.body.removeChild(textArea)
    }
  } catch {
    return false
  }
}
