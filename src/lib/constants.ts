/**
 * @file constants
 * @desc 系统常量定义和枚举映射
 */

// ==================== 咨询状态 ====================
export const CONSULTATION_STATUS = {
  FOLLOWING: 'following',
  QUOTED: 'quoted',
  REJECTED: 'rejected',
  CLOSED: 'closed',
} as const

export const CONSULTATION_STATUS_TEXT: Record<string, string> = {
  following: '跟进中',
  quoted: '已报价',
  rejected: '已拒绝',
  closed: '已关闭',
}

export const CONSULTATION_STATUS_COLOR: Record<string, string> = {
  following: 'processing',
  quoted: 'success',
  rejected: 'error',
  closed: 'default',
}

// ==================== 报价状态 ====================
export const QUOTATION_STATUS = {
  DRAFT: 'draft',
  PENDING_SALES: 'pending_sales',
  PENDING_FINANCE: 'pending_finance',
  PENDING_LAB: 'pending_lab',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  ARCHIVED: 'archived',
} as const

export const QUOTATION_STATUS_TEXT: Record<string, string> = {
  draft: '草稿',
  pending_sales: '待销售审批',
  pending_finance: '待财务审批',
  pending_lab: '待实验室审批',
  approved: '已批准',
  rejected: '已拒绝',
  archived: '已归档',
}

export const QUOTATION_STATUS_COLOR: Record<string, string> = {
  draft: 'default',
  pending_sales: 'processing',
  pending_finance: 'processing',
  pending_lab: 'processing',
  approved: 'success',
  rejected: 'error',
  archived: 'cyan',
}

// ==================== 报价客户反馈状态 ====================
export const QUOTATION_CLIENT_STATUS = {
  PENDING: 'pending',
  OK: 'ok',
  NG: 'ng',
} as const

export const QUOTATION_CLIENT_STATUS_TEXT: Record<string, string> = {
  pending: '待反馈',
  ok: '接受',
  ng: '拒绝',
}

// ==================== 合同状态 ====================
export const CONTRACT_STATUS = {
  DRAFT: 'draft',
  SIGNED: 'signed',
  EXECUTING: 'executing',
  COMPLETED: 'completed',
  TERMINATED: 'terminated',
} as const

export const CONTRACT_STATUS_TEXT: Record<string, string> = {
  draft: '草稿',
  signed: '已签订',
  executing: '执行中',
  completed: '已完成',
  terminated: '已终止',
}

export const CONTRACT_STATUS_COLOR: Record<string, string> = {
  draft: 'default',
  signed: 'success',
  executing: 'processing',
  completed: 'success',
  terminated: 'error',
}

// ==================== 委托单状态 ====================
export const ENTRUSTMENT_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  TESTING: 'testing',
  COMPLETED: 'completed',
} as const

export const ENTRUSTMENT_STATUS_TEXT: Record<string, string> = {
  pending: '待受理',
  accepted: '已受理',
  testing: '检测中',
  completed: '已完成',
}

// ==================== 样品状态 ====================
export const SAMPLE_STATUS = {
  PENDING_RECEIPT: '待收样',
  RECEIVED: '已收样',
  ASSIGNED: '已分配',
  TESTING: '检测中',
  COMPLETED: '已完成',
  RETURNED: '已归还',
  DESTROYED: '已销毁',
} as const

export const SAMPLE_STATUS_TEXT: Record<string, string> = {
  '待收样': '待收样',
  '已收样': '已收样',
  '已分配': '已分配',
  '检测中': '检测中',
  '已完成': '已完成',
  '已归还': '已归还',
  '已销毁': '已销毁',
}

export const SAMPLE_STATUS_COLOR: Record<string, string> = {
  '待收样': 'default',
  '已收样': 'success',
  '已分配': 'processing',
  '检测中': 'processing',
  '已完成': 'success',
  '已归还': 'cyan',
  '已销毁': 'error',
}

