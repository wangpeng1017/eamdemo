/**
 * @file validation.ts
 * @desc 统一输入验证模块 - 使用 Zod 进行类型安全的输入验证
 */

import { z } from 'zod'
import { badRequest } from './api-handler'

// ==================== 通用验证规则 ====================

// 分页参数
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(1000).default(10),
})

// ID 参数
export const idSchema = z.string().min(1, '缺少 ID 参数')

// 日期范围
export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

// ==================== 用户模块 ====================

export const createUserSchema = z.object({
  username: z.string().min(2, '用户名至少2个字符').max(50, '用户名最多50个字符'),
  name: z.string().min(1, '姓名不能为空').max(50, '姓名最多50个字符'),
  password: z.string().min(6, '密码至少6个字符').max(100).optional(),
  phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确').optional().nullable(),
  email: z.string().email('邮箱格式不正确').optional().nullable(),
  deptId: z.string().optional().nullable(),
  status: z.coerce.number().int().min(0).max(1).default(1),
})

export const updateUserSchema = createUserSchema.partial().extend({
  id: idSchema,
})

// ==================== 客户模块 ====================

export const createClientSchema = z.object({
  name: z.string().min(1, '客户名称不能为空').max(200, '客户名称最多200个字符'),
  shortName: z.string().max(50).optional().nullable(),
  type: z.string().max(50).optional().nullable(),
  industry: z.string().max(100).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  contactPerson: z.string().max(50).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email('邮箱格式不正确').optional().nullable(),
  status: z.string().default('active'),
})

export const updateClientSchema = createClientSchema.partial().extend({
  id: idSchema,
})

// ==================== 样品模块 ====================

export const createSampleSchema = z.object({
  name: z.string().min(1, '样品名称不能为空').max(200),
  entrustmentId: z.string().optional().nullable(),
  type: z.string().max(50).optional().nullable(),
  specification: z.string().max(200).optional().nullable(),
  quantity: z.coerce.number().int().min(1).default(1),
  unit: z.string().max(20).optional().nullable(),
  storageLocation: z.string().max(200).optional().nullable(),
  receiptDate: z.string().datetime().optional(),
  status: z.string().default('received'),
  remark: z.string().max(1000).optional().nullable(),
})

// ==================== 设备模块 ====================

export const createDeviceSchema = z.object({
  name: z.string().min(1, '设备名称不能为空').max(200),
  model: z.string().max(100).optional().nullable(),
  manufacturer: z.string().max(200).optional().nullable(),
  serialNo: z.string().max(100).optional().nullable(),
  purchaseDate: z.string().datetime().optional().nullable(),
  status: z.string().default('normal'),
  location: z.string().max(200).optional().nullable(),
  remark: z.string().max(1000).optional().nullable(),
})

// ==================== 供应商模块 ====================

export const createSupplierSchema = z.object({
  name: z.string().min(1, '供应商名称不能为空').max(200),
  code: z.string().max(50).optional().nullable(),
  type: z.string().max(50).optional().nullable(),
  contactPerson: z.string().max(50).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email('邮箱格式不正确').optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  status: z.string().default('active'),
})

// ==================== 易耗品模块 ====================

export const createConsumableSchema = z.object({
  code: z.string().min(1, '编码不能为空').max(50),
  name: z.string().min(1, '名称不能为空').max(200),
  unit: z.string().min(1, '单位不能为空').max(20),
  categoryId: z.string().optional().nullable(),
  specification: z.string().max(200).optional().nullable(),
  stockQuantity: z.coerce.number().int().min(0).default(0),
  minStock: z.coerce.number().int().min(0).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  status: z.coerce.number().int().min(0).max(2).default(1),
  remark: z.string().max(1000).optional().nullable(),
})

export const createConsumableTransactionSchema = z.object({
  type: z.enum(['in', 'out']),
  consumableId: z.string().min(1, '易耗品ID不能为空'),
  quantity: z.coerce.number().int().min(1, '数量必须大于0'),
  reason: z.string().min(1, '原因不能为空').max(500),
  operator: z.string().min(1, '操作人不能为空').max(50),
  unitPrice: z.coerce.number().min(0).optional(),
  relatedOrder: z.string().max(100).optional().nullable(),
  transactionDate: z.string().datetime().optional(),
  remark: z.string().max(1000).optional().nullable(),
})

// ==================== 审批模块 ====================

export const approvalActionSchema = z.object({
  action: z.enum(['approve', 'reject']),
  comment: z.string().max(1000).optional().nullable(),
})

// ==================== 报价单模块 ====================

export const createQuotationSchema = z.object({
  clientId: z.string().min(1, '客户ID不能为空'),
  contactPerson: z.string().max(50).optional().nullable(),
  contactPhone: z.string().max(20).optional().nullable(),
  validDays: z.coerce.number().int().min(1).default(30),
  items: z.array(z.object({
    name: z.string().min(1),
    specification: z.string().optional(),
    quantity: z.number().min(1),
    unitPrice: z.number().min(0),
    amount: z.number().min(0),
  })).optional(),
  totalAmount: z.coerce.number().min(0).optional(),
  remark: z.string().max(1000).optional().nullable(),
})

// ==================== 验证辅助函数 ====================

/**
 * 验证输入数据
 * @param schema Zod schema
 * @param data 待验证数据
 * @returns 验证后的数据
 * @throws ApiError 验证失败时抛出 400 错误
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    const errors = result.error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`).join('; ')
    badRequest(`输入验证失败: ${errors}`)
  }
  return result.data
}

/**
 * 验证查询参数
 */
export function validateQuery<T>(schema: z.ZodSchema<T>, searchParams: URLSearchParams): T {
  const data: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    data[key] = value
  })
  return validate(schema, data)
}

/**
 * 验证分页参数
 */
export function validatePagination(searchParams: URLSearchParams) {
  const page = searchParams.get('page')
  const pageSize = searchParams.get('pageSize')
  return validate(paginationSchema, {
    page: page ? parseInt(page) : 1,
    pageSize: pageSize ? parseInt(pageSize) : 10,
  })
}
