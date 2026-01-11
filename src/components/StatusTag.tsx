/**
 * @file StatusTag
 * @desc 统一的状态标签组件
 */

import { Tag } from 'antd'
import { forwardRef } from 'react'

interface StatusTagProps {
  status?: string | null
  text?: string
  color?: string
  type?: 'consultation' | 'quotation' | 'quotation_client' | 'contract' | 'entrustment' | 'sample' | 'task' | 'report' | 'device' | 'feasibility' | 'project' | 'receivable' | 'invoice' | 'boolean' | 'calibration_plan'
  className?: string
}

/**
 * 状态文本映射表
 */
const STATUS_TEXT_MAP: Record<string, Record<string, string>> = {
  consultation: {
    following: '跟进中',
    quoted: '已报价',
    rejected: '已拒绝',
    closed: '已关闭',
  },
  quotation: {
    draft: '草稿',
    pending_sales: '待销售审批',
    pending_finance: '待财务审批',
    pending_lab: '待实验室审批',
    approved: '已批准',
    rejected: '已拒绝',
    archived: '已归档',
  },
  quotation_client: {
    pending: '待反馈',
    ok: '接受',
    ng: '拒绝',
  },
  contract: {
    draft: '草稿',
    signed: '已签订',
    executing: '执行中',
    completed: '已完成',
    terminated: '已终止',
  },
  entrustment: {
    pending: '待受理',
    accepted: '已受理',
    '待分配': '待分配',
    assigned: '已分配',
    testing: '检测中',
    in_progress: '进行中',
    completed: '已完成',
    cancelled: '已取消',
    rejected: '已拒绝',
  },
  sample: {
    '待收样': '待收样',
    '已收样': '已收样',
    '已分配': '已分配',
    '检测中': '检测中',
    '已完成': '已完成',
    '已归还': '已归还',
    '已销毁': '已销毁',
  },
  task: {
    pending: '待开始',
    '进行中': '进行中',
    '已完成': '已完成',
    '已转交': '已转交',
  },
  project: {
    pending: '待分配',
    assigned: '已分配',
    subcontracted: '已外包',
    completed: '已完成',
  },
  report: {
    draft: '草稿',
    reviewing: '待审核',
    approved: '已批准',
    issued: '已发布',
  },
  device: {
    Running: '运行中',
    Maintenance: '维护中',
    Idle: '空闲',
    Scrapped: '已报废',
  },
  feasibility: {
    feasible: '可行',
    difficult: '困难',
    infeasible: '不可行',
  },
  receivable: {
    pending: '未收款',
    partial: '部分收款',
    completed: '已收款',
  },
  invoice: {
    pending: '待开票',
    issued: '已开票',
  },
  boolean: {
    true: '是',
    false: '否',
  },
  calibration_plan: {
    pending: '待检定',
    in_progress: '检定中',
    completed: '已完成',
    overdue: '已逾期',
  },
}

/**
 * 状态颜色映射表
 */
const STATUS_COLOR_MAP: Record<string, Record<string, string>> = {
  consultation: {
    following: 'processing',
    quoted: 'success',
    rejected: 'error',
    closed: 'default',
  },
  quotation: {
    draft: 'default',
    pending_sales: 'processing',
    pending_finance: 'processing',
    pending_lab: 'processing',
    approved: 'success',
    rejected: 'error',
    archived: 'cyan',
  },
  quotation_client: {
    pending: 'default',
    ok: 'success',
    ng: 'error',
  },
  contract: {
    draft: 'default',
    signed: 'success',
    executing: 'processing',
    completed: 'success',
    terminated: 'error',
  },
  entrustment: {
    pending: 'default',
    accepted: 'processing',
    '待分配': 'default',
    assigned: 'processing',
    testing: 'processing',
    in_progress: 'processing',
    completed: 'success',
    cancelled: 'default',
    rejected: 'error',
  },
  sample: {
    '待收样': 'default',
    '已收样': 'success',
    '已分配': 'processing',
    '检测中': 'processing',
    '已完成': 'success',
    '已归还': 'cyan',
    '已销毁': 'error',
  },
  task: {
    pending: 'default',
    '进行中': 'processing',
    '已完成': 'success',
    '已转交': 'warning',
  },
  project: {
    pending: 'default',
    assigned: 'processing',
    subcontracted: 'warning',
    completed: 'success',
  },
  report: {
    draft: 'default',
    reviewing: 'processing',
    approved: 'success',
    issued: 'cyan',
  },
  device: {
    Running: 'success',
    Maintenance: 'processing',
    Idle: 'default',
    Scrapped: 'error',
  },
  feasibility: {
    feasible: 'success',
    difficult: 'warning',
    infeasible: 'error',
  },
  receivable: {
    pending: 'warning',
    partial: 'processing',
    completed: 'success',
  },
  invoice: {
    pending: 'default',
    issued: 'success',
  },
  boolean: {
    true: 'success',
    false: 'default',
  },
  calibration_plan: {
    pending: 'default',
    in_progress: 'processing',
    completed: 'success',
    overdue: 'error',
  },
}

/**
 * StatusTag 组件
 *
 * @example
 * // 直接指定文本和颜色
 * <StatusTag text="已完成" color="success" />
 *
 * // 使用类型映射
 * <StatusTag type="quotation" status="approved" />
 */
export const StatusTag = forwardRef<any, StatusTagProps>(
  ({ status, text, color, type = 'consultation', className }, ref) => {
    // 如果直接指定了文本和颜色，优先使用
    if (text && color) {
      return <Tag ref={ref} color={color} className={className}>{text}</Tag>
    }

    // 获取映射的文本
    let displayText = text
    if (!displayText && type && status) {
      displayText = STATUS_TEXT_MAP[type]?.[status] || status
    }

    // 获取映射的颜色
    let displayColor = color
    if (!displayColor && type && status) {
      displayColor = STATUS_COLOR_MAP[type]?.[status] || 'default'
    }

    // 处理布尔值
    if (status === 'true' || status === 'false') {
      displayText = STATUS_TEXT_MAP.boolean[status]
      displayColor = STATUS_COLOR_MAP.boolean[status]
    }

    return (
      <Tag ref={ref} color={displayColor || 'default'} className={className}>
        {displayText || status || '-'}
      </Tag>
    )
  }
)

StatusTag.displayName = 'StatusTag'

export default StatusTag