// ==================== 样品单位 ====================
export const SAMPLE_UNITS = [
  { value: '个', label: '个' },
  { value: '件', label: '件' },
  { value: '批', label: '批' },
  { value: 'kg', label: 'kg' },
  { value: 'g', label: 'g' },
  { value: 'L', label: 'L' },
  { value: 'mL', label: 'mL' },
  { value: 'm', label: 'm' },
  { value: 'm²', label: 'm²' },
  { value: 'm³', label: 'm³' },
]

// ==================== 任务状态 ====================
export const TASK_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: '进行中',
  COMPLETED: '已完成',
  TRANSFERRED: '已转交',
} as const

export const TASK_STATUS_TEXT: Record<string, string> = {
  pending: '待开始',
  '进行中': '进行中',
  '已完成': '已完成',
  '已转交': '已转交',
}

export const TASK_STATUS_COLOR: Record<string, string> = {
  pending: 'default',
  '进行中': 'processing',
  '已完成': 'success',
  '已转交': 'warning',
}

// ==================== 检测项目状态 ====================
export const PROJECT_STATUS = {
  PENDING: 'pending',
  ASSIGNED: 'assigned',
  SUBCONTRACTED: 'subcontracted',
  COMPLETED: 'completed',
} as const

export const PROJECT_STATUS_TEXT: Record<string, string> = {
  pending: '待分配',
  assigned: '已分配',
  subcontracted: '已外包',
  completed: '已完成',
}

// ==================== 报告状态 ====================
export const REPORT_STATUS = {
  DRAFT: 'draft',
  REVIEWING: 'reviewing',
  APPROVED: 'approved',
  ISSUED: 'issued',
} as const

export const REPORT_STATUS_TEXT: Record<string, string> = {
  draft: '草稿',
  reviewing: '待审核',
  approved: '已批准',
  issued: '已发布',
}

export const REPORT_STATUS_COLOR: Record<string, string> = {
  draft: 'default',
  reviewing: 'processing',
  approved: 'success',
  issued: 'cyan',
}

// ==================== 设备状态 ====================
export const DEVICE_STATUS = {
  RUNNING: 'Running',
  MAINTENANCE: 'Maintenance',
  IDLE: 'Idle',
  SCRAPPED: 'Scrapped',
} as const

export const DEVICE_STATUS_TEXT: Record<string, string> = {
  Running: '运行中',
  Maintenance: '维护中',
  Idle: '空闲',
  Scrapped: '已报废',
}

export const DEVICE_STATUS_COLOR: Record<string, string> = {
  Running: 'success',
  Maintenance: 'processing',
  Idle: 'default',
  Scrapped: 'error',
}

// ==================== 设备资产类型 ====================
export const DEVICE_ASSET_TYPE = [
  { value: 'instrument', label: '仪器设备' },
  { value: 'device', label: '辅助设备' },
  { value: 'glassware', label: '玻璃器皿' },
]

// ==================== 检测目的 ====================
export const TEST_PURPOSE_OPTIONS = [
  { value: 'quality_inspection', label: '质量检测' },
  { value: 'product_certification', label: '产品认证' },
  { value: 'rd_testing', label: '研发测试' },
  { value: 'other', label: '其他' },
]

// ==================== 紧急程度 ====================
export const URGENCY_LEVEL_OPTIONS = [
  { value: 'normal', label: '普通' },
  { value: 'urgent', label: '紧急' },
  { value: 'very_urgent', label: '非常紧急' },
]

export const URGENCY_LEVEL_COLOR: Record<string, string> = {
  normal: 'default',
  urgent: 'warning',
  very_urgent: 'error',
}

// ==================== 可行性评估 ====================
export const FEASIBILITY_OPTIONS = [
  { value: 'feasible', label: '可行' },
  { value: 'difficult', label: '困难' },
  { value: 'infeasible', label: '不可行' },
]

export const FEASIBILITY_COLOR: Record<string, string> = {
  feasible: 'success',
  difficult: 'warning',
  infeasible: 'error',
}

// ==================== 跟进方式 ====================
export const FOLLOW_UP_TYPE_OPTIONS = [
  { value: 'phone', label: '电话' },
  { value: 'email', label: '邮件' },
  { value: 'visit', label: '拜访' },
  { value: 'other', label: '其他' },
]

// ==================== 发票类型 ====================
export const INVOICE_TYPE_OPTIONS = [
  { value: '增值税普通发票', label: '增值税普通发票' },
  { value: '增值税专用发票', label: '增值税专用发票' },
]

// ==================== 收款方式 ====================
export const PAYMENT_METHOD_OPTIONS = [
  { value: '现金', label: '现金' },
  { value: '银行转账', label: '银行转账' },
  { value: '支票', label: '支票' },
  { value: '其他', label: '其他' },
]

// ==================== 保养周期类型 ====================
export const MAINTENANCE_PLAN_TYPE = [
  { value: 'daily', label: '每日' },
  { value: 'weekly', label: '每周' },
  { value: 'monthly', label: '每月' },
  { value: 'quarterly', label: '每季度' },
  { value: 'annual', label: '每年' },
]

// ==================== 来源类型 ====================
export const SOURCE_TYPE_OPTIONS = [
  { value: 'contract', label: '合同' },
  { value: 'quotation', label: '报价' },
  { value: 'direct', label: '直接委托' },
]

// ==================== 委托来源类型 ====================
export const ENTRUSTMENT_SOURCE_TYPE = [
  { value: 'contract', label: '合同' },
  { value: 'quotation', label: '报价' },
  { value: 'direct', label: '直接' },
]

// ==================== 单号前缀 ====================
export const NUMBER_PREFIXES = {
  consultation: 'ZX',     // 咨询单
  quotation: 'BJ',        // 报价单
  contract: 'HT',         // 合同
  entrustment: 'WT',      // 委托单
  sample: 'S',            // 样品
  task: 'T',              // 任务
  report: 'RPT',          // 报告
  receivable: 'AR',       // 应收
  invoice: 'INV',         // 发票
  sampleRequisition: 'LR', // 样品领用
  outsource: 'OS',        // 外包单
  consumableTransaction: 'CT', // 易耗品出入库
} as const

// ==================== 默认服务方信息 ====================
export const DEFAULT_SERVICE_INFO = {
  company: '江苏国轻检测技术有限公司',
  contact: '张馨',
  tel: '15952575002',
  email: 'zhangxin@sae-china.org',
  address: '扬州市邗江区金山路99号',
}

// ==================== 税率 ====================
export const TAX_RATE = 0.06 // 6%

// ==================== 分页配置 ====================
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
}

// ==================== 日期格式 ====================
export const DATE_FORMAT = 'YYYY-MM-DD'
export const DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss'
export const DATE_FORMAT_CN = 'yyyy年MM月dd日'
export const DATETIME_FORMAT_CN = 'yyyy年MM月dd日 HH:mm:ss'

// ==================== 常用检测项目 ====================
export const COMMON_TEST_ITEMS = [
  '拉伸强度测试',
  '金相分析',
  '硬度测试',
  '化学成分分析',
  '冲击试验',
  '弯曲试验',
  '无损检测',
  '尺寸测量',
  '外观质量检查',
  '耐腐蚀试验',
]

// ==================== 常用检测标准 ====================
export const COMMON_TEST_STANDARDS = [
  'GB/T 228.1-2021',
  'GB/T 13298-2015',
  'GB/T 230.1-2019',
  'GB/T 4336-2016',
  'GB/T 229-2007',
  'GB/T 232-2010',
]

// ==================== 导出菜单配置 ====================
export const MENU_ITEMS = {
  entrustment: {
    key: 'entrustment',
    label: '委托管理',
    icon: 'FileTextOutlined',
    children: [
      { key: 'consultation', label: '委托咨询', path: '/entrustment/consultation' },
      { key: 'quotation', label: '报价管理', path: '/entrustment/quotation' },
      { key: 'contract', label: '合同管理', path: '/entrustment/contract' },
      { key: 'list', label: '委托单管理', path: '/entrustment/list' },
      { key: 'client', label: '客户单位', path: '/entrustment/client' },
    ],
  },
  sample: {
    key: 'sample',
    label: '样品管理',
    icon: 'ExperimentOutlined',
    children: [
      { key: 'receipt', label: '收样登记', path: '/sample/receipt' },
      { key: 'details', label: '样品明细', path: '/sample/details' },
      { key: 'my-samples', label: '我的样品', path: '/sample/my-samples' },
    ],
  },
  task: {
    key: 'task',
    label: '任务管理',
    icon: 'UnorderedListOutlined',
    children: [
      { key: 'all-tasks', label: '全部任务', path: '/task/all-tasks' },
      { key: 'my-tasks', label: '我的任务', path: '/task/my-tasks' },
    ],
  },
  test: {
    key: 'test',
    label: '检测管理',
    icon: 'ExperimentOutlined',
    children: [
      { key: 'data-entry', label: '数据录入', path: '/test/data-entry' },
      { key: 'report', label: '检测报告', path: '/test/report' },
    ],
  },
  report: {
    key: 'report',
    label: '报告管理',
    icon: 'FilePdfOutlined',
    children: [
      { key: 'test-reports', label: '检测报告', path: '/report/test-reports' },
      { key: 'client-reports', label: '客户报告', path: '/report/client-reports' },
      { key: 'approval', label: '报告审批', path: '/report/approval' },
      { key: 'templates', label: '报告模板', path: '/report/templates' },
    ],
  },
  finance: {
    key: 'finance',
    label: '财务管理',
    icon: 'DollarOutlined',
    children: [
      { key: 'receivables', label: '应收账款', path: '/finance/receivables' },
      { key: 'payment-records', label: '收款记录', path: '/finance/payment-records' },
      { key: 'invoices', label: '开票管理', path: '/finance/invoices' },
    ],
  },
  device: {
    key: 'device',
    label: '设备管理',
    icon: 'ToolOutlined',
    children: [
      { key: 'info', label: '设备台账', path: '/device/info' },
      { key: 'maintenance', label: '保养计划', path: '/device/maintenance' },
      { key: 'repair', label: '维修管理', path: '/device/repair' },
      { key: 'calibration', label: '定检计划', path: '/device/calibration' },
    ],
  },
  statistics: {
    key: 'statistics',
    label: '统计报表',
    icon: 'BarChartOutlined',
    children: [
      { key: 'entrustment', label: '委托统计', path: '/statistics/entrustment' },
      { key: 'sample', label: '样品统计', path: '/statistics/sample' },
      { key: 'task', label: '任务统计', path: '/statistics/task' },
    ],
  },
  supplier: {
    key: 'supplier',
    label: '供应商管理',
    icon: 'ShoppingOutlined',
    children: [
      { key: 'info', label: '供应商信息', path: '/supplier/info' },
      { key: 'category', label: '供应商分类', path: '/supplier/category' },
      { key: 'template', label: '评价模板', path: '/supplier/template' },
      { key: 'evaluation', label: '绩效评价', path: '/supplier/evaluation' },
    ],
  },
  consumables: {
    key: 'consumables',
    label: '易耗品管理',
    icon: 'InboxOutlined',
    children: [
      { key: 'info', label: '易耗品信息', path: '/consumables/info' },
      { key: 'transactions', label: '出入库记录', path: '/consumables/transactions' },
    ],
  },
  outsource: {
    key: 'outsource',
    label: '委外管理',
    icon: 'SendOutlined',
    children: [
      { key: 'all', label: '全部委外', path: '/outsource/all' },
      { key: 'my', label: '我的委外', path: '/outsource/my' },
    ],
  },
  system: {
    key: 'system',
    label: '系统管理',
    icon: 'SettingOutlined',
    children: [
      { key: 'users', label: '用户管理', path: '/system/users' },
      { key: 'roles', label: '角色管理', path: '/system/roles' },
      { key: 'departments', label: '部门管理', path: '/system/departments' },
      { key: 'permission', label: '权限配置', path: '/system/permission' },
      { key: 'workflow', label: '审批流程', path: '/system/workflow' },
    ],
  },
} as const
